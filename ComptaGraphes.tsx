// ComptaGraphes.tsx — petits graphiques SVG de la comptabilité (sans bibliothèque) :
// colonnes groupées (recettes / dépenses par mois ou par année), courbe (trésorerie),
// barres horizontales (répartition par poste). Survol : info-bulle ; au clavier : focus sur chaque groupe.
// Couleurs validées pour fond sombre (daltonisme compris) : recettes bleu, dépenses orange.
import * as React from "react"
import { C } from "./AcsBase.tsx"

export const SERIE = { recettes: "#3987e5", depenses: "#d95926", treso: "#9bbd8a" }
const GRILLE = "rgba(246,240,230,0.12)"
const eur0 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €"
const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

// graduations « propres » : 0 / 2 000 / 4 000… ou 0 / 10 k / 20 k
function graduations(max: number, min = 0) {
    const etendue = Math.max(1, max - min)
    const brut = etendue / 4, p = Math.pow(10, Math.floor(Math.log10(brut)))
    const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) || brut
    const bas = Math.floor(min / pas) * pas, haut = Math.ceil(max / pas) * pas
    const t: number[] = []
    for (let v = bas; v <= haut + pas / 2; v += pas) t.push(Math.round(v * 100) / 100)
    return t
}
const court = (v: number, max: number) => (Math.abs(max) >= 10000 ? (v === 0 ? "0" : `${Math.round(v / 1000).toLocaleString("fr-FR")} k`) : Math.round(v).toLocaleString("fr-FR"))

function useLargeur(min = 280) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [l, setL] = React.useState(640)
    React.useEffect(() => {
        if (!ref.current) return
        const ro = new ResizeObserver(([e]) => setL(Math.max(min, Math.round(e.contentRect.width))))
        ro.observe(ref.current); return () => ro.disconnect()
    }, [])
    return [ref, l] as const
}

export function Legende({ items }: { items: [string, string][] }) {
    return <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: C.mute, margin: "2px 0 8px" }}>
        {items.map(([t, c]) => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />{t}</span>)}
    </div>
}

function Bulle({ x, y, l, children }: { x: number; y: number; l: number; children: React.ReactNode }) {
    const gauche = x > l - 200
    return <div role="status" style={{ position: "absolute", top: Math.max(0, y), left: gauche ? undefined : x + 12, right: gauche ? l - x + 12 : undefined, background: "#15100d", border: `1px solid ${C.line}`, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.5, color: C.txt, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2, boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}>{children}</div>
}

// Colonnes groupées : une catégorie (mois, année) = un groupe de deux barres
export function Colonnes({ cats, series, hauteur = 220, titreBulle, clic }: { cats: string[]; series: { nom: string; couleur: string; valeurs: number[] }[]; hauteur?: number; titreBulle?: (i: number) => string; clic?: (i: number) => void }) {
    const [ref, L] = useLargeur()
    const [sel, setSel] = React.useState<number | null>(null)
    const max = Math.max(1, ...series.flatMap((s) => s.valeurs))
    const ticks = graduations(max), haut = ticks[ticks.length - 1] || 1
    const g = 46, d = 8, h = 18, b = 22
    const W = L - g - d, H = hauteur - h - b, bande = W / cats.length
    const ep = Math.min(24, Math.max(4, (bande * 0.7 - 2) / series.length))
    const y = (v: number) => h + H - (v / haut) * H
    const etiq = cats.length > 8 && L < 520 ? 2 : 1
    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }} onMouseLeave={() => setSel(null)}>
            <svg width={L} height={hauteur} role="img" aria-label={series.map((s) => s.nom).join(" et ")} style={{ display: "block", overflow: "visible" }}>
                {ticks.map((t) => <g key={t}><line x1={g} x2={L - d} y1={y(t)} y2={y(t)} stroke={GRILLE} strokeWidth={1} /><text x={g - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={C.mute}>{court(t, haut)}</text></g>)}
                {cats.map((c, i) => {
                    const x0 = g + i * bande + (bande - (ep * series.length + 2 * (series.length - 1))) / 2
                    return <g key={c}>
                        {sel === i && <rect x={g + i * bande} y={h} width={bande} height={H} fill="rgba(246,240,230,0.05)" />}
                        {series.map((s, k) => {
                            const v = s.valeurs[i] || 0, yy = y(v), hh = Math.max(0, h + H - yy), x = x0 + k * (ep + 2), r = Math.min(4, ep / 2, hh)
                            return hh > 0 ? <path key={s.nom} d={`M${x},${h + H} L${x},${yy + r} Q${x},${yy} ${x + r},${yy} L${x + ep - r},${yy} Q${x + ep},${yy} ${x + ep},${yy + r} L${x + ep},${h + H} Z`} fill={s.couleur} /> : null
                        })}
                        {i % etiq === 0 && <text x={g + i * bande + bande / 2} y={hauteur - 6} textAnchor="middle" fontSize={11} fill={C.mute}>{c}</text>}
                        <rect x={g + i * bande} y={h} width={bande} height={H + b} fill="transparent" tabIndex={0} aria-label={`${titreBulle ? titreBulle(i) : c} : ${series.map((s) => `${s.nom} ${eur(s.valeurs[i] || 0)}`).join(", ")}`}
                            onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onBlur={() => setSel(null)} onClick={() => clic && clic(i)} onKeyDown={(e) => { if (clic && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); clic(i) } }} style={{ outline: "none", cursor: clic ? "pointer" : "default" }} />
                    </g>
                })}
                <line x1={g} x2={L - d} y1={h + H} y2={h + H} stroke="rgba(246,240,230,0.3)" strokeWidth={1} />
            </svg>
            {sel != null && <Bulle x={g + sel * bande + bande / 2} y={h} l={L}>
                <b style={{ display: "block", marginBottom: 2 }}>{titreBulle ? titreBulle(sel) : cats[sel]}</b>
                {series.map((s) => <div key={s.nom} style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: s.couleur }} />{s.nom}<span style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums" }}>{eur(s.valeurs[sel] || 0)}</span></div>)}
                {series.length === 2 && <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 4, paddingTop: 4, display: "flex" }}>Solde<span style={{ marginLeft: "auto", paddingLeft: 12, fontVariantNumeric: "tabular-nums" }}>{eur((series[0].valeurs[sel] || 0) - (series[1].valeurs[sel] || 0))}</span></div>}
            </Bulle>}
        </div>
    )
}

