// ExposantsSalon.tsx — liste des exposants du salon
// Quand la liste d'une édition est publiée dans l'administration (onglet Salon), elle est construite
// à partir des demandes acceptées. Sinon, on garde la liste du dépliant 2026 ci-dessous.
// Les numéros sont ceux des stands sur le plan du dépliant.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"
import { createPortal } from "react-dom"
const ORDRE_ZONES = ["Petite salle", "Entre les salles", "Grande salle", "Terrain de sport"]

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
        { n: "21", nom: "A.C.S., organisateur du salon", spe: "Adhésion, conseils, plantes et substrat", type: "asso" },
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

function useListe(): { edition: number; zones: typeof ZONES } {
    const [v, setV] = React.useState({ edition: 2026, zones: ZONES })
    React.useEffect(() => {
        const client = sb()
        if (!client) return
        client.rpc("exposants_salon").then(({ data, error }: any) => {
            if (error || !data?.length) return
            const zones = [...ORDRE_ZONES, ...new Set<string>(data.map((d: any) => d.zone).filter((z: string) => !ORDRE_ZONES.includes(z)))]
                .map((z) => ({ titre: z, liste: data.filter((d: any) => d.zone === z).map((d: any, i: number) => ({ n: d.stand || "", nom: d.nom, dep: d.profil === "Professionnel" ? d.dep || undefined : undefined, spe: d.categorie, type: d.profil === "Amateur" ? ("amateur" as const) : undefined, cle: z + i })) }))
                .filter((z) => z.liste.length)
            setV({ edition: data[0].edition, zones })
        })
    }, [])
    return v
}

// Fiches producteurs (gérées dans l'administration, onglet Salon > Fiches producteurs), retrouvées par le nom
type Fiche = { nom: string; specialites?: string; ville?: string; departement?: string; presentation?: string; site_web?: string; photo_url?: string }
const cle = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
function useFiches(): Map<string, Fiche> {
    const [m, setM] = React.useState(new Map<string, Fiche>())
    React.useEffect(() => {
        sb()?.from("producteurs").select("nom,specialites,ville,departement,presentation,site_web,photo_url").then(({ data }: any) => setM(new Map((data ?? []).map((f: Fiche) => [cle(f.nom), f]))))
    }, [])
    return m
}

function FicheProducteur({ f, c, fermer }: { f: Fiche; c: any; fermer: () => void }) {
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => e.key === "Escape" && fermer()
        window.addEventListener("keydown", k)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o }
    }, [])
    const lien = f.site_web ? (/^https?:\/\//.test(f.site_web) ? f.site_web : "https://" + f.site_web) : null
    return createPortal(
        <div onClick={fermer} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,8,6,0.72)", overflowY: "auto", padding: "40px 16px", fontFamily: "Poppins, sans-serif" }}>
            <div role="dialog" aria-label={f.nom} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, margin: "0 auto", background: c.bg, color: c.txt, border: `1px solid ${c.line}` }}>
                {f.photo_url && <img src={f.photo_url} alt="" style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "cover" }} />}
                <div style={{ padding: "22px clamp(18px, 4vw, 30px) 28px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, lineHeight: 1.2, margin: 0, fontWeight: 600 }}>{f.nom}</h3>
                        <button onClick={fermer} aria-label="Fermer" style={{ flex: "0 0 auto", width: 36, height: 36, background: "transparent", border: `1px solid ${c.line}`, color: c.txt, cursor: "pointer", fontSize: 18 }}>×</button>
                    </div>
                    {(f.specialites || f.ville || f.departement) && <p style={{ margin: "6px 0 0", color: c.mut, fontSize: 14.5 }}>{[f.specialites, [f.ville, f.departement ? `(${f.departement})` : ""].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</p>}
                    {f.presentation && <div style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.65 }}>{f.presentation.split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: "0 0 12px", whiteSpace: "pre-line" }}>{p}</p>)}</div>}
                    {lien && <a href={lien} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 8, color: c.badge, fontWeight: 600, textDecoration: "none" }}>Voir son site →</a>}
                </div>
            </div>
        </div>,
        document.body,
    )
}

export default function ExposantsSalon(props: { clair: boolean }) {
    const { edition, zones } = useListe()
    const fiches = useFiches()
    const [ouverte, setOuverte] = React.useState<Fiche | null>(null)
    const total = zones.reduce((a, z) => a + z.liste.length, 0)
    const c = props.clair
        ? { bg: "#fbf7f0", line: "rgba(29,22,18,0.14)", txt: "#1d1612", mut: "#5e5247", badge: "#3f6b2c", badgeTxt: "#fbf7f0" }
        : { bg: "#241c17", line: "rgba(246,240,230,0.16)", txt: "#f6f0e6", mut: "#b9ab98", badge: "#9bbd8a", badgeTxt: "#1d1612" }
    return (
        <div style={{ width: "100%", fontFamily: "Poppins, sans-serif", color: c.txt }}>
            <p style={{ margin: "0 0 22px", fontSize: 15, fontWeight: 600, color: c.badge }}>Salon {edition} · {total} exposants{edition === 2026 ? " · la liste 2027 sera publiée au printemps" : ""}</p>
            {zones.map((z, iz) => (
                <div key={z.titre} style={{ marginTop: iz === 0 ? 0 : 28 }}>
                    <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>{z.titre}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                        {z.liste.map((e: any, ie: number) => (
                            <div key={e.cle || e.n || ie} role={fiches.has(cle(e.nom)) ? "button" : undefined} tabIndex={fiches.has(cle(e.nom)) ? 0 : undefined}
                                onClick={() => { const f = fiches.get(cle(e.nom)); if (f) setOuverte(f) }} onKeyDown={(k) => { const f = fiches.get(cle(e.nom)); if (f && (k.key === "Enter" || k.key === " ")) { k.preventDefault(); setOuverte(f) } }}
                                style={{ background: c.bg, border: `1px solid ${fiches.has(cle(e.nom)) ? c.badge : c.line}`, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start", height: 112, boxSizing: "border-box", overflow: "hidden", cursor: fiches.has(cle(e.nom)) ? "pointer" : "default", position: "relative" }}>
                                {fiches.has(cle(e.nom)) && <span style={{ position: "absolute", right: 10, bottom: 8, fontSize: 12.5, fontWeight: 600, color: c.badge }}>Fiche →</span>}
                                <span style={{ flex: "0 0 auto", minWidth: 34, height: 34, background: e.type === "amateur" ? "transparent" : c.badge, border: `1.5px solid ${c.badge}`, boxSizing: "border-box", color: e.type === "amateur" ? c.badge : c.badgeTxt, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }} title={"Stand n°" + e.n}>{e.n}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.nom}{e.dep ? <span style={{ fontWeight: 400, color: c.mut }}> ({e.dep})</span> : null}</div>
                                    <div style={{ fontSize: 14, lineHeight: 1.45, color: c.mut, marginTop: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.type === "asso" ? "Association · " : e.type === "amateur" ? "Amateur · " : ""}{e.spe}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {ouverte && <FicheProducteur f={ouverte} c={c} fermer={() => setOuverte(null)} />}
        </div>
    )
}

ExposantsSalon.defaultProps = { clair: true }
addPropertyControls(ExposantsSalon, { clair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: true } })
