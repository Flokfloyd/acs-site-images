// EspaceMembre.tsx — connexion par e-mail + code, espace adhérent, gestion admin
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb as sbReel, C, font, serif } from "./AcsBase.tsx"
import { demoClient } from "./AcsDemo.tsx"
import { COTE, pt } from "./CarteBretagne.tsx"

// En mode démo (aperçu dans l’éditeur), toutes les fonctions utilisent un faux client en mémoire
let clientDemo: any = null
const sb = (): any => clientDemo ?? sbReel()

type Adherent = { id: string; email: string; prenom?: string; nom?: string; role: "membre" | "admin"; cotisation_annee?: number; actif: boolean; annuaire?: boolean }

// ---------- petits éléments d'interface (angles droits, palette du site) ----------
const box: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: 28, color: C.txt, ...font }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", colorScheme: "dark", background: C.bg, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 0, padding: "12px 14px", font: "inherit", fontSize: 15, outline: "none" }
const label: React.CSSProperties = { display: "block", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "0 0 6px" }
const btn = (primary = true): React.CSSProperties => ({ background: primary ? C.accent : "transparent", color: primary ? C.accentDark : C.txt, border: primary ? "none" : `1px solid ${C.line}`, borderRadius: 0, padding: "12px 20px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" })
const small = (danger = false): React.CSSProperties => ({ background: "transparent", color: danger ? C.danger : C.txt, border: `1px solid ${danger ? C.danger : C.line}`, borderRadius: 0, padding: "6px 12px", font: "inherit", fontSize: 13, cursor: "pointer" })
const h2: React.CSSProperties = { fontFamily: serif, fontSize: 26, lineHeight: 1.2, margin: "0 0 8px", fontWeight: 600 }
const muted: React.CSSProperties = { color: C.mute, margin: 0 }

function Msg({ text, err }: { text: string; err?: boolean }) {
    if (!text) return null
    return <p style={{ margin: "12px 0 0", color: err ? C.danger : C.accent, fontSize: 14 }}>{text}</p>
}

// ===================================================================================
export default function EspaceMembre(props: { lienSemestriels: string; demo: "non" | "connexion" | "membre" | "admin" }) {
    const demoRef = React.useRef<any>(null)
    if (props.demo && props.demo !== "non") { if (!demoRef.current || demoRef.current.mode !== props.demo) demoRef.current = { mode: props.demo, c: demoClient(props.demo) }; clientDemo = demoRef.current.c } else clientDemo = null
    const client = sb()
    const [ready, setReady] = React.useState(false)
    const [email, setEmail] = React.useState("")
    const [moi, setMoi] = React.useState<Adherent | null | undefined>(undefined)
    const [erreur, setErreur] = React.useState<string | null>(null)
    const [sessionEmail, setSessionEmail] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!client) { setReady(true); return }
        client.auth.getSession().then(({ data }) => { setSessionEmail(data.session?.user.email ?? null); setReady(true) })
        const { data } = client.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user.email ?? null))
        return () => data.subscription.unsubscribe()
    }, [client])

    React.useEffect(() => {
        if (!client || !sessionEmail) { setMoi(null); return }
        let fini = false
        setMoi(undefined)
        const essai = async (n: number) => {
            const delai = new Promise<any>((r) => setTimeout(() => r({ data: null, error: { message: "délai dépassé" } }), 6000))
            const { data, error } = await Promise.race([client.from("adherents").select("*").eq("email", sessionEmail.toLowerCase()).maybeSingle(), delai])
            if (error) { console.warn("[ACS] lecture adhérent :", error); setErreur([error.code, error.message, error.details, error.hint].filter(Boolean).join(" · ")) } else setErreur(null)
            if (fini) return
            if ((error || !data) && n < 3) { setTimeout(() => essai(n + 1), 700 * (n + 1)); return }
            setMoi((data as Adherent) ?? null)
        }
        essai(0)
        return () => { fini = true }
    }, [sessionEmail])

    const wrap = (children: React.ReactNode) => <div style={{ width: "100%", color: C.txt, ...font }}>{children}</div>

    if (!client) return wrap(<div style={box}><h2 style={h2}>Bientôt disponible</h2><p style={muted}>L’espace membre ouvre bientôt. Les adhérents pourront s’y connecter avec leur adresse e-mail.</p></div>)
    if (!ready) return wrap(<div style={box}><p style={muted}>Chargement…</p></div>)
    if (!sessionEmail) return wrap(<Connexion email={email} setEmail={setEmail} />)
    if (moi === undefined) return wrap(<div style={box}><p style={muted}>Chargement de votre espace…</p></div>)
    if (!moi) return wrap(<div style={box}><h2 style={h2}>Adresse non reconnue</h2><p style={muted}>{sessionEmail} ne figure pas (ou plus) dans la liste des adhérents. Contactez le bureau de l’association.</p>{erreur && <p style={{ ...muted, fontSize: 12, marginTop: 12, opacity: 0.7 }}>Détail technique : {erreur}</p>}<div style={{ marginTop: 20 }}><button style={btn(false)} onClick={() => client.auth.signOut()}>Se déconnecter</button></div></div>)
    return wrap(<Tableau moi={moi} lienSemestriels={props.lienSemestriels} />)
}

