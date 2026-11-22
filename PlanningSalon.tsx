// PlanningSalon.tsx — planning des bénévoles du salon (espace membre + administration) et rétroplanning du bureau
// Les membres s'inscrivent eux-mêmes sur les créneaux, et peuvent inscrire le conjoint renseigné dans leur fiche.
// Le bureau gère les postes, les créneaux, les inscrits et la liste des tâches de préparation (rétroplanning).
import * as React from "react"
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
    if (r.error) return { err: /salon_|schema cache|exist|column/i.test(r.error.message) ? "Le planning sera disponible dès que la base aura été mise à jour." : r.error.message }
    const reg: Reglage = r.data?.[0] ?? { edition: new Date().getFullYear() + 1 }
    const [p, c, i] = await Promise.all([
        client.from("salon_postes").select("*").order("ordre"),
        client.from("salon_creneaux").select("*").eq("edition", reg.edition).order("jour").order("debut"),
        client.rpc("planning_salon", { ed: reg.edition }),
    ])
    const e = p.error || c.error || i.error
    if (e) return { err: /salon_|schema cache|exist|function/i.test(e.message) ? "Le planning sera disponible dès que la base aura été mise à jour." : e.message }
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
    if (!w) return window.alert("Autorisez l’ouverture de fenêtres pour imprimer le planning.")
    const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    const corps = grouper(creneaux, postes).map((g) => `<h2>${esc(jourFr(g.jour, true))}</h2><table><thead><tr><th>Poste</th><th>Horaire</th><th>Bénévoles</th></tr></thead><tbody>${g.postes.map((p) => p.creneaux.map((c, k) => {
        const noms = inscrits.filter((i) => i.creneau_id === c.id).map((i) => esc(i.nom))
        const vides = Math.max(0, c.places - noms.length)
        return `<tr>${k === 0 ? `<td rowspan="${p.creneaux.length}" class="poste">${esc(p.poste?.nom ?? "")}</td>` : ""}<td class="h">${heure(c.debut)} – ${heure(c.fin)}${c.note ? `<br><small>${esc(c.note)}</small>` : ""}</td><td>${noms.join(" · ")}${vides ? `<span class="vide">${"&nbsp;".repeat(1)}${Array(vides).fill("<i></i>").join("")}</span>` : ""}</td></tr>`
    }).join("")).join("")}</tbody></table>`).join("")
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Planning des bénévoles · Salon ${reg.edition}</title><style>
        body{font:13px/1.45 Arial,sans-serif;color:#111;margin:18mm 14mm}h1{font-size:20px;margin:0 0 2px}p.s{margin:0 0 14px;color:#555}
        h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}table{border-collapse:collapse;width:100%;page-break-inside:auto}
        th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eee;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
        td.poste{font-weight:bold;width:28%}td.h{white-space:nowrap;width:17%}small{color:#555}.vide i{display:inline-block;width:110px;border-bottom:1px dotted #777;height:14px;margin-left:8px}
        tr{page-break-inside:avoid}@page{size:A4;margin:0}
    </style></head><body><h1>Planning des bénévoles · Salon ${reg.edition}</h1><p class="s">${reg.date_debut ? esc(jourFr(reg.date_debut, true)) + (reg.date_fin && reg.date_fin !== reg.date_debut ? " – " + esc(jourFr(reg.date_fin, true)) : "") + " · " : ""}Imprimé le ${new Date().toLocaleDateString("fr-FR")}. Les pointillés sont les places encore libres.</p>${corps || "<p>Aucun créneau.</p>"}<script>window.onload=function(){window.print()}</script></body></html>`)
    w.document.close()
}

// ======================================================================
// Espace membre : onglet « Bénévolat salon »
// ======================================================================
export function BenevolatSalon({ client, moi }: { client: any; moi: any }) {
    const [d, setD] = React.useState<any>(null)
    const [jour, setJour] = React.useState<string>("")
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [occupe, setOccupe] = React.useState("")
    const recharger = React.useCallback(async () => { const r = await chargerPlanning(client); setD(r) }, [client])
    React.useEffect(() => { recharger() }, [recharger])
    if (!d) return <div style={box}><p style={discret}>Chargement…</p></div>
    if (d.err) return <div style={box}><p style={discret}>{d.err}</p></div>
    const { reg, postes, creneaux, inscrits } = d as { reg: Reglage; postes: Poste[]; creneaux: Creneau[]; inscrits: Inscrit[] }
    const conjoint = String(moi?.conjoint || "").trim()
    const groupes = grouper(creneaux, postes)
    const jourActif = groupes.find((g) => g.jour === jour) ? jour : groupes[0]?.jour
    const miens = creneaux.filter((c) => inscrits.some((i) => i.creneau_id === c.id && i.adherent_id === moi.id))
    const ouvert = reg.planning_ouvert !== false

    const agir = async (c: Creneau, pourConjoint: boolean, retirer: boolean) => {
        setOccupe(c.id + pourConjoint); setMsg(null)
        const q = retirer
            ? client.from("salon_benevoles").delete().eq("creneau_id", c.id).eq("adherent_id", moi.id).eq("conjoint", pourConjoint)
            : client.from("salon_benevoles").insert({ creneau_id: c.id, adherent_id: moi.id, conjoint: pourConjoint })
        const { error } = await q
        setOccupe("")
        if (error) setMsg({ t: /complet/i.test(error.message) ? "Ce créneau vient d’être complété, choisissez-en un autre." : /row-level|policy/i.test(error.message) ? "Les inscriptions sont fermées pour le moment." : error.message, err: true })
        else setMsg({ t: retirer ? "Inscription retirée." : `${pourConjoint ? conjoint + " est inscrit" : "Vous êtes inscrit"} : ${postes.find((p) => p.id === c.poste_id)?.nom}, ${jourFr(c.jour)} de ${heure(c.debut)} à ${heure(c.fin)}. Merci !`, err: false })
        recharger()
    }
    const versAgenda = (c: Creneau): EvtAgenda => ({ titre: titreCreneau(c, postes), jour: c.jour, debut: c.debut, fin: c.fin, lieu: LIEU_SALON, details: `Bénévolat au salon ${reg.edition}${c.note ? " · " + c.note : ""}` })

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <h3 style={titre2}>Bénévolat · salon {reg.edition}</h3>
                <p style={{ ...discret, fontSize: 14 }}>{reg.date_debut ? `Le salon a lieu ${reg.date_fin && reg.date_fin !== reg.date_debut ? `du ${jourFr(reg.date_debut).toLowerCase()} au ${jourFr(reg.date_fin, true).toLowerCase()}` : `le ${jourFr(reg.date_debut, true).toLowerCase()}`}. ` : ""}Choisissez les créneaux où vous pouvez aider : montage, accueil, buvette, démontage… {conjoint ? `Vous pouvez aussi inscrire ${conjoint}.` : "Pour inscrire aussi votre conjoint, ajoutez son nom dans votre Profil."}</p>
                {!ouvert && <p style={{ margin: "10px 0 0", color: ORANGE, fontSize: 14 }}>Les inscriptions sont fermées pour le moment. Le planning reste consultable.</p>}
                {miens.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                        <span style={etiquette}>Mes créneaux</span>
                        {miens.map((c) => {
                            const moiAussi = inscrits.some((i) => i.creneau_id === c.id && i.adherent_id === moi.id && !i.conjoint)
                            const lui = inscrits.some((i) => i.creneau_id === c.id && i.adherent_id === moi.id && i.conjoint)
                            return (
                                <div key={c.id} style={{ display: "flex", gap: "6px 12px", alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                                    <span style={{ flex: "1 1 240px", minWidth: 0 }}><b style={{ fontWeight: 600 }}>{postes.find((p) => p.id === c.poste_id)?.nom}</b> · {jourFr(c.jour)}, {heure(c.debut)} – {heure(c.fin)}<span style={{ color: C.mute }}>{[moiAussi && "vous", lui && conjoint].filter(Boolean).length ? " · " + [moiAussi && "vous", lui && conjoint].filter(Boolean).join(" et ") : ""}</span></span>
                                    <a href={lienGoogle(versAgenda(c))} target="_blank" rel="noopener" style={{ ...petit(), textDecoration: "none" }}>+ Google Agenda</a>
                                </div>
                            )
                        })}
                    </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    {miens.length > 0 && <button style={petit()} onClick={() => telechargerIcs(miens.map(versAgenda), `mes-creneaux-salon-${reg.edition}.ics`)}>Tout ajouter à mon agenda (Apple, Outlook…)</button>}
                    {creneaux.length > 0 && <button style={petit()} onClick={() => imprimerPlanning(reg, postes, creneaux, inscrits)}>Imprimer le planning</button>}
                </div>
                {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
            </div>

            {groupes.length === 0 ? <div style={box}><p style={discret}>Le planning n’est pas encore prêt : le bureau ajoutera bientôt les créneaux.</p></div> : <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {groupes.map((g) => <button key={g.jour} onClick={() => setJour(g.jour)} style={{ ...petit(), padding: "8px 14px", fontWeight: 600, background: g.jour === jourActif ? C.accent : "transparent", color: g.jour === jourActif ? C.accentDark : C.txt, borderColor: g.jour === jourActif ? C.accent : C.line }}>{jourFr(g.jour)}</button>)}
                </div>
                {groupes.filter((g) => g.jour === jourActif).map((g) => g.postes.map((p) => (
                    <div key={g.jour + (p.poste?.id ?? "")} style={box}>
                        <h4 style={{ ...titre2, fontSize: 19 }}>{p.poste?.nom ?? "Poste"}</h4>
                        {p.poste?.description && <p style={{ ...discret, fontSize: 14, marginBottom: 6 }}>{p.poste.description}</p>}
                        {p.creneaux.map((c) => {
                            const ici = inscrits.filter((i) => i.creneau_id === c.id)
                            const complet = ici.length >= c.places
                            const moiIci = ici.some((i) => i.adherent_id === moi.id && !i.conjoint)
                            const luiIci = ici.some((i) => i.adherent_id === moi.id && i.conjoint)
                            return (
                                <div key={c.id} style={{ display: "flex", gap: "8px 14px", alignItems: "center", flexWrap: "wrap", padding: "12px 0", borderTop: `1px solid ${C.line}` }}>
                                    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                                        <div style={{ fontWeight: 600 }}>{heure(c.debut)} – {heure(c.fin)} <span style={{ fontWeight: 400, fontSize: 13, color: complet ? ORANGE : C.mute }}>· {complet ? "complet" : `${c.places - ici.length} place${c.places - ici.length > 1 ? "s" : ""} libre${c.places - ici.length > 1 ? "s" : ""} sur ${c.places}`}</span></div>
                                        {c.note && <div style={{ fontSize: 13, color: C.mute }}>{c.note}</div>}
                                        <div style={{ fontSize: 14, marginTop: 2, color: ici.length ? C.txt : C.mute }}>{ici.length ? ici.map((i) => i.nom).join(" · ") : "Personne pour l’instant"}</div>
                                    </div>
                                    {ouvert && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {moiIci ? <button style={petit(true)} disabled={!!occupe} onClick={() => agir(c, false, true)}>Me retirer</button>
                                            : <button style={{ ...bouton(), padding: "7px 14px", opacity: complet ? 0.45 : 1 }} disabled={complet || !!occupe} onClick={() => agir(c, false, false)}>Je m’inscris</button>}
                                        {conjoint && (luiIci ? <button style={petit(true)} disabled={!!occupe} onClick={() => agir(c, true, true)}>Retirer {conjoint}</button>
                                            : <button style={{ ...petit(), opacity: complet ? 0.45 : 1 }} disabled={complet || !!occupe} onClick={() => agir(c, true, false)}>+ {conjoint}</button>)}
                                    </div>}
                                </div>
                            )
                        })}
                    </div>
                )))}
            </>}
        </div>
    )
}

// ======================================================================
// Administration : planning des bénévoles
// ======================================================================
export function PlanningAdmin({ client, etroit }: { client: any; etroit: boolean }) {
    const [d, setD] = React.useState<any>(null)
    const [adh, setAdh] = React.useState<any[]>([])
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [form, setForm] = React.useState<any>({ poste_id: "", jour: "", debut: "09:00", fin: "12:00", places: 2, note: "" })
    const [ajout, setAjout] = React.useState<Record<string, string>>({})
    const [nouveauPoste, setNouveauPoste] = React.useState("")
    const [voirPostes, setVoirPostes] = React.useState(false)
    const recharger = React.useCallback(async () => setD(await chargerPlanning(client)), [client])
    React.useEffect(() => { recharger(); client.from("adherents").select("id,prenom,nom,conjoint,actif").order("nom").then(({ data }: any) => setAdh((data ?? []).filter((a: any) => a.actif !== false))) }, [recharger])
    if (!d) return <div style={box}><p style={discret}>Chargement…</p></div>
    if (d.err) return <div style={box}><p style={discret}>{d.err}</p></div>
    const { reg, postes, creneaux, inscrits } = d as { reg: Reglage; postes: Poste[]; creneaux: Creneau[]; inscrits: Inscrit[] }
    const err = (e: any, ok?: string) => { if (e) setMsg({ t: /complet/i.test(e.message) ? "Ce créneau est complet : augmentez le nombre de places d’abord." : /duplicate|unique/i.test(e.message) ? "Cette personne est déjà inscrite sur ce créneau." : e.message, err: true }); else if (ok) setMsg({ t: ok, err: false }); recharger() }
    // jours proposés : la veille du salon (montage) jusqu'au lendemain (démontage)
    const joursProposes = reg.date_debut ? (() => { const l: string[] = []; let x = ajouterJours(reg.date_debut, -1); const fin = ajouterJours(reg.date_fin || reg.date_debut, 1); while (x <= fin && l.length < 10) { l.push(x); x = ajouterJours(x, 1) } return l })() : []
    const jourForm = form.jour || joursProposes[1] || ""
    const actifs = postes.filter((p) => p.actif)
    const posteForm = form.poste_id || actifs[0]?.id || ""

    const ajouterCreneau = async () => {
        if (!posteForm || !jourForm || !form.debut || !form.fin) return setMsg({ t: "Choisissez le poste, le jour et les horaires.", err: true })
        if (form.fin <= form.debut) return setMsg({ t: "L’heure de fin doit être après l’heure de début.", err: true })
        const { error } = await client.from("salon_creneaux").insert({ edition: reg.edition, poste_id: posteForm, jour: jourForm, debut: form.debut, fin: form.fin, places: Number(form.places) || 1, note: form.note || null })
        err(error, "Créneau ajouté.")
    }
    const copierPrecedente = async () => {
        const r = await client.from("salon_reglages").select("*").lt("edition", reg.edition).order("edition", { ascending: false }).limit(1)
        const prec = r.data?.[0]
        if (!prec?.date_debut || !reg.date_debut) return setMsg({ t: "Renseignez les dates de ce salon (et du précédent) pour pouvoir recopier les créneaux.", err: true })
        const { data } = await client.from("salon_creneaux").select("*").eq("edition", prec.edition)
        if (!data?.length) return setMsg({ t: `Aucun créneau en ${prec.edition}.`, err: true })
        const decalage = Math.round((dt(reg.date_debut).getTime() - dt(prec.date_debut).getTime()) / 86400000)
        if (!window.confirm(`Recopier les ${data.length} créneaux du salon ${prec.edition}, décalés aux dates de ${reg.edition} ? (sans les inscrits)`)) return
        const { error } = await client.from("salon_creneaux").insert(data.map((c: any) => ({ edition: reg.edition, poste_id: c.poste_id, jour: ajouterJours(c.jour, decalage), debut: c.debut, fin: c.fin, places: c.places, note: c.note })))
        err(error, "Créneaux recopiés.")
    }
    const majCreneau = async (c: Creneau, champs: any) => { const { error } = await client.from("salon_creneaux").update(champs).eq("id", c.id); err(error) }
    const supprimerCreneau = async (c: Creneau) => {
        const n = inscrits.filter((i) => i.creneau_id === c.id).length
        if (!window.confirm(`Supprimer ce créneau${n ? ` et ses ${n} inscrit${n > 1 ? "s" : ""}` : ""} ?`)) return
        const { error } = await client.from("salon_creneaux").delete().eq("id", c.id); err(error, "Créneau supprimé.")
    }
    const inscrire = async (c: Creneau) => {
        const v = ajout[c.id]; if (!v) return
        const [id, cj] = v.split("|")
        const { error } = await client.from("salon_benevoles").insert({ creneau_id: c.id, adherent_id: id, conjoint: cj === "1" })
        setAjout({ ...ajout, [c.id]: "" }); err(error)
    }
    const retirer = async (i: Inscrit) => { if (!window.confirm(`Retirer ${i.nom} de ce créneau ?`)) return; const { error } = await client.from("salon_benevoles").delete().eq("id", i.id); err(error) }
    const majReg = async (champs: any) => { const { error } = await client.from("salon_reglages").update(champs).eq("edition", reg.edition); err(error) }
    const majPoste = async (p: Poste, champs: any) => { const { error } = await client.from("salon_postes").update(champs).eq("id", p.id); err(error) }
    const ajouterPoste = async () => { if (nouveauPoste.trim().length < 2) return; const { error } = await client.from("salon_postes").insert({ nom: nouveauPoste.trim(), ordre: (Math.max(0, ...postes.map((p) => p.ordre)) + 10) }); setNouveauPoste(""); err(error, "Poste ajouté.") }
    const supprimerPoste = async (p: Poste) => {
        const n = creneaux.filter((c) => c.poste_id === p.id).length
        if (n) return setMsg({ t: `« ${p.nom} » a ${n} créneau${n > 1 ? "x" : ""} cette année : décochez « utilisé » plutôt que de le supprimer.`, err: true })
        if (!window.confirm(`Supprimer le poste « ${p.nom} » ?`)) return
        const { error } = await client.from("salon_postes").delete().eq("id", p.id); err(error)
    }
    const nbBenevoles = new Set(inscrits.map((i) => i.adherent_id + (i.conjoint ? "c" : ""))).size
    const placesTot = creneaux.reduce((a, c) => a + c.places, 0)
    const choixPersonnes = adh.flatMap((a) => { const n = [a.prenom, a.nom].filter(Boolean).join(" ") || "(sans nom)"; const l: [string, string][] = [[`${a.id}|0`, n]]; if (String(a.conjoint || "").trim()) l.push([`${a.id}|1`, `${a.conjoint.trim()} (conjoint de ${n})`]); return l })

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <h3 style={titre2}>Planning des bénévoles · salon {reg.edition}</h3>
                <p style={{ ...discret, fontSize: 14 }}>{creneaux.length} créneau{creneaux.length > 1 ? "x" : ""} · {inscrits.length} inscription{inscrits.length > 1 ? "s" : ""} sur {placesTot} place{placesTot > 1 ? "s" : ""} · {nbBenevoles} bénévole{nbBenevoles > 1 ? "s" : ""}. Les adhérents s’inscrivent eux-mêmes dans leur espace (onglet Bénévolat salon) et peuvent inscrire le conjoint noté dans leur fiche.</p>
                <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, cursor: "pointer" }}><input type="checkbox" checked={reg.planning_ouvert !== false} onChange={(e) => majReg({ planning_ouvert: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Inscriptions ouvertes aux adhérents</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button style={petit()} disabled={!creneaux.length} onClick={() => imprimerPlanning(reg, postes, creneaux, inscrits)}>Imprimer le planning</button>
                    <button style={petit()} onClick={copierPrecedente}>Recopier les créneaux de l’an dernier</button>
                    <button style={petit()} onClick={() => setVoirPostes(!voirPostes)}>{voirPostes ? "Fermer la liste des postes" : `Gérer les postes (${actifs.length})`}</button>
                </div>
                {!reg.date_debut && <p style={{ margin: "10px 0 0", color: ORANGE, fontSize: 14 }}>Indiquez d’abord les dates du salon (onglet Exposants) : les jours de montage et de démontage seront proposés automatiquement.</p>}
                {msg && <p style={{ margin: "12px 0 0", color: msg.err ? C.danger : C.accent, fontSize: 14 }}>{msg.t}</p>}
            </div>

            {voirPostes && (
                <div style={box}>
                    <h4 style={{ ...titre2, fontSize: 18 }}>Postes</h4>
                    <p style={{ ...discret, fontSize: 13, marginBottom: 8 }}>La liste est gardée d’une année sur l’autre. Décochez « utilisé » pour masquer un poste sans perdre l’historique.</p>
                    {postes.map((p) => (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(0,2fr) 70px auto auto", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                            <input style={champ} defaultValue={p.nom} onBlur={(e) => e.target.value.trim() !== p.nom && e.target.value.trim().length > 1 && majPoste(p, { nom: e.target.value.trim() })} />
                            <input style={champ} defaultValue={p.description || ""} placeholder="Consignes (facultatif)" onBlur={(e) => (e.target.value || null) !== (p.description || null) && majPoste(p, { description: e.target.value || null })} />
                            <input style={champ} type="number" title="Ordre d’affichage" defaultValue={p.ordre} onBlur={(e) => Number(e.target.value) !== p.ordre && majPoste(p, { ordre: Number(e.target.value) || 0 })} />
                            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={p.actif} onChange={(e) => majPoste(p, { actif: e.target.checked })} style={{ accentColor: C.accent }} />utilisé</label>
                            <button style={petit(true)} onClick={() => supprimerPoste(p)}>Supprimer</button>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <input style={champ} value={nouveauPoste} onChange={(e) => setNouveauPoste(e.target.value)} placeholder="Nouveau poste, ex. Parking" onKeyDown={(e) => e.key === "Enter" && ajouterPoste()} />
                        <button style={bouton()} onClick={ajouterPoste}>Ajouter</button>
                    </div>
                </div>
            )}

            <div style={box}>
                <h4 style={{ ...titre2, fontSize: 18 }}>Ajouter un créneau</h4>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,2fr) minmax(0,1.6fr) 1fr 1fr 80px", gap: 10, marginTop: 8 }}>
                    <div style={etroit ? { gridColumn: "1 / -1" } : undefined}><span style={etiquette}>Poste</span><select style={champ} value={posteForm} onChange={(e) => setForm({ ...form, poste_id: e.target.value })}>{actifs.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                    <div style={etroit ? { gridColumn: "1 / -1" } : undefined}><span style={etiquette}>Jour</span>
                        {joursProposes.length ? <select style={champ} value={jourForm} onChange={(e) => setForm({ ...form, jour: e.target.value })}>{joursProposes.map((j) => <option key={j} value={j}>{jourFr(j)}</option>)}</select>
                            : <input style={champ} type="date" value={form.jour} onChange={(e) => setForm({ ...form, jour: e.target.value })} />}</div>
                    <div><span style={etiquette}>De</span><input style={champ} type="time" step={900} value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} /></div>
                    <div><span style={etiquette}>À</span><input style={champ} type="time" step={900} value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></div>
                    <div><span style={etiquette}>Places</span><input style={champ} type="number" min={1} max={50} value={form.places} onChange={(e) => setForm({ ...form, places: e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <input style={{ ...champ, flex: "1 1 240px", width: "auto" }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Précision (facultatif), ex. prévoir des gants" />
                    <button style={bouton()} onClick={ajouterCreneau}>Ajouter le créneau</button>
                </div>
            </div>

            {grouper(creneaux, postes).map((g) => (
                <div key={g.jour} style={box}>
                    <h4 style={{ ...titre2, fontSize: 19 }}>{jourFr(g.jour, true)}</h4>
                    {g.postes.map((p) => p.creneaux.map((c) => {
                        const ici = inscrits.filter((i) => i.creneau_id === c.id)
                        const deja = new Set(ici.map((i) => `${i.adherent_id}|${i.conjoint ? 1 : 0}`))
                        return (
                            <div key={c.id} style={{ padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                                <div style={{ display: "flex", gap: "6px 12px", alignItems: "center", flexWrap: "wrap" }}>
                                    <b style={{ fontWeight: 600, flex: "1 1 200px" }}>{p.poste?.nom} <span style={{ fontWeight: 400, color: C.mute }}>· {heure(c.debut)} – {heure(c.fin)}{c.note ? ` · ${c.note}` : ""}</span></b>
                                    <span style={{ fontSize: 13, color: ici.length >= c.places ? ORANGE : C.mute }}>{ici.length}/</span>
                                    <input style={{ ...champ, width: 64, padding: "5px 8px" }} type="number" min={1} max={50} title="Nombre de places" defaultValue={c.places} onBlur={(e) => Number(e.target.value) !== c.places && Number(e.target.value) > 0 && majCreneau(c, { places: Number(e.target.value) })} />
                                    <button style={petit(true)} onClick={() => supprimerCreneau(c)}>Supprimer</button>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                    {ici.map((i) => <span key={i.id} style={{ fontSize: 13, border: `1px solid ${C.line}`, padding: "3px 4px 3px 9px", display: "inline-flex", alignItems: "center", gap: 6 }}>{i.nom}<button onClick={() => retirer(i)} title="Retirer" style={{ background: "transparent", border: "none", color: C.danger, cursor: "pointer", font: "inherit", padding: "0 4px" }}>×</button></span>)}
                                    {ici.length < c.places && <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flex: "0 1 340px", minWidth: 0 }}>
                                        <select style={{ ...champ, padding: "5px 8px", fontSize: 13, width: "auto", flex: "1 1 auto", minWidth: 0 }} value={ajout[c.id] || ""} onChange={(e) => setAjout({ ...ajout, [c.id]: e.target.value })}><option value="">Inscrire quelqu’un…</option>{choixPersonnes.filter(([v]) => !deja.has(v)).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                                        <button style={{ ...petit(), whiteSpace: "nowrap" }} disabled={!ajout[c.id]} onClick={() => inscrire(c)}>Inscrire</button>
                                    </span>}
                                </div>
                            </div>
                        )
                    }))}
                </div>
            ))}
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
