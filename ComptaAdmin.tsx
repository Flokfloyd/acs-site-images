// ComptaAdmin.tsx — comptabilité de l'association, dans l'administration (onglet Comptabilité).
// Six écrans : tableau de bord (chiffres clés et graphiques), journal (saisie et recherche),
// états (compte de résultat, grand livre, balance), budget, historique pluriannuel, réglages.
// Le trésorier saisit des recettes et des dépenses simples ; la partie double (poste + compte de trésorerie)
// est déduite automatiquement, et l'export reprend le format d'import d'AssoConnect.
// L'historique 2021-2026 vient de l'export AssoConnect (écritures notées « Import AssoConnect »).
// Saisie réservée aux personnes qui ont le droit « saisie comptable » ; tous les admins peuvent consulter.
import * as React from "react"
import { C, serif } from "./AcsBase.tsx"
import { sb, box, input, label, btn, small, h2, muted, euros, dateFr, exporter } from "./EspaceMembre.tsx"
import { FichierForm } from "./EspaceMembre.tsx"
import { Colonnes, Courbe, Barres, Legende, SERIE } from "./ComptaGraphes.tsx"

type Compte = { compte: string; intitule: string; classe: number; actif: boolean }
type Ecr = { id?: string; le: string; sens: "recette" | "depense" | "virement"; libelle: string; montant: number | string; compte?: string | null; tresorerie?: string | null; tiers?: string | null; evenement?: string | null; avance_par?: string | null; rembourse?: boolean; piece_url?: string | null; note?: string | null; categorie?: string | null; pointe?: boolean; cree_le?: string }

const auj = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` } // date locale (pas UTC)
const sa = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const n2 = (x: any) => Math.round((Number(x) || 0) * 100) / 100
const champ: React.CSSProperties = { ...input, padding: "9px 10px", fontSize: 14 }
const NUMS: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }
const TAB: React.CSSProperties = { fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" }
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
const annee = (r: Ecr) => Number(r.le.slice(0, 4))
const signe = (r: Ecr) => (r.sens === "recette" ? 1 : r.sens === "depense" ? -1 : 0) * (Number(r.montant) || 0)
const aVerifier = (r: Ecr) => r.sens !== "virement" && (!r.tresorerie || /non retrouvé/.test(r.note || ""))
// variation entre deux périodes, en texte : « +12 % » ; null si la base est nulle
const variation = (n: number, n1: number) => (n1 ? Math.round((100 * (n - n1)) / Math.abs(n1)) : null)

// mouvement d'une écriture sur un compte de trésorerie (entrée +, sortie −)
function mvt(r: Ecr, c: string) {
    const m = Number(r.montant) || 0
    if (r.sens === "recette" && r.tresorerie === c) return m
    if (r.sens === "depense" && r.tresorerie === c) return -m
    if (r.sens === "virement") return (r.compte === c ? m : 0) - (r.tresorerie === c ? m : 0)
    return 0
}

function Msg({ t, err }: { t: string; err?: boolean }) {
    return t ? <p style={{ marginTop: 10, fontSize: 14, color: err ? C.danger : C.accent }}>{t}</p> : null
}
const puceStyle = (on: boolean): React.CSSProperties => ({ ...small(), padding: "6px 12px", fontSize: 13, background: on ? C.accent : "transparent", color: on ? C.accentDark : C.txt, borderColor: on ? C.accent : C.line })
const Titre = ({ t, sous, droite }: { t: string; sous?: string; droite?: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div><span style={{ ...label, margin: 0 }}>{t}</span>{sous && <span style={{ display: "block", color: C.mute, fontSize: 13, marginTop: 2 }}>{sous}</span>}</div>{droite}
    </div>
)

// tableau générique, lisible sur ordinateur et défilable sur téléphone
function Tableau({ entetes, lignes, total, alignes, min }: { entetes: string[]; lignes: React.ReactNode[][]; total?: React.ReactNode[]; alignes?: ("g" | "d")[]; min?: number[] }) {
    const mins = min || [150]
    const al = (i: number) => (alignes ? alignes[i] : i === 0 ? "g" : "d")
    const cell = (i: number, fort = false): React.CSSProperties => ({ padding: "7px 10px", borderTop: `1px solid ${C.line}`, textAlign: al(i) === "d" ? "right" : "left", fontVariantNumeric: "tabular-nums", whiteSpace: al(i) === "d" ? "nowrap" : "normal", fontWeight: fort ? 700 : 400, verticalAlign: "top", minWidth: mins[i] })
    return <div style={{ overflowX: "auto", margin: "0 -10px" }}>
        <table style={{ width: "100%", minWidth: entetes.reduce((t, _, i) => t + (mins[i] || 96), 0), borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{entetes.map((e, i) => <th key={i} style={{ ...cell(i), borderTop: "none", color: C.mute, fontWeight: 400, fontSize: 12.5 }}>{e}</th>)}</tr></thead>
            <tbody>{lignes.map((l, k) => <tr key={k}>{l.map((c, i) => <td key={i} style={cell(i)}>{c}</td>)}</tr>)}
                {total && <tr>{total.map((c, i) => <td key={i} style={{ ...cell(i, true), borderTop: `2px solid ${C.line}` }}>{c}</td>)}</tr>}</tbody>
        </table>
    </div>
}
const Var = ({ n, n1, inverse = false }: { n: number; n1: number; inverse?: boolean }) => {
    const v = variation(n, n1)
    if (v == null) return <span style={{ color: C.mute }}>—</span>
    const bon = inverse ? v <= 0 : v >= 0
    return <span style={{ color: C.mute }}><span aria-hidden style={{ color: v === 0 ? C.mute : bon ? C.accent : C.danger }}>{v > 0 ? "▲" : v < 0 ? "▼" : "="}</span> {v > 0 ? "+" : ""}{v} %</span>
}

const Lien = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <button onClick={onClick} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(246,240,230,0.3)", textUnderlineOffset: 3 }}>{children}</button>

// impression propre (ou PDF via « Enregistrer en PDF ») d'un état comptable
function imprimer(titre: string, html: string) {
    const w = window.open("", "_blank")
    if (!w) return alert("Autorisez les fenêtres pour imprimer.")
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre}</title><style>
body{font-family:Georgia,serif;color:#111;margin:32px;font-size:12.5px}h1{font-size:20px;margin:0 0 4px}p.s{color:#555;margin:0 0 18px}
table{width:100%;border-collapse:collapse;margin:0 0 18px}th,td{padding:5px 8px;border-bottom:1px solid #ddd;text-align:left}th{font-weight:normal;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.t td{font-weight:bold;border-top:2px solid #111}h2{font-size:14px;margin:18px 0 6px}
</style></head><body>${html}<p class="s" style="margin-top:24px">Armorique Cactus Succulentes · édité le ${new Date().toLocaleDateString("fr-FR")}</p></body></html>`)
    w.document.close(); setTimeout(() => w.print(), 300)
}
const esc = (t: any) => String(t ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string))
const e2 = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// toutes les écritures (la base renvoie 1000 lignes au plus par requête)
async function toutesEcritures(client: any) {
    const tout: Ecr[] = []
    for (let i = 0; ; i += 1000) {
        const { data, error } = await client.from("ecritures").select("*").order("le", { ascending: false }).order("cree_le", { ascending: false }).range(i, i + 999)
        if (error) throw error
        tout.push(...(data ?? []))
        if (!data || data.length < 1000) break
    }
    return tout.sort((a, b) => b.le.localeCompare(a.le) || String(b.cree_le || "").localeCompare(String(a.cree_le || "")))
}

export type Vue = "bord" | "journal" | "etats" | "budget" | "historique" | "reglages"
const VUES: [Vue, string][] = [["bord", "Tableau de bord"], ["journal", "Journal"], ["etats", "États comptables"], ["budget", "Budget"], ["historique", "Historique"], ["reglages", "Réglages"]]

