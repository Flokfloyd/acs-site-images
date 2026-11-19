// EspaceMembre.tsx — connexion par e-mail + code, espace adhérent, gestion admin
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, C, font } from "./AcsBase.tsx"

type Adherent = { id: string; email: string; prenom?: string; nom?: string; role: "membre" | "admin"; cotisation_annee?: number; actif: boolean }

// ---------- petits éléments d'interface (angles droits, palette du site) ----------
const box: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: 28, color: C.txt, ...font }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: C.bg, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 0, padding: "12px 14px", font: "inherit", fontSize: 15, outline: "none" }
const label: React.CSSProperties = { display: "block", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "0 0 6px" }
const btn = (primary = true): React.CSSProperties => ({ background: primary ? C.accent : "transparent", color: primary ? C.accentDark : C.txt, border: primary ? "none" : `1px solid ${C.line}`, borderRadius: 0, padding: "12px 20px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" })
const small = (danger = false): React.CSSProperties => ({ background: "transparent", color: danger ? C.danger : C.txt, border: `1px solid ${danger ? C.danger : C.line}`, borderRadius: 0, padding: "6px 12px", font: "inherit", fontSize: 13, cursor: "pointer" })
const h2: React.CSSProperties = { fontSize: 26, lineHeight: 1.2, margin: "0 0 8px", fontWeight: 600 }
const muted: React.CSSProperties = { color: C.mute, margin: 0 }

function Msg({ text, err }: { text: string; err?: boolean }) {
    if (!text) return null
    return <p style={{ margin: "12px 0 0", color: err ? C.danger : C.accent, fontSize: 14 }}>{text}</p>
}

// ===================================================================================
export default function EspaceMembre(props: { lienSemestriels: string }) {
    const client = sb()
    const [ready, setReady] = React.useState(false)
    const [email, setEmail] = React.useState("")
    const [moi, setMoi] = React.useState<Adherent | null>(null)
    const [sessionEmail, setSessionEmail] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!client) { setReady(true); return }
        client.auth.getSession().then(({ data }) => { setSessionEmail(data.session?.user.email ?? null); setReady(true) })
        const { data } = client.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user.email ?? null))
        return () => data.subscription.unsubscribe()
    }, [])

    React.useEffect(() => {
        if (!client || !sessionEmail) { setMoi(null); return }
        client.from("adherents").select("*").eq("email", sessionEmail.toLowerCase()).maybeSingle().then(({ data }) => setMoi((data as Adherent) ?? null))
    }, [sessionEmail])

    const wrap = (children: React.ReactNode) => <div style={{ width: "100%", color: C.txt, ...font }}>{children}</div>

    if (!client) return wrap(<div style={box}><h2 style={h2}>Espace membre</h2><p style={muted}>L’espace membre ouvre bientôt. Les adhérents pourront s’y connecter avec leur adresse e-mail.</p></div>)
    if (!ready) return wrap(<div style={box}><p style={muted}>Chargement…</p></div>)
    if (!sessionEmail) return wrap(<Connexion email={email} setEmail={setEmail} />)
    if (!moi) return wrap(<div style={box}><h2 style={h2}>Adresse non reconnue</h2><p style={muted}>{sessionEmail} ne figure pas (ou plus) dans la liste des adhérents. Contactez le bureau de l’association.</p><div style={{ marginTop: 20 }}><button style={btn(false)} onClick={() => client.auth.signOut()}>Se déconnecter</button></div></div>)
    return wrap(<Tableau moi={moi} lienSemestriels={props.lienSemestriels} />)
}

EspaceMembre.defaultProps = { lienSemestriels: "/#n4" }
addPropertyControls(EspaceMembre, { lienSemestriels: { type: ControlType.String, title: "Lien semestriels", defaultValue: "/#n4" } })

