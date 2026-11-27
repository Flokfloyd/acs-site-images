// ArticlesLive.tsx — articles « Cultiver » rédigés dans l'administration (onglet Cultiver › Articles),
// présentés comme les guides : cartes sur la page Cultiver (mode « liste ») et page complète /article#<slug> (mode « article »).
// Mise en forme du texte : une ligne vide sépare les paragraphes ; « ## » en début de ligne = intertitre ;
// « - » = liste à puces ; **gras** ; [photo 2] et [photo 3] placent les photos supplémentaires.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

const serif = "'Fraunces', Georgia, serif"
const sans = "'Poppins', system-ui, sans-serif"
type Article = { id: string; slug: string; titre: string; source?: string; chapo?: string; photo_url?: string; corps: string; photo2_url?: string; legende2?: string; photo3_url?: string; legende3?: string }

function enLigne(t: string, k: string) {
    return t.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((x, i) =>
        /^\*\*.+\*\*$/.test(x) ? <strong key={k + i} style={{ color: "#1d1612" }}>{x.slice(2, -2)}</strong>
            : /^https?:\/\//.test(x) ? <a key={k + i} href={x} target="_blank" rel="noopener" style={{ color: "#3f6b2c" }}>{x.replace(/^https?:\/\//, "")}</a>
                : x)
}

function Photo({ url, legende }: { url?: string; legende?: string }) {
    if (!url) return null
    return <figure style={{ margin: "28px 0" }}><img src={url} alt={legende || ""} loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />{legende && <figcaption style={{ fontSize: 14, color: "#6b5d50", marginTop: 8 }}>{legende}</figcaption>}</figure>
}

export function Corps({ a }: { a: Article }) {
    const blocs = (a.corps || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    return <div style={{ fontFamily: sans, color: "#3a3027", fontSize: 17, lineHeight: 1.75 }}>
        {blocs.map((b, i) => {
            if (/^\[photo ?2\]$/i.test(b)) return <Photo key={i} url={a.photo2_url} legende={a.legende2} />
            if (/^\[photo ?3\]$/i.test(b)) return <Photo key={i} url={a.photo3_url} legende={a.legende3} />
            if (b.startsWith("## ")) return <h2 key={i} style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.25, color: "#1d1612", margin: "36px 0 12px", fontWeight: 600 }}>{b.slice(3)}</h2>
            const l = b.split("\n")
            if (l.every((x) => /^[-•] /.test(x))) return <ul key={i} style={{ margin: "0 0 18px", paddingLeft: 22 }}>{l.map((x, j) => <li key={j} style={{ marginBottom: 6 }}>{enLigne(x.slice(2), `${i}-${j}-`)}</li>)}</ul>
            return <p key={i} style={{ margin: "0 0 18px" }}>{l.map((x, j) => <React.Fragment key={j}>{enLigne(x, `${i}-${j}-`)}{j < l.length - 1 && <br />}</React.Fragment>)}</p>
        })}
    </div>
}

function useArticles(slug?: string) {
    const [liste, setListe] = React.useState<Article[] | null>(null)
    React.useEffect(() => {
        const c = sb(); if (!c) return setListe([])
        let q = c.from("articles").select("*").eq("publie", true).order("ordre").order("cree_le")
        if (slug) q = q.eq("slug", slug)
        q.then(({ data }: any) => setListe(data ?? []))
    }, [slug])
    return liste
}