// vue / setVue : facultatifs ; fournis par l'administration, les volets s'affichent alors dans l'en-tête de la rubrique
export const VUES_COMPTA = VUES
export default function ComptaAdmin({ moi, vue: vueExt, setVue: setVueExt }: { moi: string; vue?: Vue; setVue?: (v: Vue) => void }) {
    const client = sb()!
    const [vueInt, setVueInt] = React.useState<Vue>("bord")
    const vue = vueExt || vueInt, setVue = setVueExt || setVueInt
    const [exo, setExo] = React.useState(new Date().getFullYear())
    const [plan, setPlan] = React.useState<Compte[]>([])
    const [tout, setTout] = React.useState<Ecr[] | null>(null)
    const [budgets, setBudgets] = React.useState<Record<string, number>>({})
    const [soldesTous, setSoldesTous] = React.useState<{ exercice: number; compte: string; montant: number }[]>([])
    const [auto, setAuto] = React.useState({ adh: 0, ins: 0, dons: 0 })
    const [peut, setPeut] = React.useState(false)
    const [err, setErr] = React.useState("")
    const charger = React.useCallback(async () => {
        const deb = `${exo}-01-01`, fin = `${exo + 1}-01-01`
        try {
            const [p, e, b, s, d, a, i, dn] = await Promise.all([
                client.from("plan_comptable").select("*").order("compte"),
                toutesEcritures(client),
                client.from("budgets").select("*").eq("exercice", exo),
                client.from("soldes_ouverture").select("*"),
                client.rpc("peut_saisir_compta"),
                client.from("adhesions").select("montant").eq("annee", exo),
                client.from("inscriptions").select("montant,statut").gte("cree_le", deb).lt("cree_le", fin),
                client.from("dons").select("montant").gte("le", deb).lt("le", fin),
            ])
            if (p.error) { setErr(/plan_comptable/.test(p.error.message) ? "La nouvelle comptabilité n’est pas encore installée dans la base." : p.error.message); setTout([]); return }
            setPlan(p.data ?? []); setTout(e)
            setBudgets(Object.fromEntries((b.data ?? []).map((r: any) => [r.compte, Number(r.montant)])))
            setSoldesTous((s.data ?? []).map((r: any) => ({ ...r, montant: Number(r.montant) })))
            setPeut(d.data === true)
            const som = (l: any[]) => l.reduce((x, r) => x + (Number(r.montant) || 0), 0)
            setAuto({ adh: som(a.data ?? []), ins: som((i.data ?? []).filter((r: any) => r.statut === "valide")), dons: som(dn.data ?? []) })
        } catch (x: any) { setErr(x?.message || String(x)); setTout([]) }
    }, [exo])
    React.useEffect(() => { charger() }, [charger])

    const nom = React.useCallback((c?: string | null) => { const x = plan.find((p) => p.compte === c); return x ? x.intitule : c || "" }, [plan])
    const ecr = React.useMemo(() => (tout ?? []).filter((r) => annee(r) === exo), [tout, exo])
    const annees = React.useMemo(() => [...new Set((tout ?? []).map(annee))].sort(), [tout])

    // soldes d'ouverture : ceux saisis pour l'exercice, sinon report du solde de clôture de l'exercice précédent
    const ouverture = React.useMemo(() => {
        const memo = new Map<number, Record<string, number>>()
        const min = Math.min(exo, ...annees, ...soldesTous.map((s) => s.exercice))
        const comptes = plan.filter((p) => p.classe === 5).map((p) => p.compte)
        let prec: Record<string, number> = {}
        for (let y = min; y <= Math.max(exo, ...annees) + 1; y++) {
            const saisis = soldesTous.filter((s) => s.exercice === y)
            const o: Record<string, number> = { ...prec }
            for (const s of saisis) o[s.compte] = s.montant
            memo.set(y, o)
            const cl: Record<string, number> = { ...o }
            for (const r of tout ?? []) if (annee(r) === y) for (const c of comptes) { const m = mvt(r, c); if (m) cl[c] = (cl[c] || 0) + m }
            prec = cl
        }
        return (y: number) => memo.get(y) || {}
    }, [tout, soldesTous, plan, exo, annees])
    const soldesSaisis = React.useMemo(() => Object.fromEntries(soldesTous.filter((s) => s.exercice === exo).map((s) => [s.compte, s.montant])), [soldesTous, exo])

    // export au format d'import AssoConnect : deux lignes par écriture (poste et trésorerie)
    const exporterAssoConnect = () => {
        const lignes: any[][] = []
        ;[...ecr].reverse().forEach((r, i) => {
            const piece = i + 1, d = new Date(r.le).toLocaleDateString("fr-FR"), m = n2(r.montant)
            const journal = String(r.tresorerie || "").startsWith("53") ? "Caisse" : "Banque"
            if (r.sens === "virement") {
                lignes.push([piece, "Opérations diverses", d, r.libelle, r.evenement || "", r.tiers || "", r.compte, "", "", m, ""])
                lignes.push([piece, "Opérations diverses", d, r.libelle, r.evenement || "", r.tiers || "", r.tresorerie, "", "", "", m])
            } else if (r.sens === "depense") {
                lignes.push([piece, journal, d, r.libelle, r.evenement || "", r.tiers || "", r.compte || "", r.evenement || "", "", m, ""])
                lignes.push([piece, journal, d, r.libelle, r.evenement || "", r.tiers || "", r.tresorerie || "", "", "", "", m])
            } else {
                lignes.push([piece, journal, d, r.libelle, r.evenement || "", r.tiers || "", r.tresorerie || "", "", "", m, ""])
                lignes.push([piece, journal, d, r.libelle, r.evenement || "", r.tiers || "", r.compte || "", r.evenement || "", "", "", m])
            }
        })
        exporter(`journal-acs-${exo}-format-assoconnect.csv`, ["#Pièce", "Type de journal", "Date", "Description", "Groupe", "Contact ou tiers", "Comptes", "Budget", "Budget", "Debit", "Credit"], lignes)
    }

    const [filtreJ, setFiltreJ] = React.useState<FiltreJ>({})
    const ouvrirJournal = (f: FiltreJ) => { setFiltreJ({ ...f, n: Date.now() }); setVue("journal"); try { window.scrollTo({ top: 0, behavior: "smooth" }) } catch (e) {} }
    const ctx = { exo, plan, ecr, tout: tout ?? [], ouverture, nom, peut, annees, recharger: charger, aller: setVue, choisir: (y: number) => { setExo(y); setVue("bord") }, ouvrirJournal, filtreJ }
    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button style={small()} onClick={() => setExo(exo - 1)} aria-label="Exercice précédent">‹</button>
                    <h3 style={{ ...h2, fontSize: 22, margin: "0 8px" }}>Exercice {exo}</h3>
                    <button style={small()} onClick={() => setExo(exo + 1)} aria-label="Exercice suivant">›</button>
                    {exo !== new Date().getFullYear() && <button style={{ ...small(), color: C.mute }} onClick={() => setExo(new Date().getFullYear())}>Revenir à {new Date().getFullYear()}</button>}
                </div>
                {!vueExt && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{VUES.map(([k, t]) => <button key={k} onClick={() => setVue(k)} style={{ ...puceStyle(vue === k), padding: "8px 14px", fontSize: 14, fontWeight: 600 }}>{t}</button>)}</div>}
            </div>
            {!peut && tout && !err && <p style={{ ...muted, fontSize: 13.5 }}>Consultation seulement : la saisie est réservée au trésorier.</p>}
            {err ? <div style={box}><p style={muted}>{err}</p></div> : !tout ? <div style={box}><p style={muted}>Chargement de la comptabilité…</p></div> : <>
                {vue === "bord" && <Bord {...ctx} auto={auto} exporterAssoConnect={exporterAssoConnect} />}
                {vue === "journal" && <Saisie {...ctx} />}
                {vue === "etats" && <Etats {...ctx} />}
                {vue === "budget" && <Budget exo={exo} plan={plan} ecr={ecr} budgets={budgets} peut={peut} recharger={charger} />}
                {vue === "historique" && <Historique {...ctx} />}
                {vue === "reglages" && <Plan exo={exo} plan={plan} soldes={soldesSaisis} report={ouverture(exo)} peut={peut} recharger={charger} tout={tout} />}
            </>}
        </div>
    )
}

type Ctx = { exo: number; plan: Compte[]; ecr: Ecr[]; tout: Ecr[]; ouverture: (y: number) => Record<string, number>; nom: (c?: string | null) => string; peut: boolean; annees: number[]; recharger: () => void; aller: (v: Vue) => void; choisir: (y: number) => void; ouvrirJournal: (f: FiltreJ) => void; filtreJ: FiltreJ }
type FiltreJ = { poste?: string; act?: string; treso?: string; mois?: string; filtre?: "" | "recette" | "depense" | "virement" | "notes" | "verif"; nouveau?: boolean; n?: number }

// comptes de trésorerie utiles pour un exercice : actifs, ou avec un solde, ou avec des mouvements
function tresosDe(c: Ctx, y: number, ecr: Ecr[]) {
    const o = c.ouverture(y)
    return c.plan.filter((p) => p.classe === 5 && (p.actif || Math.abs(o[p.compte] || 0) > 0.004 || ecr.some((r) => mvt(r, p.compte))))
}
const nomTreso = (t: string) => t.replace(/^Banques - |^Caisse - Caisse - |^Caisse - /, "").replace(/^Compte en ligne - .*/, "Compte en ligne")

