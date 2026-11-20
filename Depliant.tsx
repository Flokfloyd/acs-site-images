// Depliant.tsx — le dépliant du salon, à déplier comme sur papier
// Trois volets roulés : couverture → volet « Le salon en chiffres » → intérieur complet → dos.
import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"

const BASE = "https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/5-depliant-2026/"
const img = (k: string) => BASE + k + ".jpg"
// Recto (page 1, de gauche à droite) : A volet rabattu, B dos, C couverture
// Verso (page 2) : D, E, F — l'intérieur ; C est derrière D, B derrière E, A derrière F
const RATIO = 280.63 / 595.28
const ETAPES = [
    { titre: "La couverture", vus: ["C"] },
    { titre: "Le salon en chiffres", vus: ["D", "A"] },
    { titre: "Les exposants et le plan", vus: ["D", "E", "F"] },
    { titre: "Au dos : adhérer à l’association", vus: ["B"] },
]
const NOMS: Record<string, string> = { C: "Couverture", D: "Intérieur, volet gauche", A: "Le salon en chiffres", E: "Intérieur, volet central", F: "Intérieur, volet droit", B: "Dos : adhérer" }
const FONT = "Poppins, sans-serif"

export default function Depliant(props: { hauteurMax: number; fondClair: boolean }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [W, setW] = React.useState(900)
    const [vh, setVh] = React.useState(900)
    const [etape, setEtape] = React.useState(0)
    const [loupe, setLoupe] = React.useState<number | null>(null)
    const [pret, setPret] = React.useState(false)
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(() => { setW(el.clientWidth); setVh(window.innerHeight) })
        ro.observe(el); setW(el.clientWidth); setVh(window.innerHeight); setPret(true)
        return () => ro.disconnect()
    }, [])
    React.useEffect(() => { [..."ABCDEF"].forEach((k) => { const i = new Image(); i.src = img(k) }) }, [])

    const coul = props.fondClair
        ? { txt: "#1d1612", mut: "#5e5247", line: "rgba(29,22,18,0.25)", acc: "#3f6b2c", accTxt: "#fbf7f0" }
        : { txt: "#f6f0e6", mut: "#d8cdbb", line: "rgba(246,240,230,0.35)", acc: "#9bbd8a", accTxt: "#1d1612" }

    // tailles : volet de base = 1/3 de la largeur, agrandi quand peu de volets sont visibles
    const pw0 = W / 3
    const ph0 = pw0 / RATIO
    const hMax = Math.min(props.hauteurMax || 760, vh * 0.78)
    const n = etape === 2 ? 3 : etape === 1 ? 2 : 1
    const echelle = Math.min(W / (n * pw0), hMax / ph0)
    const H = ph0 * echelle
    const decal = etape === 1 ? pw0 / 2 : 0 // recentre les deux volets visibles
    const ouvertCouv = etape === 1 || etape === 2
    const ouvertVolet = etape === 2
    const retourne = etape === 3

    const anim = "transform 950ms cubic-bezier(.62,.04,.24,1)"
    const face = (k: string, dos = false): React.CSSProperties => ({ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: dos ? "rotateY(180deg)" : "none", backgroundImage: `url(${img(k)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#3c4a3a" })
    const ombre = (actif: boolean, sens: "g" | "d"): React.CSSProperties => ({ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(${sens === "g" ? "90deg" : "270deg"}, rgba(0,0,0,0) 70%, rgba(0,0,0,0.22))`, opacity: actif ? 1 : 0, transition: "opacity 950ms" })

    const suivant = () => setEtape((e) => (e + 1) % 4)
    const precedent = () => setEtape((e) => (e + 3) % 4)
    const ordreLoupe = ["C", "A", "D", "E", "F", "B"]

    const bouton = (plein: boolean): React.CSSProperties => ({ font: `600 14px ${FONT}`, color: plein ? coul.accTxt : coul.txt, background: plein ? coul.acc : "transparent", border: `1px solid ${plein ? coul.acc : coul.line}`, borderRadius: 0, padding: "10px 16px", cursor: "pointer", minHeight: 44 })

    return (
        <div ref={ref} style={{ width: "100%", fontFamily: FONT, color: coul.txt, userSelect: "none" }}>
            <div onClick={suivant} title="Cliquer pour déplier" style={{ position: "relative", width: "100%", height: H, perspective: 2400, cursor: "pointer", opacity: pret ? 1 : 0, transition: "height 950ms cubic-bezier(.62,.04,.24,1), opacity 400ms" }}>
                {/* la feuille : 3 volets côte à côte, centrée sur le volet du milieu */}
                <div style={{ position: "absolute", left: "50%", top: 0, width: 3 * pw0, height: ph0, marginLeft: -1.5 * pw0, transformStyle: "preserve-3d", transformOrigin: "50% 0", transform: `scale(${echelle}) translateX(${decal}px) rotateY(${retourne ? 180 : 0}deg)`, transition: anim }}>
                    {/* volet central : E (intérieur) / B (dos) */}
                    <div style={{ position: "absolute", left: pw0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", boxShadow: "0 22px 50px rgba(0,0,0,0.35)" }}>
                        <div style={face("E")} />
                        <div style={face("B", true)} />
                    </div>
                    {/* volet rabattu : F (intérieur) / A (extérieur), charnière à droite du volet central */}
                    <div style={{ position: "absolute", left: 2 * pw0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", transformOrigin: "0 50%", transform: `rotateY(${ouvertVolet ? 0 : -180}deg) translateZ(-1px)`, transition: anim }}>
                        <div style={face("F")}><div style={ombre(!ouvertVolet, "d")} /></div>
                        <div style={face("A", true)} />
                    </div>
                    {/* couverture : D (intérieur) / C (couverture), charnière à gauche du volet central */}
                    <div style={{ position: "absolute", left: 0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", transformOrigin: "100% 50%", transform: `rotateY(${ouvertCouv ? 0 : 180}deg) translateZ(-2px)`, transition: anim }}>
                        <div style={face("D")}><div style={ombre(!ouvertCouv, "g")} /></div>
                        <div style={face("C", true)} />
                    </div>
                </div>
            </div>
            {/* commandes */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
                <button style={{ ...bouton(false), width: 44, padding: 0 }} aria-label="Étape précédente" onClick={precedent}>‹</button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 210 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{ETAPES[etape].titre}</span>
                    <span style={{ display: "flex", gap: 6, marginTop: 6 }}>{ETAPES.map((_, i) => <span key={i} onClick={() => setEtape(i)} style={{ width: 22, height: 3, background: i === etape ? coul.acc : coul.line, cursor: "pointer" }} />)}</span>
                </div>
                <button style={{ ...bouton(true), width: 44, padding: 0 }} aria-label="Étape suivante" onClick={suivant}>›</button>
                <button style={bouton(false)} onClick={() => setLoupe(ordreLoupe.indexOf(ETAPES[etape].vus[0]))}>Voir en grand</button>
            </div>
            {loupe !== null && typeof document !== "undefined" && createPortal(
                <div onClick={() => setLoupe(null)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(21,16,13,0.94)", display: "flex", flexDirection: "column", fontFamily: FONT, color: "#f6f0e6" }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid rgba(246,240,230,0.16)" }}>
                        <button style={{ ...bouton(false), color: "#f6f0e6", borderColor: "rgba(246,240,230,0.35)", width: 44, padding: 0 }} onClick={() => setLoupe((l) => ((l! + 5) % 6))} aria-label="Volet précédent">‹</button>
                        <span style={{ flex: 1, textAlign: "center", fontSize: 14 }}>{NOMS[ordreLoupe[loupe]]} · {loupe + 1}/6</span>
                        <button style={{ ...bouton(false), color: "#f6f0e6", borderColor: "rgba(246,240,230,0.35)", width: 44, padding: 0 }} onClick={() => setLoupe((l) => ((l! + 1) % 6))} aria-label="Volet suivant">›</button>
                        <button style={{ ...bouton(false), color: "#f6f0e6", borderColor: "rgba(246,240,230,0.35)", width: 44, padding: 0 }} onClick={() => setLoupe(null)} aria-label="Fermer">✕</button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 12 }}>
                        <img src={img(ordreLoupe[loupe])} alt={NOMS[ordreLoupe[loupe]]} style={{ width: "min(100%, 860px)", height: "auto", alignSelf: "flex-start" }} />
                    </div>
                </div>, document.body)}
        </div>
    )
}

Depliant.defaultProps = { hauteurMax: 760, fondClair: false }
addPropertyControls(Depliant, {
    hauteurMax: { type: ControlType.Number, title: "Hauteur max", min: 300, max: 1200, step: 10, defaultValue: 760 },
    fondClair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: false },
})