EspaceMembre.defaultProps = { lienSemestriels: "/#n4", demo: "non" }
addPropertyControls(EspaceMembre, {
    lienSemestriels: { type: ControlType.String, title: "Lien semestriels", defaultValue: "/#n4" },
    demo: { type: ControlType.Enum, title: "Aperçu démo", options: ["non", "connexion", "membre", "admin"], optionTitles: ["Non (réel)", "Écran de connexion", "Adhérent connecté", "Admin connecté"], defaultValue: "non" },
})

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
        const { error } = await client.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname } })
        setBusy(false)
        if (error) return setMsg({ t: /adh[ée]rent|403|not allowed|signup/i.test(error.message) ? "Cette adresse ne figure pas dans la liste des adhérents." : "Envoi impossible : " + error.message, err: true })
        setEtape("code"); setMsg({ t: "E-mail envoyé. Pensez à regarder dans les indésirables.", err: false })
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
                    <p style={{ ...muted, marginBottom: 20 }}>Saisissez l’adresse e-mail donnée lors de votre adhésion : vous recevrez un e-mail de connexion.</p>
                    <span style={label}>Adresse e-mail</span>
                    <input style={input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.fr" />
                    <div style={{ marginTop: 18 }}><button style={btn()} disabled={busy} type="submit">{busy ? "Envoi…" : "Recevoir l’e-mail de connexion"}</button></div>
                </form>
            ) : (
                <form onSubmit={verifier}>
                    <p style={{ ...muted, marginBottom: 20 }}>Un e-mail a été envoyé à <strong style={{ color: C.txt }}>{email}</strong>. Cliquez sur le lien qu’il contient, ou tapez ici le code à 6 chiffres s’il y en a un.</p>
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
const ONGLETS = ["accueil", "profil", "evenements", "annuaire", "gestion"] as const
type O = typeof ONGLETS[number]
const lireHash = (): O => { const h = (typeof window !== "undefined" ? window.location.hash.slice(1) : "") as O; return ONGLETS.includes(h) ? h : "accueil" }

function Tableau({ moi, lienSemestriels }: { moi: Adherent; lienSemestriels: string }) {
    const client = sb()!
    const [onglet, setO] = React.useState<O>(lireHash())
    const admin = moi.role === "admin"
    React.useEffect(() => { const f = () => setO(lireHash()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f) }, [])
    const setOnglet = (o: O) => { setO(o); try { history.replaceState(null, "", o === "accueil" ? location.pathname : "#" + o) } catch (e) {} }
    const tabs: [O, string][] = [["accueil", "Vue d’ensemble"], ["profil", "Profil"], ["evenements", "Événements"], ["annuaire", "Annuaire"], ...(admin ? ([["gestion", "Gestion"]] as [O, string][]) : [])]
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ ...h2, marginBottom: 2 }}>Bonjour{moi.prenom ? " " + moi.prenom : ""}</h2>
                    <p style={muted}>{moi.email}{admin ? " · administrateur" : ""}</p>
                </div>
                <button style={btn(false)} onClick={() => client.auth.signOut()}>Se déconnecter</button>
            </div>
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
                {tabs.map(([k, t]) => <button key={k} onClick={() => setOnglet(k)} style={{ background: "transparent", color: onglet === k ? C.txt : C.mute, border: "none", borderBottom: `2px solid ${onglet === k ? C.accent : "transparent"}`, borderRadius: 0, padding: "12px 16px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", marginLeft: k === "gestion" ? "auto" : 0 }}>{t}</button>)}
            </div>
            {onglet === "accueil" && <VueEnsemble moi={moi} aller={setOnglet} />}
            {onglet === "profil" && <><Profil moi={moi} /><Historique moi={moi} /></>}
            {onglet === "evenements" && <Evenements />}
            {onglet === "annuaire" && <Annuaire />}
            {onglet === "gestion" && admin && <Gestion moi={moi} />}
        </div>
    )
}

function Gestion({ moi }: { moi: Adherent }) {
    const [s, setS] = React.useState<"agenda" | "semestriels" | "adherents" | "paiements" | "messages">("agenda")
    const annee = new Date().getFullYear()
    const pills: [typeof s, string][] = [["agenda", "Agenda et inscriptions"], ["adherents", "Adhérents"], ["paiements", "Paiements"], ["messages", "Écrire aux adhérents"], ["semestriels", "Semestriels"]]
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pills.map(([k, t]) => <button key={k} onClick={() => setS(k)} style={{ ...small(), padding: "8px 14px", fontSize: 14, background: s === k ? C.accent : "transparent", color: s === k ? C.accentDark : C.txt, borderColor: s === k ? C.accent : C.line, fontWeight: 600 }}>{t}</button>)}
            </div>
            {s === "agenda" && <><Aide>Ajoutez une sortie, une réunion ou le salon. Cochez « Inscriptions ouvertes » pour que les adhérents puissent s’inscrire depuis leur espace ; les inscrits apparaissent dans « Paiements ».</Aide>
                <Editeur table="evenements" ordre="date_debut" titre="Événements" champs={CHAMPS_AGENDA} fixes={{ publie: true }} preparer={preparerEvenement} resume={(r) => `${r.date_label} — ${r.titre}${r.inscription_ouverte ? " · inscriptions ouvertes" : ""}${r.reserve_membres ? " · adhérents" : ""}`} /></>}
            {s === "semestriels" && <><Aide>Pour un nouveau numéro : choisissez le PDF final, ajoutez la couverture (image) et cochez « Publier ». Il apparaît aussitôt dans la liseuse du site.</Aide>
                <Editeur table="semestriels" ordre="numero" desc titre="Semestriels" champs={CHAMPS_SEM} nouveau={(l) => ({ numero: Math.max(0, ...l.map((r) => r.numero || 0)) + 1 })} resume={(r) => `N°${r.numero} · ${r.date_label}${r.publie ? "" : " (non publié)"}`} /></>}
            {s === "adherents" && <><Aide>Seules les adresses de cette liste peuvent se connecter. Pour le bureau, remplissez « Fonction au bureau » : la personne apparaît alors dans les contacts du bureau.</Aide><ImportAdherents />
                <Editeur table="adherents" ordre="nom" titre="Adhérents" champs={CHAMPS_ADH} avant={localiserAdherent} resume={(r) => `${[r.prenom, r.nom].filter(Boolean).join(" ") || "—"} · ${r.email}${r.fonction_bureau ? " · " + r.fonction_bureau : ""}${r.role === "admin" ? " · admin" : ""}${r.cotisation_annee && r.cotisation_annee < annee ? " · cotisation " + r.cotisation_annee : ""}${r.actif ? "" : " (désactivé)"}`} /></>}
            {s === "paiements" && <><Aide>Les paiements en ligne s’enregistreront seuls une fois le paiement branché. Ici, notez les adhésions réglées par chèque ou en espèces, et passez en « valide » les inscriptions réglées.</Aide>
                <Editeur table="adhesions" ordre="cree_le" desc titre="Adhésions" champs={CHAMPS_ADHESION} nouveau={() => ({ annee, montant: 20, formule: "Année complète", debut: `${annee}-01-01`, fin: `${annee}-12-31`, source: "Chèque" })} resume={(r) => `${r.annee} · ${r.email} · ${euros(r.montant)} · ${r.formule}${r.source ? " · " + r.source : ""}`} />
                <Editeur table="inscriptions" ordre="cree_le" desc titre="Inscriptions et achats" champs={CHAMPS_INSCR} nouveau={() => ({ montant: 0, statut: "valide", nb_personnes: 1 })} resume={(r) => `${dateFr(r.cree_le)} · ${r.formulaire} · ${r.email}${r.nb_personnes > 1 ? " · " + r.nb_personnes + " pers." : ""} · ${euros(r.montant)}${r.statut !== "valide" ? " · " + STATUTS[r.statut] : ""}`} /></>}
            {s === "messages" && <><Aide>Le message apparaît dans l’espace de chaque adhérent pendant deux ans. Il est aussi envoyé par e-mail à ceux qui l’acceptent, une fois l’envoi d’e-mails branché.</Aide>
                <Editeur table="messages" ordre="envoye_le" desc titre="Messages envoyés" champs={CHAMPS_MSG} fixes={{ auteur: moi.email }} resume={(r) => `${dateFr(r.envoye_le)} — ${r.sujet}`} /></>}
        </div>
    )
}