// ---------- Connexion : e-mail puis code à 6 chiffres ----------
function Connexion({ email, setEmail }: { email: string; setEmail: (s: string) => void }) {
    const client = sb()!
    const [etape, setEtape] = React.useState<"email" | "code">("email")
    const [code, setCode] = React.useState("")
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [busy, setBusy] = React.useState(false)

    const envoyer = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const em = email.trim().toLowerCase()
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setMsg({ t: "Adresse e-mail invalide.", err: true })
        setBusy(true); setMsg({ t: "", err: false })
        const { error } = await client.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } })
        setBusy(false)
        if (error) return setMsg({ t: /adh[ée]rent|403|not allowed|signup/i.test(error.message) ? "Cette adresse ne figure pas dans la liste des adhérents." : "Envoi impossible : " + error.message, err: true })
        setEtape("code"); setMsg({ t: "Code envoyé. Pensez à regarder dans les indésirables.", err: false })
    }
    const verifier = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setBusy(true); setMsg({ t: "", err: false })
        const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" })
        setBusy(false)
        if (error) setMsg({ t: "Code incorrect ou expiré.", err: true })
    }

    return (
        <div style={{ ...box, maxWidth: 460 }}>
            <h2 style={h2}>Connexion adhérent</h2>
            {etape === "email" ? (
                <form onSubmit={envoyer}>
                    <p style={{ ...muted, marginBottom: 20 }}>Saisissez l’adresse e-mail donnée lors de votre adhésion : vous recevrez un code de connexion.</p>
                    <span style={label}>Adresse e-mail</span>
                    <input style={input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" />
                    <div style={{ marginTop: 18 }}><button style={btn()} disabled={busy} type="submit">{busy ? "Envoi…" : "Recevoir un code"}</button></div>
                </form>
            ) : (
                <form onSubmit={verifier}>
                    <p style={{ ...muted, marginBottom: 20 }}>Code envoyé à <strong style={{ color: C.txt }}>{email}</strong>.</p>
                    <span style={label}>Code reçu</span>
                    <input style={{ ...input, letterSpacing: "0.4em", fontSize: 22, textAlign: "center" }} inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
                    <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button style={btn()} disabled={busy || code.length < 6} type="submit">{busy ? "Vérification…" : "Se connecter"}</button>
                        <button style={btn(false)} type="button" onClick={() => { setEtape("email"); setCode(""); setMsg({ t: "", err: false }) }}>Changer d’adresse</button>
                    </div>
                </form>
            )}
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Tableau de bord ----------
function Tableau({ moi, lienSemestriels }: { moi: Adherent; lienSemestriels: string }) {
    const client = sb()!
    const annee = new Date().getFullYear()
    const aJour = (moi.cotisation_annee ?? 0) >= annee
    const [onglet, setOnglet] = React.useState<"accueil" | "agenda" | "semestriels" | "adherents">("accueil")
    const admin = moi.role === "admin"
    const tabs: [typeof onglet, string][] = admin ? [["accueil", "Mon espace"], ["agenda", "Agenda"], ["semestriels", "Semestriels"], ["adherents", "Adhérents"]] : []

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ ...h2, marginBottom: 2 }}>Bonjour{moi.prenom ? " " + moi.prenom : ""}</h2>
                    <p style={muted}>{moi.email}{admin ? " · administrateur" : ""}</p>
                </div>
                <button style={btn(false)} onClick={() => client.auth.signOut()}>Se déconnecter</button>
            </div>
            {admin && (
                <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
                    {tabs.map(([k, t]) => (
                        <button key={k} onClick={() => setOnglet(k)} style={{ background: "transparent", color: onglet === k ? C.txt : C.mute, border: "none", borderBottom: `2px solid ${onglet === k ? C.accent : "transparent"}`, borderRadius: 0, padding: "12px 16px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>
                    ))}
                </div>
            )}
            {onglet === "accueil" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <div style={box}>
                        <span style={label}>Cotisation</span>
                        <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>{aJour ? `À jour pour ${annee}` : "À renouveler"}</p>
                        <p style={muted}>{aJour ? "Merci pour votre soutien !" : `Dernière cotisation : ${moi.cotisation_annee ?? "—"}. Adhésion annuelle : 20 €.`}</p>
                    </div>
                    <div style={box}>
                        <span style={label}>Semestriels</span>
                        <p style={{ ...muted, marginBottom: 16 }}>Tous les numéros sont à lire en ligne.</p>
                        <a href={lienSemestriels} style={{ ...btn(), display: "inline-block", textDecoration: "none" }}>Lire les semestriels</a>
                    </div>
                </div>
            )}
            {onglet === "agenda" && <Editeur table="evenements" ordre="date_debut" titre="Événements" champs={CHAMPS_AGENDA} resume={(r) => `${r.date_label} — ${r.titre}`} />}
            {onglet === "semestriels" && <Editeur table="semestriels" ordre="numero" desc titre="Semestriels" champs={CHAMPS_SEM} resume={(r) => `N°${r.numero} · ${r.date_label}${r.publie ? "" : " (brouillon)"}`} />}
            {onglet === "adherents" && <><ImportAdherents /><Editeur table="adherents" ordre="nom" titre="Adhérents" champs={CHAMPS_ADH} resume={(r) => `${[r.prenom, r.nom].filter(Boolean).join(" ") || "—"} · ${r.email}${r.role === "admin" ? " · admin" : ""}${r.actif ? "" : " (inactif)"}`} /></>}
        </div>
    )
}