// ---------- Tableau de bord ----------
function Bord(c: Ctx & { auto: { adh: number; ins: number; dons: number }; exporterAssoConnect: () => void }) {
    const { exo, ecr, tout, nom } = c
    const enCours = exo === new Date().getFullYear()
    const jourJ = enCours ? auj().slice(5) : "12-31"
    const n1 = tout.filter((r) => annee(r) === exo - 1 && r.le.slice(5) <= jourJ)
    const som = (l: Ecr[], s: string) => l.filter((r) => r.sens === s).reduce((x, r) => x + Number(r.montant), 0)
    const rec = som(ecr, "recette"), dep = som(ecr, "depense"), rec1 = som(n1, "recette"), dep1 = som(n1, "depense")
    const tresos = tresosDe(c, exo, ecr)
    const o = c.ouverture(exo)
    const tresoTot = tresos.reduce((s, t) => s + (o[t.compte] || 0) + ecr.reduce((x, r) => x + mvt(r, t.compte), 0), 0)
    const o1 = c.ouverture(exo - 1)
    const tresoN1 = tresosDe(c, exo - 1, n1).reduce((s, t) => s + (o1[t.compte] || 0) + n1.reduce((x, r) => x + mvt(r, t.compte), 0), 0)
    const periode = enCours ? `au ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, comparé à la même date en ${exo - 1}` : `comparé à ${exo - 1}`

    // par mois
    const parMois = (s: string) => MOIS.map((_, m) => ecr.filter((r) => r.sens === s && Number(r.le.slice(5, 7)) === m + 1).reduce((x, r) => x + Number(r.montant), 0))
    // trésorerie jour après jour (escalier)
    const debut = new Date(`${exo}-01-01`), nJours = Math.round((new Date(`${exo + 1}-01-01`).getTime() - debut.getTime()) / 864e5)
    const jour = (d: string) => Math.round((new Date(d).getTime() - debut.getTime()) / 864e5)
    const ouvTot = tresos.reduce((s, t) => s + (o[t.compte] || 0), 0)
    const pts: { j: number; v: number; date: string }[] = [{ j: 0, v: ouvTot, date: `1er janvier ${exo}` }]
    const parJour = new Map<number, number>()
    for (const r of ecr) { const m = tresos.reduce((s, t) => s + mvt(r, t.compte), 0); if (m) parJour.set(jour(r.le), (parJour.get(jour(r.le)) || 0) + m) }
    let cum = ouvTot
    for (const j of [...parJour.keys()].sort((a, b) => a - b)) { cum += parJour.get(j)!; pts.push({ j, v: n2(cum), date: new Date(debut.getTime() + j * 864e5).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) }) }
    const fin = enCours ? jour(auj()) : nJours - 1
    if (pts[pts.length - 1].j < fin) pts.push({ j: fin, v: n2(cum), date: enCours ? "aujourd’hui" : `31 décembre ${exo}` })

    // répartition par poste (7 premiers + autres)
    const parPoste = (s: string) => {
        const m = new Map<string, number>()
        for (const r of ecr) if (r.sens === s) { const k = r.compte || "—"; m.set(k, (m.get(k) || 0) + Number(r.montant)) }
        const l = [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ t: k === "—" ? "Sans poste" : nom(k), v, sous: k === "—" ? undefined : k }))
        return l.length > 8 ? [...l.slice(0, 7), { t: `Autres postes (${l.length - 7})`, v: l.slice(7).reduce((s, x) => s + x.v, 0), sous: undefined }] : l
    }
    // par activité, avec l'exercice précédent entier
    const n1Tout = tout.filter((r) => annee(r) === exo - 1)
    const acts = new Map<string, { r: number; d: number; p: number }>()
    for (const r of ecr) if (r.sens !== "virement") { const k = r.evenement || "Non affecté"; const x = acts.get(k) || { r: 0, d: 0, p: 0 }; if (r.sens === "recette") x.r += Number(r.montant); else x.d += Number(r.montant); acts.set(k, x) }
    for (const r of n1Tout) if (r.sens !== "virement") { const k = r.evenement || "Non affecté"; const x = acts.get(k) || { r: 0, d: 0, p: 0 }; x.p += signe(r); acts.set(k, x) }
    const notes = ecr.filter((r) => r.avance_par && !r.rembourse)
    const verif = ecr.filter(aVerifier)

    const tuile = (t: string, v: number, n1v: number | null, inverse = false, fort = false) => (
        <div key={t} style={{ background: C.panel, padding: "16px 18px" }}>
            <div style={{ fontSize: 12.5, color: C.mute }}>{t}</div>
            <div style={{ fontFamily: serif, fontSize: fort ? 30 : 26, fontWeight: 600, color: C.txt, margin: "2px 0" }}>{euros(v)}</div>
            {n1v != null && <div style={{ fontSize: 12.5 }}><Var n={v} n1={n1v} inverse={inverse} /> <span style={{ color: C.mute }}>({euros(n1v)} en {exo - 1})</span></div>}
        </div>
    )
    return <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: -6 }}>
            <p style={{ ...muted, fontSize: 13.5 }}>Chiffres {periode}.</p>
            {c.peut && <button style={btn()} onClick={() => c.ouvrirJournal({ nouveau: true })}>+ Nouvelle écriture</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
            {tuile("Recettes", rec, rec1)}{tuile("Dépenses", dep, dep1, true)}{tuile("Résultat", rec - dep, rec1 - dep1, false, true)}{tuile(enCours ? "Trésorerie aujourd’hui" : "Trésorerie au 31 décembre", tresoTot, tresoN1)}
        </div>
        {(verif.length > 0 || notes.length > 0) && <div style={{ ...box, borderColor: "#d7b56d", padding: "14px 18px" }}>
            <span style={{ ...label, color: "#d7b56d" }}>Points d’attention</span>
            {notes.length > 0 && <p style={{ margin: "4px 0", fontSize: 14 }}>⚠ {notes.length} note{notes.length > 1 ? "s" : ""} de frais à rembourser ({euros(notes.reduce((s, r) => s + Number(r.montant), 0))}) : {[...new Set(notes.map((r) => r.avance_par))].join(", ")}.</p>}
            {verif.length > 0 && <p style={{ margin: "4px 0", fontSize: 14 }}>⚠ {verif.length} écriture{verif.length > 1 ? "s" : ""} sans compte de trésorerie (règlement non retrouvé à l’import) : à compléter ou à laisser si la somme n’a jamais été encaissée.</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {verif.length > 0 && <button style={small()} onClick={() => c.ouvrirJournal({ filtre: "verif" })}>Voir les écritures à vérifier</button>}
                {notes.length > 0 && <button style={small()} onClick={() => c.ouvrirJournal({ filtre: "notes" })}>Voir les notes de frais</button>}
            </div>
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 16 }}>
            <div style={box}><Titre t="Recettes et dépenses par mois" sous={`Exercice ${exo} · cliquez sur un mois pour voir ses écritures`} /><Legende items={[["Recettes", SERIE.recettes], ["Dépenses", SERIE.depenses]]} />
                <Colonnes cats={MOIS} series={[{ nom: "Recettes", couleur: SERIE.recettes, valeurs: parMois("recette") }, { nom: "Dépenses", couleur: SERIE.depenses, valeurs: parMois("depense") }]} titreBulle={(i) => `${MOIS_LONG[i]} ${exo}`} clic={(i) => c.ouvrirJournal({ mois: String(i + 1).padStart(2, "0") })} /></div>
            <div style={box}><Titre t="Trésorerie totale" sous={`Tous comptes · ${euros(ouvTot)} au 1er janvier → ${euros(cum)}`} />
                <Courbe points={pts} n={nJours} mois={MOIS} etiquette="Trésorerie" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16 }}>
            <div style={box}><Titre t="D’où vient l’argent" sous={`Recettes par poste · ${euros(rec)}`} />{rec ? <Barres lignes={parPoste("recette")} couleur={SERIE.recettes} total={rec} clic={(l) => c.ouvrirJournal(l.sous ? { poste: l.sous } : { filtre: "recette" })} /> : <p style={muted}>Aucune recette.</p>}</div>
            <div style={box}><Titre t="Où va l’argent" sous={`Dépenses par poste · ${euros(dep)}`} />{dep ? <Barres lignes={parPoste("depense")} couleur={SERIE.depenses} total={dep} clic={(l) => c.ouvrirJournal(l.sous ? { poste: l.sous } : { filtre: "depense" })} /> : <p style={muted}>Aucune dépense.</p>}</div>
        </div>
        <div style={box}>
            <Titre t="Résultat par activité" sous="Renseignez « Activité » à la saisie (Salon, Adhésions, Voyages…) pour suivre chaque activité." />
            {acts.size === 0 ? <p style={muted}>Aucune écriture.</p> : <Tableau entetes={["Activité", "Recettes", "Dépenses", "Résultat", `Résultat ${exo - 1}`]}
                lignes={[...acts].filter(([, x]) => x.r || x.d).sort((a, b) => (b[1].r - b[1].d) - (a[1].r - a[1].d)).map(([k, x]) => [<Lien onClick={() => c.ouvrirJournal({ act: k === "Non affecté" ? "" : k })}>{k}</Lien>, euros(x.r), euros(x.d), <b style={{ color: x.r - x.d < 0 ? C.danger : C.txt }}>{euros(x.r - x.d)}</b>, <span style={{ color: C.mute }}>{x.p ? euros(x.p) : "—"}</span>])}
                total={["Total", euros(rec), euros(dep), euros(rec - dep), ""]} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 16 }}>
            <div style={box}><Titre t="Comptes de trésorerie" sous={`Solde au 1er janvier, entrées, sorties et solde ${enCours ? "à ce jour" : "au 31 décembre"}`} />
                <Tableau entetes={["Compte", "1er janv.", "Entrées", "Sorties", "Solde"]} lignes={tresos.map((t) => {
                    const e = ecr.reduce((s, r) => s + Math.max(0, mvt(r, t.compte)), 0), so = ecr.reduce((s, r) => s + Math.min(0, mvt(r, t.compte)), 0)
                    return [<Lien onClick={() => c.ouvrirJournal({ treso: t.compte })}>{nomTreso(t.intitule)}</Lien>, euros(o[t.compte] || 0), euros(e), euros(-so), <b>{euros((o[t.compte] || 0) + e + so)}</b>]
                })} total={["Total", euros(ouvTot), "", "", euros(tresoTot)]} />
                <p style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Le solde du 1er janvier est repris de l’exercice précédent, sauf s’il est saisi dans « Réglages ». Comparez avec vos relevés bancaires.</p>
            </div>
            <div style={box}><Titre t="Enregistré ailleurs dans le site" sous="Pour contrôle : ces montants ne s’ajoutent pas au résultat" />
                <Tableau entetes={["", "Montant"]} lignes={[["Adhésions notées dans « Adhésions et paiements »", euros(c.auto.adh)], ["Inscriptions et achats réglés", euros(c.auto.ins)], ["Dons", euros(c.auto.dons)]]} />
                <p style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Vérifiez qu’ils figurent bien dans le journal (comptes 756000 Adhésions, 754000 Dons…).</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <button style={btn(false)} onClick={c.exporterAssoConnect}>Exporter le journal {exo} (format AssoConnect)</button>
                </div>
            </div>
        </div>
    </>
}

