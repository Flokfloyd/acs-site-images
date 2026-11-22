// BoutiqueLive.tsx — catalogue de la boutique, alimenté par les administrateurs (onglet Boutique de l’administration)
// Les cartes restent courtes (photo, nom, prix) ; un clic ouvre la fiche de l’article avec sa description.
// La fiche a sa propre adresse (…/boutique#article-<id>), qu’on peut partager.
import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"
import { sb, imgLeger } from "./AcsBase.tsx"

type Produit = { id: string; nom: string; categorie?: string; prix: number; description?: string; image_url?: string; stock?: number | null; variantes?: string | null }
// « Formats ou tailles » saisis dans l’administration, un par ligne : nom ; prix
const formats = (p: Produit): { nom: string; prix: number }[] =>
    (p.variantes || "").split("\n").map((l) => l.split(";").map((x) => x.trim())).filter((l) => l[0])
        .map(([nom, px]) => ({ nom, prix: Number(String(px || "").replace(",", ".").replace(/[^\d.]/g, "")) || 0 }))

const sans = "Poppins, sans-serif", serif = "Fraunces, Georgia, serif"
// sans prix ou stock à 0 : l’article est affiché « Rupture » (renseigner le prix dans l’administration pour le remettre en vente)
const enRupture = (p: Produit) => (p.stock != null && p.stock <= 0) || !(Number(p.prix) > 0)
const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
const prix = (p: Produit) => { const f = formats(p).filter((x) => x.prix > 0); return f.length > 1 ? "dès " + euros(Math.min(...f.map((x) => x.prix))) : euros(Number(p.prix)) }
const lienMail = (email: string, p: Produit, format?: string) => `mailto:${email}?subject=${encodeURIComponent("Boutique : " + p.nom + (format ? " – " + format : "") + (enRupture(p) ? " (me prévenir au retour)" : ""))}`
const ancre = (p: Produit) => "article-" + p.id.slice(0, 8)

