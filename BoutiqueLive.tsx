// BoutiqueLive.tsx — catalogue de la boutique, alimenté par les administrateurs (onglet Boutique de l’administration)
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

type Produit = { id: string; nom: string; categorie?: string; prix: number; description?: string; image_url?: string; stock?: number | null }

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BoutiqueLive(props: { email: string; accent: string; nombre?: number; sombre?: boolean }) {
    const [liste, setListe] = React.useState<Produit[] | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return setListe([])
        const q = c.from("produits").select("*").eq("actif", true).order("ordre").order("nom")
        ;(props.nombre ? q.limit(props.nombre) : q).then(({ data }: any) => setListe(data ?? []))
    }, [props.nombre])
    const email = props.email || "asso-acs@laposte.net"
    const sombre = !!props.sombre
    const encre = sombre ? "#f6f0e6" : "#1d1612", texte = sombre ? "rgba(246,240,230,0.72)" : "#3a3027"
    // sans prix ou stock à 0 : l’article est affiché « Rupture » (renseigner le prix dans l’administration pour le remettre en vente)
    const prix = (p: Produit) => Number(p.prix).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

    if (liste === null) return <div style={{ width: "100%", minHeight: 200 }} />
    if (liste.length === 0) return <p style={{ font: "400 16px Poppins, sans-serif", color: texte, margin: 0 }}>Le catalogue est en cours de mise à jour. Écrivez-nous à {email} pour toute demande.</p>
    return (
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: sombre ? "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" : "repeat(auto-fill, minmax(min(100%, 190px), 1fr))", gap: sombre ? 28 : 16 }}>
            {liste.map((p) => {
                const epuise = (p.stock != null && p.stock <= 0) || !(Number(p.prix) > 0)
                return (
                    <div key={p.id} style={{ background: sombre ? "transparent" : "#fbf7f0", border: sombre ? "none" : "1px solid rgba(29,22,18,0.12)", padding: sombre ? 0 : 24, display: "flex", flexDirection: "column", gap: 12 }}>
                        {p.image_url ? <img src={p.image_url} alt="" loading="lazy" style={{ width: "100%", height: sombre ? 240 : 170, objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: sombre ? 240 : 170, background: sombre ? "rgba(246,240,230,0.06)" : "rgba(29,22,18,0.06)" }} />}
                        {p.categorie && <span style={{ font: "600 11px Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: sombre ? "#b9d4a8" : "#5b7a4a" }}>{p.categorie}</span>}
                        <h3 style={{ font: "600 22px/1.2 Fraunces, serif", color: encre, margin: 0 }}>{p.nom}</h3>
                        {p.description && <p style={{ font: "400 15px/1.6 Poppins, sans-serif", color: texte, margin: 0, flex: 1 }}>{p.description}</p>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
                            {epuise ? <span style={{ font: "600 16px Poppins, sans-serif", color: sombre ? "#e0a08f" : "#9a3b2a" }}>Rupture</span> : <span style={{ font: "600 16px Poppins, sans-serif", color: encre }}>{prix(p)}</span>}
                            {epuise ? <a href={`mailto:${email}?subject=${encodeURIComponent("Boutique : " + p.nom + " (me prévenir au retour)")}`} style={{ font: "600 14px Poppins, sans-serif", color: sombre ? "#b9d4a8" : props.accent || "#3f6b2c", textDecoration: "none" }}>Être prévenu →</a>
                                : <a href={`mailto:${email}?subject=${encodeURIComponent("Boutique : " + p.nom)}`} style={{ font: "600 14px Poppins, sans-serif", color: sombre ? "#b9d4a8" : props.accent || "#3f6b2c", textDecoration: "none" }}>Réserver par e-mail →</a>}
                        </div>
                    </div>
                )
            })}
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