// ---------- Éditeur générique (liste + formulaire) ----------
type Champ = { k: string; t: string; type: "text" | "textarea" | "date" | "number" | "bool" | "select" | "sommaire" | "fichier"; options?: string[]; requis?: boolean; aide?: string; dossier?: string }

const CHAMPS_AGENDA: Champ[] = [
    { k: "date_label", t: "Date affichée", type: "text", requis: true, aide: "Ex. « Samedi 14 mars 2027 » ou « Juin 2027 »" },
    { k: "date_debut", t: "Date (pour le tri)", type: "date", aide: "Laisser vide si à confirmer" },
    { k: "titre", t: "Titre", type: "text", requis: true },
    { k: "lieu", t: "Lieu", type: "text" },
    { k: "description", t: "Description", type: "textarea" },
    { k: "reserve_membres", t: "Réservé aux adhérents", type: "bool" },
    { k: "publie", t: "Publié", type: "bool" },
]
const CHAMPS_SEM: Champ[] = [
    { k: "numero", t: "Numéro", type: "number", requis: true },
    { k: "date_label", t: "Date de parution", type: "text", requis: true, aide: "Ex. « Mars 2027 »" },
    { k: "titre", t: "Titre (facultatif)", type: "text" },
    { k: "resume", t: "Résumé", type: "textarea" },
    { k: "sommaire", t: "Sommaire", type: "sommaire", aide: "Une ligne par article : Titre ; page" },
    { k: "nb_pages", t: "Nombre de pages", type: "number" },
    { k: "couverture_url", t: "Couverture", type: "fichier", dossier: "couvertures" },
    { k: "pdf_url", t: "PDF du numéro", type: "fichier", dossier: "pdf" },
    { k: "pages_base_url", t: "Dossier des pages (images)", type: "text", aide: "Rempli par l’équipe technique après conversion du PDF" },
    { k: "publie", t: "Publié sur le site", type: "bool" },
]
const CHAMPS_ADH: Champ[] = [
    { k: "email", t: "E-mail", type: "text", requis: true },
    { k: "prenom", t: "Prénom", type: "text" },
    { k: "nom", t: "Nom", type: "text" },
    { k: "cotisation_annee", t: "Cotisation réglée pour l’année", type: "number" },
    { k: "role", t: "Rôle", type: "select", options: ["membre", "admin"] },
    { k: "actif", t: "Actif (peut se connecter)", type: "bool" },
]

