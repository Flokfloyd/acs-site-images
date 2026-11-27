// ComptaAdmin.tsx — comptabilité de l'association, dans l'administration (onglet Comptabilité).
// Quatre écrans : tableau de bord, saisie, budget, plan comptable et soldes.
// Le trésorier saisit des recettes et des dépenses simples ; la partie double (poste + compte de trésorerie)
// est déduite automatiquement, et l'export reprend le format d'import d'AssoConnect.
// Saisie réservée aux personnes qui ont le droit « saisie comptable » ; tous les admins peuvent consulter.
import * as React from "react"
import { C, serif } from "./AcsBase.tsx"
import { sb, box, input, label, btn, small, h2, muted, euros, dateFr, exporter } from "./EspaceMembre.tsx"
import { FichierForm } from "./EspaceMembre.tsx"

type Compte = { compte: string; intitule: string; classe: number; actif: boolean }
type Ecr = { id?: string; le: string; sens: "recette" | "depense" | "virement"; libelle: string; montant: number | string; compte?: string | null; tresorerie?: string | null; tiers?: string | null; evenement?: string | null; avance_par?: string | null; rembourse?: boolean; piece_url?: string | null; note?: string | null; categorie?: string | null; pointe?: boolean }

const auj = () => new Date().toISOString().slice(0, 10)
const sa = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const n2 = (x: any) => Math.round((Number(x) || 0) * 100) / 100
const champ: React.CSSProperties = { ...input, padding: "9px 10px", fontSize: 14 }
const NUMS: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }

function Msg({ t, err }: { t: string; err?: boolean }) {
    return t ? <p style={{ marginTop: 10, fontSize: 14, color: err ? C.danger : C.accent }}>{t}</p> : null
}