function Liste({ lien }: { lien: string }) {
    const liste = useArticles()
    const ref = React.useRef<HTMLDivElement>(null)
    const [cols, setCols] = React.useState(3)
    React.useEffect(() => {
        const el = ref.current; if (!el) return
        const ro = new ResizeObserver(() => { const w = el.clientWidth; setCols(w < 600 ? 1 : w < 900 ? 2 : 3) })
        ro.observe(el); return () => ro.disconnect()
    }, [])
    // sans article publié, le bloc disparaît (pas d'espace vide sous les guides) ; sinon il prolonge la grille des guides
    if (liste && liste.length === 0) return <div ref={ref}><style>{`[data-framer-name="Articles (gérés dans l’administration)"]{display:none!important}`}</style></div>
    return (
        <div ref={ref} style={{ width: "100%", marginTop: liste && liste.length ? -32 : 0 }}>
            {liste && liste.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 24 }}>
                {liste.map((a) => (
                    <a key={a.id} href={`${lien}#${a.slug}`} style={{ display: "flex", flexDirection: "column", background: "#fbf7ef", textDecoration: "none", color: "#1d1612" }}>
                        <div style={{ position: "relative", height: 200, background: "#e6dccb", overflow: "hidden" }}>{a.photo_url && <img src={a.photo_url} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, fontFamily: sans }}>
                            {a.source && <span style={{ fontSize: 13, fontWeight: 600, color: "#6b5d50" }}>{a.source}</span>}
                            <span style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.2, fontWeight: 600 }}>{a.titre}</span>
                            {a.chapo && <span style={{ fontSize: 16, lineHeight: 1.6, color: "#4a3f35" }}>{a.chapo}</span>}
                        </div>
                    </a>
                ))}
            </div>}
        </div>
    )
}

function Page({ retour }: { retour: string }) {
    const [slug, setSlug] = React.useState(() => (typeof location !== "undefined" ? decodeURIComponent(location.hash.slice(1)) : ""))
    React.useEffect(() => { const f = () => setSlug(decodeURIComponent(location.hash.slice(1))); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f) }, [])
    const liste = useArticles(slug || "__aucun__")
    const a = liste?.[0]
    React.useEffect(() => { if (a) document.title = `${a.titre} | A.C.S.` }, [a])
    if (!liste) return <div style={{ minHeight: "60vh", background: "#16120f" }} />
    if (!a) return (
        <div style={{ background: "#16120f", color: "#f6f0e6", padding: "96px 40px", fontFamily: sans, minHeight: "50vh" }}>
            <div style={{ maxWidth: 880, margin: "0 auto" }}><p>Article introuvable.</p><a href={retour} style={{ color: "#9bbd8a" }}>← Tous les guides</a></div>
        </div>
    )
    return (
        <article style={{ width: "100%" }}>
            <header style={{ background: "#16120f", padding: "clamp(56px, 8vw, 80px) clamp(20px, 4vw, 40px) clamp(48px, 6vw, 64px)" }}>
                <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: sans }}>
                    <a href={retour} style={{ color: "#b9d4a8", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>← Cultiver{a.source ? ` · ${a.source}` : ""}</a>
                    <h1 style={{ fontFamily: serif, fontSize: "clamp(34px, 5vw, 52px)", lineHeight: 1.1, color: "#fffdf9", margin: "18px 0 18px", fontWeight: 600 }}>{a.titre}</h1>
                    {a.chapo && <p style={{ color: "#d8cdbb", fontSize: 19, lineHeight: 1.6, margin: 0 }}>{a.chapo}</p>}
                </div>
            </header>
            {a.photo_url && <div style={{ background: "#f6f0e6", padding: "40px clamp(20px, 4vw, 40px) 0" }}><img src={a.photo_url} alt="" style={{ display: "block", width: "100%", maxWidth: 960, margin: "0 auto", height: "auto" }} /></div>}
            <div style={{ background: "#f6f0e6", padding: "56px clamp(20px, 4vw, 40px) 72px" }}>
                <div style={{ maxWidth: 720, margin: "0 auto" }}><Corps a={a} /></div>
            </div>
        </article>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function ArticlesLive(props: { mode?: "liste" | "article"; lien?: string; retour?: string }) {
    const { mode = "liste", lien = "/article", retour = "/cultiver" } = props
    return mode === "article" ? <Page retour={retour} /> : <Liste lien={lien} />
}

addPropertyControls(ArticlesLive, {
    mode: { type: ControlType.Enum, title: "Affichage", options: ["liste", "article"], optionTitles: ["Cartes (page Cultiver)", "Article complet"], defaultValue: "liste" },
    lien: { type: ControlType.String, title: "Page article", defaultValue: "/article", hidden: (p: any) => p.mode === "article" },
    retour: { type: ControlType.String, title: "Lien retour", defaultValue: "/cultiver", hidden: (p: any) => p.mode !== "article" },
})
