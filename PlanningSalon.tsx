// PlanningSalon.tsx — tâches des bénévoles du salon (espace membre + administration) et rétroplanning du bureau
// Les membres s'inscrivent eux-mêmes sur les tâches, et peuvent inscrire le conjoint renseigné dans leur fiche.
// Le bureau gère les postes, les créneaux, les inscrits et la liste des tâches de préparation (rétroplanning).
import * as React from "react"
import { createPortal } from "react-dom"
import { C, font, serif } from "./AcsBase.tsx"

// ---------- styles (mêmes que l'espace membre) ----------
const box: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: "clamp(18px, 4vw, 28px)", color: C.txt, ...font }
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", colorScheme: "dark", background: C.bg, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 0, padding: "9px 11px", font: "inherit", fontSize: 14, outline: "none" }
const etiquette: React.CSSProperties = { display: "block", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "0 0 6px" }
const bouton = (plein = true): React.CSSProperties => ({ background: plein ? C.accent : "transparent", color: plein ? C.accentDark : C.txt, border: plein ? "none" : `1px solid ${C.line}`, borderRadius: 0, padding: "10px 16px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" })
const petit = (danger = false): React.CSSProperties => ({ background: "transparent", color: danger ? C.danger : C.txt, border: `1px solid ${danger ? C.danger : C.line}`, borderRadius: 0, padding: "5px 10px", font: "inherit", fontSize: 13, cursor: "pointer" })
const titre2: React.CSSProperties = { fontFamily: serif, fontSize: 22, lineHeight: 1.2, margin: "0 0 6px", fontWeight: 600 }
const discret: React.CSSProperties = { color: C.mute, margin: 0 }
const ORANGE = "#d9a441"

// ---------- dates et heures ----------
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
const dt = (d: string) => new Date(d + "T12:00:00")
export const jourFr = (d: string, annee = false) => { const x = dt(d); const s = `${JOURS[x.getDay()]} ${x.getDate()} ${MOIS[x.getMonth()]}${annee ? " " + x.getFullYear() : ""}`; return s.charAt(0).toUpperCase() + s.slice(1) }
export const heure = (t: string) => { const [h, m] = String(t).split(":"); return `${Number(h)} h${m && m !== "00" ? " " + m : ""}` }
const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
export const ajouterJours = (d: string, n: number) => { const x = dt(d); x.setDate(x.getDate() + n); return iso(x) }
const aujourdhui = () => iso(new Date())
const compact = (d: string, t?: string) => d.replace(/-/g, "") + (t ? "T" + String(t).slice(0, 5).replace(":", "") + "00" : "")
export const echeanceTache = (dateSalon: string, semaines: number) => ajouterJours(dateSalon, -7 * semaines)