export default function ComptaAdmin({ moi }: { moi: string }) {
    const client = sb()!
    const [vue, setVue] = React.useState<"bord" | "saisie" | "budget" | "plan">("bord")
    const [exo, setExo] = React.useState(new Date().getFullYear())
    const [plan, setPlan] = React.useState<Compte[]>([])
    const [ecr, setEcr] = React.useState<Ecr[] | null>(null)
    const [budgets, setBudgets] = React.useState<Record<string, number>>({})
    const [soldes, setSoldes] = React.useState<Record<string, number>>({})
    const [auto, setAuto] = React.useState({ adh: 0, ins: 0, dons: 0 })
    const [peut, setPeut] = React.useState(false)
    const [err, setErr] = React.useState("")
    const charger = React.useCallback(async () => {
        const deb = `${exo}-01-01`, fin = `${exo + 1}-01-01`
        const [p, e, b, s, d, a, i, dn] = await Promise.all([
            client.from("plan_comptable").select("*").order("compte"),
            client.from("ecritures").select("*").gte("le", deb).lt("le", fin).order("le", { ascending: false }).order("cree_le", { ascending: false }),
            client.from("budgets").select("*").eq("exercice", exo),
            client.from("soldes_ouverture").select("*").eq("exercice", exo),
            client.rpc("peut_saisir_compta"),
            client.from("adhesions").select("montant").eq("annee", exo),
            client.from("inscriptions").select("montant,statut").gte("cree_le", deb).lt("cree_le", fin),
            client.from("dons").select("montant").gte("le", deb).lt("le", fin),
        ])
        if (p.error) { setErr(/plan_comptable/.test(p.error.message) ? "La nouvelle comptabilité n’est pas encore installée dans la base." : p.error.message); setEcr([]); return }
        setPlan(p.data ?? []); setEcr(e.data ?? [])
        setBudgets(Object.fromEntries((b.data ?? []).map((r: any) => [r.compte, Number(r.montant)])))
        setSoldes(Object.fromEntries((s.data ?? []).map((r: any) => [r.compte, Number(r.montant)])))
        setPeut(d.data === true)
        const som = (l: any[]) => l.reduce((x, r) => x + (Number(r.montant) || 0), 0)
        setAuto({ adh: som(a.data ?? []), ins: som((i.data ?? []).filter((r: any) => r.statut === "valide")), dons: som(dn.data ?? []) })
    }, [exo])
    React.useEffect(() => { charger() }, [charger])

    const nom = (c?: string | null) => { const x = plan.find((p) => p.compte === c); return x ? x.intitule : c || "" }
    const onglet = (k: typeof vue, t: string) => <button key={k} onClick={() => setVue(k)} style={{ ...small(), padding: "8px 14px", fontWeight: 600, background: vue === k ? C.accent : "transparent", color: vue === k ? C.accentDark : C.txt, borderColor: vue === k ? C.accent : C.line }}>{t}</button>

    // export au format d'import AssoConnect : deux lignes par écriture (poste et trésorerie)
    const exporterAssoConnect = () => {
        const lignes: any[][] = []
        ;[...(ecr ?? [])].reverse().forEach((r, i) => {
            const piece = i + 1, d = dateFr(r.le), m = n2(r.montant)
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

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button style={small()} onClick={() => setExo(exo - 1)} aria-label="Exercice précédent">‹</button>
                    <h3 style={{ ...h2, fontSize: 22, margin: "0 8px" }}>Exercice {exo}</h3>
                    <button style={small()} onClick={() => setExo(exo + 1)} aria-label="Exercice suivant">›</button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{onglet("bord", "Tableau de bord")}{onglet("saisie", "Saisie")}{onglet("budget", "Budget")}{onglet("plan", "Plan et soldes")}</div>
            </div>
            {!peut && ecr && !err && <p style={{ ...muted, fontSize: 13.5 }}>Consultation seulement : la saisie est réservée au trésorier.</p>}
            {err ? <div style={box}><p style={muted}>{err}</p></div> : !ecr ? <div style={box}><p style={muted}>Chargement…</p></div> : <>
                {vue === "bord" && <Bord exo={exo} plan={plan} ecr={ecr} soldes={soldes} auto={auto} nom={nom} exporterAssoConnect={exporterAssoConnect} aller={setVue} />}
                {vue === "saisie" && <Saisie plan={plan} ecr={ecr} peut={peut} nom={nom} recharger={charger} />}
                {vue === "budget" && <Budget exo={exo} plan={plan} ecr={ecr} budgets={budgets} peut={peut} recharger={charger} />}
                {vue === "plan" && <Plan exo={exo} plan={plan} soldes={soldes} peut={peut} recharger={charger} />}
            </>}
        </div>
    )
}

// ---------- Tableau de bord ----------
function Bord({ exo, plan, ecr, soldes, auto, nom, exporterAssoConnect, aller }: any) {
    const tresos: Compte[] = plan.filter((p: Compte) => p.classe === 5 && p.actif)
    const solde = (c: string) => {
        let s = Number(soldes[c] || 0)
        for (const r of ecr as Ecr[]) {
            const m = Number(r.montant) || 0
            if (r.sens === "recette" && r.tresorerie === c) s += m
            if (r.sens === "depense" && r.tresorerie === c) s -= m
            if (r.sens === "virement") { if (r.compte === c) s += m; if (r.tresorerie === c) s -= m }
        }
        return s
    }
    const rec = (ecr as Ecr[]).filter((r) => r.sens === "recette").reduce((s, r) => s + Number(r.montant), 0)
    const dep = (ecr as Ecr[]).filter((r) => r.sens === "depense").reduce((s, r) => s + Number(r.montant), 0)
    const parEvt = new Map<string, { r: number; d: number }>()
    for (const r of ecr as Ecr[]) if (r.evenement && r.sens !== "virement") { const x = parEvt.get(r.evenement) || { r: 0, d: 0 }; if (r.sens === "recette") x.r += Number(r.montant); else x.d += Number(r.montant); parEvt.set(r.evenement, x) }
    const parPoste = (sens: string) => { const m = new Map<string, number>(); for (const r of ecr as Ecr[]) if (r.sens === sens) { const k = r.compte || r.categorie || "Sans poste"; m.set(k, (m.get(k) || 0) + Number(r.montant)) } return [...m].sort((a, b) => b[1] - a[1]) }
    const notes = (ecr as Ecr[]).filter((r) => r.avance_par && !r.rembourse)
    const tuile = (t: string, v: number, c: string) => <div key={t} style={{ background: C.panel, padding: "14px 16px" }}><div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mute }}>{t}</div><div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: c, fontVariantNumeric: "tabular-nums" }}>{euros(v)}</div></div>
    const ligne = (t: string, v: number, fort = false) => <div key={t} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: `1px solid ${C.line}`, fontWeight: fort ? 700 : 400, fontSize: 14 }}><span style={{ minWidth: 0 }}>{t}</span><span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{euros(v)}</span></div>
    return <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
            {tuile("Recettes", rec, C.accent)}{tuile("Dépenses", dep, C.danger)}{tuile("Résultat", rec - dep, rec - dep >= 0 ? C.txt : C.danger)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={box}><span style={label}>Trésorerie</span>
                {tresos.map((t) => ligne(t.intitule.replace(/^Banques - |^Caisse - /, ""), solde(t.compte)))}
                {ligne("Total", tresos.reduce((s, t) => s + solde(t.compte), 0), true)}
                <p style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Soldes d’ouverture au 1er janvier {exo} + écritures saisies. Réglez les soldes d’ouverture dans « Plan et soldes ».</p>
            </div>
            <div style={box}><span style={label}>Par événement</span>
                {parEvt.size === 0 ? <p style={{ ...muted, fontSize: 14, paddingTop: 6 }}>Renseignez le champ « Événement » à la saisie (Salon {exo}, AG…) pour suivre chaque activité.</p>
                    : [...parEvt].map(([e, x]) => <div key={e} style={{ padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontWeight: 600 }}>{e}</b><span style={{ color: x.r - x.d >= 0 ? C.accent : C.danger, fontVariantNumeric: "tabular-nums" }}>{euros(x.r - x.d)}</span></div><div style={{ color: C.mute, fontSize: 12.5 }}>recettes {euros(x.r)} · dépenses {euros(x.d)}</div></div>)}
            </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={box}><span style={label}>Recettes par poste</span>{parPoste("recette").map(([k, v]) => ligne(`${/^\d+$/.test(k) ? k + " · " : ""}${nom(k)}`, v))}{parPoste("recette").length === 0 && <p style={{ ...muted, fontSize: 14 }}>Aucune recette saisie.</p>}</div>
            <div style={box}><span style={label}>Dépenses par poste</span>{parPoste("depense").map(([k, v]) => ligne(`${/^\d+$/.test(k) ? k + " · " : ""}${nom(k)}`, v))}{parPoste("depense").length === 0 && <p style={{ ...muted, fontSize: 14 }}>Aucune dépense saisie.</p>}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={box}><span style={label}>Notes de frais à rembourser</span>
                {notes.length === 0 ? <p style={{ ...muted, fontSize: 14, paddingTop: 6 }}>Aucune.</p> : notes.map((r) => ligne(`${r.avance_par} · ${r.libelle}`, Number(r.montant)))}
                {notes.length > 0 && <button style={{ ...small(), marginTop: 10 }} onClick={() => aller("saisie")}>Voir dans la saisie</button>}
            </div>
            <div style={box}><span style={label}>Enregistré ailleurs dans le site (pour contrôle)</span>
                {ligne("Adhésions notées", auto.adh)}{ligne("Inscriptions et achats réglés", auto.ins)}{ligne("Dons", auto.dons)}
                <p style={{ ...muted, fontSize: 12.5, marginTop: 8 }}>Ces montants ne sont pas ajoutés au résultat : vérifiez qu’ils figurent bien dans la saisie (comptes 756000, 754000…).</p>
            </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btn(false)} onClick={exporterAssoConnect}>Exporter le journal (format AssoConnect)</button>
        </div>
    </>
}