// ---------- États : compte de résultat, grand livre, balance ----------
function Etats(c: Ctx) {
    const { exo, ecr, tout, plan, nom } = c
    const [sous, setSous] = React.useState<"resultat" | "livre" | "balance">("resultat")
    const n1 = tout.filter((r) => annee(r) === exo - 1)
    const parCompte = (l: Ecr[], classe: number) => {
        const m = new Map<string, number>()
        for (const r of l) if (r.sens !== "virement" && r.compte && r.compte[0] === String(classe)) m.set(r.compte, (m.get(r.compte) || 0) + (classe === 7 ? signe(r) : -signe(r)))
        return m
    }
    const bloc = (classe: number) => {
        const a = parCompte(ecr, classe), b = parCompte(n1, classe)
        const comptes = [...new Set([...a.keys(), ...b.keys()])].sort()
        return { comptes, a, b, ta: [...a.values()].reduce((s, v) => s + v, 0), tb: [...b.values()].reduce((s, v) => s + v, 0) }
    }
    const ch = bloc(6), pr = bloc(7)
    const sansPoste = ecr.filter((r) => r.sens !== "virement" && !r.compte)
    const resN = pr.ta - ch.ta, resN1 = pr.tb - ch.tb

    // grand livre
    const comptesActifs = [...new Set(ecr.flatMap((r) => [r.compte, r.tresorerie]).filter(Boolean) as string[])].sort()
    const [cpt, setCpt] = React.useState<string>("")
    const choisi = cpt && comptesActifs.includes(cpt) ? cpt : comptesActifs.find((x) => x.startsWith("512")) || comptesActifs[0] || ""
    const est5 = choisi.startsWith("5")
    const ouv = est5 ? c.ouverture(exo)[choisi] || 0 : 0
    const mouvements = ecr.filter((r) => r.compte === choisi || r.tresorerie === choisi).slice().sort((x, y) => x.le.localeCompare(y.le) || String(x.cree_le).localeCompare(String(y.cree_le)))
    // débit / crédit au sens comptable du compte choisi
    const dc = (r: Ecr): [number, number] => {
        const m = Number(r.montant) || 0
        if (est5) { const v = mvt(r, choisi); return v >= 0 ? [v, 0] : [0, -v] }
        const charge = choisi[0] === "6"
        if (r.sens === "depense") return [m, 0]
        if (r.sens === "recette") return [0, m]
        return charge ? [m, 0] : [0, m]
    }
    let cumul = est5 ? ouv : 0
    const lignesLivre = mouvements.map((r) => { const [d, cr] = dc(r); cumul += d - cr; return { r, d, cr, s: cumul } })
    const totD = lignesLivre.reduce((s, l) => s + l.d, 0), totC = lignesLivre.reduce((s, l) => s + l.cr, 0)

    // balance
    const bal = new Map<string, [number, number]>()
    const add = (k: string, d: number, cr: number) => { const x = bal.get(k) || [0, 0]; bal.set(k, [x[0] + d, x[1] + cr]) }
    for (const r of ecr) {
        const m = Number(r.montant) || 0
        if (r.sens === "depense") { if (r.compte) add(r.compte, m, 0); if (r.tresorerie) add(r.tresorerie, 0, m) }
        else if (r.sens === "recette") { if (r.compte) add(r.compte, 0, m); if (r.tresorerie) add(r.tresorerie, m, 0) }
        else { if (r.compte) add(r.compte, m, 0); if (r.tresorerie) add(r.tresorerie, 0, m) }
    }
    const balL = [...bal].sort((a, b) => a[0].localeCompare(b[0]))

    const imprimerResultat = () => {
        const t = (b: ReturnType<typeof bloc>, titre: string) => `<h2>${titre}</h2><table><tr><th>Compte</th><th>Intitulé</th><th class="n">${exo}</th><th class="n">${exo - 1}</th></tr>${b.comptes.map((k) => `<tr><td>${k}</td><td>${esc(nom(k))}</td><td class="n">${e2(b.a.get(k) || 0)}</td><td class="n">${e2(b.b.get(k) || 0)}</td></tr>`).join("")}<tr class="t"><td></td><td>Total</td><td class="n">${e2(b.ta)}</td><td class="n">${e2(b.tb)}</td></tr></table>`
        imprimer(`Compte de résultat ${exo}`, `<h1>Compte de résultat ${exo}</h1><p class="s">Armorique Cactus Succulentes · montants en euros · exercice du 1er janvier au 31 décembre ${exo}${exo === new Date().getFullYear() ? " (en cours)" : ""}</p>${t(pr, "Produits (recettes)")}${t(ch, "Charges (dépenses)")}<table><tr class="t"><td>Résultat de l’exercice</td><td class="n">${e2(resN)}</td><td class="n">${e2(resN1)}</td></tr></table>`)
    }
    const csvResultat = () => exporter(`compte-de-resultat-acs-${exo}.csv`, ["Type", "Compte", "Intitulé", String(exo), String(exo - 1)], [
        ...pr.comptes.map((k) => ["Produit", k, nom(k), e2(pr.a.get(k) || 0), e2(pr.b.get(k) || 0)]), ["Produit", "", "Total produits", e2(pr.ta), e2(pr.tb)],
        ...ch.comptes.map((k) => ["Charge", k, nom(k), e2(ch.a.get(k) || 0), e2(ch.b.get(k) || 0)]), ["Charge", "", "Total charges", e2(ch.ta), e2(ch.tb)], ["", "", "Résultat", e2(resN), e2(resN1)]])
    const lignesBloc = (b: ReturnType<typeof bloc>, inverse: boolean) => b.comptes.map((k) => [<span><span style={{ color: C.mute, fontSize: 12.5 }}>{k}</span> {nom(k)}</span>, euros(b.a.get(k) || 0), <span style={{ color: C.mute }}>{euros(b.b.get(k) || 0)}</span>, <Var n={b.a.get(k) || 0} n1={b.b.get(k) || 0} inverse={inverse} />])

    return <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{([["resultat", "Compte de résultat"], ["livre", "Grand livre"], ["balance", "Balance des comptes"]] as const).map(([k, t]) => <button key={k} onClick={() => setSous(k)} style={puceStyle(sous === k)}>{t}</button>)}</div>
        {sous === "resultat" && <div style={box}>
            <Titre t={`Compte de résultat ${exo}`} sous={`Comparé à ${exo - 1} (année entière)`} droite={<div style={{ display: "flex", gap: 8 }}><button style={small()} onClick={imprimerResultat}>Imprimer / PDF</button><button style={small()} onClick={csvResultat}>Exporter (Excel)</button></div>} />
            <h4 style={{ margin: "8px 0 4px", fontSize: 15 }}>Produits (recettes)</h4>
            <Tableau entetes={["Compte", String(exo), String(exo - 1), "Évolution"]} lignes={lignesBloc(pr, false)} total={["Total des produits", euros(pr.ta), euros(pr.tb), <Var n={pr.ta} n1={pr.tb} />]} />
            <h4 style={{ margin: "22px 0 4px", fontSize: 15 }}>Charges (dépenses)</h4>
            <Tableau entetes={["Compte", String(exo), String(exo - 1), "Évolution"]} lignes={lignesBloc(ch, true)} total={["Total des charges", euros(ch.ta), euros(ch.tb), <Var n={ch.ta} n1={ch.tb} inverse />]} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 18, padding: "12px 14px", background: C.bg, border: `1px solid ${C.line}` }}>
                <b style={{ fontFamily: serif, fontSize: 18 }}>Résultat de l’exercice</b>
                <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{euros(resN)} <span style={{ fontSize: 13, color: C.mute, fontFamily: "inherit", fontWeight: 400 }}>({euros(resN1)} en {exo - 1})</span></span>
            </div>
            <p style={{ ...muted, fontSize: 12.5, marginTop: 10 }}>{resN >= 0 ? "Excédent" : "Déficit"} de l’exercice. Les virements entre comptes de l’association n’entrent pas dans le résultat.{sansPoste.length ? ` ${sansPoste.length} règlement(s) sans poste (${euros(sansPoste.reduce((s, r) => s + signe(r), 0))}) ne sont pas comptés : voir le journal.` : ""}</p>
        </div>}
        {sous === "livre" && <div style={box}>
            <Titre t="Grand livre" sous="Tous les mouvements d’un compte, avec le solde au fil de l’eau" droite={<button style={small()} onClick={() => exporter(`grand-livre-${choisi}-${exo}.csv`, ["Date", "Libellé", "Tiers", "Activité", "Débit", "Crédit", "Solde"], [...(est5 ? [[`01/01/${exo}`, "Solde d’ouverture", "", "", "", "", e2(ouv)]] : []), ...lignesLivre.map((l) => [new Date(l.r.le).toLocaleDateString("fr-FR"), l.r.libelle, l.r.tiers || "", l.r.evenement || "", l.d ? e2(l.d) : "", l.cr ? e2(l.cr) : "", e2(l.s)])])}>Exporter (Excel)</button>} />
            <select style={{ ...champ, maxWidth: 520, marginBottom: 12 }} value={choisi} onChange={(e) => setCpt(e.target.value)}>
                {[5, 6, 7].map((k) => <optgroup key={k} label={k === 5 ? "Trésorerie" : k === 6 ? "Dépenses" : "Recettes"}>{comptesActifs.filter((x) => x[0] === String(k)).map((x) => <option key={x} value={x}>{x} · {nom(x)}</option>)}</optgroup>)}
            </select>
            <Tableau entetes={["Date", "Libellé", "Débit", "Crédit", "Solde"]} alignes={["g", "g", "d", "d", "d"]} min={[64, 190]}
                lignes={[...(est5 ? [[`1er janv.`, <i style={{ color: C.mute }}>Solde d’ouverture</i>, "", "", euros(ouv)]] : []), ...lignesLivre.map((l) => [
                    <span style={{ whiteSpace: "nowrap", color: C.mute }}>{new Date(l.r.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>,
                    <span>{l.r.libelle}{(l.r.tiers || l.r.evenement) && <span style={{ display: "block", color: C.mute, fontSize: 12.5 }}>{[l.r.tiers, l.r.evenement].filter(Boolean).join(" · ")}</span>}</span>,
                    l.d ? euros(l.d) : "", l.cr ? euros(l.cr) : "", euros(l.s)])]}
                total={["", `${lignesLivre.length} mouvement${lignesLivre.length > 1 ? "s" : ""}`, euros(totD), euros(totC), euros((est5 ? ouv : 0) + totD - totC)]} />
        </div>}
        {sous === "balance" && <div style={box}>
            <Titre t={`Balance des comptes ${exo}`} sous="Total des débits et des crédits de chaque compte sur l’exercice (hors soldes d’ouverture)" droite={<button style={small()} onClick={() => exporter(`balance-acs-${exo}.csv`, ["Compte", "Intitulé", "Débit", "Crédit", "Solde"], balL.map(([k, [d, cr]]) => [k, nom(k), e2(d), e2(cr), e2(d - cr)]))}>Exporter (Excel)</button>} />
            <Tableau entetes={["Compte", "Débit", "Crédit", "Solde"]} lignes={balL.map(([k, [d, cr]]) => [<button onClick={() => { setCpt(k); setSous("livre") }} style={{ all: "unset", cursor: "pointer" }} title="Voir le grand livre"><span style={{ color: C.mute, fontSize: 12.5 }}>{k}</span> {nom(k)}</button>, euros(d), euros(cr), <span style={{ color: C.mute }}>{euros(d - cr)}</span>])}
                total={["Total", euros(balL.reduce((s, x) => s + x[1][0], 0)), euros(balL.reduce((s, x) => s + x[1][1], 0)), ""]} />
            <p style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Cliquez sur un compte pour ouvrir son grand livre.</p>
        </div>}
    </>
}

// ---------- Historique pluriannuel ----------
function Historique(c: Ctx) {
    const { tout, annees } = c
    const ans = annees.length ? annees : [c.exo]
    const som = (y: number, s: string) => tout.filter((r) => annee(r) === y && r.sens === s).reduce((x, r) => x + Number(r.montant), 0)
    const rec = ans.map((y) => som(y, "recette")), dep = ans.map((y) => som(y, "depense"))
    const tresoFin = ans.map((y) => { const o = c.ouverture(y + 1); return Object.values(o).reduce((s, v) => s + v, 0) })
    const acts = [...new Set(tout.filter((r) => r.sens !== "virement").map((r) => r.evenement || "Non affecté"))]
    const resAct = (a: string, y: number) => tout.filter((r) => annee(r) === y && (r.evenement || "Non affecté") === a).reduce((s, r) => s + signe(r), 0)
    const actsTries = acts.map((a) => ({ a, tot: ans.reduce((s, y) => s + Math.abs(resAct(a, y)), 0) })).sort((x, y) => y.tot - x.tot).map((x) => x.a)
    return <>
        <div style={box}><Titre t="Recettes et dépenses par année" sous={`${ans[0]} – ${ans[ans.length - 1]} · l’année en cours est incomplète`} /><Legende items={[["Recettes", SERIE.recettes], ["Dépenses", SERIE.depenses]]} />
            <Colonnes cats={ans.map(String)} series={[{ nom: "Recettes", couleur: SERIE.recettes, valeurs: rec }, { nom: "Dépenses", couleur: SERIE.depenses, valeurs: dep }]} hauteur={240} titreBulle={(i) => `Exercice ${ans[i]}`} /></div>
        <div style={box}><Titre t="Synthèse par exercice" droite={<button style={small()} onClick={() => exporter("historique-acs.csv", ["Exercice", "Recettes", "Dépenses", "Résultat", "Trésorerie au 31/12"], ans.map((y, i) => [y, e2(rec[i]), e2(dep[i]), e2(rec[i] - dep[i]), e2(tresoFin[i])]))}>Exporter (Excel)</button>} />
            <Tableau entetes={["Exercice", "Recettes", "Dépenses", "Résultat", "Trésorerie au 31 déc."]} lignes={ans.map((y, i) => [
                <button onClick={() => c.choisir(y)} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", textDecorationColor: C.line, textUnderlineOffset: 3 }} title={`Ouvrir le tableau de bord ${y}`}>{y}{y === new Date().getFullYear() ? <span style={{ color: C.mute }}> (en cours)</span> : ""}</button>,
                euros(rec[i]), euros(dep[i]), <b style={{ color: rec[i] - dep[i] < 0 ? C.danger : C.txt }}>{euros(rec[i] - dep[i])}</b>, euros(tresoFin[i])])} />
        </div>
        <div style={box}><Titre t="Résultat par activité et par année" sous="Recettes moins dépenses de chaque activité" />
            <Tableau entetes={["Activité", ...ans.map(String)]} lignes={actsTries.map((a) => [a, ...ans.map((y) => { const v = resAct(a, y); return v ? <span style={{ color: v < 0 ? C.danger : C.txt }}>{euros(v)}</span> : <span style={{ color: C.mute }}>—</span> })])}
                total={["Résultat", ...ans.map((y, i) => euros(rec[i] - dep[i]))]} />
        </div>
    </>
}

// ---------- Journal : saisie, recherche, filtres ----------
const vide = (): Ecr => ({ le: auj(), sens: "depense", libelle: "", montant: "", compte: "", tresorerie: "512001", tiers: "", evenement: "", avance_par: "", rembourse: false, piece_url: null, note: "" })

function Saisie(c: Ctx) {
    const { plan, ecr, peut, nom, recharger, exo } = c
    const client = sb()!
    const [f, setF] = React.useState<Ecr | null>(c.filtreJ.nouveau && peut ? vide() : null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [q, setQ] = React.useState("")
    const fi = c.filtreJ
    const [filtre, setFiltre] = React.useState<"" | "recette" | "depense" | "virement" | "notes" | "verif">(fi.filtre || "")
    const [mois, setMois] = React.useState(fi.mois || "")
    const [poste, setPoste] = React.useState(fi.poste || "")
    const [act, setAct] = React.useState(fi.act != null ? (fi.act || "∅") : "")
    const [treso, setTreso] = React.useState(fi.treso || "")
    // filtre demandé depuis le tableau de bord (clic sur un poste, une activité, un mois…)
    React.useEffect(() => {
        if (!fi.n) return
        setFiltre(fi.filtre || ""); setMois(fi.mois || ""); setPoste(fi.poste || ""); setAct(fi.act != null ? (fi.act || "∅") : ""); setTreso(fi.treso || ""); setQ("")
        if (fi.nouveau && peut) setF(vide())
    }, [fi.n])
    // sélection multiple pour les modifications groupées
    const [sel, setSel] = React.useState<Set<string>>(new Set())
    const [groupe, setGroupe] = React.useState({ act: "", poste: "", treso: "" })
    // ventilation : une même opération répartie sur plusieurs postes
    const [vent, setVent] = React.useState<{ compte: string; montant: string; evenement: string }[] | null>(null)
    const [limite, setLimite] = React.useState(80)
    const postes = (classe: number) => plan.filter((p) => p.classe === classe && p.actif)
    const tresos = plan.filter((p) => p.classe === 5 && p.actif)
    const evts = [...new Set(c.tout.map((r) => r.evenement).filter(Boolean))].sort() as string[]
    const tiersConnus = [...new Set(c.tout.map((r) => r.tiers).filter(Boolean))].sort() as string[]
    const set = (k: keyof Ecr, v: any) => setF((x) => x && { ...x, [k]: v })
    const enregistrer = async (encore: boolean) => {
        if (!f) return
        if (!f.libelle.trim() || !(Number(f.montant) > 0) || !f.le) return setMsg({ t: "Date, libellé et montant sont obligatoires.", err: true })
        if (f.sens !== "virement" && !f.compte) return setMsg({ t: "Choisissez le poste comptable.", err: true })
        if (!f.tresorerie || (f.sens === "virement" && !f.compte)) return setMsg({ t: "Choisissez le compte de trésorerie.", err: true })
        if (vent && !f.id && f.sens !== "virement") {
            const lignes = vent.filter((v) => v.compte && Number(v.montant) > 0)
            const tot = n2(lignes.reduce((x, v) => x + Number(v.montant), 0))
            if (lignes.length < 2) return setMsg({ t: "Renseignez au moins deux lignes (poste et montant).", err: true })
            if (Math.abs(tot - n2(f.montant)) > 0.004) return setMsg({ t: `La répartition fait ${euros(tot)} pour un montant de ${euros(f.montant)}.`, err: true })
            if (!f.tresorerie) return setMsg({ t: "Choisissez le compte de trésorerie.", err: true })
            const rows = lignes.map((v) => ({ le: f.le, sens: f.sens, libelle: f.libelle.trim(), montant: n2(v.montant), compte: v.compte, tresorerie: f.tresorerie, tiers: f.tiers?.trim() || null, evenement: (v.evenement || f.evenement || "").trim() || null, avance_par: f.avance_par?.trim() || null, rembourse: !!f.rembourse, piece_url: f.piece_url || null, pointe: !!f.pointe, note: [f.note?.trim(), `Ventilation d’une opération de ${euros(f.montant)}`].filter(Boolean).join(" · "), categorie: nom(v.compte) }))
            const { error } = await client.from("ecritures").insert(rows)
            if (error) return setMsg({ t: error.message, err: true })
            setMsg({ t: `${rows.length} écritures enregistrées (ventilation).`, err: false }); setVent(null); recharger()
            setF(encore ? { ...vide(), le: f.le, sens: f.sens, tresorerie: f.tresorerie, evenement: f.evenement } : null)
            return
        }
        const row = { le: f.le, sens: f.sens, libelle: f.libelle.trim(), montant: n2(f.montant), compte: f.compte || null, tresorerie: f.tresorerie, tiers: f.tiers?.trim() || null, evenement: f.evenement?.trim() || null, avance_par: f.avance_par?.trim() || null, rembourse: !!f.rembourse, piece_url: f.piece_url || null, pointe: !!f.pointe, note: (f.note || "").replace(/ · règlement non retrouvé/, "").trim() || null, categorie: f.sens === "virement" ? "Virement interne" : nom(f.compte) }
        const { error } = f.id ? await client.from("ecritures").update(row).eq("id", f.id) : await client.from("ecritures").insert(row)
        if (error) return setMsg({ t: error.message, err: true })
        setMsg({ t: f.id ? "Écriture modifiée." : "Écriture enregistrée.", err: false })
        recharger()
        // « Enregistrer et saisir la suivante » : garde la date, le type, la trésorerie et l'activité pour enchaîner
        setF(encore ? { ...vide(), le: f.le, sens: f.sens, tresorerie: f.tresorerie, evenement: f.evenement } : null)
    }
    const supprimer = async () => {
        if (!f?.id || !window.confirm(`Supprimer l’écriture « ${f.libelle} » (${euros(f.montant)}) ?`)) return
        const { error } = await client.from("ecritures").delete().eq("id", f.id)
        if (error) return setMsg({ t: error.message, err: true })
        setF(null); setMsg({ t: "Écriture supprimée.", err: false }); recharger()
    }
    const ids = () => [...sel]
    const grouper = async (champs: any, quoi: string) => {
        if (!sel.size) return
        if (champs === "suppr") {
            if (!window.confirm(`Supprimer définitivement ${sel.size} écriture${sel.size > 1 ? "s" : ""} ? Cette action ne peut pas être annulée.`)) return
            const { error } = await client.from("ecritures").delete().in("id", ids())
            if (error) return setMsg({ t: error.message, err: true })
        } else {
            const { error } = await client.from("ecritures").update(champs).in("id", ids())
            if (error) return setMsg({ t: error.message, err: true })
        }
        setMsg({ t: `${sel.size} écriture${sel.size > 1 ? "s" : ""} : ${quoi}.`, err: false }); setSel(new Set()); recharger()
    }
    const basculerPointe = async (r: Ecr) => { await client.from("ecritures").update({ pointe: !r.pointe }).eq("id", r.id); recharger() }
    const basculerRembourse = async (r: Ecr) => { await client.from("ecritures").update({ rembourse: !r.rembourse }).eq("id", r.id); recharger() }

    const mots = sa(q).split(/\s+/).filter(Boolean)
    const liste = ecr.filter((r) => (filtre === "notes" ? !!r.avance_par : filtre === "verif" ? aVerifier(r) : (filtre as any) === "nonpointe" ? !r.pointe && r.sens !== "virement" : !filtre || r.sens === filtre)
        && (!mois || r.le.slice(5, 7) === mois) && (!poste || r.compte === poste) && (!act || (act === "∅" ? !r.evenement : r.evenement === act)) && (!treso || r.tresorerie === treso || (r.sens === "virement" && r.compte === treso))
        && mots.every((m) => sa(`${r.libelle} ${r.tiers || ""} ${r.evenement || ""} ${r.compte || ""} ${nom(r.compte)} ${r.montant} ${String(r.montant).replace(".", ",")}`).includes(m)))
    const rec = liste.filter((r) => r.sens === "recette").reduce((s, r) => s + Number(r.montant), 0), dep = liste.filter((r) => r.sens === "depense").reduce((s, r) => s + Number(r.montant), 0)
    const nVerif = ecr.filter(aVerifier).length
    const couleur = (s: string) => (s === "recette" ? C.accent : s === "depense" ? C.danger : C.mute)
    const postesUtilises = [...new Set(ecr.map((r) => r.compte).filter((x) => x && !x.startsWith("5")))].sort() as string[]
    const actsExo = [...new Set(ecr.map((r) => r.evenement || ""))].sort()
    const filtresActifs = !!(q || filtre || mois || poste || act || treso)
    const exporterListe = () => exporter(`journal-acs-${exo}.csv`, ["Date", "Type", "Libellé", "Tiers", "Poste", "Intitulé du poste", "Activité", "Trésorerie", "Recette", "Dépense", "Avancé par", "Justificatif", "Note"],
        liste.slice().reverse().map((r) => [new Date(r.le).toLocaleDateString("fr-FR"), r.sens === "virement" ? "Virement" : r.sens === "recette" ? "Recette" : "Dépense", r.libelle, r.tiers || "", r.compte || "", nom(r.compte), r.evenement || "", r.sens === "virement" ? `${nom(r.tresorerie)} → ${nom(r.compte)}` : nom(r.tresorerie), r.sens === "recette" ? e2(Number(r.montant)) : "", r.sens === "depense" ? e2(Number(r.montant)) : "", r.avance_par || "", r.piece_url || "", r.note || ""]))

    return <>
        {f ? (
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>{f.id ? "Modifier l’écriture" : "Nouvelle écriture"}</h3>
                    <button style={small()} onClick={() => { setF(null); setVent(null); setMsg({ t: "", err: false }) }}>Fermer</button>
                </div>
                {f.note && /Import AssoConnect/.test(f.note) && <p style={{ ...muted, fontSize: 13, margin: "-6px 0 12px" }}>Écriture reprise d’AssoConnect : {f.note.replace(/^Import AssoConnect · /, "")}</p>}
                <fieldset disabled={!peut} style={{ border: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {([["depense", "Dépense"], ["recette", "Recette"], ["virement", "Virement interne"]] as const).map(([k, t]) => <button type="button" key={k} onClick={() => setF({ ...f, sens: k, compte: "" })} style={{ ...small(), padding: "8px 14px", fontWeight: 600, background: f.sens === k ? couleur(k) : "transparent", color: f.sens === k ? C.accentDark : C.txt, borderColor: f.sens === k ? couleur(k) : C.line }}>{t}</button>)}
                    </div>
                    <div><span style={label}>Date</span><input type="date" style={champ} value={f.le} onChange={(e) => set("le", e.target.value)} /></div>
                    <div><span style={label}>Montant (€)</span><input type="number" min={0} step={0.01} inputMode="decimal" style={champ} value={f.montant} onChange={(e) => set("montant", e.target.value)} /></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Libellé</span><input style={champ} value={f.libelle} onChange={(e) => set("libelle", e.target.value)} placeholder={f.sens === "virement" ? "Dépôt des espèces du salon" : "Achat de ponce, cotisation de…"} /></div>
                    {f.sens !== "virement" && !f.id && <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={!!vent} onChange={(e) => setVent(e.target.checked ? [{ compte: f.compte || "", montant: String(f.montant || ""), evenement: f.evenement || "" }, { compte: "", montant: "", evenement: f.evenement || "" }] : null)} style={{ accentColor: C.accent }} />Répartir sur plusieurs postes (ex. une facture qui mêle plantes et substrat)</label>
                    </div>}
                    {f.sens !== "virement" && vent ? <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
                        {vent.map((v, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) 110px minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}>
                            <select style={champ} value={v.compte} onChange={(e) => setVent(vent.map((x, k) => (k === i ? { ...x, compte: e.target.value } : x)))} aria-label={`Poste ${i + 1}`}><option value="">— Poste —</option>{postes(f.sens === "depense" ? 6 : 7).map((p) => <option key={p.compte} value={p.compte}>{p.compte} · {p.intitule}</option>)}</select>
                            <input style={{ ...champ, textAlign: "right" }} type="number" step={0.01} min={0} placeholder="€" value={v.montant} onChange={(e) => setVent(vent.map((x, k) => (k === i ? { ...x, montant: e.target.value } : x)))} aria-label={`Montant ${i + 1}`} />
                            <input style={champ} list="acs-evts" placeholder="Activité" value={v.evenement} onChange={(e) => setVent(vent.map((x, k) => (k === i ? { ...x, evenement: e.target.value } : x)))} aria-label={`Activité ${i + 1}`} />
                            <button type="button" style={small()} onClick={() => setVent(vent.length > 2 ? vent.filter((_, k) => k !== i) : vent)} aria-label="Retirer la ligne" disabled={vent.length <= 2}>×</button>
                        </div>)}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button type="button" style={small()} onClick={() => setVent([...vent, { compte: "", montant: "", evenement: f.evenement || "" }])}>+ Ajouter une ligne</button>
                            {(() => { const t = n2(vent.reduce((x, v) => x + (Number(v.montant) || 0), 0)), r = n2(Number(f.montant || 0) - t); return <span style={{ fontSize: 13.5, color: Math.abs(r) < 0.005 && t > 0 ? C.accent : "#d7b56d" }}>Réparti {euros(t)}{Math.abs(r) >= 0.005 ? ` · reste ${euros(r)}` : t > 0 ? " ✓" : ""}</span> })()}
                        </div>
                        <div><span style={label}>{f.sens === "depense" ? "Payé depuis" : "Encaissé sur"}</span>
                            <select style={champ} value={f.tresorerie || ""} onChange={(e) => set("tresorerie", e.target.value)}><option value="">— Choisir —</option>{tresos.map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}</select></div>
                    </div> : f.sens !== "virement" ? <>
                        <div style={{ gridColumn: "1 / -1" }}><span style={label}>Poste comptable</span>
                            <select style={champ} value={f.compte || ""} onChange={(e) => set("compte", e.target.value)}>
                                <option value="">— Choisir —</option>
                                {postes(f.sens === "depense" ? 6 : 7).map((p) => <option key={p.compte} value={p.compte}>{p.compte} · {p.intitule}</option>)}
                                {f.compte && !postes(f.sens === "depense" ? 6 : 7).some((p) => p.compte === f.compte) && <option value={f.compte}>{f.compte} · {nom(f.compte)}</option>}
                            </select></div>
                        <div><span style={label}>{f.sens === "depense" ? "Payé depuis" : "Encaissé sur"}</span>
                            <select style={champ} value={f.tresorerie || ""} onChange={(e) => set("tresorerie", e.target.value)}><option value="">— Choisir —</option>{tresos.map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}{f.tresorerie && !tresos.some((p) => p.compte === f.tresorerie) && <option value={f.tresorerie}>{nom(f.tresorerie)}</option>}</select></div>
                    </> : <>
                        <div><span style={label}>Depuis</span><select style={champ} value={f.tresorerie || ""} onChange={(e) => set("tresorerie", e.target.value)}>{tresos.map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}</select></div>
                        <div><span style={label}>Vers</span><select style={champ} value={f.compte || ""} onChange={(e) => set("compte", e.target.value)}><option value="">— Choisir —</option>{tresos.filter((p) => p.compte !== f.tresorerie).map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}</select></div>
                    </>}
                    <div><span style={label}>Tiers (fournisseur, client…)</span><input style={champ} list="acs-tiers" value={f.tiers || ""} onChange={(e) => set("tiers", e.target.value)} /><datalist id="acs-tiers">{tiersConnus.map((t) => <option key={t} value={t} />)}</datalist></div>
                    <div><span style={label}>Activité (facultatif)</span><input style={champ} list="acs-evts" value={f.evenement || ""} onChange={(e) => set("evenement", e.target.value)} placeholder="SALON de BÉDÉE, Adhésions, Voyages…" /><datalist id="acs-evts">{evts.map((t) => <option key={t} value={t} />)}</datalist></div>
                    {f.sens === "depense" && <div><span style={label}>Note de frais : avancé par</span><input style={champ} value={f.avance_par || ""} onChange={(e) => set("avance_par", e.target.value)} placeholder="Vide si payé par l’association" />
                        {f.avance_par && <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={!!f.rembourse} onChange={(e) => set("rembourse", e.target.checked)} style={{ accentColor: C.accent }} />Remboursé</label>}</div>}
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Justificatif (photo ou PDF)</span><FichierForm v={f.piece_url} set={(v: any) => set("piece_url", v)} dossier="compta" accept="image/*,application/pdf" taille={1600} /></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Note</span><textarea style={{ ...champ, minHeight: 60, resize: "vertical" }} value={f.note || ""} onChange={(e) => set("note", e.target.value)} /></div>
                    <label style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={!!f.pointe} onChange={(e) => set("pointe", e.target.checked)} style={{ accentColor: C.accent }} />Pointé : vu sur le relevé de compte</label>
                </fieldset>
                {peut && <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                    <button style={btn()} onClick={() => enregistrer(false)}>Enregistrer</button>
                    {!f.id && <button style={btn(false)} onClick={() => enregistrer(true)}>Enregistrer et saisir la suivante</button>}
                    {f.id && <button style={btn(false)} onClick={() => { setF({ ...f, id: undefined, le: auj(), pointe: false, rembourse: false, note: (f.note || "").replace(/^Import AssoConnect.*$/, "") }); setMsg({ t: "Copie prête : vérifiez la date et le montant, puis enregistrez.", err: false }) }}>Dupliquer</button>}
                    {f.id && <button style={small(true)} onClick={supprimer}>Supprimer</button>}
                </div>}
                <Msg t={msg.t} err={msg.err} />
            </div>
        ) : peut && <div><button style={btn()} onClick={() => { setMsg({ t: "", err: false }); setF(vide()) }}>Nouvelle écriture</button><Msg t={msg.t} err={msg.err} /></div>}

        <div style={box}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <input style={{ ...champ, flex: "1 1 240px", maxWidth: 380 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (libellé, tiers, poste, montant…)" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {([["", "Tout"], ["recette", "Recettes"], ["depense", "Dépenses"], ["virement", "Virements"], ["notes", "Notes de frais"]] as const).map(([k, t]) => <button key={k} onClick={() => setFiltre(k)} style={puceStyle(filtre === k)}>{t}</button>)}
                    <button onClick={() => setFiltre("nonpointe" as any)} style={puceStyle((filtre as any) === "nonpointe")}>Non pointées</button>
                    {nVerif > 0 && <button onClick={() => setFiltre("verif")} style={{ ...puceStyle(filtre === "verif"), borderColor: filtre === "verif" ? C.accent : "#d7b56d" }}>À vérifier ({nVerif})</button>}
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 12 }}>
                <select style={champ} value={mois} onChange={(e) => setMois(e.target.value)} aria-label="Mois"><option value="">Tous les mois</option>{MOIS_LONG.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m[0].toUpperCase() + m.slice(1)}</option>)}</select>
                <select style={champ} value={poste} onChange={(e) => setPoste(e.target.value)} aria-label="Poste"><option value="">Tous les postes</option>{postesUtilises.map((p) => <option key={p} value={p}>{p} · {nom(p)}</option>)}</select>
                <select style={champ} value={act} onChange={(e) => setAct(e.target.value)} aria-label="Activité"><option value="">Toutes les activités</option>{actsExo.map((a) => <option key={a || "∅"} value={a || "∅"}>{a || "Non affecté"}</option>)}</select>
                <select style={champ} value={treso} onChange={(e) => setTreso(e.target.value)} aria-label="Trésorerie"><option value="">Tous les comptes</option>{plan.filter((p) => p.classe === 5 && ecr.some((r) => mvt(r, p.compte))).map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}</select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <p style={{ ...muted, fontSize: 13 }}>{liste.length} écriture{liste.length > 1 ? "s" : ""} · recettes {euros(rec)} · dépenses {euros(dep)} · solde <b style={{ color: C.txt }}>{euros(rec - dep)}</b></p>
                <div style={{ display: "flex", gap: 8 }}>
                    {filtresActifs && <button style={small()} onClick={() => { setQ(""); setFiltre(""); setMois(""); setPoste(""); setAct(""); setTreso("") }}>Effacer les filtres</button>}
                    <button style={small()} onClick={exporterListe}>Exporter (Excel)</button>
                </div>
            </div>
            {peut && liste.length > 0 && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0", fontSize: 13.5 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={sel.size > 0 && liste.slice(0, limite).every((r) => sel.has(r.id!))} onChange={(e) => setSel(e.target.checked ? new Set(liste.slice(0, limite).map((r) => r.id!)) : new Set())} style={{ accentColor: C.accent, width: 16, height: 16 }} />Tout sélectionner{liste.length > limite ? ` (les ${limite} affichées)` : ""}</label>
                {sel.size > 0 && <span style={{ color: C.mute }}>{sel.size} sélectionnée{sel.size > 1 ? "s" : ""}</span>}
            </div>}
            {sel.size > 0 && <div style={{ border: `1px solid ${C.accent}`, padding: 12, margin: "0 0 10px", display: "grid", gap: 10 }}>
                <b style={{ fontSize: 14 }}>Modifier les {sel.size} écriture{sel.size > 1 ? "s" : ""} sélectionnée{sel.size > 1 ? "s" : ""}</b>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}><input style={champ} list="acs-evts" placeholder="Activité" value={groupe.act} onChange={(e) => setGroupe({ ...groupe, act: e.target.value })} /><button style={small()} onClick={() => grouper({ evenement: groupe.act.trim() || null }, groupe.act.trim() ? `activité « ${groupe.act.trim()} »` : "activité retirée")}>Appliquer</button></div>
                    <div style={{ display: "flex", gap: 6 }}><select style={champ} value={groupe.poste} onChange={(e) => setGroupe({ ...groupe, poste: e.target.value })}><option value="">Poste…</option>{plan.filter((p) => (p.classe === 6 || p.classe === 7) && p.actif).map((p) => <option key={p.compte} value={p.compte}>{p.compte} · {p.intitule}</option>)}</select><button style={small()} disabled={!groupe.poste} onClick={() => grouper({ compte: groupe.poste, categorie: nom(groupe.poste) }, `poste ${groupe.poste}`)}>Appliquer</button></div>
                    <div style={{ display: "flex", gap: 6 }}><select style={champ} value={groupe.treso} onChange={(e) => setGroupe({ ...groupe, treso: e.target.value })}><option value="">Compte de trésorerie…</option>{tresos.map((p) => <option key={p.compte} value={p.compte}>{nomTreso(p.intitule)}</option>)}</select><button style={small()} disabled={!groupe.treso} onClick={() => grouper({ tresorerie: groupe.treso }, `trésorerie ${nomTreso(nom(groupe.treso))}`)}>Appliquer</button></div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={small()} onClick={() => grouper({ pointe: true }, "pointées")}>Marquer pointées</button>
                    <button style={small()} onClick={() => grouper({ pointe: false }, "non pointées")}>Retirer le pointage</button>
                    <button style={small()} onClick={() => setSel(new Set())}>Annuler la sélection</button>
                    <button style={{ ...small(true), marginLeft: "auto" }} onClick={() => grouper("suppr", "supprimées")}>Supprimer</button>
                </div>
                <p style={{ ...muted, fontSize: 12.5 }}>Le poste ne s’applique qu’aux recettes et dépenses ; vérifiez la sélection avant d’appliquer.</p>
            </div>}
            {filtre === "verif" && <p style={{ fontSize: 13.5, color: "#d7b56d", margin: "4px 0 8px" }}>Ces écritures reprises d’AssoConnect n’ont pas de règlement retrouvé (souvent une vente annulée ou jamais payée). Ouvrez-les pour indiquer le compte d’encaissement si l’argent a bien été reçu.</p>}
            {liste.length === 0 ? <p style={{ ...muted, fontSize: 14 }}>Aucune écriture.</p> : liste.slice(0, limite).map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.line}`, fontSize: 14, background: sel.has(r.id!) ? "rgba(155,189,138,0.08)" : undefined }}>
                    {peut && <input type="checkbox" checked={sel.has(r.id!)} onChange={() => setSel((x) => { const n = new Set(x); n.has(r.id!) ? n.delete(r.id!) : n.add(r.id!); return n })} style={{ accentColor: C.accent, width: 16, height: 16, flexShrink: 0 }} aria-label={`Sélectionner ${r.libelle}`} />}
                    <button onClick={() => { setMsg({ t: "", err: false }); setVent(null); setF({ ...r }); window.scrollTo({ top: 0, behavior: "smooth" }) }} style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0, display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <span style={{ color: C.mute, fontSize: 13, minWidth: 64, fontVariantNumeric: "tabular-nums" }}>{new Date(r.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                        <span style={{ flex: "1 1 220px", minWidth: 0 }}>{r.libelle}{r.tiers ? <span style={{ color: C.mute }}> · {r.tiers}</span> : null}
                            <span style={{ display: "block", fontSize: 12.5, color: C.mute }}>{r.sens === "virement" ? `${nomTreso(nom(r.tresorerie))} → ${nomTreso(nom(r.compte))}` : `${r.compte ? r.compte + " · " : ""}${nom(r.compte) || r.categorie || "Sans poste"}`}{r.evenement ? ` · ${r.evenement}` : ""}{r.sens !== "virement" && r.tresorerie ? ` · ${nomTreso(nom(r.tresorerie))}` : ""}{r.piece_url ? " · 📎" : ""}{aVerifier(r) ? <span style={{ color: "#d7b56d" }}> · à vérifier</span> : null}</span></span>
                    </button>
                    {r.avance_par && <button onClick={() => peut && basculerRembourse(r)} title={peut ? "Cliquer pour changer" : undefined} style={{ ...small(), fontSize: 12, padding: "4px 8px", color: r.rembourse ? C.mute : "#d7b56d", borderColor: r.rembourse ? C.line : "#d7b56d", whiteSpace: "nowrap" }}>{r.rembourse ? "Remboursé" : `À rembourser · ${r.avance_par}`}</button>}
                    <button onClick={() => peut && basculerPointe(r)} title={r.pointe ? "Pointé sur le relevé (cliquer pour retirer)" : "Non pointé (cliquer pour pointer)"} aria-label={r.pointe ? "Pointé" : "Non pointé"} style={{ all: "unset", cursor: peut ? "pointer" : "default", width: 18, textAlign: "center", color: r.pointe ? C.accent : "rgba(246,240,230,0.25)", fontSize: 14 }}>{r.pointe ? "✓" : "○"}</button>
                    <span style={{ fontWeight: 600, color: couleur(r.sens), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: 86, textAlign: "right" }}>{r.sens === "depense" ? "−" : r.sens === "recette" ? "+" : ""}{euros(r.montant)}</span>
                </div>
            ))}
            {liste.length > limite && <button style={{ ...small(), marginTop: 10 }} onClick={() => setLimite(limite + 200)}>Afficher plus ({liste.length - limite} restantes)</button>}
        </div>
    </>
}

// ---------- Budget prévisionnel par poste ----------
function Budget({ exo, plan, ecr, budgets, peut, recharger }: { exo: number; plan: Compte[]; ecr: Ecr[]; budgets: Record<string, number>; peut: boolean; recharger: () => void }) {
    const client = sb()!
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [tous, setTous] = React.useState(false)
    const reel = (c: string) => ecr.filter((r) => r.compte === c && r.sens !== "virement").reduce((s, r) => s + Number(r.montant), 0)
    const majBudget = async (c: string, v: string) => {
        const m = v === "" ? 0 : n2(v)
        const { error } = await client.from("budgets").upsert({ exercice: exo, compte: c, montant: m })
        if (error) setMsg({ t: error.message, err: true }); else recharger()
    }
    const reprendre = async () => {
        if (!window.confirm(`Remplir le budget ${exo} avec le réalisé de ${exo - 1} ? Les montants déjà saisis seront remplacés.`)) return
        const { data, error } = await client.from("ecritures").select("compte,montant,sens").gte("le", `${exo - 1}-01-01`).lt("le", `${exo}-01-01`)
        if (error) return setMsg({ t: error.message, err: true })
        const m = new Map<string, number>()
        for (const r of data ?? []) if (r.compte && r.sens !== "virement") m.set(r.compte, (m.get(r.compte) || 0) + Number(r.montant))
        if (!m.size) return setMsg({ t: `Aucune écriture en ${exo - 1}.`, err: true })
        const { error: e2 } = await client.from("budgets").upsert([...m].map(([compte, v]) => ({ exercice: exo, compte, montant: Math.round(v) })))
        if (e2) return setMsg({ t: e2.message, err: true })
        setMsg({ t: `Budget prérempli avec le réalisé ${exo - 1} (arrondi à l’euro).`, err: false }); recharger()
    }
    const bloc = (classe: number, titre: string) => {
        const lignes = plan.filter((p) => p.classe === classe && (tous ? p.actif : budgets[p.compte] || reel(p.compte)))
        const tp = lignes.reduce((s, p) => s + (budgets[p.compte] || 0), 0), tr = lignes.reduce((s, p) => s + reel(p.compte), 0)
        return (
            <div style={box}>
                <span style={label}>{titre}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 13, color: C.mute, padding: "4px 0" }}><span style={{ flex: "1 1 200px" }}>Poste</span><span style={NUMS}><span style={{ width: 92, textAlign: "right" }}>Prévu</span><span style={{ width: 92, textAlign: "right" }}>Réalisé</span><span style={{ width: 46, textAlign: "right" }}>%</span></span></div>
                {lignes.length === 0 && <p style={{ ...muted, fontSize: 14, padding: "6px 0" }}>Aucun poste budgété. Cochez « Afficher tous les postes » pour en ajouter.</p>}
                {lignes.map((p) => {
                    const b = budgets[p.compte] || 0, r = reel(p.compte), pc = b ? Math.round((100 * r) / b) : null
                    return (
                        <div key={p.compte} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                            <span style={{ flex: "1 1 200px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${p.compte} · ${p.intitule}`}><span style={{ color: C.mute, fontSize: 12.5 }}>{p.compte}</span> {p.intitule}</span>
                            <span style={NUMS}>
                                <input key={`${p.compte}-${b}`} type="number" min={0} step={1} disabled={!peut} defaultValue={b || ""} onBlur={(e) => Number(e.target.value || 0) !== b && majBudget(p.compte, e.target.value)} style={{ ...champ, width: 92, padding: "5px 8px", textAlign: "right" }} aria-label={`Prévu ${p.intitule}`} />
                                <span style={{ width: 92, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{euros(r)}</span>
                                <span style={{ width: 46, textAlign: "right", fontVariantNumeric: "tabular-nums", color: pc == null ? C.mute : classe === 6 ? (pc > 100 ? C.danger : C.txt) : (pc >= 100 ? C.accent : C.txt) }}>{pc == null ? "—" : `${pc} %`}</span>
                            </span>
                        </div>
                    )
                })}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", padding: "7px 0", borderTop: `1px solid ${C.line}`, fontWeight: 700, fontSize: 14 }}><span style={{ flex: "1 1 200px" }}>Total</span><span style={NUMS}><span style={{ width: 92, textAlign: "right" }}>{euros(tp)}</span><span style={{ width: 92, textAlign: "right" }}>{euros(tr)}</span><span style={{ width: 46 }} /></span></div>
            </div>
        )
    }
    const rp = plan.filter((p) => p.classe === 7).reduce((s, p) => s + (budgets[p.compte] || 0), 0), dp = plan.filter((p) => p.classe === 6).reduce((s, p) => s + (budgets[p.compte] || 0), 0)
    return <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ ...muted, fontSize: 14 }}>Résultat prévu : <b style={{ color: rp - dp >= 0 ? C.accent : C.danger }}>{euros(rp - dp)}</b> (recettes {euros(rp)} − dépenses {euros(dp)})</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={tous} onChange={(e) => setTous(e.target.checked)} style={{ accentColor: C.accent }} />Afficher tous les postes</label>
                {peut && <button style={small()} onClick={reprendre}>Reprendre le réalisé {exo - 1}</button>}
            </div>
        </div>
        <Msg t={msg.t} err={msg.err} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: 16 }}>{bloc(7, "Recettes")}{bloc(6, "Dépenses")}</div>
    </>
}