// ---------- Événements : s'inscrire aux sorties de l'agenda ----------
function Evenements() {
    const client = sb()!
    const [evts, setEvts] = React.useState<any[] | null>(null)
    const [mes, setMes] = React.useState<any[]>([])
    const [prises, setPrises] = React.useState<Record<string, number>>({})
    const [nb, setNb] = React.useState<Record<string, number>>({})
    const [msg, setMsg] = React.useState<Record<string, { t: string; err: boolean }>>({})
    const charger = React.useCallback(async () => {
        const auj = new Date().toISOString().slice(0, 10)
        const { data } = await client.from("evenements").select("*").order("date_debut", { ascending: true, nullsFirst: false })
        const futurs = (data ?? []).filter((e: any) => e.publie !== false && (!e.date_debut || e.date_debut >= auj))
        setEvts(futurs)
        const { data: m } = await client.from("inscriptions").select("*").order("cree_le", { ascending: false })
        setMes((m ?? []).filter((r: any) => r.evenement_id && r.statut !== "abandonne"))
        const p: Record<string, number> = {}
        for (const e of futurs) if (e.inscription_ouverte && e.places) { const { data: n } = await client.rpc("places_prises", { evt: e.id }); p[e.id] = n ?? 0 }
        setPrises(p)
    }, [])
    React.useEffect(() => { charger() }, [charger])
    const inscrire = async (e: any) => {
        const { data, error } = await client.rpc("s_inscrire", { evt: e.id, nb: nb[e.id] ?? 1 })
        const t = error ? error.message : data === "ok" ? (e.prix > 0 ? "Inscription enregistrée, règlement à prévoir." : "Vous êtes inscrit, à bientôt !") : data
        setMsg({ ...msg, [e.id]: { t, err: !!error || data !== "ok" } }); charger()
    }
    const desinscrire = async (e: any) => { if (!window.confirm("Annuler votre inscription ?")) return; await client.rpc("se_desinscrire", { evt: e.id }); setMsg({ ...msg, [e.id]: { t: "Inscription annulée.", err: false } }); charger() }
    if (!evts) return <div style={box}><p style={muted}>Chargement…</p></div>
    return (
        <div style={{ display: "grid", gap: 16 }}>
            {evts.length === 0 && <div style={box}><p style={muted}>Aucune sortie annoncée pour le moment.</p></div>}
            {evts.map((e) => {
                const moiInscrit = mes.find((r) => r.evenement_id === e.id)
                const restantes = e.places ? Math.max(0, e.places - (prises[e.id] ?? 0)) : null
                return (
                    <div key={e.id} style={{ ...box, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 20, alignItems: "start" }}>
                        <div>
                            <span style={label}>{e.date_label}</span>
                            <h3 style={{ ...h2, fontSize: 22, margin: "2px 0 6px" }}>{e.titre}</h3>
                            {e.lieu && <p style={{ ...muted, marginBottom: 6 }}>{e.lieu}</p>}
                            {e.description && <p style={{ margin: "0 0 10px", whiteSpace: "pre-wrap", opacity: 0.9 }}>{e.description}</p>}
                            <p style={{ ...muted, fontSize: 14 }}>{e.prix > 0 ? `${euros(e.prix)} par personne` : "Gratuit"}{restantes != null ? ` · ${restantes} place${restantes > 1 ? "s" : ""} restante${restantes > 1 ? "s" : ""}` : ""}</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 180 }}>
                            {!e.inscription_ouverte ? <span style={{ ...muted, fontSize: 14 }}>Inscriptions bientôt</span> : <>
                                {moiInscrit && <span style={{ fontSize: 13, padding: "3px 10px", border: `1px solid ${C.accent}`, color: C.accent }}>Inscrit · {moiInscrit.nb_personnes} pers.{moiInscrit.statut === "en_attente" ? " · à régler" : ""}</span>}
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.mute }}>Personnes
                                    <select value={nb[e.id] ?? moiInscrit?.nb_personnes ?? 1} onChange={(x) => setNb({ ...nb, [e.id]: Number(x.target.value) })} style={{ ...input, width: 70, padding: "8px 10px" }}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                                </label>
                                <button style={btn()} onClick={() => inscrire(e)}>{moiInscrit ? "Modifier" : "S’inscrire"}</button>
                                {moiInscrit && <button style={small(true)} onClick={() => desinscrire(e)}>Annuler mon inscription</button>}
                            </>}
                            {msg[e.id] && <Msg text={msg[e.id].t} err={msg[e.id].err} />}
                        </div>
                    </div>
                )
            })}
            <p style={{ ...muted, fontSize: 13 }}>Les sorties payantes se règlent pour l’instant sur place ou par chèque ; le paiement en ligne arrivera prochainement. Vos inscriptions passées sont dans Profil.</p>
        </div>
    )
}


