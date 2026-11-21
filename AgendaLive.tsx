// AgendaLive.tsx — agenda public de l'accueil, lu depuis la base (événements ajoutés par les admins)
// Les événements « réservés aux adhérents » n'apparaissent que pour un adhérent connecté (règle de la base).
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, C, font, serif } from "./AcsBase.tsx"

type Evt = { id: string; date_label?: string | null; date_debut: string | null; date_fin?: string | null; heure?: string | null; titre: string; lieu?: string | null; description?: string | null; reserve_membres?: boolean; inscription_ouverte?: boolean }

const SECOURS: Evt[] = [
    { id: "a", date_label: "12–13 juin 2027", date_debut: "2027-06-12", titre: "Salon de l’A.C.S. à Bédée", description: "Salle polyvalente de Bédée · environ 40 exposants · entrée gratuite" },
    { id: "b", date_label: "À venir", date_debut: null, titre: "Prochaine assemblée générale et réunions", description: "Dates communiquées dans le semestriel" },
]

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
function dateAffichee(e: Evt): string {
    if (e.date_label && e.date_label.trim()) return e.date_label
    if (!e.date_debut) return "À venir"
    const [a, m, j] = e.date_debut.split("-").map(Number)
    if (e.date_fin && e.date_fin !== e.date_debut) {
        const [a2, m2, j2] = e.date_fin.split("-").map(Number)
        if (a === a2 && m === m2) return `${j}–${j2} ${MOIS[m - 1]} ${a}`
        return `${j} ${MOIS[m - 1]}${a !== a2 ? " " + a : ""} – ${j2} ${MOIS[m2 - 1]} ${a2}`
    }
    return `${j} ${MOIS[m - 1]} ${a}`
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function AgendaLive(props: { max: number; lienMembre: string }) {
    const { max = 6, lienMembre = "/espace-membre#evenements" } = props
    const [evts, setEvts] = React.useState<Evt[]>(SECOURS)
    const ref = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(1000)
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth)
        return () => ro.disconnect()
    }, [])
    React.useEffect(() => {
        const client = sb()
        if (!client) return
        const auj = new Date().toISOString().slice(0, 10)
        client.from("evenements").select("*")
            .or(`date_debut.gte.${auj},date_fin.gte.${auj},date_debut.is.null`)
            .order("date_debut", { ascending: true, nullsFirst: false })
            .limit(max)
            .then(({ data, error }: any) => { if (!error && data && data.length) setEvts(data.filter((e: any) => e.publie !== false)) })
    }, [max])
    const etroit = w < 640
    return (
        <div ref={ref} style={{ width: "100%", minWidth: 0, contain: "inline-size", overflowWrap: "anywhere", color: C.txt, ...font }}>
            {evts.map((e) => (
                <div key={e.id} style={{ display: "flex", flexDirection: etroit ? "column" : "row", gap: etroit ? 6 : 32, padding: "26px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ flex: "none", width: etroit ? "auto" : 160, fontFamily: serif, fontSize: 22, lineHeight: 1.2, fontWeight: 600, color: C.accent }}>{dateAffichee(e)}</div>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <div style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.25, fontWeight: 600 }}>{e.titre}</div>
                        {(e.heure || e.lieu || e.description) && <div style={{ color: C.mute, marginTop: 6, fontSize: 15, lineHeight: 1.55 }}>{[e.heure, e.lieu, e.description].filter(Boolean).join(" · ")}</div>}
                        {(e.reserve_membres || e.inscription_ouverte) && (
                            <div style={{ marginTop: 8, fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap" }}>
                                {e.reserve_membres && <span style={{ color: C.mute }}>Réservé aux adhérents</span>}
                                {e.inscription_ouverte && <a href={lienMembre} style={{ color: C.accent }}>S’inscrire dans l’espace adhérents →</a>}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

addPropertyControls(AgendaLive, {
    max: { type: ControlType.Number, title: "Nombre max", min: 1, max: 20, step: 1, defaultValue: 6 },
    lienMembre: { type: ControlType.String, title: "Lien inscription", defaultValue: "/espace-membre#evenements" },
})