// Courbe d'une seule série (trésorerie au jour le jour) ; x = jour de l'année 0..n
export function Courbe({ points, n, mois, hauteur = 200, couleur = SERIE.treso, etiquette }: { points: { j: number; v: number; date: string }[]; n: number; mois: string[]; hauteur?: number; couleur?: string; etiquette?: string }) {
    const [ref, L] = useLargeur()
    const [sel, setSel] = React.useState<number | null>(null)
    if (!points.length) return <div ref={ref} />
    const vs = points.map((p) => p.v), ticks = graduations(Math.max(...vs, 0), Math.min(...vs, 0))
    const bas = ticks[0], haut = ticks[ticks.length - 1]
    const g = 46, d = 14, h = 14, b = 22, W = L - g - d, H = hauteur - h - b
    const x = (j: number) => g + (j / Math.max(1, n - 1)) * W, y = (v: number) => h + H - ((v - bas) / Math.max(1, haut - bas)) * H
    // escalier : le solde reste constant jusqu'au mouvement suivant
    let dd = `M${x(points[0].j)},${y(points[0].v)}`
    for (let i = 1; i < points.length; i++) dd += ` H${x(points[i].j)} V${y(points[i].v)}`
    const der = points[points.length - 1]
    const proche = (px: number) => { const j = ((px - g) / W) * (n - 1); let best = 0; for (let i = 0; i < points.length; i++) if (points[i].j <= j) best = i; return best }
    return (
        <div ref={ref} style={{ position: "relative", width: "100%" }}>
            <svg width={L} height={hauteur} role="img" aria-label={etiquette || "Évolution"} style={{ display: "block", overflow: "visible" }}
                onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); setSel(proche(e.clientX - r.left)) }} onMouseLeave={() => setSel(null)}>
                {ticks.map((t) => <g key={t}><line x1={g} x2={L - d} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(246,240,230,0.3)" : GRILLE} strokeWidth={1} /><text x={g - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={C.mute}>{court(t, Math.max(Math.abs(bas), Math.abs(haut)))}</text></g>)}
                {mois.map((m, i) => <text key={m} x={x((i * (n - 1)) / 12 + (n - 1) / 24)} y={hauteur - 6} textAnchor="middle" fontSize={11} fill={C.mute}>{L < 520 && i % 2 ? "" : m}</text>)}
                <path d={`${dd} V${y(Math.max(bas, 0))} H${x(points[0].j)} Z`} fill={couleur} opacity={0.1} />
                <path d={dd} fill="none" stroke={couleur} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(der.j)} cy={y(der.v)} r={4.5} fill={couleur} stroke={C.panel} strokeWidth={2} />
                {sel != null && <><line x1={x(points[sel].j)} x2={x(points[sel].j)} y1={h} y2={h + H} stroke="rgba(246,240,230,0.35)" strokeWidth={1} /><circle cx={x(points[sel].j)} cy={y(points[sel].v)} r={4.5} fill={couleur} stroke={C.panel} strokeWidth={2} /></>}
            </svg>
            {sel != null && <Bulle x={x(points[sel].j)} y={h} l={L}><b style={{ display: "block" }}>{points[sel].date}</b>{etiquette || "Solde"} : <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(points[sel].v)}</span></Bulle>}
        </div>
    )
}

// Barres horizontales (une série) : répartition par poste, valeur au bout
export function Barres({ lignes, couleur, total, clic }: { lignes: { t: string; v: number; sous?: string }[]; couleur: string; total?: number; clic?: (l: { t: string; v: number; sous?: string }) => void }) {
    const max = Math.max(1, ...lignes.map((l) => l.v)), tot = total ?? lignes.reduce((s, l) => s + l.v, 0)
    return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 9 }}>
        {lignes.map((l) => <div key={l.t} title={`${l.t} : ${eur(l.v)}${clic ? " · cliquer pour voir les écritures" : ""}`} role={clic ? "button" : undefined} tabIndex={clic ? 0 : undefined} onClick={() => clic && clic(l)} onKeyDown={(e) => { if (clic && e.key === "Enter") clic(l) }} style={{ cursor: clic ? "pointer" : "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, marginBottom: 3 }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.t}{l.sous && <span style={{ color: C.mute }}> · {l.sous}</span>}</span>
                <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{eur0(l.v)}<span style={{ color: C.mute, fontSize: 12, marginLeft: 6 }}>{tot ? Math.round((100 * l.v) / tot) : 0} %</span></span>
            </div>
            <div style={{ height: 8, background: "rgba(246,240,230,0.06)", borderRadius: 4 }}><div style={{ width: `${(100 * l.v) / max}%`, height: "100%", background: couleur, borderRadius: "0 4px 4px 0", minWidth: l.v > 0 ? 3 : 0 }} /></div>
        </div>)}
    </div>
}
