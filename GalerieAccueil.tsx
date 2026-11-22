// GalerieAccueil.tsx — galerie photo de la page d'accueil, gérée dans l'administration (onglet Galerie).
// Seules les photos cochées « Page d'accueil » sont publiques ; les autres sont réservées aux adhérents.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, imgLeger } from "./AcsBase.tsx"

export type Photo = { id: string; image_url: string; legende?: string | null; album?: string | null; accueil?: boolean; ordre?: number }

const sans = "'Poppins', system-ui, sans-serif"
const serif = "'Fraunces', Georgia, serif"

const SECOURS: Photo[] = [
    ["u24jE1XFwpIS1ZTudAPbwhz8", "Jardin Majorelle"], ["Hhr8UCPbAO7x1jNY8RVDG6gGq5s", "Madère"], ["iIVUFH0jRRuu4b6rtMNVIpdowu8", "Agave"],
    ["nNFsqvAFZ62Gc4uVcCCjZdkaQ", "Cierge"], ["3IFb9YLmwND3KZxWa42klDHQxF4", "Epiphyllum"], ["EiFCYebHOmQ4xh2kTo7DoCMPVY", "Cactus"],
].map(([h, l], i) => ({ id: h, image_url: `https://framerusercontent.com/images/${h}.jpg`, legende: l, ordre: i }))

// Réduit une photo avant envoi (côté le plus long 2000 px, JPEG) pour rester dans l'espace gratuit
async function reduireImage(f: File, max = 2000): Promise<Blob> {
    const url = URL.createObjectURL(f)
    try {
        const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement("canvas")
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
        return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b || f), "image/jpeg", 0.85))
    } finally { URL.revokeObjectURL(url) }
}

function Diaporama({ photos, index, fermer }: { photos: Photo[]; index: number; fermer: () => void }) {
    const [i, setI] = React.useState(index)
    const n = photos.length
    const aller = (d: number) => setI((x) => (x + d + n) % n)
    const debut = React.useRef<number | null>(null)
    React.useEffect(() => {
        const f = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); if (e.key === "ArrowRight") aller(1); if (e.key === "ArrowLeft") aller(-1) }
        window.addEventListener("keydown", f)
        const o = document.body.style.overflow; document.body.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", f); document.body.style.overflow = o }
    }, [])
    const p = photos[i]
    if (!p) return null
    const fleche = (d: number): React.CSSProperties => ({ all: "unset", cursor: "pointer", position: "absolute", top: "50%", [d < 0 ? "left" : "right"]: 8, transform: "translateY(-50%)", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", color: "#f6f0e6", fontSize: 30, background: "rgba(0,0,0,0.35)" } as any)
    return (
        <div role="dialog" aria-modal="true" aria-label="Photo agrandie" onClick={fermer}
            onTouchStart={(e) => (debut.current = e.touches[0].clientX)} onTouchEnd={(e) => { if (debut.current == null) return; const dx = e.changedTouches[0].clientX - debut.current; if (Math.abs(dx) > 50) aller(dx < 0 ? 1 : -1); debut.current = null }}
            style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,12,10,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 12px 20px", boxSizing: "border-box" }}>
            <button aria-label="Fermer" onClick={fermer} style={{ all: "unset", cursor: "pointer", position: "absolute", top: 10, right: 16, color: "#f6f0e6", fontSize: 34, lineHeight: 1, padding: 6 }}>×</button>
            <img src={p.image_url} alt={p.legende || ""} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "calc(100% - 60px)", objectFit: "contain", display: "block" }} />
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 14, textAlign: "center", color: "#f6f0e6", fontFamily: sans }}>
                {p.legende && <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 600 }}>{p.legende}</div>}
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4, letterSpacing: 0.5 }}>{p.album ? p.album + " · " : ""}{i + 1} / {n}</div>
            </div>
            {n > 1 && <button aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); aller(-1) }} style={fleche(-1)}>‹</button>}
            {n > 1 && <button aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); aller(1) }} style={fleche(1)}>›</button>}
        </div>
    )
}

function Vignette({ p, onClick, hauteur }: { p: Photo; onClick: () => void; hauteur: number | string }) {
    const [sur, setSur] = React.useState(false)
    return (
        <button onClick={onClick} onMouseEnter={() => setSur(true)} onMouseLeave={() => setSur(false)} aria-label={p.legende ? `Agrandir : ${p.legende}` : "Agrandir la photo"}
            style={{ all: "unset", cursor: "zoom-in", position: "relative", display: "block", height: hauteur, overflow: "hidden", background: "#2e241e" }}>
            <img {...imgLeger(p.image_url)} alt={p.legende || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: sur ? "scale(1.04)" : "none", transition: "transform .5s ease" }} />
            {p.legende && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "56px 16px 16px", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)", color: "#f6f0e6", fontFamily: sans, fontWeight: 600, fontSize: 15, textAlign: "center" }}>{p.legende}</div>
            )}
        </button>
    )
}

export const GALERIE = { Diaporama, Vignette, reduireImage, SECOURS }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function GalerieAccueil(props: { nombre?: number; lien?: string }) {
    const { nombre = 6, lien = "/espace-membre#galerie" } = props
    const [photos, setPhotos] = React.useState<Photo[]>(SECOURS.slice(0, nombre))
    const [ouverte, setOuverte] = React.useState<number | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return
        c.from("photos").select("id,image_url,legende,album,ordre").eq("accueil", true).order("ordre").order("cree_le", { ascending: false }).limit(nombre)
            .then(({ data, error }: any) => { if (!error && data && data.length) setPhotos(data) })
    }, [nombre])
    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
                {photos.map((p, i) => <Vignette key={p.id} p={p} hauteur={210} onClick={() => setOuverte(i)} />)}
            </div>
            {lien && (
                <a href={lien} style={{ display: "inline-block", marginTop: 22, fontFamily: sans, fontSize: 14, color: "rgba(246,240,230,0.75)", textDecoration: "underline", textUnderlineOffset: 4 }}>Plus de photos dans l’espace adhérents →</a>
            )}
            {ouverte != null && <Diaporama photos={photos} index={ouverte} fermer={() => setOuverte(null)} />}
        </div>
    )
}

addPropertyControls(GalerieAccueil, {
    nombre: { type: ControlType.Number, title: "Nombre de photos", defaultValue: 6, min: 3, max: 12, step: 3 },
    lien: { type: ControlType.String, title: "Lien adhérents", defaultValue: "/espace-membre#galerie" },
})