// ---------- Espace personnel ----------
const euros = (n: any) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
const dateFr = (d: any, heure = false) => { if (!d) return "—"; const x = new Date(d); return heure ? x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + " à " + x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) }
const STATUTS: Record<string, string> = { valide: "Validé", en_attente: "En attente", abandonne: "Abandonné", rembourse: "Remboursé" }
const lien: React.CSSProperties = { color: C.accent, textDecoration: "none" }
function useTable(table: string, ordre: string) {
    const [rows, setRows] = React.useState<any[] | null>(null)
    React.useEffect(() => { sb()!.from(table).select("*").order(ordre, { ascending: false }).then(({ data }: any) => setRows(data ?? [])) }, [table])
    return rows
}
function useRpc(nom: string) {
    const [rows, setRows] = React.useState<any[] | null>(null)
    React.useEffect(() => { sb()!.rpc(nom).then(({ data }: any) => setRows(data ?? [])) }, [nom])
    return rows
}
function exporter(nom: string, entetes: string[], lignes: any[][]) {
    const csv = "\ufeff" + [entetes, ...lignes].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = nom; a.click()
}

function VueEnsemble({ moi, aller }: { moi: Adherent; aller: (o: any) => void }) {
    const adhesions = useTable("adhesions", "annee")
    const inscr = useTable("inscriptions", "cree_le")
    const bureau = useRpc("bureau")
    const annee = new Date().getFullYear()
    const aJour = (moi.cotisation_annee ?? 0) >= annee
    const derniere = adhesions?.[0]
    const prochaines = (inscr ?? []).filter((r) => r.evenement_id && r.statut !== "abandonne").slice(0, 3)
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div style={box}>
                    <span style={label}>Mon adhésion</span>
                    <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600, color: aJour ? C.txt : C.danger }}>{aJour ? `À jour pour ${annee}` : "À renouveler"}</p>
                    <p style={muted}>{derniere ? `${derniere.formule} · du ${dateFr(derniere.debut)} au ${dateFr(derniere.fin)}` : `Dernière cotisation : ${moi.cotisation_annee ?? "—"}.`}</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                        {!aJour && <a href="/#adhesion" style={{ ...btn(), textDecoration: "none" }}>Renouveler · 20 €</a>}
                        {derniere?.recu_url && <a href={derniere.recu_url} target="_blank" rel="noreferrer" style={{ ...btn(false), textDecoration: "none" }}>Reçu {derniere.annee}</a>}
                        <button style={btn(false)} onClick={() => aller("profil")}>Mon profil</button>
                    </div>
                </div>
                <div style={box}>
                    <span style={label}>Mes prochaines sorties</span>
                    {inscr === null ? <p style={muted}>…</p> : prochaines.length === 0 ? <p style={muted}>Aucune inscription en cours.</p> :
                        prochaines.map((r) => <div key={r.id} style={{ padding: "8px 0", borderTop: `1px solid ${C.line}` }}><div style={{ fontWeight: 600 }}>{r.formulaire}</div><div style={{ ...muted, fontSize: 13 }}>{r.nb_personnes} pers.{r.statut === "en_attente" ? " · à régler" : ""}</div></div>)}
                    <button style={{ ...btn(false), marginTop: 12 }} onClick={() => aller("evenements")}>Voir les sorties</button>
                </div>
            </div>
            <Messages />
            <div style={box}>
                <span style={label}>Le bureau de l’association {annee}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 8 }}>
                    {(bureau ?? []).map((b) => (
                        <div key={b.email + b.fonction}>
                            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>{b.prenom} {b.nom}</div>
                            <div style={{ color: C.accent, fontSize: 13, marginBottom: 6 }}>{b.fonction}</div>
                            <a href={`mailto:${b.email}`} style={{ ...lien, display: "block", fontSize: 14, wordBreak: "break-all" }}>{b.email}</a>
                            {b.telephone && <a href={`tel:${b.telephone.replace(/\s/g, "")}`} style={{ color: C.txt, textDecoration: "none", fontSize: 14 }}>{b.telephone}</a>}
                        </div>
                    ))}
                    {bureau && bureau.length === 0 && <p style={muted}>Contacts du bureau bientôt disponibles.</p>}
                </div>
            </div>
        </div>
    )
}

function Profil({ moi }: { moi: any }) {
    const client = sb()!
    const [f, setF] = React.useState<any>({ conjoint: moi.conjoint ?? "", telephone: moi.telephone ?? "", adresse: moi.adresse ?? "", code_postal: moi.code_postal ?? "", ville: moi.ville ?? "", annuaire: moi.annuaire !== false, recoit_emails: moi.recoit_emails !== false })
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value })
    const enregistrer = async () => {
        const p: any = { ...f }
        await localiserAdherent(p, moi)
        const { error } = await client.rpc("maj_profil", { p })
        if (error) setMsg({ t: error.message, err: true }); else { Object.assign(moi, p); setMsg({ t: "Vos informations sont enregistrées.", err: false }) }
    }
    const champ = (k: string, t: string, place?: string) => <div><span style={label}>{t}</span><input style={input} value={f[k]} placeholder={place} onChange={set(k)} /></div>
    const coche = (k: string, t: string, aide: string) => <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}><input type="checkbox" checked={f[k]} onChange={set(k)} style={{ width: 18, height: 18, accentColor: C.accent, marginTop: 3 }} /><span>{t}<span style={{ display: "block", color: C.mute, fontSize: 13 }}>{aide}</span></span></label>
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
            <div style={box}>
                <h3 style={{ ...h2, fontSize: 20 }}>Mes coordonnées</h3>
                <p style={{ ...muted, marginBottom: 18 }}>{[moi.prenom, moi.nom].filter(Boolean).join(" ")} · {moi.email}. Pour changer de nom ou d’adresse e-mail, écrivez au bureau.</p>
                <div style={{ display: "grid", gap: 14 }}>
                    {champ("conjoint", "Second adhérent du foyer", "Prénom Nom")}
                    {champ("telephone", "Téléphone", "06 12 34 56 78")}
                    {champ("adresse", "Adresse postale", "Pour l’envoi du semestriel")}
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>{champ("code_postal", "Code postal")}{champ("ville", "Commune")}</div>
                </div>
            </div>
            <div style={box}>
                <h3 style={{ ...h2, fontSize: 20 }}>Confidentialité</h3>
                <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
                    {coche("recoit_emails", "Recevoir les e-mails de l’association", "Sorties, salon, semestriel. Les messages restent consultables ici même si vous décochez.")}
                    {coche("annuaire", "Apparaître dans l’annuaire des adhérents", "Nom, commune, e-mail et téléphone. Votre adresse postale reste visible du seul bureau.")}
                </div>
                <p style={{ ...muted, fontSize: 13, marginTop: 18 }}>Le site ne mesure ni l’ouverture des e-mails ni les clics. Pour faire supprimer vos données, écrivez au bureau.</p>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button style={btn()} onClick={enregistrer}>Enregistrer mes choix</button>
                <Msg text={msg.t} err={msg.err} />
            </div>
        </div>
    )
}

