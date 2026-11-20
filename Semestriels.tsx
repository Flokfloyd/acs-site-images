// Semestriels.tsx — tous les numéros en couvertures, et une liseuse dessous dont les pages se tournent
// Le numéro lu change selon la couverture cliquée (ou le lien /semestriels#n3).
// Les numéros ajoutés par les admins dans l’espace membre viennent de la base et se lisent depuis leur PDF.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

type Issue = { n: number; date: string; resume: string; ch: [string, number][]; couv: string; pdf?: string | null; total: number }
const GH = "https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/"
const STATIQUES: Issue[] = [
    { n: 1, date: "Mars 2025", resume: "Le programme du salon, débuter en cactées, l’étiquetage, Astrophytum, Pleiospilos et un voyage en Espagne.", ch: [["Salon", 4], ["Programme", 5], ["Débuter", 6], ["Histoire d’une passion", 7], ["Étiquetage", 8], ["Astrophytum", 11], ["Pleiospilos", 12], ["Espagne", 13], ["AG", 15]], couv: GH + "1-couvertures/couverture-n1.jpg", total: 16 },
    { n: 2, date: "Juillet 2025", resume: "Le retour sur le salon, le portrait de Yannick, les substrats et les Aeonium d’Arabie.", ch: [["Salon", 4], ["Yannick", 7], ["Substrats", 9], ["Aeonium d’Arabie", 12], ["Agenda", 16]], couv: GH + "1-couvertures/couverture-n2.jpg", total: 16 },
    { n: 3, date: "Février 2026", resume: "Les Epiphyllum, les semis et le caisson à semis, un voyage à Madère et l’agenda.", ch: [["Epiphyllum", 4], ["Semis", 7], ["Caisson", 9], ["Madère", 10], ["AG / agenda", 16]], couv: GH + "1-couvertures/couverture-n3.jpg", total: 16 },
    { n: 4, date: "Septembre 2026", resume: "L’Ouest américain, le guide des Echeveria, le jardin Majorelle, le bilan du 10ᵉ salon et le Gerrardanthus.", ch: [["Édito", 2], ["Printemps", 4], ["Echeveria", 6], ["Ouest américain", 9], ["Majorelle", 12], ["Bilan du salon", 15], ["Gerrardanthus", 16]], couv: GH + "1-couvertures/couverture-n4.jpg", total: 16 },
]
const RATIO_IMG = 910 / 1287
const srcImg = (n: number, p: number) => GH + "4-pages/n" + n + "/p-" + String(p).padStart(2, "0") + ".jpg"
const FONT = "Poppins, sans-serif"
const SERIF = "Fraunces, Georgia, serif"

// ---------- PDF (pdf.js chargé seulement si un numéro vient de la base) ----------
const PDFJS = "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs"
const PDFJS_WORKER = "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs"
const docs = new Map<string, Promise<any>>()
const rendus = new Map<string, Promise<string>>()
function ouvrirPdf(url: string): Promise<any> {
    if (!docs.has(url)) docs.set(url, (async () => { const lib: any = await import(/* @vite-ignore */ PDFJS); lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return lib.getDocument({ url }).promise })())
    return docs.get(url)!
}
function pagePdf(url: string, p: number): Promise<string> {
    const k = url + "#" + p
    if (!rendus.has(k)) rendus.set(k, (async () => {
        const doc = await ouvrirPdf(url); const page = await doc.getPage(p)
        const v1 = page.getViewport({ scale: 1 }); const vp = page.getViewport({ scale: 1400 / v1.height })
        const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height)
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise
        return await new Promise<string>((ok) => cv.toBlob((b) => ok(URL.createObjectURL(b!)), "image/jpeg", 0.88))
    })())
    return rendus.get(k)!
}

