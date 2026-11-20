import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Contour simplifié de la Bretagne historique (5 départements), en longitude / latitude.
// Tracé à la main à partir des points remarquables de la côte et de la limite terrestre.
const CONTOUR: [number, number][] = [
    [-1.51, 48.63], [-1.85, 48.68], [-1.84, 48.71], [-2.02, 48.65], [-2.06, 48.62], [-2.2, 48.6], [-2.26, 48.64],
    [-2.32, 48.68], [-2.47, 48.64], [-2.55, 48.59], [-2.73, 48.53], [-2.82, 48.6], [-2.83, 48.66], [-3.04, 48.78],
    [-3.01, 48.83], [-3.17, 48.86], [-3.44, 48.83], [-3.51, 48.84], [-3.57, 48.77], [-3.64, 48.69], [-3.83, 48.68],
    [-3.98, 48.73], [-4.17, 48.68], [-4.33, 48.68], [-4.57, 48.61], [-4.71, 48.57], [-4.77, 48.45], [-4.77, 48.36],
    [-4.62, 48.36], [-4.49, 48.39], [-4.41, 48.4], [-4.34, 48.36], [-4.22, 48.3], [-4.33, 48.28], [-4.46, 48.3], [-4.56, 48.33],
    [-4.6, 48.28], [-4.63, 48.25], [-4.5, 48.22], [-4.55, 48.17], [-4.38, 48.21], [-4.3, 48.15], [-4.33, 48.09],
    [-4.56, 48.1], [-4.71, 48.06], [-4.74, 48.04], [-4.54, 48.01], [-4.42, 47.93], [-4.37, 47.8], [-4.17, 47.83],
    [-4.11, 47.87], [-3.98, 47.86], [-3.92, 47.87], [-3.85, 47.79], [-3.55, 47.77], [-3.37, 47.7], [-3.21, 47.65],
    [-3.13, 47.58], [-3.11, 47.48], [-3.08, 47.56], [-3.03, 47.58], [-2.95, 47.56], [-2.92, 47.55], [-2.89, 47.51],
    [-2.85, 47.5], [-2.69, 47.5], [-2.58, 47.51], [-2.48, 47.5], [-2.48, 47.45], [-2.46, 47.4], [-2.51, 47.34],
    [-2.55, 47.29], [-2.43, 47.27], [-2.35, 47.26], [-2.2, 47.27], [-2.17, 47.23], [-2.24, 47.14], [-2.1, 47.11],
    [-1.95, 47.04], [-2.0, 46.98], [-1.82, 46.97], [-1.6, 46.89], [-1.5, 46.93], [-1.31, 46.97], [-1.24, 47.05],
    [-1.18, 47.13], [-1.1, 47.25], [-0.95, 47.36], [-1.04, 47.5], [-1.17, 47.62], [-1.22, 47.74], [-1.1, 47.85],
    [-1.1, 47.97], [-1.03, 48.1], [-1.07, 48.3], [-1.12, 48.48], [-1.25, 48.52], [-1.4, 48.55], [-1.51, 48.63],
]

const BEDEE: [number, number] = [-1.95, 48.18]

// Villes proches : nom, position, distance et temps indicatifs en voiture depuis Bédée.
const VILLES: { nom: string; p: [number, number]; km: string; t: string; ancre?: "g" | "d" }[] = [
    { nom: "Rennes", p: [-1.68, 48.11], km: "27 km", t: "25 min", ancre: "d" },
    { nom: "Saint-Malo", p: [-2.0, 48.65], km: "70 km", t: "50 min", ancre: "d" },
    { nom: "Saint-Brieuc", p: [-2.76, 48.51], km: "80 km", t: "55 min", ancre: "g" },
    { nom: "Vannes", p: [-2.76, 47.66], km: "110 km", t: "1 h 20", ancre: "d" },
    { nom: "Nantes", p: [-1.55, 47.22], km: "130 km", t: "1 h 25", ancre: "d" },
    { nom: "Lorient", p: [-3.37, 47.75], km: "150 km", t: "1 h 40", ancre: "g" },
    { nom: "Quimper", p: [-4.1, 48.0], km: "200 km", t: "2 h 10", ancre: "d" },
    { nom: "Brest", p: [-4.49, 48.39], km: "225 km", t: "2 h 20", ancre: "d" },
]