function Tableau2({ titre, entetes, lignes, fichier, vide }: { titre: string; entetes: string[]; lignes: React.ReactNode[][] | null; fichier?: [string, any[][]]; vide: string }) {
    return (
        <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>{titre} <span style={{ color: C.mute, fontWeight: 400 }}>({lignes?.length ?? "…"})</span></h3>
                {fichier && lignes && lignes.length > 0 && <button style={small()} onClick={() => exporter(fichier[0], entetes, fichier[1])}>Exporter</button>}
            </div>
            {lignes && lignes.length === 0 ? <p style={muted}>{vide}</p> :
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead><tr>{entetes.map((e) => <th key={e} style={{ textAlign: "left", padding: "8px 10px 8px 0", color: C.mute, fontWeight: 500, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{e}</th>)}</tr></thead>
                        <tbody>{(lignes ?? []).map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} style={{ padding: "10px 10px 10px 0", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" }}>{c}</td>)}</tr>)}</tbody>
                    </table>
                </div>}
        </div>
    )
}

function Historique({ moi }: { moi: Adherent }) {
    const adhesions = useTable("adhesions", "annee")
    const inscr = useTable("inscriptions", "cree_le")
    const dons = useTable("dons", "le")
    const valides = inscr?.filter((r) => r.statut !== "abandonne") ?? null
    const pastille = (st: string) => <span style={{ fontSize: 12, padding: "2px 8px", border: `1px solid ${st === "valide" ? C.accent : C.line}`, color: st === "valide" ? C.accent : C.mute, whiteSpace: "nowrap" }}>{STATUTS[st] || st}</span>
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <Tableau2 titre="Mes adhésions" entetes={["Année", "Formule", "Montant", "Période", "Reçu"]} vide="Aucune adhésion enregistrée."
                lignes={adhesions?.map((a) => [<strong>{a.annee}</strong>, a.formule, euros(a.montant), `${dateFr(a.debut)} – ${dateFr(a.fin)}`, a.recu_url ? <a href={a.recu_url} target="_blank" rel="noreferrer" style={lien}>Télécharger</a> : <span style={{ color: C.mute }}>—</span>]) ?? null}
                fichier={["mes-adhesions.csv", (adhesions ?? []).map((a) => [a.annee, a.formule, a.montant, a.debut, a.fin, a.recu_url])]} />
            <Tableau2 titre="Inscriptions et achats" entetes={["Date", "Objet", "Montant", "Statut"]} vide="Aucune inscription ni achat pour l’instant."
                lignes={valides?.map((r) => [dateFr(r.cree_le), r.formulaire, euros(r.montant), pastille(r.statut)]) ?? null}
                fichier={["mes-inscriptions.csv", (valides ?? []).map((r) => [r.cree_le, r.formulaire, r.montant, STATUTS[r.statut], r.reference])]} />
            <Tableau2 titre="Mes dons" entetes={["Date", "Montant", "Reçu fiscal"]} vide="Aucun don enregistré. Merci à celles et ceux qui soutiennent l’association !"
                lignes={dons?.map((d) => [dateFr(d.le), euros(d.montant), d.recu_url ? <a href={d.recu_url} target="_blank" rel="noreferrer" style={lien}>Télécharger</a> : "—"]) ?? null} />
        </div>
    )
}

function Messages() {
    const messages = useTable("messages", "envoye_le")
    const [ouvert, setOuvert] = React.useState<string | null>(null)
    const [tout, setTout] = React.useState(false)
    return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>Messages de l’association <span style={{ color: C.mute, fontWeight: 400 }}>({messages?.length ?? "…"})</span></h3>
            <p style={{ ...muted, marginBottom: 16 }}>Les messages envoyés aux adhérents, aussi reçus par e-mail. Ils sont conservés deux ans.</p>
            {messages && messages.length === 0 && <p style={muted}>Aucun message pour l’instant.</p>}
            {(messages ?? []).slice(0, tout ? 999 : 5).map((m) => (
                <div key={m.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <button onClick={() => setOuvert(ouvert === m.id ? null : m.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12, background: "transparent", border: "none", color: C.txt, font: "inherit", padding: "14px 0", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontWeight: 600 }}>{m.sujet}</span>
                        <span style={{ color: C.mute, fontSize: 13, whiteSpace: "nowrap" }}>{dateFr(m.envoye_le, true)} {ouvert === m.id ? "▴" : "▾"}</span>
                    </button>
                    {ouvert === m.id && <div style={{ whiteSpace: "pre-wrap", color: C.txt, opacity: 0.9, padding: "0 0 18px", lineHeight: 1.65 }}>{m.contenu}</div>}
                </div>
            ))}
            {!tout && (messages?.length ?? 0) > 5 && <button style={{ ...btn(false), marginTop: 12 }} onClick={() => setTout(true)}>Voir les {messages!.length} messages</button>}
        </div>
    )
}

function Aide({ children }: { children: React.ReactNode }) {
    return <p style={{ margin: 0, color: C.mute, fontSize: 14, borderLeft: `2px solid ${C.accent}`, paddingLeft: 12 }}>{children}</p>
}

// ---------- Éditeur générique (liste + formulaire) ----------
type Champ = { k: string; t: string; type: "text" | "textarea" | "date" | "number" | "bool" | "admin" | "sommaire" | "fichier"; requis?: boolean; aide?: string; dossier?: string; accept?: string; place?: string }

const JOURS_MOIS = (d: string) => { try { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()) } catch (e) { return d } }
function preparerEvenement(r: any): string | null {
    if (!r.date_debut && !r.date_label) return "Indiquez une date, ou un mois approximatif."
    if (r.date_debut && (!r.date_label || r.__auto)) r.date_label = JOURS_MOIS(r.date_debut)
    return null
}

const CHAMPS_AGENDA: Champ[] = [
    { k: "titre", t: "Titre", type: "text", requis: true, place: "Sortie chez un producteur" },
    { k: "date_debut", t: "Date", type: "date" },
    { k: "date_label", t: "Ou date approximative", type: "text", aide: "Seulement si la date n’est pas encore fixée.", place: "Juin 2027" },
    { k: "lieu", t: "Lieu", type: "text", place: "Bédée (35)" },
    { k: "description", t: "Description", type: "textarea" },
    { k: "reserve_membres", t: "Visible seulement par les adhérents connectés", type: "bool" },
    { k: "inscription_ouverte", t: "Inscriptions ouvertes aux adhérents", type: "bool" },
    { k: "prix", t: "Prix par personne (€, 0 = gratuit)", type: "number" },
    { k: "places", t: "Nombre de places (vide = illimité)", type: "number" },
]
const CHAMPS_SEM: Champ[] = [
    { k: "numero", t: "Numéro", type: "number", requis: true },
    { k: "date_label", t: "Date de parution", type: "text", requis: true, place: "Mars 2027" },
    { k: "pdf_url", t: "PDF du numéro", type: "fichier", dossier: "pdf", accept: "application/pdf", requis: true },
    { k: "couverture_url", t: "Couverture (image)", type: "fichier", dossier: "couvertures", accept: "image/*" },
    { k: "sommaire", t: "Sommaire (facultatif)", type: "sommaire", aide: "Une ligne par article : titre ; page" },
    { k: "resume", t: "Résumé (facultatif)", type: "textarea" },
    { k: "publie", t: "Publier sur le site", type: "bool" },
]
const CHAMPS_ADH: Champ[] = [
    { k: "email", t: "E-mail", type: "text", requis: true },
    { k: "prenom", t: "Prénom", type: "text" },
    { k: "nom", t: "Nom", type: "text" },
    { k: "conjoint", t: "Conjoint ou second adhérent du foyer", type: "text" },
    { k: "telephone", t: "Téléphone", type: "text" },
    { k: "adresse", t: "Adresse postale (visible du bureau seulement)", type: "text" },
    { k: "code_postal", t: "Code postal", type: "text" },
    { k: "ville", t: "Commune", type: "text", aide: "Place automatiquement l’adhérent sur la carte de l’annuaire." },
    { k: "annuaire", t: "Apparaît dans l’annuaire des adhérents", type: "bool" },
    { k: "fonction_bureau", t: "Fonction au bureau", type: "text", place: "Président, Secrétaire…", aide: "Laisser vide si la personne n’est pas au bureau." },
    { k: "ordre_bureau", t: "Ordre d’affichage dans le bureau", type: "number" },
    { k: "email_bureau", t: "E-mail de contact du bureau (si différent)", type: "text" },
    { k: "cotisation_annee", t: "Cotisation payée pour l’année", type: "number", aide: "Mise à jour automatiquement quand une adhésion est enregistrée." },
    { k: "role", t: "Administrateur (peut gérer le site)", type: "admin" },
    { k: "actif", t: "Peut se connecter", type: "bool" },
]

const CHAMPS_ADHESION: Champ[] = [
    { k: "email", t: "E-mail de l’adhérent", type: "text", requis: true },
    { k: "annee", t: "Année", type: "number", requis: true },
    { k: "formule", t: "Formule", type: "text", place: "Année complète pour un couple" },
    { k: "montant", t: "Montant (€)", type: "number" },
    { k: "debut", t: "Début", type: "date" },
    { k: "fin", t: "Fin", type: "date" },
    { k: "source", t: "Moyen de paiement", type: "text", place: "Chèque, espèces, HelloAsso…" },
    { k: "recu_url", t: "Reçu (PDF)", type: "fichier", dossier: "recus", accept: "application/pdf" },
]
const CHAMPS_INSCR: Champ[] = [
    { k: "email", t: "E-mail de l’adhérent", type: "text", requis: true },
    { k: "formulaire", t: "Objet", type: "text", requis: true, place: "Sortie du 16 mai, T-shirt ACS 10 ans…" },
    { k: "montant", t: "Montant (€)", type: "number" },
    { k: "nb_personnes", t: "Nombre de personnes", type: "number" },
    { k: "statut", t: "Statut (valide, en_attente, abandonne, rembourse)", type: "text" },
    { k: "reference", t: "Référence de paiement", type: "text" },
]
const CHAMPS_MSG: Champ[] = [
    { k: "sujet", t: "Sujet", type: "text", requis: true, place: "Troc plantes le 27 septembre" },
    { k: "contenu", t: "Message", type: "textarea", requis: true },
]

function Editeur({ table, ordre, desc, titre, champs, resume, fixes, nouveau, preparer, avant }: { table: string; ordre: string; desc?: boolean; titre: string; champs: Champ[]; resume: (r: any) => string; fixes?: any; nouveau?: (lignes: any[]) => any; preparer?: (r: any) => string | null; avant?: (row: any, ancien: any) => Promise<void> }) {
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

    const vide = () => ({ ...Object.fromEntries(champs.map((c) => [c.k, c.type === "bool" ? (c.k === "actif" || c.k === "annuaire") : c.type === "admin" ? "membre" : c.type === "sommaire" ? [] : ""])), ...(nouveau ? nouveau(lignes) : {}) })

    const enregistrer = async () => {
        for (const c of champs) if (c.requis && (edit[c.k] === "" || edit[c.k] == null)) return setMsg({ t: `« ${c.t} » est obligatoire.`, err: true })
        const row: any = { ...(fixes || {}) }
        for (const c of champs) {
            let v = edit[c.k]
            if (v === "") v = null
            if (c.type === "number" && v != null) v = Number(v)
            if (c.k === "email" && v) v = String(v).trim().toLowerCase()
            row[c.k] = v
        }
        if (preparer) { row.__auto = edit.__auto; const err = preparer(row); delete row.__auto; if (err) return setMsg({ t: err, err: true }) }
        if (avant) await avant(row, lignes.find((l) => l.id === edit.id) || {})
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
                {champs.map((c) => <ChampForm key={c.k} c={c} v={edit[c.k]} set={(v) => setEdit({ ...edit, [c.k]: v, ...(c.k === "date_debut" && edit.date_debut && edit.date_label === JOURS_MOIS(edit.date_debut) ? { __auto: true } : {}) })} />)}
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
    if (c.type === "admin") return (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={v === "admin"} onChange={(e) => set(e.target.checked ? "admin" : "membre")} style={{ width: 18, height: 18, accentColor: C.accent }} />{c.t}
        </label>
    )
    if (c.type === "bool") return (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.accent }} />{c.t}
        </label>
    )
    let el: React.ReactNode
    if (c.type === "textarea") el = <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} value={v ?? ""} onChange={(e) => set(e.target.value)} />
        else if (c.type === "sommaire") el = <SommaireForm v={v} set={set} />
    else if (c.type === "fichier") el = <FichierForm v={v} set={set} dossier={c.dossier || "divers"} accept={c.accept} />
    else el = <input style={input} type={c.type === "date" ? "date" : c.type === "number" ? "number" : "text"} placeholder={c.place} value={v ?? ""} onChange={(e) => set(e.target.value)} />
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

function FichierForm({ v, set, dossier, accept }: { v: any; set: (v: any) => void; dossier: string; accept?: string }) {
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
            <input type="file" accept={accept} onChange={(e) => e.target.files?.[0] && envoyer(e.target.files[0])} style={{ color: C.mute, font: "inherit" }} />
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
            .map(([email, prenom, nom, telephone, code_postal, ville]) => ({ email: email.toLowerCase(), prenom: prenom || null, nom: nom || null, telephone: telephone || null, code_postal: code_postal || null, ville: ville || null, cotisation_annee: annee } as any))
        if (!rows.length) return setMsg({ t: "Aucune adresse trouvée.", err: true })
        setMsg({ t: "Placement des communes sur la carte…", err: false })
        for (const r of rows) if (r.ville) { await localiserAdherent(r, {}); await new Promise((ok) => setTimeout(ok, 120)) }
        const { error } = await client.from("adherents").upsert(rows, { onConflict: "email", ignoreDuplicates: true })
        if (error) setMsg({ t: error.message, err: true }); else { setMsg({ t: `${rows.length} adresse(s) traitée(s). Rechargez l’onglet pour voir la liste.`, err: false }); setTxt("") }
    }
    if (!ouvert) return <div><button style={btn(false)} onClick={() => setOuvert(true)}>Importer une liste (copier-coller d’un tableur)</button></div>
    return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>Importer des adhérents</h3>
            <p style={{ ...muted, marginBottom: 12 }}>Une ligne par personne : e-mail ; prénom ; nom ; téléphone ; code postal ; commune (les quatre derniers sont facultatifs). Copier-coller depuis Excel fonctionne aussi. Les adresses déjà présentes sont ignorées ; la cotisation est notée pour {annee}.</p>
            <textarea style={{ ...input, minHeight: 160 }} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"marie.durand@exemple.fr ; Marie ; Durand"} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button style={btn()} onClick={importer}>Importer</button>
                <button style={btn(false)} onClick={() => setOuvert(false)}>Fermer</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Localisation d'une commune (Base Adresse Nationale, seule la commune est envoyée) ----------
