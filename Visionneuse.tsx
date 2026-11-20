import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

// Numéros déjà en ligne (pages en images). Les numéros ajoutés par les admins
// dans l'espace membre viennent de la base et s'affichent depuis leur PDF.
const BASE = "https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/4-pages/"
type Issue = { n: number; date: string; ch: [string, number][]; pdf?: string | null; total?: number }
const STATIQUES: Issue[] = [
  { n: 1, date: "Mars 2025", ch: [["Salon", 4], ["Programme", 5], ["Débuter", 6], ["Histoire d’une passion", 7], ["Étiquetage", 8], ["Astrophytum", 11], ["Pleiospilos", 12], ["Espagne", 13], ["AG", 15]] },
  { n: 2, date: "Juillet 2025", ch: [["Salon", 4], ["Yannick", 7], ["Substrats", 9], ["Aeonium d’Arabie", 12], ["Agenda", 16]] },
  { n: 3, date: "Février 2026", ch: [["Epiphyllum", 4], ["Semis", 7], ["Caisson", 9], ["Madère", 10], ["AG / agenda", 16]] },
  { n: 4, date: "Septembre 2026", ch: [["Édito", 2], ["Printemps", 4], ["Echeveria", 6], ["Ouest américain", 9], ["Majorelle", 12], ["Bilan du salon", 15], ["Gerrardanthus", 16]] },
]
const RATIO_IMG = 910 / 1287
const srcImg = (n: number, p: number) => BASE + "n" + n + "/p-" + String(p).padStart(2, "0") + ".jpg"
const C = { bg: "#15100d", panel: "#241c17", line: "rgba(246,240,230,0.16)", txt: "#f6f0e6", mut: "#b9ab98", acc: "#9bbd8a", accTxt: "#1d1612" }
const FONT = "Poppins, sans-serif"

// ---------- lecture des PDF (pdf.js chargé seulement si besoin) ----------
const PDFJS = "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs"
const PDFJS_WORKER = "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs"
const docs = new Map<string, Promise<any>>()
const rendus = new Map<string, Promise<string>>()
function ouvrirPdf(url: string): Promise<any> {
  if (!docs.has(url)) docs.set(url, (async () => {
    const lib: any = await import(/* @vite-ignore */ PDFJS)
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
    return lib.getDocument({ url }).promise
  })())
  return docs.get(url)!
}
function pagePdf(url: string, p: number): Promise<string> {
  const k = url + "#" + p
  if (!rendus.has(k)) rendus.set(k, (async () => {
    const doc = await ouvrirPdf(url)
    const page = await doc.getPage(p)
    const v1 = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: 1400 / v1.height })
    const cv = document.createElement("canvas")
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height)
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise
    return await new Promise<string>((ok) => cv.toBlob((b) => ok(URL.createObjectURL(b!)), "image/jpeg", 0.88))
  })())
  return rendus.get(k)!
}
function PagePdf({ url, p, style, alt }: { url: string; p: number; style: React.CSSProperties; alt: string }) {
  const [s, setS] = React.useState<string | null>(null)
  React.useEffect(() => { let vivant = true; setS(null); pagePdf(url, p).then((u) => vivant && setS(u)).catch(() => {}); return () => { vivant = false } }, [url, p])
  return s ? <img src={s} alt={alt} draggable={false} style={style} /> : <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7c6c", font: "500 13px " + FONT }}>Chargement…</div>
}

