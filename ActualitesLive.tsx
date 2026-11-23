// ActualitesLive.tsx — actualités de l'association, rédigées dans l'administration (onglet Actualités).
// Mode « accueil » : les dernières actualités en cartes + lien vers la page.
// Mode « page » : toutes les actualités (page /actualites) ; un article s'ouvre en grand, et /actualites#<id> y mène directement.
// Les actualités « réservées aux adhérents » n'apparaissent qu'une fois connecté.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { createPortal } from "react-dom"
import { sb } from "./AcsBase.tsx"

const sans = "'Poppins', system-ui, sans-serif"
const serif = "'Fraunces', Georgia, serif"
const VERT = "#9bbd8a"
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
export const dateActu = (d: string) => { const [a, m, j] = d.slice(0, 10).split("-").map(Number); return `${j} ${MOIS[m - 1]} ${a}` }

export type Actu = { id: string; titre: string; resume?: string | null; contenu: string; photo_url?: string | null; publie_le: string; public: boolean }

// texte simple : paragraphes séparés par une ligne vide, liens cliquables
export function TexteActu({ texte, clair }: { texte: string; clair?: boolean }) {
    const morceaux = (p: string) => p.split(/(https?:\/\/[^\s]+)/g).map((x, i) => /^https?:\/\//.test(x)
        ? <a key={i} href={x} target="_blank" rel="noopener" style={{ color: clair ? "#4f7a3c" : VERT, wordBreak: "break-word" }}>{x.replace(/^https?:\/\//, "")}</a>
        : x.split("\n").map((l, k, t) => <React.Fragment key={`${i}-${k}`}>{l}{k < t.length - 1 && <br />}</React.Fragment>))
    return <>{texte.split(/\n{2,}/).filter((p) => p.trim()).map((p, i) => <p key={i} style={{ margin: "0 0 16px" }}>{morceaux(p)}</p>)}</>
}

function Article({ a, fermer }: { a: Actu; fermer: () => void }) {
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => e.key === "Escape" && fermer()
        window.addEventListener("keydown", k)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o }
    }, [])
    return createPortal(
        <div onClick={fermer} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,8,6,0.78)", overflowY: "auto", padding: "40px 16px", fontFamily: sans }}>
            <article onClick={(e) => e.stopPropagation()} role="dialog" aria-label={a.titre} style={{ maxWidth: 760, margin: "0 auto", background: "#1e1915", color: "#f6f0e6", border: "1px solid rgba(246,240,230,0.14)" }}>
                {a.photo_url && <img src={a.photo_url} alt="" style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "cover" }} />}
                <div style={{ padding: "26px clamp(18px, 5vw, 44px) 34px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <span style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: VERT }}>{dateActu(a.publie_le)}{!a.public && " · réservé aux adhérents"}</span>
                        <button onClick={fermer} aria-label="Fermer" style={{ background: "transparent", border: "1px solid rgba(246,240,230,0.3)", color: "#f6f0e6", width: 36, height: 36, cursor: "pointer", fontSize: 18, flex: "0 0 auto" }}>×</button>
                    </div>
                    <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.15, margin: "10px 0 18px", fontWeight: 600 }}>{a.titre}</h2>
                    {a.resume && <p style={{ fontSize: 18, lineHeight: 1.55, opacity: 0.85, margin: "0 0 20px" }}>{a.resume}</p>}
                    <div style={{ fontSize: 16, lineHeight: 1.7 }}><TexteActu texte={a.contenu} /></div>
                </div>
            </article>
        </div>,
        document.body,
    )
}