// ---------- ajout à un agenda personnel ----------
type EvtAgenda = { titre: string; jour: string; jourFin?: string; debut?: string; fin?: string; lieu?: string; details?: string }
export function lienGoogle(e: EvtAgenda) {
    const dates = e.debut ? `${compact(e.jour, e.debut)}/${compact(e.jour, e.fin || e.debut)}` : `${compact(e.jour)}/${compact(ajouterJours(e.jourFin || e.jour, 1))}`
    const p = new URLSearchParams({ action: "TEMPLATE", text: e.titre, dates, ctz: "Europe/Paris" })
    if (e.lieu) p.set("location", e.lieu)
    if (e.details) p.set("details", e.details)
    return "https://calendar.google.com/calendar/render?" + p.toString()
}
const echap = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n")
export function telechargerIcs(evts: EvtAgenda[], fichier: string) {
    const lignes = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ACS//Salon//FR", "CALSCALE:GREGORIAN"]
    const maintenant = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
    evts.forEach((e, i) => {
        lignes.push("BEGIN:VEVENT", `UID:acs-${compact(e.jour, e.debut)}-${i}-${Math.random().toString(36).slice(2, 8)}@acs`, `DTSTAMP:${maintenant}`)
        if (e.debut) lignes.push(`DTSTART;TZID=Europe/Paris:${compact(e.jour, e.debut)}`, `DTEND;TZID=Europe/Paris:${compact(e.jour, e.fin || e.debut)}`)
        else lignes.push(`DTSTART;VALUE=DATE:${compact(e.jour)}`, `DTEND;VALUE=DATE:${compact(ajouterJours(e.jourFin || e.jour, 1))}`)
        lignes.push(`SUMMARY:${echap(e.titre)}`)
        if (e.lieu) lignes.push(`LOCATION:${echap(e.lieu)}`)
        if (e.details) lignes.push(`DESCRIPTION:${echap(e.details)}`)
        lignes.push("END:VEVENT")
    })
    lignes.push("END:VCALENDAR")
    const url = URL.createObjectURL(new Blob([lignes.join("\r\n")], { type: "text/calendar;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = fichier; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ---------- données ----------
type Reglage = { edition: number; date_debut?: string | null; date_fin?: string | null; planning_ouvert?: boolean }
type Poste = { id: string; nom: string; description?: string | null; ordre: number; actif: boolean }
type Creneau = { id: string; edition: number; poste_id: string; jour: string; debut: string; fin: string; places: number; note?: string | null }
type Inscrit = { id: string; creneau_id: string; adherent_id: string; conjoint: boolean; nom: string }

async function chargerPlanning(client: any) {
    const r = await client.from("salon_reglages").select("*").order("edition", { ascending: false }).limit(1)
    if (r.error) return { err: /salon_|schema cache|exist|column/i.test(r.error.message) ? "Les tâches des bénévoles seront disponibles dès que la base aura été mise à jour." : r.error.message }
    const reg: Reglage = r.data?.[0] ?? { edition: new Date().getFullYear() + 1 }
    const [p, c, i] = await Promise.all([
        client.from("salon_postes").select("*").order("ordre"),
        client.from("salon_creneaux").select("*").eq("edition", reg.edition).order("jour").order("debut"),
        client.rpc("planning_salon", { ed: reg.edition }),
    ])
    const e = p.error || c.error || i.error
    if (e) return { err: /salon_|schema cache|exist|function/i.test(e.message) ? "Les tâches des bénévoles seront disponibles dès que la base aura été mise à jour." : e.message }
    return { reg, postes: (p.data ?? []) as Poste[], creneaux: (c.data ?? []) as Creneau[], inscrits: (i.data ?? []) as Inscrit[] }
}

const LIEU_SALON = "Salle polyvalente, Bédée (35)"
const titreCreneau = (c: Creneau, postes: Poste[]) => `Salon ACS · ${postes.find((p) => p.id === c.poste_id)?.nom ?? "Bénévolat"}`

// regroupe par jour puis par poste (dans l'ordre des postes)
function grouper(creneaux: Creneau[], postes: Poste[]) {
    const jours = [...new Set(creneaux.map((c) => c.jour))].sort()
    const rang = (id: string) => { const p = postes.find((x) => x.id === id); return p ? p.ordre : 9999 }
    return jours.map((j) => {
        const du = creneaux.filter((c) => c.jour === j)
        const ids = [...new Set(du.map((c) => c.poste_id))].sort((a, b) => rang(a) - rang(b))
        return { jour: j, postes: ids.map((id) => ({ poste: postes.find((p) => p.id === id), creneaux: du.filter((c) => c.poste_id === id).sort((a, b) => a.debut.localeCompare(b.debut)) })) }
    })
}

// ---------- version imprimable ----------
export function imprimerPlanning(reg: Reglage, postes: Poste[], creneaux: Creneau[], inscrits: Inscrit[]) {
    const w = window.open("", "_blank")
    if (!w) return window.alert("Autorisez l’ouverture de fenêtres pour imprimer la liste.")
    const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    const corps = grouper(creneaux, postes).map((g) => `<h2>${esc(jourFr(g.jour, true))}</h2><table><thead><tr><th>Tâche</th><th>Horaire</th><th>Bénévoles</th></tr></thead><tbody>${g.postes.map((p) => p.creneaux.map((c, k) => {
        const noms = inscrits.filter((i) => i.creneau_id === c.id).map((i) => esc(i.nom))
        const vides = Math.max(0, c.places - noms.length)
        return `<tr>${k === 0 ? `<td rowspan="${p.creneaux.length}" class="poste">${esc(p.poste?.nom ?? "")}</td>` : ""}<td class="h">${heure(c.debut)} – ${heure(c.fin)}${c.note ? `<br><small>${esc(c.note)}</small>` : ""}</td><td>${noms.join(" · ")}${vides ? `<span class="vide">${"&nbsp;".repeat(1)}${Array(vides).fill("<i></i>").join("")}</span>` : ""}</td></tr>`
    }).join("")).join("")}</tbody></table>`).join("")
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Tâches des bénévoles · Salon ${reg.edition}</title><style>
        body{font:13px/1.45 Arial,sans-serif;color:#111;margin:18mm 14mm}h1{font-size:20px;margin:0 0 2px}p.s{margin:0 0 14px;color:#555}
        h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}table{border-collapse:collapse;width:100%;page-break-inside:auto}
        th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eee;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        td.poste{font-weight:bold;width:28%}td.h{white-space:nowrap;width:17%}small{color:#555}.vide i{display:inline-block;width:110px;border-bottom:1px dotted #777;height:14px;margin-left:8px}
        tr{page-break-inside:avoid}@page{size:A4;margin:0}
    </style></head><body><h1>Tâches des bénévoles · Salon ${reg.edition}</h1><p class="s">${reg.date_debut ? esc(jourFr(reg.date_debut, true)) + (reg.date_fin && reg.date_fin !== reg.date_debut ? " – " + esc(jourFr(reg.date_fin, true)) : "") + " · " : ""}Imprimé le ${new Date().toLocaleDateString("fr-FR")}. Les pointillés sont les places encore libres.</p>${corps || "<p>Aucun créneau.</p>"}<script>window.onload=function(){window.print()}</script></body></html>`)
    w.document.close()
}

// ======================================================================
// Tâches des bénévoles : vue « agenda » (colonnes = jours, lignes = heures)
// ======================================================================
const DEBUT_DEFAUT = 8, FIN_DEFAUT = 19
const minutes = (t: string) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0) }

// place les tâches d'une journée côte à côte quand elles se chevauchent
function colonnes(l: Creneau[]) {
    const tri = [...l].sort((a, b) => a.debut.localeCompare(b.debut) || b.fin.localeCompare(a.fin))
    const res: { c: Creneau; voie: number; nb: number }[] = []
    let groupe: { c: Creneau; voie: number; nb: number }[] = [], finGroupe = -1, voies: number[] = []
    const clore = () => { const n = Math.max(1, voies.length); groupe.forEach((g) => (g.nb = n)); res.push(...groupe); groupe = []; voies = [] }
    for (const c of tri) {
        const d = minutes(c.debut), f = minutes(c.fin)
        if (d >= finGroupe && groupe.length) clore()
        let v = voies.findIndex((fin) => fin <= d)
        if (v < 0) { v = voies.length; voies.push(f) } else voies[v] = f
        groupe.push({ c, voie: v, nb: 1 }); finGroupe = Math.max(finGroupe, f)
    }
    clore()
    return res
}

function useLargeur(): [(el: HTMLDivElement | null) => void, number] {
    const [w, setW] = React.useState(1000)
    const ro = React.useRef<ResizeObserver | null>(null)
    const ref = React.useCallback((el: HTMLDivElement | null) => {
        ro.current?.disconnect()
        if (!el) return
        ro.current = new ResizeObserver(() => setW(el.clientWidth)); ro.current.observe(el); setW(el.clientWidth)
    }, [])
    return [ref, w]
}

function Grille({ jours, creneaux, postes, inscrits, moiId, ouvrir }: { jours: string[]; creneaux: Creneau[]; postes: Poste[]; inscrits: Inscrit[]; moiId?: string; ouvrir: (c: Creneau) => void }) {
    const [ref, w] = useLargeur()
    const etroit = w < 640
    const [jourSel, setJourSel] = React.useState("")
    const visibles = etroit ? [jours.includes(jourSel) ? jourSel : (jours.find((j) => creneaux.some((c) => c.jour === j)) ?? jours[0])] : jours
    const hDeb = Math.min(DEBUT_DEFAUT, ...creneaux.map((c) => Math.floor(minutes(c.debut) / 60)))
    const hFin = Math.max(FIN_DEFAUT, ...creneaux.map((c) => Math.ceil(minutes(c.fin) / 60)))
    const H = etroit ? 64 : 58 // hauteur d'une heure
    const heures = Array.from({ length: hFin - hDeb }, (_, i) => hDeb + i)
    const gauche = 46
    const nomPoste = (id: string) => postes.find((p) => p.id === id)?.nom ?? "Tâche"
    return (
        <div ref={ref} style={{ width: "100%", minWidth: 0 }}>
            {etroit && jours.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(jours.length, 4)}, minmax(0,1fr))`, gap: 6, marginBottom: 10 }}>
                    {jours.map((j) => { const a = j === visibles[0]; const x = dt(j); return <button key={j} onClick={() => setJourSel(j)} style={{ ...petit(), padding: "8px 4px", lineHeight: 1.2, background: a ? C.accent : "transparent", color: a ? C.accentDark : C.txt, borderColor: a ? C.accent : C.line, fontWeight: 600 }}>{JOURS[x.getDay()].slice(0, 3).replace(/^./, (s) => s.toUpperCase())}<span style={{ display: "block", fontSize: 17 }}>{x.getDate()}</span></button> })}
                </div>
            )}
            <div style={{ border: `1px solid ${C.line}`, background: C.bg }}>
                {/* en-têtes des jours */}
                <div style={{ display: "grid", gridTemplateColumns: `${gauche}px repeat(${visibles.length}, minmax(0,1fr))`, borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.bg, zIndex: 2 }}>
                    <div />
                    {visibles.map((j) => { const x = dt(j); const besoin = creneaux.filter((c) => c.jour === j).reduce((a, c) => a + Math.max(0, c.places - inscrits.filter((i) => i.creneau_id === c.id).length), 0); return (
                        <div key={j} style={{ padding: "10px 8px", borderLeft: `1px solid ${C.line}`, textAlign: "center" }}>
                            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.mute }}>{JOURS[x.getDay()]}</div>
                            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>{x.getDate()} {MOIS[x.getMonth()].slice(0, 4)}{MOIS[x.getMonth()].length > 4 ? "." : ""}</div>
                            <div style={{ fontSize: 12, color: besoin ? ORANGE : C.accent, marginTop: 2 }}>{creneaux.some((c) => c.jour === j) ? (besoin ? `${besoin} place${besoin > 1 ? "s" : ""} à prendre` : "tout est pourvu") : "rien de prévu"}</div>
                        </div>
                    ) })}
                </div>
                {/* corps : lignes horaires */}
                <div style={{ display: "grid", gridTemplateColumns: `${gauche}px repeat(${visibles.length}, minmax(0,1fr))`, position: "relative" }}>
                    <div style={{ position: "relative", height: heures.length * H }}>
                        {heures.map((h, i) => <div key={h} style={{ position: "absolute", top: i * H - 7, right: 6, fontSize: 11.5, color: C.mute, fontVariantNumeric: "tabular-nums" }}>{i === 0 ? "" : `${h} h`}</div>)}
                    </div>
                    {visibles.map((j) => (
                        <div key={j} style={{ position: "relative", height: heures.length * H, borderLeft: `1px solid ${C.line}`, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${H - 1}px, rgba(246,240,230,0.09) ${H - 1}px, rgba(246,240,230,0.09) ${H}px)` }}>
                            {colonnes(creneaux.filter((c) => c.jour === j)).map(({ c, voie, nb }) => {
                                const ici = inscrits.filter((i) => i.creneau_id === c.id)
                                const manque = Math.max(0, c.places - ici.length)
                                const moi = !!moiId && ici.some((i) => i.adherent_id === moiId)
                                const top = ((minutes(c.debut) - hDeb * 60) / 60) * H
                                const haut = Math.max(34, ((minutes(c.fin) - minutes(c.debut)) / 60) * H - 3)
                                const fond = moi ? C.accent : manque ? "rgba(155,189,138,0.16)" : "rgba(246,240,230,0.07)"
                                const bord = moi ? C.accent : manque ? C.accent : "rgba(246,240,230,0.3)"
                                const texte = moi ? C.accentDark : C.txt
                                return (
                                    <button key={c.id} onClick={() => ouvrir(c)} title={`${nomPoste(c.poste_id)} · ${heure(c.debut)} – ${heure(c.fin)}`}
                                        style={{ position: "absolute", top: top + 1, height: haut, left: `calc(${(voie / nb) * 100}% + 3px)`, width: `calc(${100 / nb}% - 6px)`, boxSizing: "border-box", background: fond, color: texte, border: "none", borderLeft: `4px solid ${bord}`, borderRadius: 0, padding: "5px 7px", textAlign: "left", font: "inherit", cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: haut < 60 ? "nowrap" : "normal" }}>{nomPoste(c.poste_id)}</span>
                                        <span style={{ fontSize: 12, opacity: 0.85, whiteSpace: "nowrap" }}>{heure(c.debut)} – {heure(c.fin)}</span>
                                        {haut >= 56 && <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: moi ? C.accentDark : manque ? C.accent : C.mute }}>{moi ? "✓ vous y êtes" : manque ? `${ici.length}/${c.places} · ${manque} à trouver` : `complet · ${c.places}/${c.places}`}</span>}
                                        {haut >= 100 && ici.length > 0 && <span style={{ fontSize: 11.5, opacity: 0.8, lineHeight: 1.3 }}>{ici.map((i) => i.nom.split(" ")[0]).join(", ")}</span>}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// fenêtre de détail d'une tâche (membre ou admin)
function Fiche({ fermer, children }: { fermer: () => void; children: React.ReactNode }) {
    React.useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && fermer(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f) }, [])
    if (typeof document === "undefined") return null
    return createPortal(
        <div onClick={fermer} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,8,6,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...box, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                <button onClick={fermer} aria-label="Fermer" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: "none", color: C.mute, fontSize: 26, lineHeight: 1, cursor: "pointer" }}>×</button>
                {children}
            </div>
        </div>,
        document.body,
    )
}

function EnteteFiche({ c, postes, ici }: { c: Creneau; postes: Poste[]; ici: Inscrit[] }) {
    const p = postes.find((x) => x.id === c.poste_id)
    const manque = Math.max(0, c.places - ici.length)
    return <>
        <span style={etiquette}>{jourFr(c.jour)} · {heure(c.debut)} – {heure(c.fin)}</span>
        <h3 style={{ ...titre2, paddingRight: 30 }}>{p?.nom ?? "Tâche"}</h3>
        {(p?.description || c.note) && <p style={{ ...discret, fontSize: 14, marginBottom: 8 }}>{[p?.description, c.note].filter(Boolean).join(" · ")}</p>}
        <p style={{ margin: "10px 0 6px", fontSize: 15 }}><b>Besoin : {c.places} personne{c.places > 1 ? "s" : ""}</b> <span style={{ color: manque ? ORANGE : C.accent }}>· {manque ? `il en manque ${manque}` : "complet"}</span></p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {ici.map((i) => <span key={i.id} style={{ fontSize: 14, border: `1px solid ${C.line}`, padding: "4px 10px" }}>{i.nom}</span>)}
            {Array.from({ length: manque }).map((_, k) => <span key={k} style={{ fontSize: 14, border: `1px dashed ${C.line}`, padding: "4px 10px", color: C.mute }}>place libre</span>)}
        </div>
    </>
}

const joursDuSalon = (reg: Reglage, creneaux: Creneau[]) => {
    const s = new Set(creneaux.map((c) => c.jour))
    if (reg.date_debut) { let x = ajouterJours(reg.date_debut, -1); const fin = ajouterJours(reg.date_fin || reg.date_debut, 1); while (x <= fin) { s.add(x); x = ajouterJours(x, 1) } }
    return [...s].sort()
}

// ======================================================================
// Espace membre : bloc « Tâches des bénévoles » dans la fiche du salon (onglet Événements)
// ======================================================================
let cacheReglage: Promise<any> | null = null
export function TachesBenevoles({ client, moi, evenement }: { client: any; moi: any; evenement: any }) {
    const [reg, setReg] = React.useState<Reglage | null>(null)
    const [d, setD] = React.useState<any>(null)
    const [ouvert, setOuvert] = React.useState(false)
    const [fiche, setFiche] = React.useState<Creneau | null>(null)
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [occupe, setOccupe] = React.useState(false)
    React.useEffect(() => {
        if (!cacheReglage) cacheReglage = client.from("salon_reglages").select("*").order("edition", { ascending: false }).limit(1)
        cacheReglage.then((r: any) => setReg(r?.data?.[0] ?? null))
    }, [])
    const recharger = React.useCallback(async () => setD(await chargerPlanning(client)), [client])
    // ce bloc ne s'affiche que sous l'événement du salon (dates qui se recoupent)
    const estSalon = !!reg?.date_debut && !!evenement?.date_debut && evenement.date_debut <= (reg.date_fin || reg.date_debut) && (evenement.date_fin || evenement.date_debut) >= reg.date_debut
    React.useEffect(() => { if (estSalon) recharger() }, [estSalon])
    if (!estSalon || !d || d.err) return null
    const { postes, creneaux, inscrits } = d as { postes: Poste[]; creneaux: Creneau[]; inscrits: Inscrit[] }
    const r = d.reg as Reglage
    if (!creneaux.length) return <p style={{ ...discret, fontSize: 14, marginTop: 14, gridColumn: "1 / -1" }}>Tâches des bénévoles : le bureau prépare la liste, elle apparaîtra ici.</p>
    const conjoint = String(moi?.conjoint || "").trim()
    const besoin = creneaux.reduce((a, c) => a + Math.max(0, c.places - inscrits.filter((i) => i.creneau_id === c.id).length), 0)
    const mes = creneaux.filter((c) => inscrits.some((i) => i.creneau_id === c.id && i.adherent_id === moi.id)).sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut))
    const ouvertes = r.planning_ouvert !== false
    const versAgenda = (c: Creneau): EvtAgenda => ({ titre: titreCreneau(c, postes), jour: c.jour, debut: c.debut, fin: c.fin, lieu: evenement.lieu || LIEU_SALON, details: `Bénévole au salon ${r.edition}${c.note ? " · " + c.note : ""}` })
    const agir = async (c: Creneau, pourConjoint: boolean, retirer: boolean) => {
        setOccupe(true); setMsg(null)
        const { error } = retirer
            ? await client.from("salon_benevoles").delete().eq("creneau_id", c.id).eq("adherent_id", moi.id).eq("conjoint", pourConjoint)
            : await client.from("salon_benevoles").insert({ creneau_id: c.id, adherent_id: moi.id, conjoint: pourConjoint })
        setOccupe(false)
        if (error) setMsg({ t: /complet/i.test(error.message) ? "Cette tâche vient d’être complétée, choisissez-en une autre." : /row-level|policy/i.test(error.message) ? "Les inscriptions sont fermées pour le moment." : error.message, err: true })
        else setMsg({ t: retirer ? "C’est retiré." : "C’est noté, merci !", err: false })
        recharger()
    }
    const ficheIci = fiche ? inscrits.filter((i) => i.creneau_id === fiche.id) : []
    const moiIci = ficheIci.some((i) => i.adherent_id === moi.id && !i.conjoint)
    const luiIci = ficheIci.some((i) => i.adherent_id === moi.id && i.conjoint)
    const complet = fiche ? ficheIci.length >= fiche.places : false
    return (
        <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${C.line}`, paddingTop: 16, marginTop: 4 }}>
            <button onClick={() => setOuvert(!ouvert)} style={{ ...bouton(!ouvert), width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left" }}>
                <span>Tâches des bénévoles <span style={{ fontWeight: 400 }}>· {besoin ? `${besoin} place${besoin > 1 ? "s" : ""} à prendre` : "tout est pourvu"}{mes.length ? ` · vous : ${mes.length}` : ""}</span></span>
                <span aria-hidden>{ouvert ? "▲" : "▼"}</span>
            </button>
            {ouvert && <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                <p style={{ ...discret, fontSize: 14 }}>Touchez une tâche pour voir qui y est et vous inscrire{conjoint ? `, vous ou ${conjoint}` : ""}. {ouvertes ? "" : "Les inscriptions sont fermées pour le moment."}</p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: C.mute }}>
                    <span><i style={{ display: "inline-block", width: 12, height: 12, background: C.accent, verticalAlign: -1, marginRight: 6 }} />vous y êtes</span>
                    <span><i style={{ display: "inline-block", width: 12, height: 12, background: "rgba(155,189,138,0.16)", borderLeft: `3px solid ${C.accent}`, verticalAlign: -1, marginRight: 6 }} />il manque du monde</span>
                    <span><i style={{ display: "inline-block", width: 12, height: 12, background: "rgba(246,240,230,0.07)", borderLeft: "3px solid rgba(246,240,230,0.3)", verticalAlign: -1, marginRight: 6 }} />complet</span>
                </div>
                <Grille jours={joursDuSalon(r, creneaux)} creneaux={creneaux} postes={postes} inscrits={inscrits} moiId={moi.id} ouvrir={(c) => { setMsg(null); setFiche(c) }} />
                {mes.length > 0 && (
                    <div style={{ border: `1px solid ${C.line}`, padding: "12px 14px" }}>
                        <span style={etiquette}>Mes tâches</span>
                        {mes.map((c) => (
                            <div key={c.id} style={{ display: "flex", gap: "6px 12px", alignItems: "center", flexWrap: "wrap", padding: "7px 0", borderTop: `1px solid ${C.line}` }}>
                                <span style={{ flex: "1 1 220px", fontSize: 14 }}><b style={{ fontWeight: 600 }}>{postes.find((p) => p.id === c.poste_id)?.nom}</b> · {jourFr(c.jour)}, {heure(c.debut)} – {heure(c.fin)}</span>
                                <a href={lienGoogle(versAgenda(c))} target="_blank" rel="noopener" style={{ ...petit(), textDecoration: "none" }}>+ Google Agenda</a>
                            </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                            <button style={petit()} onClick={() => telechargerIcs(mes.map(versAgenda), `mes-taches-salon-${r.edition}.ics`)}>Tout ajouter à mon agenda (Apple, Outlook…)</button>
                        </div>
                    </div>
                )}
                <div><button style={petit()} onClick={() => imprimerPlanning(r, postes, creneaux, inscrits)}>Imprimer la liste des tâches</button></div>
            </div>}
            {fiche && (
                <Fiche fermer={() => setFiche(null)}>
                    <EnteteFiche c={fiche} postes={postes} ici={ficheIci} />
                    {ouvertes ? <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                        {moiIci ? <button style={{ ...petit(true), padding: "11px 14px", fontSize: 15 }} disabled={occupe} onClick={() => agir(fiche, false, true)}>Je me retire</button>
                            : <button style={{ ...bouton(), opacity: complet ? 0.45 : 1 }} disabled={complet || occupe} onClick={() => agir(fiche, false, false)}>{complet ? "Complet" : "Je m’inscris"}</button>}
                        {conjoint && (luiIci ? <button style={{ ...petit(true), padding: "11px 14px", fontSize: 15 }} disabled={occupe} onClick={() => agir(fiche, true, true)}>Retirer {conjoint}</button>
                            : <button style={{ ...bouton(false), opacity: complet ? 0.45 : 1 }} disabled={complet || occupe} onClick={() => agir(fiche, true, false)}>{moiIci ? "Inscrire aussi" : "Inscrire"} {conjoint}</button>)}
                        {(moiIci || luiIci) && <a href={lienGoogle(versAgenda(fiche))} target="_blank" rel="noopener" style={{ ...petit(), textDecoration: "none", textAlign: "center", padding: "10px 14px" }}>+ Ajouter à Google Agenda</a>}
                    </div> : <p style={{ ...discret, marginTop: 12, color: ORANGE }}>Les inscriptions sont fermées pour le moment.</p>}
                    {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
                </Fiche>
            )}
        </div>
    )
}

// ======================================================================
// Administration : tâches des bénévoles
// ======================================================================
export function TachesAdmin({ client, etroit }: { client: any; etroit: boolean }) {
    const [d, setD] = React.useState<any>(null)
    const [adh, setAdh] = React.useState<any[]>([])
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [form, setForm] = React.useState<any>({ poste_id: "", jour: "", debut: "09:00", fin: "12:00", places: 2, note: "" })
    const [ajout, setAjout] = React.useState("")
    const [nouveauPoste, setNouveauPoste] = React.useState("")
    const [voirPostes, setVoirPostes] = React.useState(false)
    const [fiche, setFiche] = React.useState<Creneau | null>(null)
    const recharger = React.useCallback(async () => setD(await chargerPlanning(client)), [client])
    React.useEffect(() => { recharger(); client.from("adherents").select("id,prenom,nom,conjoint,actif").order("nom").then(({ data }: any) => setAdh((data ?? []).filter((a: any) => a.actif !== false))) }, [recharger])
    if (!d) return <div style={box}><p style={discret}>Chargement…</p></div>
    if (d.err) return <div style={box}><p style={discret}>{d.err}</p></div>
    const { reg, postes, creneaux, inscrits } = d as { reg: Reglage; postes: Poste[]; creneaux: Creneau[]; inscrits: Inscrit[] }
    const err = (e: any, ok?: string) => { if (e) setMsg({ t: /complet/i.test(e.message) ? "C’est complet : augmentez d’abord le nombre de personnes nécessaires." : /duplicate|unique/i.test(e.message) ? "Cette personne est déjà inscrite sur cette tâche." : e.message, err: true }); else if (ok) setMsg({ t: ok, err: false }); recharger() }
    const jours = joursDuSalon(reg, creneaux)
    const jourForm = form.jour || (reg.date_debut ? ajouterJours(reg.date_debut, -1) : "")
    const actifs = postes.filter((p) => p.actif)
    const posteForm = form.poste_id || actifs[0]?.id || ""
    const ajouterTache = async () => {
        if (!posteForm || !jourForm || !form.debut || !form.fin) return setMsg({ t: "Choisissez la tâche, le jour et les horaires.", err: true })
        if (form.fin <= form.debut) return setMsg({ t: "L’heure de fin doit être après l’heure de début.", err: true })
        const { error } = await client.from("salon_creneaux").insert({ edition: reg.edition, poste_id: posteForm, jour: jourForm, debut: form.debut, fin: form.fin, places: Number(form.places) || 1, note: form.note || null })
        err(error, "Ajouté au tableau.")
    }
    const copierPrecedente = async () => {
        const r = await client.from("salon_reglages").select("*").lt("edition", reg.edition).order("edition", { ascending: false }).limit(1)
        const prec = r.data?.[0]
        if (!prec?.date_debut || !reg.date_debut) return setMsg({ t: "Il faut les dates de ce salon et du précédent pour recopier les tâches.", err: true })
        const { data } = await client.from("salon_creneaux").select("*").eq("edition", prec.edition)
        if (!data?.length) return setMsg({ t: `Aucune tâche en ${prec.edition}.`, err: true })
        const decalage = Math.round((dt(reg.date_debut).getTime() - dt(prec.date_debut).getTime()) / 86400000)
        if (!window.confirm(`Recopier les ${data.length} tâches du salon ${prec.edition} aux dates de ${reg.edition} ? (sans les inscrits)`)) return
        const { error } = await client.from("salon_creneaux").insert(data.map((c: any) => ({ edition: reg.edition, poste_id: c.poste_id, jour: ajouterJours(c.jour, decalage), debut: c.debut, fin: c.fin, places: c.places, note: c.note })))
        err(error, "Tâches recopiées.")
    }
    const majCreneau = async (c: Creneau, champs: any) => { const { error } = await client.from("salon_creneaux").update(champs).eq("id", c.id); setFiche({ ...c, ...champs }); err(error) }
    const supprimerCreneau = async (c: Creneau) => {
        const n = inscrits.filter((i) => i.creneau_id === c.id).length
        if (!window.confirm(`Supprimer cette tâche${n ? ` et ses ${n} inscrit${n > 1 ? "s" : ""}` : ""} ?`)) return
        const { error } = await client.from("salon_creneaux").delete().eq("id", c.id); setFiche(null); err(error, "Tâche supprimée.")
    }
    const inscrire = async (c: Creneau, choix: string) => {
        const [id, cj] = choix.split("|")
        const { error } = await client.from("salon_benevoles").insert({ creneau_id: c.id, adherent_id: id, conjoint: cj === "1" })
        setAjout(""); err(error)
    }
    const retirer = async (i: Inscrit) => { if (!window.confirm(`Retirer ${i.nom} ?`)) return; const { error } = await client.from("salon_benevoles").delete().eq("id", i.id); err(error) }
    const majReg = async (champs: any) => { const { error } = await client.from("salon_reglages").update(champs).eq("edition", reg.edition); err(error) }
    const majPoste = async (p: Poste, champs: any) => { const { error } = await client.from("salon_postes").update(champs).eq("id", p.id); err(error) }
    const ajouterPoste = async () => { if (nouveauPoste.trim().length < 2) return; const { error } = await client.from("salon_postes").insert({ nom: nouveauPoste.trim(), ordre: (Math.max(0, ...postes.map((p) => p.ordre)) + 10) }); setNouveauPoste(""); err(error, "Ajouté à la liste.") }
    const supprimerPoste = async (p: Poste) => {
        const n = creneaux.filter((c) => c.poste_id === p.id).length
        if (n) return setMsg({ t: `« ${p.nom} » est utilisé ${n} fois cette année : décochez « proposé » plutôt que de le supprimer.`, err: true })
        if (!window.confirm(`Supprimer « ${p.nom} » de la liste ?`)) return
        const { error } = await client.from("salon_postes").delete().eq("id", p.id); err(error)
    }
    const besoinTot = creneaux.reduce((a, c) => a + c.places, 0)
    const manqueTot = creneaux.reduce((a, c) => a + Math.max(0, c.places - inscrits.filter((i) => i.creneau_id === c.id).length), 0)
    const nbBenevoles = new Set(inscrits.map((i) => i.adherent_id + (i.conjoint ? "c" : ""))).size
    // personnes proposées : adhérents et conjoints renseignés, par ordre alphabétique du nom affiché
    const choixPersonnes = adh.flatMap((a) => { const n = [a.prenom, a.nom].filter(Boolean).join(" ") || "(sans nom)"; const l: [string, string][] = [[`${a.id}|0`, n]]; if (String(a.conjoint || "").trim()) l.push([`${a.id}|1`, `${a.conjoint.trim()} (conjoint de ${n})`]); return l })
        .sort((x, y) => x[1].localeCompare(y[1], "fr", { sensitivity: "base" }))
    const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    const ficheIci = fiche ? inscrits.filter((i) => i.creneau_id === fiche.id) : []
    const deja = new Set(ficheIci.map((i) => `${i.adherent_id}|${i.conjoint ? 1 : 0}`))

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <h3 style={titre2}>Tâches des bénévoles · salon {reg.edition}</h3>
                <p style={{ ...discret, fontSize: 14 }}>Besoin total : {besoinTot} personne{besoinTot > 1 ? "s" : ""} · {manqueTot ? <span style={{ color: ORANGE }}>{manqueTot} place{manqueTot > 1 ? "s" : ""} encore à pourvoir</span> : <span style={{ color: C.accent }}>tout est pourvu</span>} · {nbBenevoles} bénévole{nbBenevoles > 1 ? "s" : ""}. Les adhérents s’inscrivent depuis la fiche du salon (page Agenda). Cliquez sur une case du tableau pour la modifier ou inscrire quelqu’un.</p>
                <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, cursor: "pointer" }}><input type="checkbox" checked={reg.planning_ouvert !== false} onChange={(e) => majReg({ planning_ouvert: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Inscriptions ouvertes aux adhérents</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button style={petit()} disabled={!creneaux.length} onClick={() => imprimerPlanning(reg, postes, creneaux, inscrits)}>Imprimer</button>
                    <button style={petit()} onClick={copierPrecedente}>Recopier les tâches de l’an dernier</button>
                    <button style={petit()} onClick={() => setVoirPostes(!voirPostes)}>{voirPostes ? "Fermer la liste" : `Liste des tâches proposées (${actifs.length})`}</button>
                </div>
                {!reg.date_debut && <p style={{ margin: "10px 0 0", color: ORANGE, fontSize: 14 }}>Indiquez d’abord les dates du salon (Exposants et réglages) : les jours de montage et de démontage s’ajoutent tout seuls.</p>}
                {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
            </div>

            {voirPostes && (
                <div style={box}>
                    <h4 style={{ ...titre2, fontSize: 18 }}>Liste des tâches proposées</h4>
                    <p style={{ ...discret, fontSize: 13, marginBottom: 8 }}>Gardée d’une année sur l’autre. Décochez « proposée » pour la masquer sans rien perdre.</p>
                    {postes.map((p) => (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(0,2fr) 70px auto auto", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                            <input style={champ} defaultValue={p.nom} onBlur={(e) => e.target.value.trim() !== p.nom && e.target.value.trim().length > 1 && majPoste(p, { nom: e.target.value.trim() })} />
                            <input style={champ} defaultValue={p.description || ""} placeholder="Consignes (facultatif)" onBlur={(e) => (e.target.value || null) !== (p.description || null) && majPoste(p, { description: e.target.value || null })} />
                            <input style={champ} type="number" title="Ordre d’affichage" defaultValue={p.ordre} onBlur={(e) => Number(e.target.value) !== p.ordre && majPoste(p, { ordre: Number(e.target.value) || 0 })} />
                            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={p.actif} onChange={(e) => majPoste(p, { actif: e.target.checked })} style={{ accentColor: C.accent }} />proposée</label>
                            <button style={petit(true)} onClick={() => supprimerPoste(p)}>Supprimer</button>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <input style={champ} value={nouveauPoste} onChange={(e) => setNouveauPoste(e.target.value)} placeholder="Nouvelle tâche, ex. Parking" onKeyDown={(e) => e.key === "Enter" && ajouterPoste()} />
                        <button style={bouton()} onClick={ajouterPoste}>Ajouter</button>
                    </div>
                </div>
            )}

            <div style={box}>
                <h4 style={{ ...titre2, fontSize: 18 }}>Ajouter une tâche au tableau</h4>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,2fr) minmax(0,1.6fr) 1fr 1fr 110px", gap: 10, marginTop: 8 }}>
                    <div style={etroit ? { gridColumn: "1 / -1" } : undefined}><span style={etiquette}>Tâche</span><select style={champ} value={posteForm} onChange={(e) => setForm({ ...form, poste_id: e.target.value })}>{actifs.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                    <div style={etroit ? { gridColumn: "1 / -1" } : undefined}><span style={etiquette}>Jour</span>
                        {jours.length ? <select style={champ} value={jourForm} onChange={(e) => setForm({ ...form, jour: e.target.value })}>{jours.map((j) => <option key={j} value={j}>{jourFr(j)}</option>)}</select>
                            : <input style={champ} type="date" value={form.jour} onChange={(e) => setForm({ ...form, jour: e.target.value })} />}</div>
                    <div><span style={etiquette}>De</span><input style={champ} type="time" step={900} value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} /></div>
                    <div><span style={etiquette}>À</span><input style={champ} type="time" step={900} value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></div>
                    <div><span style={etiquette}>Personnes</span><input style={champ} type="number" min={1} max={50} value={form.places} onChange={(e) => setForm({ ...form, places: e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <input style={{ ...champ, flex: "1 1 240px", width: "auto" }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Précision (facultatif), ex. prévoir des gants" />
                    <button style={bouton()} onClick={ajouterTache}>Ajouter</button>
                </div>
            </div>

            <div style={box}>
                {jours.length ? <Grille jours={jours} creneaux={creneaux} postes={postes} inscrits={inscrits} ouvrir={(c) => { setMsg(null); setAjout(""); setFiche(c) }} /> : <p style={discret}>Le tableau apparaîtra dès que les dates du salon seront indiquées.</p>}
            </div>

            {fiche && (
                <Fiche fermer={() => setFiche(null)}>
                    <EnteteFiche c={fiche} postes={postes} ici={ficheIci} />
                    <div key={fiche.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, marginTop: 14 }}>
                        {ficheIci.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ficheIci.map((i) => <button key={i.id} onClick={() => retirer(i)} style={{ ...petit(true) }}>Retirer {i.nom}</button>)}</div>}
                        {ficheIci.length < fiche.places && <div style={{ display: "flex", gap: 6 }}>
                            {(() => {
                                const q = sansAccent(ajout.trim())
                                const mots = q.split(/\s+/).filter(Boolean)
                                const libres = choixPersonnes.filter(([v]) => !deja.has(v))
                                const trouves = mots.length ? libres.filter(([, t]) => mots.every((m) => sansAccent(t).includes(m))) : libres
                                return <div style={{ flex: 1, minWidth: 0 }}>
                                    <input style={{ ...champ, width: "100%", boxSizing: "border-box" }} value={ajout} onChange={(e) => setAjout(e.target.value)} placeholder="Inscrire quelqu’un : tapez un nom…" autoComplete="off" />
                                    <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${C.line}`, borderTop: "none" }}>
                                        {trouves.map(([v, t]) => <button key={v} onClick={() => inscrire(fiche, v)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, color: C.txt, font: "inherit", fontSize: 14, padding: "8px 10px", cursor: "pointer" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(155,189,138,0.12)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>+ {t}</button>)}
                                        {trouves.length === 0 && <p style={{ ...discret, fontSize: 14, padding: "8px 10px", margin: 0 }}>Personne ne correspond.</p>}
                                    </div>
                                </div>
                            })()}
                        </div>}
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 76px", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                            <div><span style={etiquette}>De</span><input style={champ} type="time" step={900} defaultValue={fiche.debut.slice(0, 5)} onBlur={(e) => e.target.value && e.target.value !== fiche.debut.slice(0, 5) && e.target.value < fiche.fin.slice(0, 5) && majCreneau(fiche, { debut: e.target.value })} /></div>
                            <div><span style={etiquette}>À</span><input style={champ} type="time" step={900} defaultValue={fiche.fin.slice(0, 5)} onBlur={(e) => e.target.value && e.target.value !== fiche.fin.slice(0, 5) && e.target.value > fiche.debut.slice(0, 5) && majCreneau(fiche, { fin: e.target.value })} /></div>
                            <div><span style={etiquette}>Personnes</span><input style={champ} type="number" min={1} max={50} defaultValue={fiche.places} onBlur={(e) => Number(e.target.value) > 0 && Number(e.target.value) !== fiche.places && majCreneau(fiche, { places: Number(e.target.value) })} /></div>
                        </div>
                        <input style={champ} defaultValue={fiche.note || ""} placeholder="Précision (facultatif)" onBlur={(e) => (e.target.value || null) !== (fiche.note || null) && majCreneau(fiche, { note: e.target.value || null })} />
                        <div><button style={petit(true)} onClick={() => supprimerCreneau(fiche)}>Supprimer cette tâche</button></div>
                    </div>
                    {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
                </Fiche>
            )}
        </div>
    )
}

// ======================================================================
// Administration : rétroplanning (bureau)
// ======================================================================
export function RetroplanningAdmin({ client, etroit }: { client: any; etroit: boolean }) {
    const [reg, setReg] = React.useState<Reglage | null>(null)
    const [l, setL] = React.useState<any[] | null>(null)
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [neuf, setNeuf] = React.useState<any>({ titre: "", semaines_avant: 4, responsable: "", cle: false })
    const [masquerFaits, setMasquerFaits] = React.useState(false)
    const recharger = React.useCallback(async () => {
        const r = await client.from("salon_reglages").select("*").order("edition", { ascending: false }).limit(1)
        if (r.error) return setMsg({ t: r.error.message, err: true })
        const g = r.data?.[0]; setReg(g ?? null)
        if (!g) return setL([])
        const t = await client.from("salon_taches").select("*").eq("edition", g.edition).order("semaines_avant", { ascending: false }).order("cree_le")
        if (t.error) setMsg({ t: /salon_taches|schema cache|exist/i.test(t.error.message) ? "Le rétroplanning sera disponible dès que la base aura été mise à jour." : t.error.message, err: true }); else setL([...(t.data ?? [])].sort((x: any, y: any) => y.semaines_avant - x.semaines_avant || String(x.cree_le).localeCompare(String(y.cree_le))))
    }, [client])
    React.useEffect(() => { recharger() }, [recharger])
    if (!l) return <div style={box}><p style={discret}>{msg?.t || "Chargement…"}</p></div>
    if (!reg) return <div style={box}><p style={discret}>Aucun salon n’est encore créé.</p></div>
    const auj = aujourdhui(), dans15 = ajouterJours(auj, 14)
    const ech = (t: any) => (reg.date_debut ? echeanceTache(reg.date_debut, t.semaines_avant) : null)
    const etat = (t: any) => { const e = ech(t); if (t.fait) return "fait"; if (!e) return ""; if (e < auj) return "retard"; if (e <= dans15) return "bientot"; return "" }
    const COUL: Record<string, string> = { fait: C.accent, retard: C.danger, bientot: ORANGE }
    const maj = async (t: any, champs: any) => { setL((x) => x && x.map((y) => (y.id === t.id ? { ...y, ...champs } : y))); const { error } = await client.from("salon_taches").update(champs).eq("id", t.id); if (error) { setMsg({ t: error.message, err: true }); recharger() } }
    const ajouter = async () => {
        if (neuf.titre.trim().length < 2) return setMsg({ t: "Écrivez la tâche.", err: true })
        const { error } = await client.from("salon_taches").insert({ edition: reg.edition, titre: neuf.titre.trim(), semaines_avant: Number(neuf.semaines_avant) || 0, responsable: neuf.responsable || null, cle: neuf.cle })
        if (error) return setMsg({ t: error.message, err: true })
        setNeuf({ titre: "", semaines_avant: neuf.semaines_avant, responsable: "", cle: false }); setMsg(null); recharger()
    }
    const supprimer = async (t: any) => { if (!window.confirm(`Supprimer la tâche « ${t.titre} » ?`)) return; await client.from("salon_taches").delete().eq("id", t.id); recharger() }
    const preparerSuivant = async () => {
        const suivante = reg.edition + 1
        const { count } = await client.from("salon_taches").select("id", { count: "exact", head: true }).eq("edition", suivante)
        if (count) return setMsg({ t: `Le rétroplanning ${suivante} existe déjà.`, err: true })
        if (!window.confirm(`Préparer le salon ${suivante} ?\n\nLes ${l.length} tâches sont recopiées (non faites), avec les mêmes délais. L’administration passe alors sur ${suivante} : pensez à indiquer ses dates dans l’onglet Exposants.`)) return
        const r1 = await client.from("salon_reglages").upsert({ edition: suivante, ouvert: false }, { onConflict: "edition", ignoreDuplicates: true })
        if (r1.error) return setMsg({ t: r1.error.message, err: true })
        const { error } = await client.from("salon_taches").insert(l.map((t) => ({ edition: suivante, titre: t.titre, details: t.details, semaines_avant: t.semaines_avant, responsable: t.responsable, cle: t.cle })))
        if (error) return setMsg({ t: error.message, err: true })
        setMsg({ t: `Rétroplanning ${suivante} créé.`, err: false }); recharger()
    }
    const faites = l.filter((t) => t.fait).length
    const cles = l.filter((t) => t.cle && !t.fait).length
    const retards = l.filter((t) => etat(t) === "retard").length
    const vis = masquerFaits ? l.filter((t) => !t.fait) : l
    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <h3 style={titre2}>Rétroplanning · salon {reg.edition}</h3>
                <p style={{ ...discret, fontSize: 14 }}>Réservé au bureau. Chaque tâche est fixée « X semaines avant le salon » : les dates limites se recalculent toutes seules si la date du salon change, et la liste se recopie d’une année sur l’autre. Les tâches en retard ou à faire dans les 15 jours s’affichent en haut de l’administration.</p>
                {!reg.date_debut && <p style={{ margin: "10px 0 0", color: ORANGE, fontSize: 14 }}>Indiquez la date du salon (onglet Exposants) pour calculer les dates limites.</p>}
                <div style={{ marginTop: 14, height: 8, background: C.bg, border: `1px solid ${C.line}` }}><div style={{ height: "100%", width: `${l.length ? (faites / l.length) * 100 : 0}%`, background: C.accent }} /></div>
                <p style={{ ...discret, fontSize: 13, marginTop: 6 }}>{faites} / {l.length} tâches faites{cles ? ` · ${cles} étape${cles > 1 ? "s" : ""} clé${cles > 1 ? "s" : ""} restante${cles > 1 ? "s" : ""}` : ""}{retards ? ` · ` : ""}{retards ? <span style={{ color: C.danger }}>{retards} en retard</span> : null}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button style={petit()} onClick={() => setMasquerFaits(!masquerFaits)}>{masquerFaits ? "Afficher les tâches faites" : "Masquer les tâches faites"}</button>
                    <button style={petit()} onClick={preparerSuivant}>Préparer le salon {reg.edition + 1}</button>
                </div>
                {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
            </div>
            <div style={box}>
                {vis.length === 0 && <p style={discret}>Aucune tâche.</p>}
                {vis.map((t) => {
                    const e = ech(t), s = etat(t)
                    return (
                        <div key={t.id} style={{ display: "flex", flexWrap: etroit ? "wrap" : "nowrap", gap: "6px 10px", alignItems: "center", padding: "10px 0 10px 10px", borderTop: `1px solid ${C.line}`, borderLeft: `3px solid ${COUL[s] || "transparent"}` }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: etroit ? "1 1 100%" : "1 1 auto", minWidth: 0 }}>
                                <input type="checkbox" checked={!!t.fait} title="Fait" onChange={(x) => maj(t, { fait: x.target.checked, fait_le: x.target.checked ? new Date().toISOString() : null })} style={{ width: 18, height: 18, flex: "none", accentColor: C.accent }} />
                                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                                    <textarea rows={etroit ? 2 : 1} style={{ ...champ, resize: "none", border: "1px solid transparent", background: "transparent", padding: "4px 6px", lineHeight: 1.35, fontWeight: t.cle ? 700 : 400, textDecoration: t.fait ? "line-through" : "none", opacity: t.fait ? 0.6 : 1 }} defaultValue={t.titre} onBlur={(x) => x.target.value.trim() !== t.titre && x.target.value.trim().length > 1 && maj(t, { titre: x.target.value.trim() })} />
                                    <div style={{ fontSize: 12.5, color: COUL[s] || C.mute, paddingLeft: 6 }}>{e ? `${t.semaines_avant >= 0 ? "avant le" : "le"} ${jourFr(e, true).toLowerCase()}` : `${t.semaines_avant} sem. avant`}{s === "retard" ? " · en retard" : s === "bientot" ? " · bientôt" : ""}{t.cle ? " · étape clé" : ""}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: etroit ? "1 1 100%" : "none", marginLeft: etroit ? 28 : 0, flexWrap: "wrap", minWidth: 0 }}>
                                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: C.mute }}><input style={{ ...champ, width: 58, padding: "5px 6px" }} type="number" min={-12} max={104} defaultValue={t.semaines_avant} onBlur={(x) => Number(x.target.value) !== t.semaines_avant && maj(t, { semaines_avant: Number(x.target.value) || 0 })} />sem. avant</label>
                                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer", color: t.cle ? ORANGE : C.mute }} title="Étape clé"><input type="checkbox" checked={!!t.cle} onChange={(x) => maj(t, { cle: x.target.checked })} style={{ accentColor: ORANGE }} />clé</label>
                                <input style={{ ...champ, padding: "5px 8px", width: etroit ? 120 : 130 }} defaultValue={t.responsable || ""} placeholder="Responsable" onBlur={(x) => (x.target.value || null) !== (t.responsable || null) && maj(t, { responsable: x.target.value || null })} />
                                <button style={petit(true)} title="Supprimer" onClick={() => supprimer(t)}>×</button>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div style={box}>
                <h4 style={{ ...titre2, fontSize: 18 }}>Ajouter une tâche</h4>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "minmax(0,3fr) 110px minmax(0,1.2fr) auto auto", gap: 10, alignItems: "end", marginTop: 8 }}>
                    <div><span style={etiquette}>Tâche</span><input style={champ} value={neuf.titre} onChange={(e) => setNeuf({ ...neuf, titre: e.target.value })} placeholder="Ex. réserver les tables et les grilles" onKeyDown={(e) => e.key === "Enter" && ajouter()} /></div>
                    <div><span style={etiquette}>Sem. avant</span><input style={champ} type="number" min={-12} max={104} value={neuf.semaines_avant} onChange={(e) => setNeuf({ ...neuf, semaines_avant: e.target.value })} /></div>
                    <div><span style={etiquette}>Responsable</span><input style={champ} value={neuf.responsable} onChange={(e) => setNeuf({ ...neuf, responsable: e.target.value })} /></div>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, cursor: "pointer", paddingBottom: 9 }}><input type="checkbox" checked={neuf.cle} onChange={(e) => setNeuf({ ...neuf, cle: e.target.checked })} style={{ accentColor: ORANGE }} />Étape clé</label>
                    <button style={bouton()} onClick={ajouter}>Ajouter</button>
                </div>
                <p style={{ ...discret, fontSize: 13, marginTop: 8 }}>Un nombre négatif place la tâche après le salon (ex. −2 pour le bilan deux semaines après).</p>
            </div>
        </div>
    )
}

// Tâches du rétroplanning à signaler en haut de l'administration (en retard ou dans les 15 jours)
export async function tachesAlertes(client: any): Promise<{ reg: Reglage; taches: any[] } | null> {
    const r = await client.from("salon_reglages").select("*").order("edition", { ascending: false }).limit(1)
    const reg = r.data?.[0]
    if (r.error || !reg?.date_debut) return null
    const t = await client.from("salon_taches").select("*").eq("edition", reg.edition).eq("fait", false)
    if (t.error) return null
    const limite = ajouterJours(aujourdhui(), 14)
    const taches = (t.data ?? []).map((x: any) => ({ ...x, echeance: echeanceTache(reg.date_debut, x.semaines_avant) })).filter((x: any) => x.echeance <= limite).sort((a: any, b: any) => a.echeance.localeCompare(b.echeance))
    return { reg, taches }
}

export function AlertesRetroplanning({ client, ouvrir }: { client: any; ouvrir: () => void }) {
    const [a, setA] = React.useState<{ reg: Reglage; taches: any[] } | null>(null)
    const charger = React.useCallback(() => { tachesAlertes(client).then(setA) }, [client])
    React.useEffect(() => { charger() }, [charger])
    if (!a || !a.taches.length) return null
    const auj = aujourdhui()
    const fait = async (t: any) => { await client.from("salon_taches").update({ fait: true, fait_le: new Date().toISOString() }).eq("id", t.id); charger() }
    return (
        <div style={{ border: `2px solid ${ORANGE}`, background: "rgba(217,164,65,0.12)", padding: "14px 18px", color: C.txt, ...font }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: "#f3c86b" }}>Préparation du salon {a.reg.edition} : {a.taches.length} tâche{a.taches.length > 1 ? "s" : ""} à faire</div>
                <button style={petit()} onClick={ouvrir}>Voir le rétroplanning</button>
            </div>
            {a.taches.slice(0, 6).map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid rgba(243,200,107,0.25)", marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ flex: "1 1 260px", fontSize: 14 }}><span style={{ color: t.echeance < auj ? C.danger : "#f3c86b", fontWeight: 600 }}>{t.echeance < auj ? "En retard" : "Avant le " + jourFr(t.echeance).toLowerCase()}</span> · {t.titre}{t.responsable ? <span style={{ color: C.mute }}> ({t.responsable})</span> : null}</span>
                    <button style={petit()} onClick={() => fait(t)}>Fait</button>
                </div>
            ))}
            {a.taches.length > 6 && <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>… et {a.taches.length - 6} autre{a.taches.length - 6 > 1 ? "s" : ""}.</div>}
        </div>
    )
}
