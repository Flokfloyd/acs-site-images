// BibliothequePage.tsx — « Bibliothèque » : les meilleurs livres sur les cactus et succulentes, visibles de tous
// (en bas de la page Cultiver), présentés comme les semestriels de l'accueil. Gérés dans l'administration (onglet Bibliothèque).
// Couvertures réduites à 500 px à l'envoi (environ 30 Ko) et chargées seulement quand elles apparaissent à l'écran.
import * as React from "react"
import { createPortal } from "react-dom"
import { C, serif } from "./AcsBase.tsx"
import { sb, box, small, muted, input } from "./EspaceMembre.tsx"

type Livre = { id: string; titre: string; auteurs?: string; editeur?: string; annee?: number; pages?: number; langue?: string; isbn?: string; genres?: string; caracteristiques?: string; avis?: string; couverture_url?: string }
const sa = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const genresDe = (l: Livre) => (l.genres || "").split(",").map((g) => g.trim()).filter(Boolean)

function Couverture({ l, hauteur }: { l: Livre; hauteur: number }) {
    const larg = Math.round(hauteur * 0.7)
    if (l.couverture_url) return <img src={l.couverture_url} alt={`Couverture : ${l.titre}`} loading="lazy" style={{ display: "block", width: larg, height: hauteur, objectFit: "cover", border: `1px solid ${C.line}`, background: "#2e241e", flex: "0 0 auto" }} />
    return (
        <div aria-hidden style={{ width: larg, height: hauteur, flex: "0 0 auto", background: "#2e241e", border: `1px solid ${C.line}`, display: "flex", alignItems: "flex-end", padding: 10, boxSizing: "border-box" }}>
            <span style={{ fontFamily: serif, fontSize: Math.max(12, hauteur / 11), lineHeight: 1.15, color: C.txt, fontWeight: 600 }}>{l.titre}</span>
        </div>
    )
}

function Fiche({ l, fermer }: { l: Livre; fermer: () => void }) {
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => e.key === "Escape" && fermer()
        window.addEventListener("keydown", k)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o }
    }, [])
    const ligne = (t: string, v: any) => v ? <div style={{ display: "flex", gap: 10, fontSize: 14, padding: "5px 0", borderTop: `1px solid ${C.line}` }}><span style={{ color: C.mute, minWidth: 90 }}>{t}</span><span>{v}</span></div> : null
    return createPortal(
        <div onClick={fermer} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,8,6,0.78)", overflowY: "auto", padding: "40px 16px", fontFamily: "Poppins, sans-serif" }}>
            <div role="dialog" aria-label={l.titre} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, margin: "0 auto", background: C.panel, color: C.txt, border: `1px solid ${C.line}`, padding: "clamp(18px, 4vw, 30px)" }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}><button onClick={fermer} aria-label="Fermer" style={{ ...small(), width: 36, height: 36, padding: 0, fontSize: 18 }}>×</button></div>
                <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <Couverture l={l} hauteur={240} />
                    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                        <h2 style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, margin: "0 0 6px", fontWeight: 600 }}>{l.titre}</h2>
                        {l.auteurs && <p style={{ margin: "0 0 12px", color: C.mute }}>{l.auteurs}</p>}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{genresDe(l).map((g) => <span key={g} style={{ fontSize: 12.5, padding: "3px 9px", border: `1px solid ${C.line}`, color: C.accent }}>{g}</span>)}</div>
                        {ligne("Éditeur", l.editeur)}{ligne("Année", l.annee)}{ligne("Pages", l.pages)}{ligne("Langue", l.langue)}{ligne("ISBN", l.isbn)}
                    </div>
                </div>
                {l.caracteristiques && <><h3 style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "22px 0 6px" }}>Caractéristiques</h3><p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{l.caracteristiques}</p></>}
                {l.avis && <><h3 style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "22px 0 6px" }}>Pourquoi on le recommande</h3><p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{l.avis}</p></>}
            </div>
        </div>,
        document.body,
    )
}