export default function Visionneuse(props: { start: number }) {
  const [issues, setIssues] = React.useState<Issue[]>(STATIQUES)
  const [issue, setIssue] = React.useState(Math.max(0, Math.min(STATIQUES.length - 1, (props.start || 4) - 1)))
  const [page, setPage] = React.useState(1) // première page visible
  const [zoom, setZoom] = React.useState(1)
  const [dir, setDir] = React.useState(0)
  const [tick, setTick] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const [nat, setNat] = React.useState(false)
  const full = true
  const [size, setSize] = React.useState({ w: 800, h: 600 })
  const [toc, setToc] = React.useState(false)
  const [ratioPdf, setRatioPdf] = React.useState<Record<string, number>>({})
  const root = React.useRef<HTMLDivElement>(null)
  const stage = React.useRef<HTMLDivElement>(null)
  const ptrs = React.useRef(new Map<number, { x: number; y: number }>())
  const drag = React.useRef({ x: 0, y: 0, sl: 0, st: 0, moved: false, pinch: 0, z0: 1 })
  const issuesRef = React.useRef(issues); issuesRef.current = issues
  const cur = issues[Math.min(issue, issues.length - 1)]
  const n = cur.n
  const TOTAL = cur.total || 16
  const RATIO = cur.pdf ? (ratioPdf[cur.pdf] || RATIO_IMG) : RATIO_IMG

  // numéros publiés dans la base (ajoutés par les admins)
  React.useEffect(() => {
    const client = sb()
    if (!client) return
    client.from("semestriels").select("numero,date_label,sommaire,pdf_url,nb_pages,publie").eq("publie", true).order("numero", { ascending: true })
      .then(({ data, error }: any) => {
        if (error || !data || !data.length) return
        const parN = new Map<number, Issue>(STATIQUES.map((s) => [s.n, s]))
        for (const r of data) {
          const base = parN.get(r.numero)
          const ch = Array.isArray(r.sommaire) && r.sommaire.length ? r.sommaire : base?.ch || []
          // un numéro déjà en images garde ses images ; un nouveau numéro s'affiche depuis son PDF
          if (base) parN.set(r.numero, { ...base, date: r.date_label || base.date, ch, pdf: null })
          else if (r.pdf_url) parN.set(r.numero, { n: r.numero, date: r.date_label, ch, pdf: r.pdf_url, total: r.nb_pages || 16 })
        }
        setIssues(Array.from(parN.values()).sort((a, b) => a.n - b.n))
      })
  }, [])

  // nombre réel de pages et format d'un PDF
  React.useEffect(() => {
    if (!open || !cur.pdf) return
    const url = cur.pdf
    ouvrirPdf(url).then(async (doc) => {
      const p1 = await doc.getPage(1); const v = p1.getViewport({ scale: 1 })
      setRatioPdf((r) => ({ ...r, [url]: v.width / v.height }))
      if (doc.numPages && doc.numPages !== cur.total) setIssues((l) => l.map((x) => (x.pdf === url ? { ...x, total: doc.numPages } : x)))
    }).catch(() => {})
  }, [open, cur.pdf])

  // mesure de la scène
  React.useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [open])

  const single = size.w < 720 || size.w / Math.max(1, size.h) < 1.15
  // pages affichées
  let pages: number[]
  if (single) pages = [page]
  else if (page <= 1) pages = [1]
  else if (page >= TOTAL) pages = [TOTAL]
  else { const a = page % 2 === 0 ? page : page - 1; pages = [a, Math.min(a + 1, TOTAL)].filter((x, i, t) => t.indexOf(x) === i) }

  const go = (p: number) => {
    let t = Math.max(1, Math.min(TOTAL, p))
    if (!single && t > 1 && t < TOTAL && t % 2 === 1) t -= 1
    if (t !== page) { setDir(t > page ? 1 : -1); setTick((k) => k + 1); setPage(t); setZoom(1) }
  }
  const next = () => go(single ? page + 1 : (page <= 1 ? 2 : pages[pages.length - 1] + 1))
  const prev = () => go(single ? page - 1 : (page <= 2 ? 1 : pages[0] - 2))
  const pick = (i: number) => { setIssue(i); setPage(1); setZoom(1); setDir(0); setToc(false) }
  const pickNumero = (num: number) => { const i = issuesRef.current.findIndex((x) => x.n === num); if (i >= 0) { pick(i); return true } return false }

  // plein écran : API native si possible, sinon repli plein viewport
  const nativeFull = () => !!(document as any).fullscreenElement
  const toggleFull = () => {
    const el: any = root.current
    if (!el) return
    if (nativeFull()) document.exitFullscreen && document.exitFullscreen()
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
  }
  const close = () => {
    if (nativeFull()) document.exitFullscreen && document.exitFullscreen()
    setOpen(false)
    try { history.replaceState(null, "", location.pathname + location.search) } catch (e) {}
  }
  React.useEffect(() => {
    const h = () => setNat(nativeFull())
    document.addEventListener("fullscreenchange", h)
    return () => document.removeEventListener("fullscreenchange", h)
  }, [])
  React.useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])
  React.useEffect(() => { if (open) setTimeout(() => root.current && root.current.focus(), 50) }, [open])

  // clavier
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = root.current
      if (!el) return
      if (!open) return
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next() }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev() }
      else if (e.key === "Home") go(1)
      else if (e.key === "End") go(TOTAL)
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))
      else if (e.key === "-") setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))
      else if (e.key === "f" || e.key === "F") toggleFull()
      else if (e.key === "Escape" && !nativeFull()) close()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  })

  // liens #n1, #n2… (n'importe quel numéro)
  React.useEffect(() => {
    const ouvre = (num: number) => { if (pickNumero(num)) setOpen(true); else setTimeout(() => { if (pickNumero(num)) setOpen(true) }, 1500) }
    const h = () => { const m = /^#n(\d{1,3})$/.exec(location.hash); if (m) ouvre(Number(m[1])) }
    h()
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a")
      const m = a && /#n(\d{1,3})$/.exec(a.getAttribute("href") || "")
      if (m) { e.preventDefault(); ouvre(Number(m[1])) }
    }
    window.addEventListener("hashchange", h)
    window.addEventListener("popstate", h)
    document.addEventListener("click", click, true)
    return () => { window.removeEventListener("hashchange", h); window.removeEventListener("popstate", h); document.removeEventListener("click", click, true) }
  }, [])

  // préchargement
  React.useEffect(() => {
    if (!open) return
    const around = [page - 2, page - 1, page + 1, page + 2, page + 3].filter((p) => p >= 1 && p <= TOTAL)
    if (cur.pdf) around.forEach((p) => { pagePdf(cur.pdf!, p).catch(() => {}) })
    else around.forEach((p) => { const i = new Image(); i.src = srcImg(n, p) })
  }, [page, issue, open, cur.pdf])

  // dimensions des pages
  const pad = full ? 12 : 16
  const availW = Math.max(100, size.w - pad * 2)
  const availH = Math.max(100, size.h - pad * 2)
  const units = single ? 1 : 2
  const baseH = Math.min(availH, availW / (RATIO * units))
  const ph = baseH * zoom
  const pw = ph * RATIO
  const contentW = pw * pages.length

  // glisser / balayer / pincer
  const onDown = (e: React.PointerEvent) => {
    const el = stage.current
    if (!el) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const d = drag.current
    d.x = e.clientX; d.y = e.clientY; d.sl = el.scrollLeft; d.st = el.scrollTop; d.moved = false
    if (ptrs.current.size === 2) {
      const [a, b] = Array.from(ptrs.current.values())
      d.pinch = Math.hypot(a.x - b.x, a.y - b.y); d.z0 = zoom
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const el = stage.current
    if (!el || !ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const d = drag.current
    if (ptrs.current.size === 2 && d.pinch > 0) {
      const [a, b] = Array.from(ptrs.current.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      setZoom(Math.max(1, Math.min(4, +(d.z0 * dist / d.pinch).toFixed(2))))
      d.moved = true
      return
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true
    if (zoom > 1) { el.scrollLeft = d.sl - dx; el.scrollTop = d.st - dy }
  }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    const was = ptrs.current.has(e.pointerId)
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) d.pinch = 0
    if (!was) return
    const dx = e.clientX - d.x
    if (zoom <= 1.05) {
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - d.y)) { dx < 0 ? next() : prev(); return }
      if (!d.moved) {
        const r = stage.current!.getBoundingClientRect()
        const rel = (e.clientX - r.left) / r.width
        if (rel < 0.3) prev(); else if (rel > 0.7) next()
      }
    }
  }
  const onDouble = () => setZoom((z) => (z > 1 ? 1 : 2))
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.max(1, Math.min(4, +(z - e.deltaY * 0.01).toFixed(2)))) }
  }

  const btn = (active: boolean): React.CSSProperties => ({ font: "500 13px " + FONT, color: active ? C.accTxt : C.txt, background: active ? C.acc : "transparent", border: "1px solid " + (active ? C.acc : C.line), borderRadius: 0, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap", flex: "0 0 auto", textDecoration: "none" })
  const ico: React.CSSProperties = { font: "500 18px " + FONT, color: C.txt, background: "transparent", border: "1px solid " + C.line, borderRadius: 0, width: 44, height: 44, cursor: "pointer", flex: "0 0 auto" }
  const anim = dir === 0 ? "none" : "acsSlide" + (dir > 0 ? "R" : "L") + (tick % 2) + " 320ms ease"
  const wrapStyle: React.CSSProperties = full
    ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: 99999 }
    : { position: "relative", width: "100%", height: "100%" }
  const pageStyle: React.CSSProperties = { width: pw, height: ph, display: "block", background: "#fffdf9", pointerEvents: "none" }

  if (!open || typeof document === "undefined") return <div style={{ width: 1, height: 1 }} />
  return createPortal(
    <div ref={root} tabIndex={0} style={{ ...wrapStyle, background: C.bg, color: C.txt, fontFamily: FONT, display: "flex", flexDirection: "column", overflow: "hidden", outline: "none", touchAction: "manipulation" }}>
      <style>{"@keyframes acsSlideR0{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}@keyframes acsSlideR1{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}@keyframes acsSlideL0{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}@keyframes acsSlideL1{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}.acs-scroll::-webkit-scrollbar{display:none}"}</style>
      {/* barre du haut */}
      <div className="acs-scroll" style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: C.panel, borderBottom: "1px solid " + C.line, overflowX: "auto", scrollbarWidth: "none" }}>
        {issues.map((it, i) => (<button key={it.n} style={btn(i === issue)} onClick={() => pick(i)}>{single ? "N°" + it.n : "N°" + it.n + " · " + it.date}</button>))}
        <span style={{ flex: 1 }} />
        {cur.ch.length > 0 && <button style={btn(toc)} onClick={() => setToc((t) => !t)}>Sommaire</button>}
        {cur.pdf && !single && <a style={btn(false)} href={cur.pdf} target="_blank" rel="noreferrer">PDF</a>}
        <button style={ico} aria-label={nat ? "Quitter le plein écran" : "Plein écran"} onClick={toggleFull}>{nat ? "⤡" : "⛶"}</button>
        <button style={ico} aria-label="Fermer" onClick={close}>✕</button>
      </div>
      {toc && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px", background: C.panel, borderBottom: "1px solid " + C.line }}>
          {cur.ch.map(([t, p]) => (<button key={t + p} style={{ ...btn(pages.includes(p)), padding: "6px 10px", fontSize: 12 }} onClick={() => { go(p); setToc(false) }}>{t} · p.{p}</button>))}
        </div>
      )}
      {/* scène */}
      <div ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble} onWheel={onWheel}
        style={{ position: "relative", flex: 1, minHeight: 0, overflow: zoom > 1 ? "auto" : "hidden", cursor: zoom > 1 ? "grab" : "pointer", touchAction: zoom > 1 ? "none" : "pan-y", userSelect: "none", WebkitUserSelect: "none", scrollbarWidth: "none" }} className="acs-scroll">
        <div style={{ minWidth: "100%", minHeight: "100%", width: Math.max(contentW + pad * 2, size.w), height: Math.max(ph + pad * 2, size.h), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div key={n + "-" + page + "-" + (single ? "s" : "d")} style={{ display: "flex", width: contentW, height: ph, animation: anim, boxShadow: "0 18px 44px rgba(0,0,0,0.55)", flex: "0 0 auto" }}>
            {pages.map((p) => cur.pdf
              ? <PagePdf key={p} url={cur.pdf} p={p} alt={"Semestriel N°" + n + ", page " + p} style={pageStyle} />
              : <img key={p} src={srcImg(n, p)} alt={"Semestriel N°" + n + ", page " + p} draggable={false} style={pageStyle} />)}
          </div>
        </div>
        {zoom <= 1.05 && page > 1 && (<div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.txt, background: "rgba(21,16,13,0.55)", width: 40, height: 56, display: "flex", alignItems: "center", justifyContent: "center", font: "500 24px " + FONT, pointerEvents: "none" }}>‹</div>)}
        {zoom <= 1.05 && pages[pages.length - 1] < TOTAL && (<div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.txt, background: "rgba(21,16,13,0.55)", width: 40, height: 56, display: "flex", alignItems: "center", justifyContent: "center", font: "500 24px " + FONT, pointerEvents: "none" }}>›</div>)}
      </div>
      {/* barre du bas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: C.panel, borderTop: "1px solid " + C.line }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...ico, opacity: page <= 1 ? 0.35 : 1 }} aria-label="Page précédente" onClick={prev} disabled={page <= 1}>‹</button>
          <button style={{ ...ico, opacity: pages[pages.length - 1] >= TOTAL ? 0.35 : 1 }} aria-label="Page suivante" onClick={next} disabled={pages[pages.length - 1] >= TOTAL}>›</button>
        </div>
        <span style={{ font: "500 13px " + FONT, color: C.mut, textAlign: "center" }}>{pages.length === 1 ? "Page " + pages[0] : "Pages " + pages[0] + "–" + pages[1]} / {TOTAL}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={ico} aria-label="Zoom arrière" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}>−</button>
          <button style={ico} aria-label="Zoom avant" onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))}>+</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
;(Visionneuse as any).defaultProps = { start: 4, width: 1120, height: 760 }
addPropertyControls(Visionneuse, { start: { type: ControlType.Number, title: "N° initial", min: 1, max: 20, step: 1, defaultValue: 4 } })