function Fiche({ p, email, accent, fermer }: { p: Produit; email: string; accent: string; fermer: () => void }) {
    React.useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") fermer() }
        window.addEventListener("keydown", h)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", h); document.body.style.overflow = o }
    }, [])
    const rupture = enRupture(p)
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={p.nom} onClick={fermer}
            style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,12,10,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#fbf7f0", color: "#1d1612", width: "min(860px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", fontFamily: sans }}>
                <button onClick={fermer} aria-label="Fermer" style={{ all: "unset", cursor: "pointer", position: "absolute", top: 8, right: 12, fontSize: 30, lineHeight: 1, color: "#1d1612", background: "rgba(251,247,240,.85)", padding: "2px 8px", zIndex: 1 }}>×</button>
                {p.image_url ? <img src={p.image_url} alt={p.nom} style={{ width: "100%", height: "100%", minHeight: 260, maxHeight: 520, objectFit: "cover", display: "block" }} />
                    : <div style={{ minHeight: 260, background: "rgba(29,22,18,0.06)" }} />}
                <div style={{ padding: "28px 28px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {p.categorie && <span style={{ font: `600 11px ${sans}`, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b7a4a" }}>{p.categorie}</span>}
                    <h3 style={{ font: `600 28px/1.15 ${serif}`, margin: 0 }}>{p.nom}</h3>
                    {rupture ? <span style={{ font: `600 18px ${sans}`, color: "#9a3b2a" }}>Rupture</span> : <span style={{ font: `600 20px ${sans}` }}>{prix(p)}</span>}
                    {p.description && <p style={{ font: `400 15px/1.65 ${sans}`, color: "#3a3027", margin: 0 }}>{p.description}</p>}
                    {!rupture && formats(p).length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(29,22,18,0.12)" }}>
                            {formats(p).map((f) => (
                                <div key={f.nom} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(29,22,18,0.12)" }}>
                                    <span style={{ flex: 1, fontSize: 15 }}>{f.nom}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15 }}>{f.prix > 0 ? euros(f.prix) : ""}</span>
                                    <a href={lienMail(email, p, f.nom)} style={{ font: `600 14px ${sans}`, color: accent, textDecoration: "none" }}>Réserver →</a>
                                </div>
                            ))}
                        </div>
                    )}
                    {(rupture || formats(p).length === 0) && <a href={lienMail(email, p)} style={{ marginTop: "auto", alignSelf: "flex-start", background: accent, color: "#fbf7f0", font: `600 15px ${sans}`, padding: "13px 22px", textDecoration: "none" }}>{rupture ? "Être prévenu du retour" : "Réserver par e-mail"}</a>}
                    <span style={{ fontSize: 13, color: "#5e5247" }}>Retrait au stand de l’association pendant le salon de Bédée ou lors d’une sortie.</span>
                </div>
            </div>
        </div>,
        document.body
    )
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BoutiqueLive(props: { email: string; accent: string; nombre?: number; sombre?: boolean }) {
    const [liste, setListe] = React.useState<Produit[] | null>(null)
    const [ouvert, setOuvert] = React.useState<Produit | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return setListe([])
        const q = c.from("produits").select("*").eq("actif", true).order("ordre").order("nom")
        ;(props.nombre ? q.limit(props.nombre) : q).then(({ data }: any) => setListe(data ?? []))
    }, [props.nombre])
    // ouvrir la fiche si l’adresse contient #article-…
    React.useEffect(() => {
        if (!liste) return
        const lire = () => { const h = window.location.hash.slice(1); setOuvert(liste.find((p) => ancre(p) === h) || null) }
        lire(); window.addEventListener("hashchange", lire)
        return () => window.removeEventListener("hashchange", lire)
    }, [liste])
    const ouvrir = (p: Produit) => { history.replaceState(null, "", "#" + ancre(p)); setOuvert(p) }
    const fermer = () => { history.replaceState(null, "", window.location.pathname + window.location.search); setOuvert(null) }

    const email = props.email || "asso-acs@laposte.net"
    const accent = props.accent || "#3f6b2c"
    const sombre = !!props.sombre
    const encre = sombre ? "#f6f0e6" : "#1d1612", texte = sombre ? "rgba(246,240,230,0.72)" : "#3a3027"

    if (liste === null) return <div style={{ width: "100%", minHeight: 200 }} />
    if (liste.length === 0) return <p style={{ font: `400 16px ${sans}`, color: texte, margin: 0 }}>Le catalogue est en cours de mise à jour. Écrivez-nous à {email} pour toute demande.</p>
    return (
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: sombre ? "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" : "repeat(auto-fill, minmax(min(100%, 190px), 1fr))", gap: sombre ? 28 : 16 }}>
            <style>{`.acs-carte{transition:box-shadow .2s,transform .2s}.acs-carte:hover{box-shadow:0 10px 28px rgba(29,22,18,.14);transform:translateY(-2px)}.acs-carte:focus-visible{outline:2px solid ${accent};outline-offset:2px}`}</style>
            {liste.map((p) => {
                const rupture = enRupture(p)
                return (
                    <div key={p.id} className="acs-carte" role="button" tabIndex={0} aria-label={`Voir la fiche : ${p.nom}`}
                        onClick={() => ouvrir(p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(p) } }}
                        style={{ cursor: "pointer", background: sombre ? "transparent" : "#fbf7f0", border: sombre ? "none" : "1px solid rgba(29,22,18,0.12)", padding: sombre ? 0 : 18, display: "flex", flexDirection: "column", gap: 10 }}>
                        {p.image_url ? <img {...imgLeger(p.image_url)} alt="" loading="lazy" style={{ width: "100%", height: sombre ? 240 : 170, objectFit: "cover", display: "block" }} />
                            : <div style={{ width: "100%", height: sombre ? 240 : 170, background: sombre ? "rgba(246,240,230,0.06)" : "rgba(29,22,18,0.06)" }} />}
                        {p.categorie && <span style={{ font: `600 11px ${sans}`, letterSpacing: "0.1em", textTransform: "uppercase", color: sombre ? "#b9d4a8" : "#5b7a4a" }}>{p.categorie}</span>}
                        <h3 style={{ font: `600 20px/1.2 ${serif}`, color: encre, margin: 0 }}>{p.nom}</h3>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
                            {rupture ? <span style={{ font: `600 15px ${sans}`, color: sombre ? "#e0a08f" : "#9a3b2a" }}>Rupture</span> : <span style={{ font: `600 16px ${sans}`, color: encre }}>{prix(p)}</span>}
                            <span style={{ font: `600 14px ${sans}`, color: sombre ? "#b9d4a8" : accent }}>Voir →</span>
                        </div>
                    </div>
                )
            })}
            {ouvert && typeof document !== "undefined" && <Fiche p={ouvert} email={email} accent={accent} fermer={fermer} />}
        </div>
    )
}
BoutiqueLive.defaultProps = { email: "asso-acs@laposte.net", accent: "#3f6b2c", nombre: 0, sombre: false }
addPropertyControls(BoutiqueLive, {
    email: { type: ControlType.String, title: "E-mail", defaultValue: "asso-acs@laposte.net" },
    accent: { type: ControlType.Color, title: "Lien", defaultValue: "#3f6b2c" },
    nombre: { type: ControlType.Number, title: "Nombre max", defaultValue: 0, min: 0, step: 1, displayStepper: true },
    sombre: { type: ControlType.Boolean, title: "Fond sombre", defaultValue: false },
})
