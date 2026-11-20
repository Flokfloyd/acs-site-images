// BoutiqueLive.tsx — catalogue de la boutique, alimenté par les administrateurs (onglet Boutique de l’administration)
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

type Produit = { id: string; nom: string; categorie?: string; prix: number; description?: string; image_url?: string; stock?: number | null }

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BoutiqueLive(props: { email: string; accent: string }) {
    const [liste, setListe] = React.useState<Produit[] | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return setListe([])
        c.from("produits").select("*").eq("actif", true).order("ordre").order("nom").then(({ data }: any) => setListe(data ?? []))
    }, [])
    const email = props.email || "asso-acs@laposte.net"
    const encre = "#1d1612", texte = "#3a3027"
    const prix = (p: Produit) => (Number(p.prix) > 0 ? Number(p.prix).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) : "Prix sur demande")

    if (liste === null) return <div style={{ width: "100%", minHeight: 200 }} />
    if (liste.length === 0) return <p style={{ font: "400 16px Poppins, sans-serif", color: texte, margin: 0 }}>Le catalogue est en cours de mise à jour. Écrivez-nous à {email} pour toute demande.</p>
    return (
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
            {liste.map((p) => {
                const epuise = p.stock != null && p.stock <= 0
                return (
                    <div key={p.id} style={{ background: "#fbf7f0", border: "1px solid rgba(29,22,18,0.12)", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                        {p.image_url ? <img src={p.image_url} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: 170, background: "rgba(29,22,18,0.06)" }} />}
                        {p.categorie && <span style={{ font: "600 11px Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5b7a4a" }}>{p.categorie}</span>}
                        <h3 style={{ font: "600 22px/1.2 Fraunces, serif", color: encre, margin: 0 }}>{p.nom}</h3>
                        {p.description && <p style={{ font: "400 15px/1.6 Poppins, sans-serif", color: texte, margin: 0, flex: 1 }}>{p.description}</p>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
                            <span style={{ font: "600 16px Poppins, sans-serif", color: encre }}>{prix(p)}</span>
                            {epuise ? <span style={{ font: "500 13px Poppins, sans-serif", color: "#9a3b2a" }}>Épuisé</span>
                                : <a href={`mailto:${email}?subject=${encodeURIComponent("Boutique : " + p.nom)}`} style={{ font: "600 14px Poppins, sans-serif", color: props.accent || "#3f6b2c", textDecoration: "none" }}>Réserver par e-mail →</a>}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
BoutiqueLive.defaultProps = { email: "asso-acs@laposte.net", accent: "#3f6b2c" }
addPropertyControls(BoutiqueLive, {
    email: { type: ControlType.String, title: "E-mail", defaultValue: "asso-acs@laposte.net" },
    accent: { type: ControlType.Color, title: "Lien", defaultValue: "#3f6b2c" },
})