function Page({ it, p, style }: { it: Issue; p: number | null; style: React.CSSProperties }) {
    const [s, setS] = React.useState<string | null>(null)
    React.useEffect(() => {
        if (!p || !it.pdf) return
        let vivant = true; setS(null); pagePdf(it.pdf, p).then((u) => vivant && setS(u)).catch(() => {}); return () => { vivant = false }
    }, [it.pdf, p])
    if (!p) return <div style={{ ...style, background: "transparent" }} />
    const src = it.pdf ? s : srcImg(it.n, p)
    return src ? <img src={src} alt={`Semestriel N°${it.n}, page ${p}`} draggable={false} style={{ ...style, objectFit: "cover", background: "#fffdf9" }} />
        : <div style={{ ...style, background: "#fffdf9", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7c6c", font: `500 13px ${FONT}` }}>Chargement…</div>
}

export default function Semestriels(props: { hauteurMax: number }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const lecteur = React.useRef<HTMLDivElement>(null)
    const [W, setW] = React.useState(1000)
    const [vh, setVh] = React.useState(900)
    const [pret, setPret] = React.useState(false)
    const [issues, setIssues] = React.useState<Issue[]>(STATIQUES)
    const [sel, setSel] = React.useState(STATIQUES.length - 1)
    const [s, setS] = React.useState(0) // double page : n° de planche ; page simple : n° de page - 1
    const [flip, setFlip] = React.useState<null | { dir: 1 | -1; a: number }>(null)
    const [toc, setToc] = React.useState(false)
    const [plein, setPlein] = React.useState(false)
    const [ratioPdf, setRatioPdf] = React.useState<Record<string, number>>({})
    const issuesRef = React.useRef(issues); issuesRef.current = issues

    React.useEffect(() => {
        const el = ref.current; if (!el) return
        const ro = new ResizeObserver(() => { setW(el.clientWidth); setVh(window.innerHeight) })
        ro.observe(el); setW(el.clientWidth); setVh(window.innerHeight); setPret(true)
        const fs = () => setPlein(!!document.fullscreenElement); document.addEventListener("fullscreenchange", fs)
        return () => { ro.disconnect(); document.removeEventListener("fullscreenchange", fs) }
    }, [])

    // numéros de la base (ajoutés par les admins)
    React.useEffect(() => {
        const client = sb(); if (!client) return
        client.from("semestriels").select("numero,date_label,resume,sommaire,pdf_url,couverture_url,nb_pages,publie").eq("publie", true).order("numero", { ascending: true })
            .then(({ data, error }: any) => {
                if (error || !data || !data.length) return
                const parN = new Map<number, Issue>(STATIQUES.map((x) => [x.n, x]))
                for (const r of data) {
                    const base = parN.get(r.numero)
                    const ch = Array.isArray(r.sommaire) && r.sommaire.length ? r.sommaire : base?.ch || []
                    if (base) parN.set(r.numero, { ...base, date: r.date_label || base.date, resume: r.resume || base.resume, ch })
                    else if (r.pdf_url) parN.set(r.numero, { n: r.numero, date: r.date_label, resume: r.resume || "", ch, couv: r.couverture_url || "", pdf: r.pdf_url, total: r.nb_pages || 16 })
                }
                const l = Array.from(parN.values()).sort((a, b) => a.n - b.n)
                setIssues(l)
                if (!/^#n\d/.test(location.hash)) setSel(l.length - 1)
            })
    }, [])

    // choix du numéro par le lien (#n3) ou la couverture
    const choisir = React.useCallback((i: number, defiler = true) => {
        setSel(i); setS(0); setFlip(null); setToc(false)
        if (defiler && lecteur.current) setTimeout(() => lecteur.current!.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
    }, [])
    React.useEffect(() => {
        const lire = () => { const m = /^#n(\d{1,3})$/.exec(location.hash); if (!m) return; const i = issuesRef.current.findIndex((x) => x.n === Number(m[1])); if (i >= 0) choisir(i, true) }
        lire(); const t = setTimeout(lire, 1600)
        window.addEventListener("hashchange", lire)
        return () => { clearTimeout(t); window.removeEventListener("hashchange", lire) }
    }, [])

    const it = issues[Math.min(sel, issues.length - 1)]
    const total = it.total
    React.useEffect(() => {
        if (!it.pdf) return
        const url = it.pdf
        ouvrirPdf(url).then(async (doc) => {
            const p1 = await doc.getPage(1); const v = p1.getViewport({ scale: 1 })
            setRatioPdf((r) => ({ ...r, [url]: v.width / v.height }))
            if (doc.numPages && doc.numPages !== total) setIssues((l) => l.map((x) => (x.pdf === url ? { ...x, total: doc.numPages } : x)))
        }).catch(() => {})
    }, [it.pdf])

    // géométrie
    const simple = W < 760
    const ratio = it.pdf ? ratioPdf[it.pdf] || RATIO_IMG : RATIO_IMG
    const hMax = plein ? (typeof window !== "undefined" ? window.innerHeight - 90 : 800) : Math.min(props.hauteurMax || 820, vh * 0.8)
    const largeur = plein && typeof window !== "undefined" ? window.innerWidth - 32 : W
    const pw = Math.min(simple ? largeur : largeur / 2, hMax * ratio)
    const ph = pw / ratio
    const maxS = simple ? total - 1 : Math.floor(total / 2)
    const L = (k: number) => (simple ? null : k === 0 ? null : 2 * k <= total ? 2 * k : null)
    const R = (k: number) => (simple ? k + 1 : k === 0 ? 1 : 2 * k + 1 <= total ? 2 * k + 1 : null)

    // tourner une page : 1) on pose la feuille, 2) on la fait pivoter, 3) on valide
    const tourner = (dir: 1 | -1) => {
        if (flip) return
        if (dir === 1 && s >= maxS) return
        if (dir === -1 && s <= 0) return
        setFlip({ dir, a: simple && dir === -1 ? -180 : 0 })
    }
    React.useEffect(() => {
        if (!flip || (flip.a !== 0 && flip.a !== -180)) return
        const cible = flip.dir === 1 ? -180 : simple ? 0 : 180
        if (flip.a === cible) return
        const t1 = setTimeout(() => setFlip((f) => (f ? { ...f, a: cible } : f)), 30)
        const t2 = setTimeout(() => { setS((x) => x + flip.dir); setFlip(null) }, 760)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [flip && flip.dir])

    // clavier, quand la liseuse est survolée ou active
    const actif = React.useRef(false)
    React.useEffect(() => {
        const h = (e: KeyboardEvent) => { if (!actif.current && !plein) return; if (e.key === "ArrowRight") { e.preventDefault(); tourner(1) } else if (e.key === "ArrowLeft") { e.preventDefault(); tourner(-1) } }
        window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
    })

    // balayage
    const debut = React.useRef<{ x: number; y: number } | null>(null)
    const onDown = (e: React.PointerEvent) => { debut.current = { x: e.clientX, y: e.clientY } }
    const onUp = (e: React.PointerEvent) => {
        const d = debut.current; debut.current = null; if (!d) return
        const dx = e.clientX - d.x, dy = e.clientY - d.y
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { tourner(dx < 0 ? 1 : -1); return }
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); tourner(e.clientX - r.left < r.width / 2 ? -1 : 1) }
    }
    const pleinEcran = () => { const el: any = lecteur.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}) }

    // préchargement des pages voisines
    React.useEffect(() => {
        const pages = simple ? [s + 2, s + 3, s] : [2 * s + 2, 2 * s + 3, 2 * s + 4, 2 * s - 1, 2 * s - 2]
        pages.filter((p) => p >= 1 && p <= total).forEach((p) => { if (it.pdf) pagePdf(it.pdf, p).catch(() => {}); else { const i = new Image(); i.src = srcImg(it.n, p) } })
    }, [s, sel, simple])

    // ce qui est affiché sous la feuille qui tourne
    const fd = flip?.dir
    const baseL = simple ? null : fd === 1 ? L(s) : fd === -1 ? L(s - 1) : L(s)
    const baseR = simple ? (fd === 1 ? R(s + 1) : fd === -1 ? R(s) : R(s)) : fd === 1 ? R(s + 1) : fd === -1 ? R(s) : R(s)
    const pageStyle: React.CSSProperties = { width: pw, height: ph, display: "block" }
    const face = (dos: boolean): React.CSSProperties => ({ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: dos ? "rotateY(180deg)" : "none" })
    const reflet = (sens: "g" | "d", fort: number): React.CSSProperties => ({ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(${sens === "d" ? "90deg" : "270deg"}, rgba(0,0,0,${0.18 * fort}) 0%, rgba(0,0,0,0) 22%)` })
    const ombreAnim = flip ? Math.sin((Math.abs(flip.a) / 180) * Math.PI) : 0

    const libelle = simple ? `Page ${s + 1} / ${total}` : (() => { const a = L(s), b = R(s); return a && b ? `Pages ${a}–${b} / ${total}` : `Page ${a || b} / ${total}` })()
    const aller = (p: number) => { setFlip(null); setS(simple ? p - 1 : Math.floor(p / 2)); setToc(false) }

    const btn = (plein_: boolean): React.CSSProperties => ({ font: `600 14px ${FONT}`, color: plein_ ? "#1d1612" : "#f6f0e6", background: plein_ ? "#9bbd8a" : "transparent", border: `1px solid ${plein_ ? "#9bbd8a" : "rgba(246,240,230,0.3)"}`, borderRadius: 0, padding: "0 14px", height: 44, minWidth: 44, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" })
    const largeurLivre = simple ? pw : 2 * pw

    return (
        <div ref={ref} style={{ width: "100%", fontFamily: FONT, opacity: pret ? 1 : 0, transition: "opacity 300ms" }}>
            {/* les numéros */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${W < 500 ? 140 : 200}px, 1fr))`, gap: W < 500 ? 14 : 24 }}>
                {[...issues].reverse().map((x) => {
                    const i = issues.indexOf(x); const choisi = i === sel
                    return (
                        <button key={x.n} onClick={() => choisir(i)} style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, color: "#1d1612" }} aria-label={`Lire le semestriel N°${x.n}`}>
                            <div style={{ position: "relative", width: "100%", aspectRatio: String(RATIO_IMG), background: "#ddd2c0", outline: choisi ? "3px solid #3f6b2c" : "1px solid rgba(29,22,18,0.12)", outlineOffset: choisi ? 3 : 0, boxShadow: "0 10px 26px rgba(29,22,18,0.16)", transition: "transform 250ms, box-shadow 250ms", transform: choisi ? "translateY(-4px)" : "none" }}>
                                {x.couv ? <img src={x.couv} alt={`Couverture du N°${x.n}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: `600 28px ${SERIF}` }}>N°{x.n}</div>}
                                {choisi && <span style={{ position: "absolute", left: 0, bottom: 0, background: "#3f6b2c", color: "#fbf7f0", font: `600 12px ${FONT}`, padding: "6px 10px", letterSpacing: "0.04em" }}>EN LECTURE</span>}
                            </div>
                            <div>
                                <div style={{ font: `600 20px/1.2 ${SERIF}` }}>N°{x.n} <span style={{ font: `500 14px ${FONT}`, color: "#5e5247" }}>· {x.date}</span></div>
                                {W >= 500 && x.resume && <div style={{ font: `400 14px/1.5 ${FONT}`, color: "#3a3027", marginTop: 6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.resume}</div>}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* la liseuse */}
            <div ref={lecteur} onMouseEnter={() => (actif.current = true)} onMouseLeave={() => (actif.current = false)} style={{ marginTop: W < 500 ? 36 : 56, background: "#1f1915", padding: plein ? "16px" : W < 500 ? "18px 10px 14px" : "32px 24px 20px", scrollMarginTop: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "#f6f0e6", height: plein ? "100vh" : "auto", boxSizing: "border-box", justifyContent: plein ? "center" : "flex-start" }}>
                <div style={{ width: "100%", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", maxWidth: Math.max(largeurLivre, 320) }}>
                    <div style={{ font: `600 22px/1.2 ${SERIF}` }}>Semestriel N°{it.n} <span style={{ font: `500 14px ${FONT}`, color: "#b9ab98" }}>· {it.date}</span></div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {it.ch.length > 0 && <button style={btn(toc)} onClick={() => setToc((t) => !t)}>Sommaire</button>}
                        {it.pdf && <a style={btn(false)} href={it.pdf} target="_blank" rel="noreferrer">PDF</a>}
                        <button style={btn(false)} onClick={pleinEcran} aria-label="Plein écran">{plein ? "⤡" : "⛶"}</button>
                    </div>
                </div>
                {toc && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: Math.max(largeurLivre, 320), width: "100%" }}>
                        {it.ch.map(([t, p]) => (<button key={t + p} style={{ ...btn(false), height: 36, font: `500 13px ${FONT}` }} onClick={() => aller(p)}>{t} · p.{p}</button>))}
                    </div>
                )}
                {/* le livre */}
                <div onPointerDown={onDown} onPointerUp={onUp} style={{ position: "relative", width: largeurLivre, height: ph, perspective: 2600, cursor: "pointer", userSelect: "none", touchAction: "pan-y" }}>
                    {/* pages fixes */}
                    {!simple && <div style={{ position: "absolute", left: 0, top: 0, width: pw, height: ph, boxShadow: baseL ? "0 18px 40px rgba(0,0,0,0.45)" : "none" }}><Page it={it} p={baseL} style={pageStyle} />{baseL && <div style={reflet("g", 1)} />}</div>}
                    <div style={{ position: "absolute", left: simple ? 0 : pw, top: 0, width: pw, height: ph, boxShadow: baseR ? "0 18px 40px rgba(0,0,0,0.45)" : "none" }}><Page it={it} p={baseR} style={pageStyle} />{baseR && !simple && <div style={reflet("d", 1)} />}</div>
                    {/* la feuille qui tourne */}
                    {flip && (() => {
                        const avant = !simple && flip.dir === -1
                        const recto = simple ? (flip.dir === 1 ? R(s) : R(s - 1)) : flip.dir === 1 ? R(s) : L(s)
                        const verso = simple ? null : flip.dir === 1 ? L(s + 1) : R(s - 1)
                        return (
                            <div style={{ position: "absolute", top: 0, left: simple ? 0 : avant ? 0 : pw, width: pw, height: ph, transformStyle: "preserve-3d", transformOrigin: avant ? "100% 50%" : "0 50%", transform: `rotateY(${flip.a}deg)`, transition: "transform 700ms cubic-bezier(.45,.05,.3,1)", zIndex: 3 }}>
                                <div style={face(false)}><Page it={it} p={recto} style={pageStyle} /><div style={{ ...reflet(avant ? "g" : "d", 1 + ombreAnim * 2) }} /></div>
                                <div style={face(true)}>{simple ? <div style={{ ...pageStyle, background: "#efe8dc" }} /> : <Page it={it} p={verso} style={pageStyle} />}<div style={reflet(avant ? "d" : "g", 1 + ombreAnim * 2)} /></div>
                            </div>
                        )
                    })()}
                    {/* pli central */}
                    {!simple && baseL && baseR && <div style={{ position: "absolute", left: pw - 1, top: 0, width: 2, height: ph, background: "rgba(0,0,0,0.25)", zIndex: 2, pointerEvents: "none" }} />}
                </div>
                {/* commandes */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <button style={{ ...btn(false), opacity: s <= 0 ? 0.35 : 1 }} onClick={() => tourner(-1)} aria-label="Page précédente">‹</button>
                    <span style={{ font: `500 14px ${FONT}`, color: "#d8cdbb", minWidth: 130, textAlign: "center" }}>{libelle}</span>
                    <button style={{ ...btn(true), opacity: s >= maxS ? 0.35 : 1 }} onClick={() => tourner(1)} aria-label="Page suivante">›</button>
                </div>
            </div>
        </div>
    )
}

Semestriels.defaultProps = { hauteurMax: 820 }
addPropertyControls(Semestriels, { hauteurMax: { type: ControlType.Number, title: "Hauteur max", min: 400, max: 1200, step: 10, defaultValue: 820 } })