async function localiserAdherent(row: any, ancien: any) {
    if (!row.ville) { row.lat = null; row.lon = null; return }
    if (row.ville === ancien.ville && row.code_postal === ancien.code_postal && ancien.lat != null) return
    try {
        const u = "https://api-adresse.data.gouv.fr/search/?type=municipality&limit=1&q=" + encodeURIComponent(row.ville) + (row.code_postal ? "&postcode=" + row.code_postal : "")
        const f = (await (await fetch(u)).json()).features?.[0]
        if (f) { row.lon = f.geometry.coordinates[0]; row.lat = f.geometry.coordinates[1] }
    } catch (e) {}
}

// ---------- Annuaire des adhérents : carte de la Bretagne + liste ----------
type Fiche = { id: string; prenom?: string; nom?: string; conjoint?: string; email: string; telephone?: string; code_postal?: string; ville?: string; lat?: number; lon?: number }
const DEPTS_BZH = ["22", "29", "35", "44", "56"]
const REPERES: [string, number, number][] = [["Rennes", -1.68, 48.05], ["Nantes", -1.55, 47.16], ["Brest", -4.49, 48.33], ["Vannes", -2.76, 47.6], ["Saint-Brieuc", -2.76, 48.45]]
const NOM_DEPT: Record<string, string> = { "22": "Côtes-d’Armor", "29": "Finistère", "35": "Ille-et-Vilaine", "44": "Loire-Atlantique", "56": "Morbihan", "49": "Maine-et-Loire", "50": "Manche", "53": "Mayenne", "72": "Sarthe", "85": "Vendée", "14": "Calvados", "76": "Seine-Maritime" }
const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