function Carte({ a, ouvrir, clair }: { a: Actu; ouvrir: () => void; clair: boolean }) {
    const txt = clair ? "#2b2420" : "#f6f0e6"
    return (
        <button onClick={ouvrir} style={{ display: "flex", flexDirection: "column", textAlign: "left", padding: 0, background: clair ? "rgba(43,36,32,0.04)" : "rgba(246,240,230,0.04)", border: `1px solid ${clair ? "rgba(43,36,32,0.14)" : "rgba(246,240,230,0.14)"}`, color: txt, cursor: "pointer", font: "inherit", fontFamily: sans, minWidth: 0 }}>
            {a.photo_url ? <img src={a.photo_url} alt="" loading="lazy" style={{ display: "block", width: "100%", height: 190, objectFit: "cover" }} />
                : <div style={{ height: 8, background: VERT, opacity: 0.6 }} />}
            <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: clair ? "#4f7a3c" : VERT }}>{dateActu(a.publie_le)}{!a.public && " · adhérents"}</span>
                <span style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.25, fontWeight: 600 }}>{a.titre}</span>
                {(a.resume || a.contenu) && <span style={{ fontSize: 14.5, lineHeight: 1.55, opacity: 0.78, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.resume || a.contenu}</span>}
                <span style={{ fontSize: 14, fontWeight: 600, color: clair ? "#4f7a3c" : VERT, marginTop: 4 }}>Lire →</span>
            </div>
        </button>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function ActualitesLive(props: { mode?: "accueil" | "page"; nombre?: number; lien?: string; clair?: boolean }) {
    const { mode = "accueil", nombre = 3, lien = "/actualites", clair = false } = props
    const [liste, setListe] = React.useState<Actu[] | null>(null)
    const [ouverte, setOuverte] = React.useState<Actu | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return setListe([])
        const charger = () => {
            let q = c.from("actualites").select("id,titre,resume,contenu,photo_url,publie_le,public").eq("publie", true)
                .lte("publie_le", new Date().toISOString().slice(0, 10)).order("publie_le", { ascending: false }).order("cree_le", { ascending: false })
            if (mode === "accueil") q = q.limit(nombre)
            q.then(({ data }: any) => {
                const l = data ?? []
                setListe(l)
                const id = typeof location !== "undefined" ? decodeURIComponent(location.hash.slice(1)) : ""
                if (mode === "page" && id) { const x = l.find((a: Actu) => a.id === id); if (x) setOuverte(x) }
            })
        }
        charger()
        const { data } = c.auth.onAuthStateChange(() => charger())   // une connexion fait apparaître les actualités réservées
        return () => data.subscription.unsubscribe()
    }, [mode, nombre])
    const ouvrir = (a: Actu) => {
        if (mode === "accueil" && lien) { window.location.href = `${lien}#${a.id}`; return }
        setOuverte(a); try { history.replaceState(null, "", `#${a.id}`) } catch (e) {}
    }
    const fermer = () => { setOuverte(null); try { history.replaceState(null, "", location.pathname + location.search) } catch (e) {} }
    const txt = clair ? "#2b2420" : "#f6f0e6"
    if (liste === null) return <div style={{ width: "100%", minHeight: 120 }} />
    if (!liste.length) return mode === "page"
        ? <p style={{ fontFamily: sans, color: txt, opacity: 0.7, width: "100%" }}>Pas encore d’actualité publiée.</p>
        : <div style={{ width: "100%" }}><style>{`[data-framer-name="s-actu"]{display:none!important}`}</style></div>   // aucune actualité : la section de l'accueil se masque
    return (
        <div style={{ width: "100%", fontFamily: sans, color: txt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 18 }}>
                {liste.map((a) => <Carte key={a.id} a={a} clair={clair} ouvrir={() => ouvrir(a)} />)}
            </div>
            {mode === "accueil" && lien && (
                <div style={{ marginTop: 22 }}>
                    <a href={lien} style={{ display: "inline-block", padding: "12px 22px", border: `1px solid ${clair ? "rgba(43,36,32,0.5)" : "rgba(246,240,230,0.55)"}`, color: txt, textDecoration: "none", fontWeight: 600, fontSize: 15 }}>Toutes les actualités →</a>
                </div>
            )}
            {ouverte && <Article a={ouverte} fermer={fermer} />}
        </div>
    )
}

addPropertyControls(ActualitesLive, {
    mode: { type: ControlType.Enum, title: "Affichage", options: ["accueil", "page"], optionTitles: ["Accueil (dernières)", "Page complète"], defaultValue: "accueil" },
    nombre: { type: ControlType.Number, title: "Nombre", defaultValue: 3, min: 1, max: 12, hidden: (p: any) => p.mode === "page" },
    lien: { type: ControlType.String, title: "Lien page", defaultValue: "/actualites" },
    clair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: false },
})
