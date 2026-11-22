// GalerieAccueil.tsx — galerie photo de la page d'accueil, gérée dans l'administration (onglet Galerie).
// Seules les photos cochées « Page d'accueil » sont publiques ; les autres sont réservées aux adhérents.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, imgLeger } from "./AcsBase.tsx"

export type Photo = { id: string; image_url: string; vignette_url?: string | null; legende?: string | null; album?: string | null; serie?: string | null; accueil?: boolean; ordre?: number }

const sans = "'Poppins', system-ui, sans-serif"
const serif = "'Fraunces', Georgia, serif"

// Les cinq catégories de la galerie (une vignette chacune sur la page d'accueil)
export const CATEGORIES = ["Salon des Plantes", "Sortie", "Voyage", "Plantes", "Semestrielles"]
export const categorie = (album?: string | null) => (album && CATEGORIES.includes(album) ? album : "Plantes")

// photos de secours (avant que l'administration n'en ait ajouté), une par catégorie
const SECOURS: Photo[] = [
    ["EiFCYebHOmQ4xh2kTo7DoCMPVY", "Salon des Plantes"], ["nNFsqvAFZ62Gc4uVcCCjZdkaQ", "Sortie"], ["u24jE1XFwpIS1ZTudAPbwhz8", "Voyage"],
    ["iIVUFH0jRRuu4b6rtMNVIpdowu8", "Plantes"], ["3IFb9YLmwND3KZxWa42klDHQxF4", "Semestrielles"],
].map(([h, a], i) => ({ id: h, image_url: `https://framerusercontent.com/images/${h}.jpg`, album: a, legende: null, ordre: i }))

// Réduit une photo avant envoi (côté le plus long 2000 px, JPEG) pour rester dans l'espace gratuit
async function reduireImage(f: File, max = 2000, qualite = 0.85): Promise<Blob> {
    const url = URL.createObjectURL(f)
    try {
        const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement("canvas")
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
        return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b || f), "image/jpeg", qualite))
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

function Vignette({ p, onClick, hauteur, sous }: { p: Photo; onClick: () => void; hauteur: number | string; sous?: string }) {
    const [sur, setSur] = React.useState(false)
    return (
        <button onClick={onClick} onMouseEnter={() => setSur(true)} onMouseLeave={() => setSur(false)} aria-label={p.legende ? `Agrandir : ${p.legende}` : "Agrandir la photo"}
            style={{ all: "unset", cursor: "zoom-in", position: "relative", display: "block", height: hauteur, overflow: "hidden", background: "#2e241e" }}>
            <img {...(p.vignette_url ? { src: p.vignette_url } : imgLeger(p.image_url))} alt={p.legende || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: sur ? "scale(1.04)" : "none", transition: "transform .5s ease" }} />
            {p.legende && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "56px 16px 16px", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)", color: "#f6f0e6", fontFamily: sans, fontWeight: 600, fontSize: 15, textAlign: "center" }}>{p.legende}{sous && <span style={{ display: "block", fontWeight: 400, fontSize: 12, opacity: 0.75, marginTop: 2 }}>{sous}</span>}</div>
            )}
        </button>
    )
}

export const GALERIE = { Diaporama, Vignette, reduireImage, SECOURS, CATEGORIES, categorie }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function GalerieAccueil(props: { nombre?: number; lien?: string }) {
    const { lien = "/galerie" } = props
    const [photos, setPhotos] = React.useState<Photo[]>([])
    const [ouverte, setOuverte] = React.useState<{ liste: Photo[]; i: number } | null>(null)
    React.useEffect(() => {
        const c = sb()
        if (!c) return
        c.from("photos").select("id,image_url,vignette_url,legende,album,ordre").eq("accueil", true).order("ordre").order("cree_le", { ascending: false }).limit(60)
            .then(({ data, error }: any) => { if (!error && data) setPhotos(data) })
    }, [])
    // une vignette par catégorie : seule la photo de couverture est publique (la première cochée « page d'accueil »,
    // ordre 1 en premier) ; toutes les autres photos restent dans la galerie des adhérents
    const tuiles = CATEGORIES.map((cat) => {
        const couverture = photos.find((p) => categorie(p.album) === cat) || SECOURS.find((p) => p.album === cat)!
        return { cat, liste: [couverture] }
    })
    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
                {tuiles.map((t) => <Vignette key={t.cat} p={{ ...t.liste[0], legende: t.cat }} hauteur={210} onClick={() => setOuverte({ liste: t.liste.map((p) => ({ ...p, album: t.cat })), i: 0 })} />)}
                {lien && (
                    // 6e case : accès à la galerie complète, même aspect que le bouton « Connexion »
                    <a href={lien} style={{ height: 210, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid rgba(246,240,230,0.55)", color: "#f6f0e6", textDecoration: "none", fontFamily: sans, textAlign: "center", padding: 20, transition: "background .2s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(246,240,230,0.06)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <span style={{ fontWeight: 600, fontSize: 18 }}>Toutes les photos →</span>
                        <span style={{ fontSize: 13, opacity: 0.7 }}>réservé aux adhérents</span>
                    </a>
                )}
            </div>
            {ouverte && <Diaporama photos={ouverte.liste} index={ouverte.i} fermer={() => setOuverte(null)} />}
        </div>
    )
}

addPropertyControls(GalerieAccueil, {
    lien: { type: ControlType.String, title: "Lien adhérents", defaultValue: "/galerie" },
})