export function Bibliotheque() {
    const [livres, setLivres] = React.useState<Livre[] | null>(null)
    const [q, setQ] = React.useState("")
    const [genre, setGenre] = React.useState<string | null>(null)
    const [ouvert, setOuvert] = React.useState<Livre | null>(null)
    const ref = React.useRef<HTMLDivElement>(null)
    const [cols, setCols] = React.useState(4)
    React.useEffect(() => {
        sb()?.from("livres").select("*").order("ordre").order("titre").then(({ data }: any) => setLivres(data ?? []))
    }, [])
    React.useEffect(() => {
        const el = ref.current; if (!el) return
        const ro = new ResizeObserver(() => { const w = el.clientWidth; setCols(w < 560 ? 2 : w < 860 ? 3 : 4) })
        ro.observe(el); return () => ro.disconnect()
    }, [livres === null])
    if (!livres) return <div ref={ref} style={{ width: "100%", minHeight: 200 }} />
    if (!livres.length) return <div ref={ref} style={{ width: "100%" }}><p style={muted}>La bibliothèque sera bientôt garnie.</p></div>
    const tous = [...new Set(livres.flatMap(genresDe))].sort((a, b) => a.localeCompare(b, "fr"))
    const mots = sa(q).split(/\s+/).filter(Boolean)
    const vus = livres.filter((l) => (!genre || genresDe(l).includes(genre)) && mots.every((m) => sa(`${l.titre} ${l.auteurs || ""} ${l.genres || ""} ${l.editeur || ""}`).includes(m)))
    const puce = (actif: boolean): React.CSSProperties => ({ ...small(), padding: "6px 12px", fontSize: 13, background: actif ? C.accent : "transparent", color: actif ? C.accentDark : C.txt, borderColor: actif ? C.accent : C.line })
    const outils = livres.length > 8   // recherche et filtres seulement quand la liste s'allonge
    return (
        <div ref={ref} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Poppins, sans-serif" }}>
            {outils && <>
                <input style={{ ...input, maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un titre, un auteur, une famille…" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button style={puce(!genre)} onClick={() => setGenre(null)}>Tous</button>
                    {tous.map((g) => <button key={g} style={puce(genre === g)} onClick={() => setGenre(genre === g ? null : g)}>{g}</button>)}
                </div>
            </>}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cols === 2 ? 14 : 24 }}>
                {vus.map((l) => (
                    <button key={l.id} onClick={() => setOuvert(l)} aria-label={`${l.titre}, voir la fiche`}
                        style={{ all: "unset", cursor: "pointer", position: "relative", display: "block", background: "#241c17", aspectRatio: "0.72", overflow: "hidden", boxSizing: "border-box" }}
                        onMouseEnter={(e) => { const i = e.currentTarget.querySelector("img") as HTMLImageElement | null; if (i) i.style.transform = "scale(1.03)" }}
                        onMouseLeave={(e) => { const i = e.currentTarget.querySelector("img") as HTMLImageElement | null; if (i) i.style.transform = "none" }}>
                        {l.couverture_url
                            ? <img src={l.couverture_url} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 300ms ease" }} />
                            : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center", fontFamily: serif, fontSize: 20, lineHeight: 1.2, color: C.txt, fontWeight: 600 }}>{l.titre}</span>}
                        <span style={{ position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)", maxWidth: "calc(100% - 24px)", boxSizing: "border-box", background: "rgba(22,18,15,0.88)", color: C.txt, fontSize: cols === 2 ? 12.5 : 14, fontWeight: 600, lineHeight: 1.25, padding: "6px 14px", width: "max-content", textAlign: "center" }}>{l.titre.split(/[,(]/)[0].trim()}</span>
                    </button>
                ))}
            </div>
            {vus.length === 0 && <p style={muted}>Aucun livre ne correspond.</p>}
            {ouvert && <Fiche l={ouvert} fermer={() => setOuvert(null)} />}
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BibliothequePage() {
    return <Bibliotheque />
}
