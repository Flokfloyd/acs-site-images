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
    { titre: "Adhérer", vus: ["B"] },
]
const NOMS: Record<string, string> = { C: "Couverture", D: "Intérieur, volet gauche", A: "Le salon en chiffres", E: "Intérieur, volet central", F: "Intérieur, volet droit", B: "Adhérer" }
const FONT = "Poppins, sans-serif"

export default function Depliant(props: { hauteurMax: number; fondClair: boolean }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [W, setW] = React.useState(900)
    const [vh, setVh] = React.useState(900)
    const [etape, setEtape] = React.useState(0)
    const [plein, setPlein] = React.useState(false)
    const [pret, setPret] = React.useState(false)
    const [vw, setVw] = React.useState(1200)
    const overlay = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const maj = () => { setW(el.clientWidth); setVh(window.innerHeight); setVw(window.innerWidth) }
        const ro = new ResizeObserver(maj)
        ro.observe(el); maj(); setPret(true)
        window.addEventListener("resize", maj)
        const fs = () => { if (!document.fullscreenElement) setPlein(false) }
        document.addEventListener("fullscreenchange", fs)
        return () => { ro.disconnect(); window.removeEventListener("resize", maj); document.removeEventListener("fullscreenchange", fs) }
    }, [])
    React.useEffect(() => { [..."ABCDEF"].forEach((k) => { const i = new Image(); i.src = img(k) }) }, [])
    React.useEffect(() => {
        if (!plein) return
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); else if (e.key === "ArrowRight") suivant(); else if (e.key === "ArrowLeft") precedent() }
        window.addEventListener("keydown", h)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", h); document.body.style.overflow = o }
    }, [plein])

    const coul = props.fondClair
        ? { txt: "#1d1612", mut: "#5e5247", line: "rgba(29,22,18,0.25)", acc: "#3f6b2c", accTxt: "#fbf7f0" }
        : { txt: "#f6f0e6", mut: "#d8cdbb", line: "rgba(246,240,230,0.35)", acc: "#9bbd8a", accTxt: "#1d1612" }

    const ouvertCouv = etape === 1 || etape === 2
    const ouvertVolet = etape === 2
    const retourne = etape === 3
    const anim = "transform 950ms cubic-bezier(.62,.04,.24,1)"
    // au dos, les volets repliés passent derrière : on les masque une fois retournés (évite un liseré)
    const cache: React.CSSProperties = { opacity: retourne ? 0 : 1, transition: retourne ? `${anim}, opacity 0s linear 950ms` : anim }
    const face = (k: string, dos = false): React.CSSProperties => ({ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: dos ? "rotateY(180deg)" : "none", backgroundImage: `url(${img(k)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#3c4a3a" })
    const ombre = (actif: boolean, sens: "g" | "d"): React.CSSProperties => ({ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(${sens === "g" ? "90deg" : "270deg"}, rgba(0,0,0,0) 70%, rgba(0,0,0,0.22))`, opacity: actif ? 1 : 0, transition: "opacity 950ms" })

    const suivant = () => setEtape((e) => (e + 1) % 4)
    const precedent = () => setEtape((e) => (e + 3) % 4)
    const ouvrir = () => { setPlein(true); setTimeout(() => { const el: any = overlay.current; if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {}) }, 30) }
    const fermer = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setPlein(false) }

    // la scène, dimensionnée pour une largeur et une hauteur données
    const scene = (largeur: number, hauteurMax: number) => {
        const pw0 = largeur / 3
        const ph0 = pw0 / RATIO
        const n = etape === 2 ? 3 : etape === 1 ? 2 : 1
        const echelle = Math.min(largeur / (n * pw0), hauteurMax / ph0)
        const H = ph0 * echelle
        const decal = etape === 1 ? pw0 / 2 : 0
        return (
            <div onClick={suivant} title="Cliquer pour déplier" style={{ position: "relative", width: largeur, height: H, perspective: 2400, cursor: "pointer", opacity: pret ? 1 : 0, transition: "height 950ms cubic-bezier(.62,.04,.24,1), opacity 400ms" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, width: 3 * pw0, height: ph0, marginLeft: -1.5 * pw0, transformStyle: "preserve-3d", transformOrigin: "50% 0", transform: `scale(${echelle}) translateX(${decal}px) rotateY(${retourne ? 180 : 0}deg)`, transition: anim }}>
                    <div style={{ position: "absolute", left: pw0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", boxShadow: retourne ? "none" : "0 22px 50px rgba(0,0,0,0.35)" }}>
                        <div style={face("E")} />
                        <div style={face("B", true)} />
                    </div>
                    <div style={{ position: "absolute", left: 2 * pw0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", transformOrigin: "0 50%", transform: `rotateY(${ouvertVolet ? 0 : -180}deg) translateZ(-1px)`, ...cache }}>
                        <div style={face("F")}><div style={ombre(!ouvertVolet, "d")} /></div>
                        <div style={face("A", true)} />
                    </div>
                    <div style={{ position: "absolute", left: 0, top: 0, width: pw0, height: ph0, transformStyle: "preserve-3d", transformOrigin: "100% 50%", transform: `rotateY(${ouvertCouv ? 0 : 180}deg) translateZ(-2px)`, ...cache }}>
                        <div style={face("D")}><div style={ombre(!ouvertCouv, "g")} /></div>
                        <div style={face("C", true)} />
                    </div>
                </div>
            </div>
        )
    }

    const bouton = (plein_: boolean, sombre = false): React.CSSProperties => ({ font: `600 14px ${FONT}`, color: plein_ ? coul.accTxt : sombre ? "#f6f0e6" : coul.txt, background: plein_ ? coul.acc : "transparent", border: `1px solid ${plein_ ? coul.acc : sombre ? "rgba(246,240,230,0.35)" : coul.line}`, borderRadius: 0, padding: "10px 16px", cursor: "pointer", minHeight: 44 })
    const commandes = (sombre: boolean) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...bouton(false, sombre), width: 44, padding: 0 }} aria-label="Étape précédente" onClick={precedent}>‹</button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 180 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: sombre ? "#f6f0e6" : coul.txt }}>{ETAPES[etape].titre}</span>
                <span style={{ display: "flex", gap: 6, marginTop: 6 }}>{ETAPES.map((_, i) => <span key={i} onClick={() => setEtape(i)} style={{ width: 22, height: 3, background: i === etape ? coul.acc : sombre ? "rgba(246,240,230,0.35)" : coul.line, cursor: "pointer" }} />)}</span>
            </div>
            <button style={{ ...bouton(true), width: 44, padding: 0 }} aria-label="Étape suivante" onClick={suivant}>›</button>
            {sombre ? <button style={bouton(false, true)} onClick={fermer}>Fermer</button> : <button style={bouton(false)} onClick={ouvrir}>Voir en grand</button>}
        </div>
    )

    return (
        <div ref={ref} style={{ width: "100%", fontFamily: FONT, color: coul.txt, userSelect: "none" }}>
            {scene(W, Math.min(props.hauteurMax || 760, vh * 0.78))}
            <div style={{ marginTop: 22 }}>{commandes(false)}</div>
            {plein && typeof document !== "undefined" && createPortal(
                <div ref={overlay} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#15100d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 16, boxSizing: "border-box", fontFamily: FONT }}>
                    {scene(vw - 32, vh - 130)}
                    {commandes(true)}
                </div>, document.body)}
        </div>
    )
}

Depliant.defaultProps = { hauteurMax: 760, fondClair: false }
addPropertyControls(Depliant, {
    hauteurMax: { type: ControlType.Number, title: "Hauteur max", min: 300, max: 1200, step: 10, defaultValue: 760 },
    fondClair: { type: ControlType.Boolean, title: "Fond clair", defaultValue: false },
})