function Editeur({ table, ordre, desc, titre, champs, resume }: { table: string; ordre: string; desc?: boolean; titre: string; champs: Champ[]; resume: (r: any) => string }) {
    const client = sb()!
    const [lignes, setLignes] = React.useState<any[]>([])
    const [edit, setEdit] = React.useState<any | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [filtre, setFiltre] = React.useState("")

    const charger = React.useCallback(async () => {
        const { data, error } = await client.from(table).select("*").order(ordre, { ascending: !desc, nullsFirst: false })
        if (error) setMsg({ t: error.message, err: true })
        else setLignes(data ?? [])
    }, [table])
    React.useEffect(() => { charger() }, [charger])

    const vide = () => Object.fromEntries(champs.map((c) => [c.k, c.type === "bool" ? (c.k === "actif" || c.k === "publie") : c.type === "select" ? c.options![0] : c.type === "sommaire" ? [] : ""]))

    const enregistrer = async () => {
        for (const c of champs) if (c.requis && (edit[c.k] === "" || edit[c.k] == null)) return setMsg({ t: `« ${c.t} » est obligatoire.`, err: true })
        const row: any = {}
        for (const c of champs) {
            let v = edit[c.k]
            if (v === "") v = null
            if (c.type === "number" && v != null) v = Number(v)
            if (c.k === "email" && v) v = String(v).trim().toLowerCase()
            row[c.k] = v
        }
        const q = edit.id ? client.from(table).update(row).eq("id", edit.id) : client.from(table).insert(row)
        const { error } = await q
        if (error) return setMsg({ t: error.message.includes("duplicate") ? "Cette entrée existe déjà." : error.message, err: true })
        setMsg({ t: "Enregistré.", err: false }); setEdit(null); charger()
    }
    const supprimer = async (r: any) => {
        if (!window.confirm(`Supprimer définitivement : ${resume(r)} ?`)) return
        const { error } = await client.from(table).delete().eq("id", r.id)
        if (error) setMsg({ t: error.message, err: true }); else { setMsg({ t: "Supprimé.", err: false }); charger() }
    }

    const visibles = lignes.filter((r) => !filtre || resume(r).toLowerCase().includes(filtre.toLowerCase()))

    if (edit) return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>{edit.id ? "Modifier" : "Ajouter"} · {titre}</h3>
            <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                {champs.map((c) => <ChampForm key={c.k} c={c} v={edit[c.k]} set={(v) => setEdit({ ...edit, [c.k]: v })} />)}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <button style={btn()} onClick={enregistrer}>Enregistrer</button>
                <button style={btn(false)} onClick={() => { setEdit(null); setMsg({ t: "", err: false }) }}>Annuler</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )

    return (
        <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>{titre} <span style={{ color: C.mute, fontWeight: 400 }}>({lignes.length})</span></h3>
                <button style={btn()} onClick={() => { setEdit(vide()); setMsg({ t: "", err: false }) }}>Ajouter</button>
            </div>
            {lignes.length > 8 && <input style={{ ...input, marginBottom: 12 }} placeholder="Rechercher…" value={filtre} onChange={(e) => setFiltre(e.target.value)} />}
            <div>
                {visibles.map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.line}` }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{resume(r)}</span>
                        <span style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                            <button style={small()} onClick={() => setEdit({ ...vide(), ...r })}>Modifier</button>
                            <button style={small(true)} onClick={() => supprimer(r)}>Supprimer</button>
                        </span>
                    </div>
                ))}
                {visibles.length === 0 && <p style={muted}>Aucune entrée.</p>}
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

function ChampForm({ c, v, set }: { c: Champ; v: any; set: (v: any) => void }) {
    const aide = c.aide ? <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>{c.aide}</span> : null
    if (c.type === "bool") return (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.accent }} />{c.t}
        </label>
    )
    let el: React.ReactNode
    if (c.type === "textarea") el = <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} value={v ?? ""} onChange={(e) => set(e.target.value)} />
    else if (c.type === "select") el = <select style={input} value={v ?? ""} onChange={(e) => set(e.target.value)}>{c.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>
    else if (c.type === "sommaire") el = <SommaireForm v={v} set={set} />
    else if (c.type === "fichier") el = <FichierForm v={v} set={set} dossier={c.dossier || "divers"} />
    else el = <input style={input} type={c.type === "date" ? "date" : c.type === "number" ? "number" : "text"} value={v ?? ""} onChange={(e) => set(e.target.value)} />
    return <div><span style={label}>{c.t}{c.requis ? " *" : ""}</span>{el}{aide}</div>
}

function SommaireForm({ v, set }: { v: any; set: (v: any) => void }) {
    const toText = (a: any) => (Array.isArray(a) ? a.map((x: any) => `${x[0]} ; ${x[1]}`).join("\n") : "")
    const [txt, setTxt] = React.useState(toText(v))
    return <textarea style={{ ...input, minHeight: 140, resize: "vertical" }} value={txt} onChange={(e) => {
        setTxt(e.target.value)
        set(e.target.value.split("\n").map((l) => l.split(";").map((s) => s.trim())).filter((p) => p[0]).map((p) => [p[0], Number(p[1]) || 1]))
    }} placeholder={"Édito ; 2\nEcheveria ; 6"} />
}

function FichierForm({ v, set, dossier }: { v: any; set: (v: any) => void; dossier: string }) {
    const client = sb()!
    const [etat, setEtat] = React.useState("")
    const envoyer = async (f: File) => {
        setEtat("Envoi…")
        const nom = `${dossier}/${Date.now()}-${f.name.normalize("NFD").replace(/[^\w.-]+/g, "-")}`
        const { error } = await client.storage.from("semestriels").upload(nom, f, { upsert: false })
        if (error) return setEtat("Échec : " + error.message)
        set(client.storage.from("semestriels").getPublicUrl(nom).data.publicUrl); setEtat("Fichier envoyé.")
    }
    return (
        <div>
            {v && /\.(jpe?g|png|webp)$/i.test(v) && <img src={v} alt="" style={{ display: "block", maxWidth: 140, marginBottom: 10, border: `1px solid ${C.line}` }} />}
            {v && !/\.(jpe?g|png|webp)$/i.test(v) && <a href={v} target="_blank" rel="noreferrer" style={{ color: C.accent, display: "block", marginBottom: 10, wordBreak: "break-all" }}>{v.split("/").pop()}</a>}
            <input type="file" onChange={(e) => e.target.files?.[0] && envoyer(e.target.files[0])} style={{ color: C.mute, font: "inherit" }} />
            {etat && <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>{etat}</span>}
        </div>
    )
}

// ---------- Import en masse des adhérents ----------
function ImportAdherents() {
    const client = sb()!
    const [ouvert, setOuvert] = React.useState(false)
    const [txt, setTxt] = React.useState("")
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const annee = new Date().getFullYear()
    const importer = async () => {
        const rows = txt.split("\n").map((l) => l.split(/[;,\t]/).map((s) => s.trim())).filter((p) => /@/.test(p[0] || ""))
            .map(([email, prenom, nom]) => ({ email: email.toLowerCase(), prenom: prenom || null, nom: nom || null, cotisation_annee: annee }))
        if (!rows.length) return setMsg({ t: "Aucune adresse trouvée.", err: true })
        const { error } = await client.from("adherents").upsert(rows, { onConflict: "email", ignoreDuplicates: true })
        if (error) setMsg({ t: error.message, err: true }); else { setMsg({ t: `${rows.length} adresse(s) traitée(s). Rechargez l’onglet pour voir la liste.`, err: false }); setTxt("") }
    }
    if (!ouvert) return <div><button style={btn(false)} onClick={() => setOuvert(true)}>Importer une liste (copier-coller d’un tableur)</button></div>
    return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>Importer des adhérents</h3>
            <p style={{ ...muted, marginBottom: 12 }}>Une ligne par personne : e-mail ; prénom ; nom. Copier-coller depuis Excel fonctionne aussi. Les adresses déjà présentes sont ignorées ; la cotisation est notée pour {annee}.</p>
            <textarea style={{ ...input, minHeight: 160 }} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"marie.durand@exemple.fr ; Marie ; Durand"} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button style={btn()} onClick={importer}>Importer</button>
                <button style={btn(false)} onClick={() => setOuvert(false)}>Fermer</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}
