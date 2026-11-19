// AgendaLive.tsx — agenda public lu depuis la base (mis à jour par les admins)
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, C, font } from "./AcsBase.tsx"

type Evt = { id: string; date_label: string; date_debut: string | null; titre: string; lieu?: string; description?: string }

const SECOURS: Evt[] = [
    { id: "a", date_label: "Juin 2027", date_debut: "2027-06-01", titre: "Salon de l’A.C.S. à Bédée", description: "Date à confirmer · environ 40 exposants" },
    { id: "b", date_label: "À venir", date_debut: null, titre: "Prochaine assemblée générale et réunions", description: "Dates communiquées dans le semestriel" },
]

export default function AgendaLive(props: { max: number; colonnes: number }) {
    const [evts, setEvts] = React.useState<Evt[]>(SECOURS)
    React.useEffect(() => {
        const client = sb()
        if (!client) return
        const today = new Date().toISOString().slice(0, 10)
        client.from("evenements").select("id,date_label,date_debut,titre,lieu,description")
            .or(`date_debut.gte.${today},date_debut.is.null`)
            .order("date_debut", { ascending: true, nullsFirst: false })
            .limit(props.max)
            .then(({ data, error }) => { if (!error && data && data.length) setEvts(data as Evt[]) })
    }, [props.max])

    return (
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${props.colonnes > 1 ? 280 : 9999}px, 1fr))`, gap: 16, color: C.txt, ...font }}>
            {evts.map((e) => (
                <article key={e.id} style={{ background: C.panel, border: `1px solid ${C.line}`, padding: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent }}>{e.date_label}</span>
                    <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, fontWeight: 600 }}>{e.titre}</h3>
                    {(e.lieu || e.description) && <p style={{ margin: 0, color: C.mute }}>{[e.lieu, e.description].filter(Boolean).join(" · ")}</p>}
                </article>
            ))}
        </div>
    )
}

AgendaLive.defaultProps = { max: 6, colonnes: 2 }
addPropertyControls(AgendaLive, {
    max: { type: ControlType.Number, title: "Nombre max", min: 1, max: 20, step: 1, defaultValue: 6 },
    colonnes: { type: ControlType.Number, title: "Colonnes", min: 1, max: 2, step: 1, defaultValue: 2 },
})