const LON0 = -4.85, LAT1 = 48.92, K = Math.cos((48.1 * Math.PI) / 180)
const W = (-0.85 - LON0) * K * 100, H = (LAT1 - 46.84) * 100
const pt = ([lon, lat]: [number, number]) => [(lon - LON0) * K * 100, (LAT1 - lat) * 100]
// Lissage de Chaikin (deux passes) pour adoucir le tracé
const lisse = (pts: number[][]) => {
    let a = pts.slice(0, -1)
    for (let n = 0; n < 2; n++) {
        const b: number[][] = []
        for (let i = 0; i < a.length; i++) {
            const p = a[i], q = a[(i + 1) % a.length]
            b.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]])
        }
        a = b
    }
    return a
}
const D = lisse(CONTOUR.map(pt)).map((c, i) => (i ? "L" : "M") + c.map((v) => v.toFixed(1)).join(" ")).join("") + "Z"

const serif = "'Fraunces', Georgia, serif"
const sans = "'Poppins', system-ui, sans-serif"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function CarteBretagne(props) {
    const { mode = "Carte du salon", trait = "#3f6b2c", remplissage = "rgba(155,189,138,0.18)", texte = "#1d1612", accent = "#b5543a" } = props
    const [bx, by] = pt(BEDEE)

    if (mode === "Silhouette") {
        return (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible" }} aria-hidden="true">
                    <path d={D} fill={remplissage} stroke={trait} strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <circle cx={bx} cy={by} r={9} fill="none" stroke={accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.7} />
                    <circle cx={bx} cy={by} r={4.5} fill={accent} />
                    <text x={bx + 13} y={by + 4.5} fontFamily={sans} fontSize={13} fontWeight={600} letterSpacing={1} fill={trait}>BÉDÉE</text>
                </svg>
            </div>
        )
    }

    return (
        <div style={{ width: "100%", fontFamily: sans, color: texte }}>
            <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} style={{ width: "100%", maxWidth: 680, height: "auto", display: "block", margin: "0 auto" }} role="img" aria-label="Carte de la Bretagne : le salon a lieu à Bédée, à l’ouest de Rennes">
                <path d={D} fill={remplissage} stroke={trait} strokeWidth={1.1} strokeLinejoin="round" />
                {VILLES.map((v) => {
                    const [x, y] = pt(v.p)
                    const g = v.ancre === "g"
                    return (
                        <g key={v.nom}>
                            <circle cx={x} cy={y} r={2.2} fill={texte} />
                            <text x={g ? x - 4.5 : x + 4.5} y={y + 2.6} textAnchor={g ? "end" : "start"} fontSize={7.5} fontFamily={sans} fill={texte}>{v.nom}</text>
                        </g>
                    )
                })}
                <circle cx={bx} cy={by} r={7.5} fill="none" stroke={accent} strokeWidth={1} opacity={0.6} />
                <circle cx={bx} cy={by} r={3.6} fill={accent} />
                <text x={bx - 6} y={by - 9} textAnchor="end" fontSize={9} fontWeight={700} fontFamily={sans} fill={accent}>Bédée · le salon</text>
            </svg>
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 1, background: "rgba(29,22,18,0.12)", border: "1px solid rgba(29,22,18,0.12)" }}>
                {VILLES.map((v) => (
                    <div key={v.nom} style={{ background: "#fbf7f0", padding: "10px 12px" }}>
                        <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 600 }}>{v.nom}</div>
                        <div style={{ fontSize: 13, opacity: 0.75 }}>{v.km} · {v.t}</div>
                    </div>
                ))}
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
                Distances et temps indicatifs en voiture depuis Bédée. Accès par la N12 (Rennes – Saint-Brieuc), sortie Bédée. En train : gare de Montfort-sur-Meu, à 5 km. En car : ligne BreizhGo 19 depuis la gare routière de Rennes.
            </p>
        </div>
    )
}

addPropertyControls(CarteBretagne, {
    mode: { type: ControlType.Enum, title: "Affichage", options: ["Carte du salon", "Silhouette"], defaultValue: "Carte du salon" },
    trait: { type: ControlType.Color, title: "Contour", defaultValue: "#3f6b2c" },
    remplissage: { type: ControlType.Color, title: "Fond", defaultValue: "rgba(155,189,138,0.18)" },
    texte: { type: ControlType.Color, title: "Texte", defaultValue: "#1d1612" },
    accent: { type: ControlType.Color, title: "Point Bédée", defaultValue: "#b5543a" },
})
