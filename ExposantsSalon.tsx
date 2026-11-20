// ExposantsSalon.tsx — liste des exposants du salon (édition 2026, d'après le dépliant)
// Les numéros sont ceux des stands sur le plan du dépliant.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Exp = { n: string; nom: string; dep?: string; spe: string; type?: "asso" | "amateur" }
// Liste du dépliant 2026, par zone. Les amateurs sont nommés comme dans le dépliant (prénom et initiale).
const ZONES: { titre: string; liste: Exp[] }[] = [
    { titre: "Petite salle", liste: [
        { n: "1", nom: "Ludovic L.", spe: "Cactées et succulentes", type: "amateur" },
        { n: "2", nom: "Jean-Claude et Mireille R.", spe: "Cactées et succulentes", type: "amateur" },
        { n: "3", nom: "Patrick B.", spe: "Cactées", type: "amateur" },
        { n: "4", nom: "La Canopée des Orchidées", dep: "29", spe: "Orchidées" },
    ] },
    { titre: "Entre les salles", liste: [
        { n: "5", nom: "Brendel Succulentes", dep: "71", spe: "Succulentes" },
        { n: "6", nom: "Les Murets de Causse", dep: "46", spe: "Cactées et succulentes" },
    ] },
    { titre: "Grande salle", liste: [
        { n: "7", nom: "Les Tillandsias", dep: "76", spe: "Tillandsias" },
        { n: "8", nom: "Cactuseraie de Creisméas", dep: "29", spe: "Cactées et succulentes, aloès" },
        { n: "9", nom: "Alain J.", spe: "Plantes rares de La Réunion", type: "amateur" },
        { n: "10", nom: "Plant X Me", spe: "Plantes tropicales" },
        { n: "11", nom: "Couleur Succulentes", dep: "22", spe: "Cactées et succulentes" },
        { n: "12", nom: "David D.", spe: "Bonsaïs", type: "amateur" },
        { n: "13", nom: "Décorateur Végétal", dep: "44", spe: "Succulentes et poterie" },
        { n: "14", nom: "Desertica", dep: "72", spe: "Cactées, succulentes et yuccas" },
        { n: "15", nom: "Vitaloe Concept", dep: "35", spe: "Produits à base d’aloès" },
        { n: "16", nom: "Matthias B.", spe: "Gasterias et haworthias", type: "amateur" },
        { n: "17", nom: "AFABEGO", spe: "Bégonias de collection", type: "asso" },
        { n: "18", nom: "Les Succulentes de Locqui", dep: "22", spe: "Haworthias, aeoniums et succulentes" },
        { n: "19", nom: "Dionée", spe: "Plantes carnivores", type: "asso" },
        { n: "20", nom: "Fleurs et Ânes d’Armor", dep: "22", spe: "Plantes carnivores" },
        { n: "21", nom: "A.C.S., l’association organisatrice", spe: "Adhésion et conseils, cactus et succulentes, gravier, engrais et substrat", type: "asso" },
    ] },
    { titre: "Terrain de sport", liste: [
        { n: "22", nom: "Éric M.", spe: "Cactées, aloès", type: "amateur" },
        { n: "23", nom: "Pascal G.", spe: "Frangipaniers", type: "amateur" },
        { n: "24", nom: "Fabrice P.", spe: "Cactées et succulentes", type: "amateur" },
        { n: "25", nom: "Frédéric J.", spe: "Cactées et succulentes", type: "amateur" },
        { n: "26", nom: "Sylvestre Agrume", dep: "29", spe: "Plants d’agrumes" },
        { n: "27", nom: "Les Serres d’Antoine", dep: "08", spe: "Cactées, agaves et aloès" },
        { n: "28", nom: "Cactus Sylvestre", dep: "49", spe: "Cactées et succulentes" },
        { n: "29", nom: "Pépinières de Penhoadic", dep: "29", spe: "Vivaces, fougères et graminées" },
        { n: "30", nom: "Georges G.", spe: "Palmiers", type: "amateur" },
        { n: "31", nom: "Exotik Trégor", dep: "22", spe: "Aloès, euphorbes, agaves et cactées" },
        { n: "32", nom: "Les Succulentes de Perséphone", dep: "22", spe: "Succulentes et aeoniums" },
        { n: "33", nom: "Succu’Land", dep: "35", spe: "Succulentes" },
        { n: "34", nom: "Le Jardin de Lesgall", dep: "29", spe: "Plantes à caudex" },
        { n: "35", nom: "Jérôme B.", spe: "Cactées et succulentes", type: "amateur" },
        { n: "36", nom: "Fuchsia Delhommeau", dep: "44", spe: "Fuchsias, pélargoniums et géraniums" },
        { n: "37", nom: "Bonsaï Club La Vaunoise", spe: "Amateurs de bonsaïs", type: "asso" },
        { n: "38", nom: "Ferme botanique de Kerveat", dep: "29", spe: "Aeoniums" },
    ] },
]

export default function ExposantsSalon(props: { clair: boolean }) {
    const c = props.clair
        ? { bg: "#fbf7f0", line: "rgba(29,22,18,0.14)", txt: "#1d1612", mut: "#5e5247", badge: "#3f6b2c", badgeTxt: "#fbf7f0" }
        : { bg: "#241c17", line: "rgba(246,240,230,0.16)", txt: "#f6f0e6", mut: "#b9ab98", badge: "#9bbd8a", badgeTxt: "#1d1612" }
    return (
        <div style={{ width: "100%", fontFamily: "Poppins, sans-serif", color: c.txt }}>
            {ZONES.map((z) => (
                <div key={z.titre} style={{ marginTop: z.titre === "Petite salle" ? 0 : 28 }}>
                    <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>{z.titre}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                        {z.liste.map((e) => (
                            <div key={e.n} style={{ background: c.bg, border: `1px solid ${c.line}`, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                                <span style={{ flex: "0 0 auto", minWidth: 34, height: 34, background: e.type === "amateur" ? "transparent" : c.badge, border: `1.5px solid ${c.badge}`, boxSizing: "border-box", color: e.type === "amateur" ? c.badge : c.badgeTxt, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }} title={"Stand n°" + e.n}>{e.n}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{e.nom}{e.dep ? <span style={{ fontWeight: 400, color: c.mut }}> ({e.dep})</span> : null}</div>
                                    <div style={{ fontSize: 14, lineHeight: 1.45, color: c.mut, marginTop: 3 }}>{e.type === "asso" ? "Association · " : e.type === "amateur" ? "Amateur · " : ""}{e.spe}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

ExposantsSalon.defaultProps = { clair: true }
addPropertyControls(ExposantsSalon, { clair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: true } })
