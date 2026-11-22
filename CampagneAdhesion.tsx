// CampagneAdhesion.tsx — parties de la page Adhésion qui changent chaque année (année, tarif, lien de paiement).
// La campagne affichée est la plus récente dont la date d’ouverture est passée (table campagnes_adhesion,
// réglée dans l’administration › Adhésions et paiements). Sans la base, les valeurs de secours ci-dessous servent.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

type Campagne = { annee: number; ouverture: string; tarif: number; lien: string | null; message: string | null }
const SECOURS: Campagne[] = [
    { annee: 2026, ouverture: "2025-12-01", tarif: 20, lien: "https://www.armorique-cactus-succulentes.com/collect/choice/649064-n-campagne-d-adhesion-2026", message: null },
    { annee: 2027, ouverture: "2026-12-01", tarif: 20, lien: null, message: null },
]
const MAIL = "asso-acs@laposte.net"
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const choisir = (l: Campagne[]) => [...l].filter((c) => c.ouverture <= aujourdhui()).sort((a, b) => b.annee - a.annee)[0] ?? [...l].sort((a, b) => a.annee - b.annee)[0]

let cache: Promise<Campagne[]> | null = null
function useCampagne(): Campagne {
    const [c, setC] = React.useState<Campagne>(() => choisir(SECOURS))
    React.useEffect(() => {
        const client = sb()
        if (!client) return
        cache ??= Promise.race([
            client.from("campagnes_adhesion").select("annee, ouverture, tarif, lien, message").then(({ data, error }: any) => (error || !data?.length ? SECOURS : data)),
            new Promise<Campagne[]>((r) => setTimeout(() => r(SECOURS), 4000)),
        ])
        cache.then((l) => setC(choisir(l)))
    }, [])
    return c
}

const corps: React.CSSProperties = { fontFamily: "Poppins, sans-serif", fontSize: 16, lineHeight: 1.6, letterSpacing: "-0.02em", color: "#d8cdbb", margin: 0 }
const titre3: React.CSSProperties = { fontFamily: "Fraunces, Georgia, serif", fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.02em", fontWeight: 600, color: "#f6f0e6", margin: 0 }

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function CampagneAdhesion(props: { partie: "titre" | "formules" | "bouton" }) {
    const c = useCampagne()
    const partie = props.partie || "formules"

    if (partie === "titre")
        return <p style={{ fontFamily: "Poppins, sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", lineHeight: 1.2, textTransform: "uppercase", color: "rgb(185, 212, 168)", margin: 0 }}>Campagne d’adhésion {c.annee}</p>

    if (partie === "bouton") {
        if (c.lien)
            return <a href={c.lien} target="_blank" rel="noopener" style={{ display: "inline-block", background: "#9bbd8a", color: "rgb(22, 18, 15)", padding: "14px 26px", fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>J’adhère en ligne pour {c.annee}</a>
        return (
            <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
                <p style={corps}>L’adhésion en ligne pour {c.annee} ouvre très bientôt. En attendant, écrivez-nous : nous vous répondrons avec le lien ou les modalités par chèque.</p>
                <a href={`mailto:${MAIL}?subject=${encodeURIComponent(`Adhésion ${c.annee}`)}`} style={{ display: "inline-block", border: "1px solid #9bbd8a", color: "#f6f0e6", padding: "13px 25px", fontFamily: "Poppins, sans-serif", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>Nous écrire</a>
            </div>
        )
    }

    return (
        <div style={{ display: "grid", gap: 16, width: "100%" }}>
            <style>{`.acs-h2-adh{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:28px;line-height:1.1;letter-spacing:-0.01em;color:#f6f0e6;margin:0}
@media (min-width:810px){.acs-h2-adh{font-size:34px}}@media (min-width:1200px){.acs-h2-adh{font-size:40px}}`}</style>
            <h2 className="acs-h2-adh">Formules {c.annee}</h2>
            {c.message && <p style={{ ...corps, color: "#f6f0e6", borderLeft: "2px solid #9bbd8a", paddingLeft: 14 }}>{c.message}</p>}
            <h3 style={titre3}>Année complète pour un couple · {c.tarif} €</h3>
            <p style={corps}>Une seule cotisation pour le foyer, valable du 1er janvier au 31 décembre {c.annee}.</p>
            <h3 style={titre3}>Adhésion avec don · montant libre, à partir de {c.tarif} €</h3>
            <p style={corps}>Vous pouvez adhérer en faisant un don supérieur à la cotisation de {c.tarif} €. Vous recevrez un reçu fiscal vous permettant de déduire 66 % de votre don de vos impôts.</p>
        </div>
    )
}

addPropertyControls(CampagneAdhesion, {
    partie: { type: ControlType.Enum, title: "Partie", options: ["titre", "formules", "bouton"], optionTitles: ["Titre (année)", "Formules", "Bouton d’adhésion"], defaultValue: "formules" },
})