// ---------- Réglages : droit de saisie, soldes au 1er janvier, plan comptable ----------
// activités et tiers : renommer (ou fusionner en donnant le nom d'un autre) sur toutes les écritures
function Noms({ tout, peut, recharger }: { tout: Ecr[]; peut: boolean; recharger: () => void }) {
    const client = sb()!
    const [type, setType] = React.useState<"evenement" | "tiers">("evenement")
    const [q, setQ] = React.useState("")
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [limite, setLimite] = React.useState(30)
    const stats = new Map<string, { n: number; m: number; der: string }>()
    for (const r of tout) { const k = (r as any)[type]; if (!k) continue; const x = stats.get(k) || { n: 0, m: 0, der: "" }; x.n++; x.m += r.sens === "virement" ? 0 : signe(r); if (r.le > x.der) x.der = r.le; stats.set(k, x) }
    const l = [...stats].filter(([k]) => !q || sa(k).includes(sa(q))).sort((a, b) => (type === "evenement" ? b[1].n - a[1].n : a[0].localeCompare(b[0], "fr")))
    const renommer = async (ancien: string, nouveau: string) => {
        nouveau = nouveau.trim()
        if (!nouveau || nouveau === ancien) return
        const fusion = stats.has(nouveau)
        if (!window.confirm(fusion ? `« ${nouveau} » existe déjà : fusionner les ${stats.get(ancien)!.n} écritures de « ${ancien} » avec lui ?` : `Renommer « ${ancien} » en « ${nouveau} » sur ${stats.get(ancien)!.n} écriture(s) ?`)) return recharger()
        const { error } = await client.from("ecritures").update({ [type]: nouveau }).eq(type, ancien)
        if (error) return setMsg({ t: error.message, err: true })
        setMsg({ t: fusion ? "Fusion faite." : "Renommé.", err: false }); recharger()
    }
    return <div style={box}>
        <span style={label}>Activités et tiers</span>
        <p style={{ ...muted, fontSize: 13.5, margin: "4px 0 10px" }}>Renommez une activité ou un tiers : toutes ses écritures suivent. Pour regrouper deux noms (doublon, faute de frappe), donnez à l’un le nom exact de l’autre. Une nouvelle activité se crée simplement en la tapant à la saisie.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <button style={puceStyle(type === "evenement")} onClick={() => { setType("evenement"); setQ("") }}>Activités</button>
            <button style={puceStyle(type === "tiers")} onClick={() => { setType("tiers"); setQ("") }}>Tiers</button>
            <input style={{ ...champ, flex: "1 1 200px", maxWidth: 300 }} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {l.slice(0, limite).map(([k, x]) => <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "4px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
            <input key={k} disabled={!peut} defaultValue={k} onBlur={(e) => renommer(k, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }} style={{ ...champ, padding: "5px 8px", background: "transparent", border: "1px solid transparent" }} onFocus={(e) => (e.target.style.borderColor = C.line)} aria-label={`Renommer ${k}`} />
            <span style={{ color: C.mute, fontSize: 12.5, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{x.n} écriture{x.n > 1 ? "s" : ""} · {euros(x.m)} · {x.der.slice(0, 4)}</span>
        </div>)}
        {l.length > limite && <button style={{ ...small(), marginTop: 8 }} onClick={() => setLimite(limite + 100)}>Afficher plus ({l.length - limite})</button>}
        {l.length === 0 && <p style={{ ...muted, fontSize: 14 }}>Aucun.</p>}
        <Msg t={msg.t} err={msg.err} />
    </div>
}

function Plan({ exo, plan, soldes, report, peut, recharger, tout }: { exo: number; plan: Compte[]; soldes: Record<string, number>; report: Record<string, number>; peut: boolean; recharger: () => void; tout: Ecr[] }) {
    const client = sb()!
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [nouv, setNouv] = React.useState({ compte: "", intitule: "" })
    const [voir, setVoir] = React.useState<number>(6)
    const [admins, setAdmins] = React.useState<any[]>([])
    React.useEffect(() => { client.from("adherents").select("id,prenom,nom,email,saisie_compta,fonction_bureau").eq("role", "admin").order("nom").then(({ data }: any) => setAdmins(data ?? [])) }, [])
    const utilises = new Set(tout.flatMap((r) => [r.compte, r.tresorerie]).filter(Boolean) as string[])
    const supprimerCompte = async (c: Compte) => {
        if (utilises.has(c.compte)) return setMsg({ t: "Ce compte a des écritures : décochez-le plutôt pour le masquer.", err: true })
        if (!window.confirm(`Supprimer le compte ${c.compte} · ${c.intitule} ?`)) return
        await client.from("budgets").delete().eq("compte", c.compte); await client.from("soldes_ouverture").delete().eq("compte", c.compte)
        const { error } = await client.from("plan_comptable").delete().eq("compte", c.compte)
        if (error) setMsg({ t: error.message, err: true }); else { setMsg({ t: "Compte supprimé.", err: false }); recharger() }
    }
    const maj = async (c: Compte, champs: any) => { const { error } = await client.from("plan_comptable").update(champs).eq("compte", c.compte); if (error) setMsg({ t: error.message, err: true }); else recharger() }
    const ajouter = async () => {
        const compte = nouv.compte.trim(), intitule = nouv.intitule.trim()
        if (!/^\d{3,8}$/.test(compte) || intitule.length < 2) return setMsg({ t: "Numéro (chiffres) et intitulé obligatoires.", err: true })
        const { error } = await client.from("plan_comptable").insert({ compte, intitule, classe: Number(compte[0]), actif: true })
        if (error) return setMsg({ t: /duplicate/.test(error.message) ? "Ce numéro de compte existe déjà." : error.message, err: true })
        setNouv({ compte: "", intitule: "" }); setMsg({ t: "Compte ajouté.", err: false }); recharger()
    }
    const majSolde = async (c: string, v: string) => {
        const { error } = v === "" ? await client.from("soldes_ouverture").delete().eq("exercice", exo).eq("compte", c) : await client.from("soldes_ouverture").upsert({ exercice: exo, compte: c, montant: n2(v) })
        if (error) setMsg({ t: error.message, err: true }); else recharger()
    }
    const droit = async (a: any) => { const { error } = await client.from("adherents").update({ saisie_compta: !a.saisie_compta }).eq("id", a.id); if (error) return setMsg({ t: error.message, err: true }); setAdmins((l) => l.map((x) => (x.id === a.id ? { ...x, saisie_compta: !a.saisie_compta } : x))); recharger() }
    const classes: [number, string][] = [[6, "Dépenses (6)"], [7, "Recettes (7)"], [5, "Trésorerie (5)"], [4, "Tiers (4)"], [1, "Capitaux (1)"], [8, "Contributions (8)"]]
    return <>
        <div style={box}>
            <span style={label}>Droit de saisie</span>
            <p style={{ ...muted, fontSize: 13.5, margin: "4px 0 10px" }}>Seuls les administrateurs cochés peuvent saisir et modifier la comptabilité ; les autres administrateurs la consultent. Tant que personne n’est coché, tous les administrateurs peuvent saisir.</p>
            {admins.map((a) => <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 14, cursor: peut ? "pointer" : "default" }}>
                <input type="checkbox" disabled={!peut} checked={!!a.saisie_compta} onChange={() => droit(a)} style={{ accentColor: C.accent, width: 16, height: 16 }} />
                <span>{[a.prenom, a.nom].filter(Boolean).join(" ") || a.email}{a.fonction_bureau ? <span style={{ color: C.mute }}> · {a.fonction_bureau}</span> : null}</span></label>)}
        </div>
        <div style={box}>
            <span style={label}>Soldes au 1er janvier {exo}</span>
            <p style={{ ...muted, fontSize: 13.5, margin: "4px 0 10px" }}>Par défaut, chaque compte reprend son solde du 31 décembre précédent (affiché en gris). Ne saisissez un montant que pour corriger d’après le relevé bancaire ; videz la case pour revenir au report automatique.</p>
            {plan.filter((p) => p.classe === 5 && (p.actif || soldes[p.compte] != null || Math.abs(report[p.compte] || 0) > 0.004)).map((p) => (
                <div key={p.compte} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px", gap: 10, alignItems: "center", padding: "5px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                    <span>{nomTreso(p.intitule)} <span style={{ color: C.mute, fontSize: 12.5 }}>{p.compte}{soldes[p.compte] == null ? " · report automatique" : " · saisi"}</span></span>
                    <input key={`${p.compte}-${soldes[p.compte]}`} type="number" step={0.01} disabled={!peut} defaultValue={soldes[p.compte] ?? ""} placeholder={(report[p.compte] || 0).toFixed(2)} onBlur={(e) => e.target.value !== String(soldes[p.compte] ?? "") && majSolde(p.compte, e.target.value)} style={{ ...champ, padding: "5px 8px", textAlign: "right" }} aria-label={`Solde au 1er janvier ${p.intitule}`} />
                </div>
            ))}
        </div>
        <div style={box}>
            <span style={label}>Plan comptable</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>{classes.map(([k, t]) => <button key={k} onClick={() => setVoir(k)} style={{ ...small(), padding: "6px 12px", fontSize: 13, background: voir === k ? C.accent : "transparent", color: voir === k ? C.accentDark : C.txt, borderColor: voir === k ? C.accent : C.line }}>{t}</button>)}</div>
            <p style={{ ...muted, fontSize: 13, marginBottom: 6 }}>Décochez les postes inutilisés : ils disparaissent des listes de saisie sans être supprimés.</p>
            {plan.filter((p) => p.classe === voir).map((p) => (
                <div key={p.compte} style={{ display: "grid", gridTemplateColumns: "24px 70px minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "4px 0", borderTop: `1px solid ${C.line}`, fontSize: 14, opacity: p.actif ? 1 : 0.55 }}>
                    <input type="checkbox" disabled={!peut} checked={p.actif} onChange={() => maj(p, { actif: !p.actif })} style={{ accentColor: C.accent, width: 16, height: 16 }} aria-label={`Utiliser ${p.intitule}`} />
                    <span style={{ color: C.mute, fontVariantNumeric: "tabular-nums" }}>{p.compte}</span>
                    <input key={`${p.compte}-${p.intitule}`} disabled={!peut} defaultValue={p.intitule} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== p.intitule && maj(p, { intitule: e.target.value.trim() })} style={{ ...champ, padding: "5px 8px", background: "transparent", border: "1px solid transparent" }} />
                    {peut && !utilises.has(p.compte) ? <button style={{ ...small(true), padding: "3px 8px", fontSize: 12 }} onClick={() => supprimerCompte(p)} aria-label={`Supprimer ${p.compte}`}>Supprimer</button> : <span style={{ color: C.mute, fontSize: 12 }}>{utilises.has(p.compte) ? "utilisé" : ""}</span>}
                </div>
            ))}
            {peut && <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 8, marginTop: 12 }}>
                <input style={champ} value={nouv.compte} onChange={(e) => setNouv({ ...nouv, compte: e.target.value })} placeholder="607900" inputMode="numeric" />
                <input style={champ} value={nouv.intitule} onChange={(e) => setNouv({ ...nouv, intitule: e.target.value })} placeholder="Intitulé du nouveau compte" />
                <button style={{ ...btn(), whiteSpace: "nowrap" }} onClick={ajouter}>Ajouter</button>
            </div>}
            <Msg t={msg.t} err={msg.err} />
        </div>
        <Noms tout={tout} peut={peut} recharger={recharger} />
    </>
}
