// ExposantsSalon.tsx — liste des exposants du salon (édition 2026, d'après le dépliant)
// Les numéros sont ceux des stands sur le plan. Les amateurs ne sont pas nommés.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Exp = { n: string; nom: string; dep?: string; spe: string; type?: "asso" }
const EXPOSANTS: Exp[] = [
    { n: "4", nom: "La Canopée des Orchidées", dep: "29", spe: "Orchidées" },
    { n: "5", nom: "Brendel Succulentes", dep: "71", spe: "Succulentes" },
    { n: "6", nom: "Les Murets du Causse", dep: "46", spe: "Cactées et succulentes" },
    { n: "7", nom: "Les Tillandsias", dep: "76", spe: "Tillandsias" },
    { n: "8", nom: "Cactuseraie de Creisméas", dep: "29", spe: "Cactées et succulentes, aloès" },
    { n: "10", nom: "Plant X Me", spe: "Plantes tropicales" },
    { n: "11", nom: "Couleur Succulentes", dep: "22", spe: "Cactées et succulentes" },
    { n: "13", nom: "Décorateur Végétal", dep: "44", spe: "Succulentes et poterie" },
    { n: "14", nom: "Desertica", dep: "72", spe: "Cactées, succulentes et yuccas" },
    { n: "15", nom: "Vitaloe Concept", dep: "35", spe: "Produits à base d’aloès" },
    { n: "17", nom: "AFABEGO", spe: "Bégonias de collection", type: "asso" },
    { n: "18", nom: "Les Succulentes de Locqui", dep: "22", spe: "Haworthias, aeoniums et succulentes" },
    { n: "19", nom: "Dionée", spe: "Plantes carnivores", type: "asso" },
    { n: "20", nom: "Fleurs et Ânes d’Armor", dep: "22", spe: "Plantes carnivores" },
    { n: "21", nom: "A.C.S., l’association organisatrice", spe: "Adhésion et conseils, cactus et succulentes, gravier, engrais et substrat", type: "asso" },
    { n: "26", nom: "Sylvestre Agrume", dep: "29", spe: "Plants d’agrumes" },
    { n: "27", nom: "Les Serres d’Antoine", dep: "08", spe: "Cactées, agaves et aloès" },
    { n: "28", nom: "Cactus Sylvestre", dep: "49", spe: "Cactées et succulentes" },
    { n: "29", nom: "Pépinières de Penhoadic", dep: "29", spe: "Vivaces, fougères et graminées" },
    { n: "31", nom: "Exotik Trégor", dep: "22", spe: "Aloès, euphorbes, agaves et cactées" },
    { n: "32", nom: "Les Succulentes de Perséphone", dep: "22", spe: "Succulentes et aeoniums" },
    { n: "33", nom: "Succu’Land", dep: "35", spe: "Succulentes" },
    { n: "34", nom: "Le Jardin de Lesgall", dep: "29", spe: "Plantes à caudex" },
    { n: "36", nom: "Fuchsia Delhommeau", dep: "44", spe: "Fuchsias, pélargoniums et géraniums" },
    { n: "37", nom: "Bonsaï Club La Vaunoise", spe: "Amateurs de bonsaïs", type: "asso" },
    { n: "38", nom: "Ferme botanique de Kerveat", dep: "29", spe: "Aeoniums" },
]
const AMATEURS = "Et 12 collectionneurs amateurs : cactées et succulentes, gasterias et haworthias, bonsaïs, palmiers, frangipaniers et plantes rares de La Réunion."

export default function ExposantsSalon(props: { clair: boolean }) {
    const c = props.clair
        ? { bg: "#fbf7f0", line: "rgba(29,22,18,0.14)", txt: "#1d1612", mut: "#5e5247", badge: "#3f6b2c", badgeTxt: "#fbf7f0" }
        : { bg: "#241c17", line: "rgba(246,240,230,0.16)", txt: "#f6f0e6", mut: "#b9ab98", badge: "#9bbd8a", badgeTxt: "#1d1612" }
    return (
        <div style={{ width: "100%", fontFamily: "Poppins, sans-serif", color: c.txt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                {EXPOSANTS.map((e) => (
                    <div key={e.n} style={{ background: c.bg, border: `1px solid ${c.line}`, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span style={{ flex: "0 0 auto", minWidth: 34, height: 34, borderRadius: 0, background: c.badge, color: c.badgeTxt, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }} title={"Stand n°" + e.n}>{e.n}</span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{e.nom}{e.dep ? <span style={{ fontWeight: 400, color: c.mut }}> ({e.dep})</span> : null}</div>
                            <div style={{ fontSize: 14, lineHeight: 1.45, color: c.mut, marginTop: 3 }}>{e.type === "asso" ? "Association · " : ""}{e.spe}</div>
                        </div>
                    </div>
                ))}
            </div>
            <p style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.55, color: c.mut }}>{AMATEURS}</p>
        </div>
    )
}

ExposantsSalon.defaultProps = { clair: true }
addPropertyControls(ExposantsSalon, { clair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: true } })