function Annuaire() {
    const client = sb()!
    const [liste, setListe] = React.useState<Fiche[] | null>(null)
    const [err, setErr] = React.useState("")
    const [q, setQ] = React.useState("")
    const [commune, setCommune] = React.useState<string | null>(null)
    const [survol, setSurvol] = React.useState<string | null>(null)
    const ref = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(900)
    React.useEffect(() => { client.rpc("annuaire").then(({ data, error }: any) => { if (error) setErr(error.message); else setListe(data ?? []) }) }, [])
    React.useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect() }, [liste])

    if (err) return <div style={box}><p style={{ ...muted, color: C.danger }}>{err}</p></div>
    if (!liste) return <div style={box}><p style={muted}>Chargement de l’annuaire…</p></div>

    const cle = (f: Fiche) => `${f.code_postal || ""} ${f.ville || ""}`
    const bzh = (f: Fiche) => DEPTS_BZH.includes((f.code_postal || "").slice(0, 2))
    const cherche = (f: Fiche) => !q || sansAccent([f.prenom, f.nom, f.conjoint, f.ville, f.code_postal].join(" ")).includes(sansAccent(q))
    const communes = new Map<string, { ville: string; x: number; y: number; n: number }>()
    for (const f of liste) if (bzh(f) && f.lat != null && f.lon != null) {
        const k = cle(f), c = communes.get(k)
        if (c) c.n++; else { const [x, y] = pt(f.lon, f.lat); communes.set(k, { ville: f.ville || "", x, y, n: 1 }) }
    }
    const filtres = liste.filter(cherche)
    const enBzh = filtres.filter((f) => bzh(f) && (!commune || cle(f) === commune))
    const hors = filtres.filter((f) => !bzh(f))
    const parDept = new Map<string, Fiche[]>()
    for (const f of hors) { const d = (f.code_postal || "??").slice(0, 2); parDept.set(d, [...(parDept.get(d) || []), f]) }
    const etroit = w < 820
    const allumees = new Set(filtres.filter(bzh).map(cle))
    const infos = survol ? communes.get(survol) : null

    const carte = (
        <div style={{ position: "relative", flex: etroit ? "none" : "1.3 1 0", width: etroit ? "100%" : undefined, minWidth: 0 }}>
            <div style={{ width: "100%", aspectRatio: "272 / 196", position: "relative" }}>
            <svg viewBox="-24 -4 272 196" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", overflow: "visible" }} role="img" aria-label="Carte des adhérents en Bretagne">
                <path d={COTE} fill="none" stroke={C.txt} strokeOpacity={0.75} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {REPERES.map(([n, lo, la]) => { const [x, y] = pt(lo, la); return <text key={n} x={x} y={y + 1.6} textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize={4.4} letterSpacing={0.6} fill={C.txt} fillOpacity={0.35}>{n.toUpperCase()}</text> })}
                {[...communes.entries()].map(([k, c]) => {
                    const actif = commune === k, eteint = !allumees.has(k)
                    return (
                        <g key={k} style={{ cursor: "pointer" }} onClick={() => setCommune(actif ? null : k)} onMouseEnter={() => setSurvol(k)} onMouseLeave={() => setSurvol(null)}>
                            <circle cx={c.x} cy={c.y} r={7} fill="transparent" />
                            <circle cx={c.x} cy={c.y} r={2.4 + 1 * Math.sqrt(c.n - 1)} fill={actif ? "#d9805f" : C.accent} fillOpacity={eteint ? 0.2 : 0.95} stroke={C.bg} strokeWidth={0.5} />
                        </g>
                    )
                })}
                {infos && <text x={infos.x + 4} y={infos.y - 4} fontFamily="Poppins, sans-serif" fontSize={6} fontWeight={600} fill={C.txt} stroke={C.bg} strokeWidth={2} paintOrder="stroke">{infos.ville}{infos.n > 1 ? ` · ${infos.n}` : ""}</text>}
            </svg>
            </div>
        </div>
    )

    const fiche = (f: Fiche) => (
        <div key={f.id} style={{ background: C.bg, border: `1px solid ${C.line}`, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>{[f.prenom, f.nom].filter(Boolean).join(" ")}</span>
            {f.conjoint && <span style={{ color: C.mute, fontSize: 13 }}>et {f.conjoint}</span>}
            <span style={{ color: C.accent, fontSize: 13, letterSpacing: "0.02em" }}>{f.ville}{f.code_postal ? ` (${f.code_postal.slice(0, 2)})` : ""}</span>
            <a href={`mailto:${f.email}`} style={{ color: C.txt, textDecoration: "none", fontSize: 14, wordBreak: "break-all", marginTop: 6 }}>{f.email}</a>
            {f.telephone && <a href={`tel:${f.telephone.replace(/\s/g, "")}`} style={{ color: C.txt, textDecoration: "none", fontSize: 14, opacity: 0.85 }}>{f.telephone}</a>}
        </div>
    )
    const grille = (fs: Fiche[]) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>{fs.map(fiche)}</div>
    const parDeptBzh = new Map<string, Fiche[]>()
    for (const f of enBzh) { const d = (f.code_postal || "").slice(0, 2); parDeptBzh.set(d, [...(parDeptBzh.get(d) || []), f]) }
    const titreGroupe = (t: string, n: number) => <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "26px 0 12px", borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}><span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>{t}</span><span style={{ color: C.mute, fontSize: 13 }}>{n} adhérent{n > 1 ? "s" : ""}</span></div>

    const cote = (
        <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ ...h2, fontSize: 24, margin: 0 }}>Annuaire des adhérents</h3>
            <p style={muted}>Pour échanger des plantes, covoiturer vers une sortie ou trouver un adhérent près de chez vous. Ces coordonnées sont réservées aux adhérents : merci de ne pas les diffuser.</p>
            <input style={input} placeholder="Rechercher un nom ou une commune…" value={q} onChange={(e) => { setQ(e.target.value); setCommune(null) }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
                {[[liste.length, "adhérents"], [liste.filter(bzh).length, "en Bretagne"], [communes.size, "communes"]].map(([n, t]) => <div key={t as string} style={{ background: C.panel, padding: "12px 14px" }}><div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600 }}>{n}</div><div style={{ color: C.mute, fontSize: 12 }}>{t}</div></div>)}
            </div>
            {commune ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ ...label, margin: 0 }}>Commune : {communes.get(commune)?.ville}</span><button style={small()} onClick={() => setCommune(null)}>Voir tout le monde</button></div>
                : <p style={{ ...muted, fontSize: 13 }}>Cliquez sur un point de la carte pour voir qui habite dans la commune.</p>}
        </div>
    )

    return (
        <div ref={ref} style={box}>
            <div style={{ display: "flex", flexDirection: etroit ? "column" : "row", gap: etroit ? 20 : 40, alignItems: etroit ? "stretch" : "center" }}>
                {cote}
                {carte}
            </div>
            {[...parDeptBzh.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, fs]) => <div key={d}>{titreGroupe(NOM_DEPT[d] || d, fs.length)}{grille(fs)}</div>)}
            {enBzh.length === 0 && <p style={{ ...muted, marginTop: 20 }}>Personne ne correspond.</p>}
            {!commune && hors.length > 0 && <div>{titreGroupe("Hors secteur", hors.length)}{grille(hors)}</div>}
        </div>
    )
}
