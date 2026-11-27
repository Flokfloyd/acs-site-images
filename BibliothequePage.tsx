// BibliothequePage.tsx — page « Bibliothèque » : les meilleurs livres sur les cactus et succulentes.
// Réservée aux adhérents connectés. Les livres se gèrent dans l'administration (onglet Bibliothèque).
// Couvertures réduites à 500 px à l'envoi (environ 30 Ko) et chargées seulement quand elles apparaissent à l'écran.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { createPortal } from "react-dom"
import { C, serif } from "./AcsBase.tsx"
import { sb, box, small, muted, input } from "./EspaceMembre.tsx"
import { ReserveAdherents } from "./GaleriePage.tsx"

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
    const [err, setErr] = React.useState("")
    const [q, setQ] = React.useState("")
    const [genre, setGenre] = React.useState<string | null>(null)
    const [ouvert, setOuvert] = React.useState<Livre | null>(null)
    React.useEffect(() => {
        sb()?.from("livres").select("*").order("ordre").order("titre").then(({ data, error }: any) => { if (error) setErr(error.message); setLivres(data ?? []) })
    }, [])
    if (!livres) return <div style={box}><p style={muted}>Chargement…</p></div>
    if (err && !livres.length) return <div style={box}><p style={muted}>La bibliothèque n’est pas encore disponible.</p></div>
    const tous = [...new Set(livres.flatMap(genresDe))].sort((a, b) => a.localeCompare(b, "fr"))
    const mots = sa(q).split(/\s+/).filter(Boolean)
    const vus = livres.filter((l) => (!genre || genresDe(l).includes(genre)) && mots.every((m) => sa(`${l.titre} ${l.auteurs || ""} ${l.genres || ""} ${l.editeur || ""}`).includes(m)))
    const puce = (actif: boolean): React.CSSProperties => ({ ...small(), padding: "6px 12px", fontSize: 13, background: actif ? C.accent : "transparent", color: actif ? C.accentDark : C.txt, borderColor: actif ? C.accent : C.line })
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input style={{ ...input, flex: "1 1 240px", maxWidth: 420 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un titre, un auteur, une famille…" />
                <span style={{ ...muted, fontSize: 13 }}>{vus.length} livre{vus.length > 1 ? "s" : ""}</span>
            </div>
            {tous.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button style={puce(!genre)} onClick={() => setGenre(null)}>Tous</button>
                {tous.map((g) => <button key={g} style={puce(genre === g)} onClick={() => setGenre(genre === g ? null : g)}>{g}</button>)}
            </div>}
            {vus.length === 0 ? <div style={box}><p style={muted}>Aucun livre ne correspond.</p></div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
                    {vus.map((l) => (
                        <button key={l.id} onClick={() => setOuvert(l)} style={{ all: "unset", cursor: "pointer", display: "flex", gap: 14, padding: 14, background: C.panel, border: `1px solid ${C.line}`, boxSizing: "border-box", minWidth: 0 }}>
                            <Couverture l={l} hauteur={150} />
                            <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, color: C.txt, fontFamily: "Poppins, sans-serif" }}>
                                <span style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.25, fontWeight: 600 }}>{l.titre}</span>
                                {l.auteurs && <span style={{ fontSize: 13.5, color: C.mute }}>{l.auteurs}{l.annee ? ` · ${l.annee}` : ""}</span>}
                                <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{genresDe(l).slice(0, 4).map((g) => <span key={g} style={{ fontSize: 12, padding: "2px 8px", border: `1px solid ${C.line}`, color: C.accent }}>{g}</span>)}</span>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: C.accent, marginTop: "auto" }}>Voir la fiche →</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {ouvert && <Fiche l={ouvert} fermer={() => setOuvert(null)} />}
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BibliothequePage(props: { pageConnexion: string }) {
    return <ReserveAdherents pageConnexion={props.pageConnexion} texte="La bibliothèque des meilleurs livres sur les cactus et succulentes est réservée aux adhérents connectés." contenu={() => <Bibliotheque />} />
}

addPropertyControls(BibliothequePage, {
    pageConnexion: { type: ControlType.String, title: "Page de connexion", defaultValue: "/espace-membre" },
})