// ---------- Saisie ----------
const vide = (): Ecr => ({ le: auj(), sens: "depense", libelle: "", montant: "", compte: "", tresorerie: "512001", tiers: "", evenement: "", avance_par: "", rembourse: false, piece_url: null, note: "" })

function Saisie({ plan, ecr, peut, nom, recharger }: { plan: Compte[]; ecr: Ecr[]; peut: boolean; nom: (c?: string | null) => string; recharger: () => void }) {
    const client = sb()!
    const [f, setF] = React.useState<Ecr | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [q, setQ] = React.useState("")
    const [filtre, setFiltre] = React.useState<"" | "recette" | "depense" | "virement" | "notes">("")
    const [limite, setLimite] = React.useState(60)
    const postes = (classe: number) => plan.filter((p) => p.classe === classe && p.actif)
    const tresos = plan.filter((p) => p.classe === 5 && p.actif)
    const evts = [...new Set(ecr.map((r) => r.evenement).filter(Boolean))] as string[]
    const tiersConnus = [...new Set(ecr.map((r) => r.tiers).filter(Boolean))] as string[]
    const set = (k: keyof Ecr, v: any) => setF((x) => x && { ...x, [k]: v })
    const enregistrer = async (encore: boolean) => {
        if (!f) return
        if (!f.libelle.trim() || !(Number(f.montant) > 0) || !f.le) return setMsg({ t: "Date, libellé et montant sont obligatoires.", err: true })
        if (f.sens !== "virement" && !f.compte) return setMsg({ t: "Choisissez le poste comptable.", err: true })
        if (!f.tresorerie || (f.sens === "virement" && !f.compte)) return setMsg({ t: "Choisissez le compte de trésorerie.", err: true })
        const row = { le: f.le, sens: f.sens, libelle: f.libelle.trim(), montant: n2(f.montant), compte: f.compte || null, tresorerie: f.tresorerie, tiers: f.tiers?.trim() || null, evenement: f.evenement?.trim() || null, avance_par: f.avance_par?.trim() || null, rembourse: !!f.rembourse, piece_url: f.piece_url || null, note: f.note?.trim() || null, categorie: f.sens === "virement" ? "Virement interne" : nom(f.compte) }
        const { error } = f.id ? await client.from("ecritures").update(row).eq("id", f.id) : await client.from("ecritures").insert(row)
        if (error) return setMsg({ t: error.message, err: true })
        setMsg({ t: f.id ? "Écriture modifiée." : "Écriture enregistrée.", err: false })
        recharger()
        // « Enregistrer et continuer » : garde la date, le type, la trésorerie et l'événement pour enchaîner les saisies
        setF(encore ? { ...vide(), le: f.le, sens: f.sens, tresorerie: f.tresorerie, evenement: f.evenement } : null)
    }
    const supprimer = async () => {
        if (!f?.id || !window.confirm(`Supprimer l’écriture « ${f.libelle} » (${euros(f.montant)}) ?`)) return
        const { error } = await client.from("ecritures").delete().eq("id", f.id)
        if (error) return setMsg({ t: error.message, err: true })
        setF(null); setMsg({ t: "Écriture supprimée.", err: false }); recharger()
    }
    const basculerRembourse = async (r: Ecr) => { await client.from("ecritures").update({ rembourse: !r.rembourse }).eq("id", r.id); recharger() }

    const mots = sa(q).split(/\s+/).filter(Boolean)
    const liste = ecr.filter((r) => (filtre === "notes" ? !!r.avance_par : !filtre || r.sens === filtre)
        && mots.every((m) => sa(`${r.libelle} ${r.tiers || ""} ${r.evenement || ""} ${r.compte || ""} ${nom(r.compte)} ${r.montant}`).includes(m)))
    const total = liste.reduce((s, r) => s + (r.sens === "recette" ? 1 : r.sens === "depense" ? -1 : 0) * Number(r.montant), 0)
    const puce = (k: typeof filtre, t: string) => <button key={k} onClick={() => setFiltre(k)} style={{ ...small(), padding: "6px 12px", fontSize: 13, background: filtre === k ? C.accent : "transparent", color: filtre === k ? C.accentDark : C.txt, borderColor: filtre === k ? C.accent : C.line }}>{t}</button>
    const couleur = (s: string) => (s === "recette" ? C.accent : s === "depense" ? C.danger : C.mute)

    return <>
        {f ? (
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>{f.id ? "Modifier l’écriture" : "Nouvelle écriture"}</h3>
                    <button style={small()} onClick={() => { setF(null); setMsg({ t: "", err: false }) }}>Fermer</button>
                </div>
                <fieldset disabled={!peut} style={{ border: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {([["depense", "Dépense"], ["recette", "Recette"], ["virement", "Virement interne"]] as const).map(([k, t]) => <button type="button" key={k} onClick={() => setF({ ...f, sens: k, compte: "" })} style={{ ...small(), padding: "8px 14px", fontWeight: 600, background: f.sens === k ? couleur(k) : "transparent", color: f.sens === k ? C.accentDark : C.txt, borderColor: f.sens === k ? couleur(k) : C.line }}>{t}</button>)}
                    </div>
                    <div><span style={label}>Date</span><input type="date" style={champ} value={f.le} onChange={(e) => set("le", e.target.value)} /></div>
                    <div><span style={label}>Montant (€)</span><input type="number" min={0} step={0.01} inputMode="decimal" style={champ} value={f.montant} onChange={(e) => set("montant", e.target.value)} /></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Libellé</span><input style={champ} value={f.libelle} onChange={(e) => set("libelle", e.target.value)} placeholder={f.sens === "virement" ? "Dépôt des espèces du salon" : "Achat de ponce, cotisation de…"} /></div>
                    {f.sens !== "virement" ? <>
                        <div style={{ gridColumn: "1 / -1" }}><span style={label}>Poste comptable</span>
                            <select style={champ} value={f.compte || ""} onChange={(e) => set("compte", e.target.value)}>
                                <option value="">— Choisir —</option>
                                {postes(f.sens === "depense" ? 6 : 7).map((p) => <option key={p.compte} value={p.compte}>{p.compte} · {p.intitule}</option>)}
                            </select></div>
                        <div><span style={label}>{f.sens === "depense" ? "Payé depuis" : "Encaissé sur"}</span>
                            <select style={champ} value={f.tresorerie || ""} onChange={(e) => set("tresorerie", e.target.value)}>{tresos.map((p) => <option key={p.compte} value={p.compte}>{p.intitule}</option>)}</select></div>
                    </> : <>
                        <div><span style={label}>Depuis</span><select style={champ} value={f.tresorerie || ""} onChange={(e) => set("tresorerie", e.target.value)}>{tresos.map((p) => <option key={p.compte} value={p.compte}>{p.intitule}</option>)}</select></div>
                        <div><span style={label}>Vers</span><select style={champ} value={f.compte || ""} onChange={(e) => set("compte", e.target.value)}><option value="">— Choisir —</option>{tresos.filter((p) => p.compte !== f.tresorerie).map((p) => <option key={p.compte} value={p.compte}>{p.intitule}</option>)}</select></div>
                    </>}
                    <div><span style={label}>Tiers (fournisseur, client…)</span><input style={champ} list="acs-tiers" value={f.tiers || ""} onChange={(e) => set("tiers", e.target.value)} /><datalist id="acs-tiers">{tiersConnus.map((t) => <option key={t} value={t} />)}</datalist></div>
                    <div><span style={label}>Événement (facultatif)</span><input style={champ} list="acs-evts" value={f.evenement || ""} onChange={(e) => set("evenement", e.target.value)} placeholder={`Salon ${new Date().getFullYear()}`} /><datalist id="acs-evts">{evts.map((t) => <option key={t} value={t} />)}</datalist></div>
                    {f.sens === "depense" && <div><span style={label}>Note de frais : avancé par</span><input style={champ} value={f.avance_par || ""} onChange={(e) => set("avance_par", e.target.value)} placeholder="Vide si payé par l’association" />
                        {f.avance_par && <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={!!f.rembourse} onChange={(e) => set("rembourse", e.target.checked)} style={{ accentColor: C.accent }} />Remboursé</label>}</div>}
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Justificatif (photo ou PDF)</span><FichierForm v={f.piece_url} set={(v: any) => set("piece_url", v)} dossier="compta" accept="image/*,application/pdf" taille={1600} /></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={label}>Note</span><textarea style={{ ...champ, minHeight: 60, resize: "vertical" }} value={f.note || ""} onChange={(e) => set("note", e.target.value)} /></div>
                </fieldset>
                {peut && <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                    <button style={btn()} onClick={() => enregistrer(false)}>Enregistrer</button>
                    {!f.id && <button style={btn(false)} onClick={() => enregistrer(true)}>Enregistrer et saisir la suivante</button>}
                    {f.id && <button style={small(true)} onClick={supprimer}>Supprimer</button>}
                </div>}
                <Msg t={msg.t} err={msg.err} />
            </div>
        ) : peut && <div><button style={btn()} onClick={() => { setMsg({ t: "", err: false }); setF(vide()) }}>Nouvelle écriture</button><Msg t={msg.t} err={msg.err} /></div>}

        <div style={box}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <input style={{ ...champ, flex: "1 1 220px", maxWidth: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (libellé, tiers, poste, montant…)" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{puce("", "Tout")}{puce("recette", "Recettes")}{puce("depense", "Dépenses")}{puce("virement", "Virements")}{puce("notes", "Notes de frais")}</div>
            </div>
            <p style={{ ...muted, fontSize: 13, marginBottom: 6 }}>{liste.length} écriture{liste.length > 1 ? "s" : ""}{filtre !== "virement" ? ` · solde ${euros(total)}` : ""}</p>
            {liste.length === 0 ? <p style={{ ...muted, fontSize: 14 }}>Aucune écriture.</p> : liste.slice(0, limite).map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                    <button onClick={() => { setMsg({ t: "", err: false }); setF({ ...r }) ; window.scrollTo({ top: 0, behavior: "smooth" }) }} style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0, display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <span style={{ color: C.mute, fontSize: 13, minWidth: 76, fontVariantNumeric: "tabular-nums" }}>{dateFr(r.le)}</span>
                        <span style={{ flex: "1 1 200px", minWidth: 0 }}>{r.libelle}{r.tiers ? <span style={{ color: C.mute }}> · {r.tiers}</span> : null}
                            <span style={{ display: "block", fontSize: 12.5, color: C.mute }}>{r.sens === "virement" ? `${nom(r.tresorerie)} → ${nom(r.compte)}` : `${r.compte ? r.compte + " · " : ""}${nom(r.compte) || r.categorie || "Sans poste"}`}{r.evenement ? ` · ${r.evenement}` : ""}{r.piece_url ? " · 📎" : ""}</span></span>
                    </button>
                    {r.avance_par && <button onClick={() => peut && basculerRembourse(r)} title={peut ? "Cliquer pour changer" : undefined} style={{ ...small(), fontSize: 12, padding: "4px 8px", color: r.rembourse ? C.mute : "#d7b56d", borderColor: r.rembourse ? C.line : "#d7b56d", whiteSpace: "nowrap" }}>{r.rembourse ? "Remboursé" : `À rembourser · ${r.avance_par}`}</button>}
                    <span style={{ fontWeight: 600, color: couleur(r.sens), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.sens === "depense" ? "−" : r.sens === "recette" ? "+" : ""}{euros(r.montant)}</span>
                </div>
            ))}
            {liste.length > limite && <button style={{ ...small(), marginTop: 10 }} onClick={() => setLimite(limite + 100)}>Afficher plus ({liste.length - limite} restantes)</button>}
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

// ---------- Plan comptable, soldes d'ouverture, droit de saisie ----------
function Plan({ exo, plan, soldes, peut, recharger }: { exo: number; plan: Compte[]; soldes: Record<string, number>; peut: boolean; recharger: () => void }) {
    const client = sb()!
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [nouv, setNouv] = React.useState({ compte: "", intitule: "" })
    const [voir, setVoir] = React.useState<number>(6)
    const [admins, setAdmins] = React.useState<any[]>([])
    React.useEffect(() => { client.from("adherents").select("id,prenom,nom,email,saisie_compta,fonction_bureau").eq("role", "admin").order("nom").then(({ data }: any) => setAdmins(data ?? [])) }, [])
    const maj = async (c: Compte, champs: any) => { const { error } = await client.from("plan_comptable").update(champs).eq("compte", c.compte); if (error) setMsg({ t: error.message, err: true }); else recharger() }
    const ajouter = async () => {
        const compte = nouv.compte.trim(), intitule = nouv.intitule.trim()
        if (!/^\d{3,8}$/.test(compte) || intitule.length < 2) return setMsg({ t: "Numéro (chiffres) et intitulé obligatoires.", err: true })
        const { error } = await client.from("plan_comptable").insert({ compte, intitule, classe: Number(compte[0]), actif: true })
        if (error) return setMsg({ t: /duplicate/.test(error.message) ? "Ce numéro de compte existe déjà." : error.message, err: true })
        setNouv({ compte: "", intitule: "" }); setMsg({ t: "Compte ajouté.", err: false }); recharger()
    }
    const majSolde = async (c: string, v: string) => { const { error } = await client.from("soldes_ouverture").upsert({ exercice: exo, compte: c, montant: v === "" ? 0 : n2(v) }); if (error) setMsg({ t: error.message, err: true }); else recharger() }
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
            <span style={label}>Soldes d’ouverture au 1er janvier {exo}</span>
            {plan.filter((p) => p.classe === 5 && p.actif).map((p) => (
                <div key={p.compte} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 130px", gap: 10, alignItems: "center", padding: "5px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                    <span>{p.intitule} <span style={{ color: C.mute, fontSize: 12.5 }}>{p.compte}</span></span>
                    <input key={`${p.compte}-${soldes[p.compte]}`} type="number" step={0.01} disabled={!peut} defaultValue={soldes[p.compte] ?? ""} onBlur={(e) => Number(e.target.value || 0) !== (soldes[p.compte] || 0) && majSolde(p.compte, e.target.value)} style={{ ...champ, padding: "5px 8px", textAlign: "right" }} />
                </div>
            ))}
        </div>
        <div style={box}>
            <span style={label}>Plan comptable</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>{classes.map(([k, t]) => <button key={k} onClick={() => setVoir(k)} style={{ ...small(), padding: "6px 12px", fontSize: 13, background: voir === k ? C.accent : "transparent", color: voir === k ? C.accentDark : C.txt, borderColor: voir === k ? C.accent : C.line }}>{t}</button>)}</div>
            <p style={{ ...muted, fontSize: 13, marginBottom: 6 }}>Décochez les postes inutilisés : ils disparaissent des listes de saisie sans être supprimés.</p>
            {plan.filter((p) => p.classe === voir).map((p) => (
                <div key={p.compte} style={{ display: "grid", gridTemplateColumns: "24px 70px minmax(0, 1fr)", gap: 10, alignItems: "center", padding: "4px 0", borderTop: `1px solid ${C.line}`, fontSize: 14, opacity: p.actif ? 1 : 0.55 }}>
                    <input type="checkbox" disabled={!peut} checked={p.actif} onChange={() => maj(p, { actif: !p.actif })} style={{ accentColor: C.accent, width: 16, height: 16 }} aria-label={`Utiliser ${p.intitule}`} />
                    <span style={{ color: C.mute, fontVariantNumeric: "tabular-nums" }}>{p.compte}</span>
                    <input key={`${p.compte}-${p.intitule}`} disabled={!peut} defaultValue={p.intitule} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== p.intitule && maj(p, { intitule: e.target.value.trim() })} style={{ ...champ, padding: "5px 8px", background: "transparent", border: "1px solid transparent" }} />
                </div>
            ))}
            {peut && <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 8, marginTop: 12 }}>
                <input style={champ} value={nouv.compte} onChange={(e) => setNouv({ ...nouv, compte: e.target.value })} placeholder="607900" inputMode="numeric" />
                <input style={champ} value={nouv.intitule} onChange={(e) => setNouv({ ...nouv, intitule: e.target.value })} placeholder="Intitulé du nouveau compte" />
                <button style={{ ...btn(), whiteSpace: "nowrap" }} onClick={ajouter}>Ajouter</button>
            </div>}
            <Msg t={msg.t} err={msg.err} />
        </div>
    </>
}
