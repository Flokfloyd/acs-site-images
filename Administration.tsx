// Administration.tsx — espace des administrateurs : agenda, inscriptions, adhérents, comptabilité, boutique, campagnes e-mail
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { C, font, serif } from "./AcsBase.tsx"
import {
    sb, box, input, label, btn, small, h2, muted, Msg, Aide, euros, dateFr, STATUTS, exporter,
    Editeur, ChampForm, ImportAdherents, localiserAdherent, preparerEvenement, JOURS_MOIS,
    CHAMPS_AGENDA, CHAMPS_SEM, CHAMPS_ADH, CHAMPS_ADHESION, CHAMPS_INSCR,
} from "./EspaceMembre.tsx"
import type { Champ } from "./EspaceMembre.tsx"

const ONGLETS = [["agenda", "Agenda"], ["paiements", "Adhésions et paiements"], ["adherents", "Adhérents"], ["compta", "Comptabilité"], ["boutique", "Boutique"], ["campagnes", "Campagnes e-mail"], ["semestriels", "Semestriels"]] as const
type O = (typeof ONGLETS)[number][0]
const lireHash = (): O => { const h = (typeof window !== "undefined" ? window.location.hash.slice(1) : "") as O; return ONGLETS.some(([k]) => k === h) ? h : "agenda" }

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function Administration(props: { pageMembre: string }) {
    const client = sb()
    const [etat, setEtat] = React.useState<"chargement" | "deconnecte" | "refuse" | "ok">("chargement")
    const [email, setEmail] = React.useState("")
    const [onglet, setO] = React.useState<O>("agenda")
    const [campagneOuverte, setCampagneOuverte] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!client) return
        setO(lireHash())
        const f = () => setO(lireHash()); window.addEventListener("hashchange", f)
        const verifier = async (s: any) => {
            if (!s) return setEtat("deconnecte")
            setEmail(s.user.email)
            const { data } = await client.rpc("est_admin")
            setEtat(data === true ? "ok" : "refuse")
        }
        client.auth.getSession().then(({ data }: any) => verifier(data.session))
        const { data } = client.auth.onAuthStateChange((_e: any, s: any) => { if (!s) setEtat("deconnecte") })
        return () => { window.removeEventListener("hashchange", f); data.subscription.unsubscribe() }
    }, [])
    const aller = (o: O) => { setO(o); try { history.replaceState(null, "", "#" + o) } catch (e) {} ; window.scrollTo({ top: 0, behavior: "smooth" }) }
    const ouvrirCampagne = (id: string) => { setCampagneOuverte(id); aller("campagnes") }

    const wrap = (c: React.ReactNode) => <div style={{ width: "100%", color: C.txt, ...font }}>{c}</div>
    if (!client) return wrap(<div style={box}><p style={muted}>Administration bientôt disponible.</p></div>)
    if (etat === "chargement") return wrap(<div style={box}><p style={muted}>Chargement…</p></div>)
    if (etat === "deconnecte") return wrap(<div style={box}><h2 style={h2}>Réservé aux administrateurs</h2><p style={{ ...muted, marginBottom: 18 }}>Connectez-vous d’abord à l’espace membre.</p><a href={props.pageMembre || "/espace-membre"} style={{ ...btn(), textDecoration: "none", display: "inline-block" }}>Se connecter</a></div>)
    if (etat === "refuse") return wrap(<div style={box}><h2 style={h2}>Accès réservé</h2><p style={muted}>{email} n’est pas administrateur de l’association.</p></div>)

    return wrap(
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
                {ONGLETS.map(([k, t]) => <button key={k} onClick={() => aller(k)} style={{ background: "transparent", color: onglet === k ? C.txt : C.mute, border: "none", borderBottom: `2px solid ${onglet === k ? C.accent : "transparent"}`, borderRadius: 0, padding: "12px 16px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>)}
            </div>
            {onglet === "agenda" && <Agenda moi={email} ouvrirCampagne={ouvrirCampagne} />}
            {onglet === "paiements" && <><Aide>Notez ici les adhésions réglées par chèque ou en espèces, et passez en « valide » les inscriptions réglées. Les paiements en ligne s’enregistreront seuls une fois branchés.</Aide>
                <Editeur table="adhesions" ordre="cree_le" desc titre="Adhésions" champs={CHAMPS_ADHESION} nouveau={() => { const a = new Date().getFullYear(); return { annee: a, montant: 20, formule: "Année complète", debut: `${a}-01-01`, fin: `${a}-12-31`, source: "Chèque" } }} resume={(r) => `${r.annee} · ${r.email} · ${euros(r.montant)} · ${r.formule}${r.source ? " · " + r.source : ""}`} />
                <Editeur table="inscriptions" ordre="cree_le" desc titre="Inscriptions et achats" champs={CHAMPS_INSCR} nouveau={() => ({ montant: 0, statut: "valide", nb_personnes: 1 })} resume={(r) => `${dateFr(r.cree_le)} · ${r.formulaire} · ${r.email}${r.nb_personnes > 1 ? " · " + r.nb_personnes + " pers." : ""} · ${euros(r.montant)}${r.statut !== "valide" ? " · " + STATUTS[r.statut] : ""}`} /></>}
            {onglet === "adherents" && <AdherentsAdmin />}
            {onglet === "compta" && <Compta />}
            {onglet === "boutique" && <><Aide>Les articles cochés « En vente » apparaissent sur la page Boutique du site, dans l’ordre indiqué. Laissez le stock vide si vous ne le suivez pas.</Aide>
                <Editeur table="produits" ordre="ordre" titre="Articles" champs={CHAMPS_PROD} nouveau={(l) => ({ actif: true, ordre: (l.length + 1) * 10 })} resume={(r) => `${r.categorie ? r.categorie + " · " : ""}${r.nom} · ${euros(r.prix)}${r.stock != null ? ` · stock ${r.stock}` : ""}${r.actif ? "" : " (retiré)"}`} /></>}
            {onglet === "campagnes" && <Campagnes moi={email} ouverte={campagneOuverte} setOuverte={setCampagneOuverte} />}
            {onglet === "semestriels" && <><Aide>Pour un nouveau numéro : choisissez le PDF final, ajoutez la couverture (image) et cochez « Publier ». Il apparaît aussitôt dans la liseuse du site.</Aide>
                <Editeur table="semestriels" ordre="numero" desc titre="Semestriels" champs={CHAMPS_SEM} nouveau={(l) => ({ numero: Math.max(0, ...l.map((r) => r.numero || 0)) + 1 })} resume={(r) => `N°${r.numero} · ${r.date_label}${r.publie ? "" : " (non publié)"}`} /></>}
        </div>
    )
}
Administration.defaultProps = { pageMembre: "/espace-membre" }
addPropertyControls(Administration, { pageMembre: { type: ControlType.String, title: "Page membre", defaultValue: "/espace-membre" } })

const CHAMPS_PROD: Champ[] = [
    { k: "nom", t: "Nom de l’article", type: "text", requis: true, place: "Tee-shirt ACS" },
    { k: "categorie", t: "Catégorie", type: "text", place: "Tee-shirts, Substrats, Engrais…" },
    { k: "prix", t: "Prix (€)", type: "number", requis: true },
    { k: "description", t: "Description", type: "textarea" },
    { k: "image_url", t: "Photo (sans personne reconnaissable)", type: "fichier", dossier: "boutique", accept: "image/*" },
    { k: "stock", t: "Stock (vide = non suivi)", type: "number" },
    { k: "ordre", t: "Ordre d’affichage", type: "number" },
    { k: "actif", t: "En vente sur le site", type: "bool" },
]
const CHAMPS_ECR: Champ[] = [
    { k: "le", t: "Date", type: "date", requis: true },
    { k: "sens", t: "Type", type: "choix", options: [["depense", "Dépense"], ["recette", "Recette"]] },
    { k: "libelle", t: "Libellé", type: "text", requis: true, place: "Location de salle, timbres…" },
    { k: "categorie", t: "Catégorie", type: "text", place: "Salon, Semestriel, Boutique, Frais bancaires…" },
    { k: "montant", t: "Montant (€)", type: "number", requis: true },
    { k: "moyen", t: "Moyen de paiement", type: "choix", options: [["", "—"], ["Chèque", "Chèque"], ["Espèces", "Espèces"], ["Virement", "Virement"], ["Carte", "Carte"], ["Prélèvement", "Prélèvement"]] },
    { k: "piece_url", t: "Justificatif (photo ou PDF)", type: "fichier", dossier: "compta", accept: "image/*,application/pdf" },
    { k: "note", t: "Note", type: "textarea" },
]
const CIBLES: [string, string][] = [["tous", "Tous les adhérents"], ["a_jour", "Adhérents à jour de cotisation"], ["retard", "Cotisation à renouveler"], ["bureau", "Membres du bureau"], ["evenement", "Inscrits à un événement"]]

// ---------- Adhérents ----------
function AdherentsAdmin() {
    const annee = new Date().getFullYear()
    return <>
        <Aide>Seules les adresses de cette liste peuvent se connecter. Pour le bureau, remplissez « Fonction au bureau » : la personne apparaît alors dans les contacts du bureau.</Aide>
        <ImportAdherents />
        <Editeur table="adherents" ordre="nom" titre="Adhérents" champs={CHAMPS_ADH} avant={localiserAdherent} resume={(r) => `${[r.prenom, r.nom].filter(Boolean).join(" ") || "—"} · ${r.email}${r.fonction_bureau ? " · " + r.fonction_bureau : ""}${r.role === "admin" ? " · admin" : ""}${r.cotisation_annee && r.cotisation_annee < annee ? " · cotisation " + r.cotisation_annee : ""}${r.actif ? "" : " (désactivé)"}`} />
    </>
}

// ---------- Envoi via la fonction Supabase « envoyer » ----------
async function envoyer(body: any): Promise<{ ok: boolean; texte: string }> {
    const { data, error } = await sb().functions.invoke("envoyer", { body })
    if (error) {
        let t = error.message
        try { const j = await error.context.json(); t = j.erreur || t } catch (e) {}
        if (/Failed to send|not found|404/i.test(t)) t = "L’envoi d’e-mails n’est pas encore branché (fonction « envoyer » à installer)."
        return { ok: false, texte: t }
    }
    return { ok: true, texte: `${data.envois} e-mail(s) envoyé(s).` }
}

// ---------- Agenda calendaire ----------
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function Agenda({ moi, ouvrirCampagne }: { moi: string; ouvrirCampagne: (id: string) => void }) {
    const client = sb()
    const auj = new Date()
    const [mois, setMois] = React.useState(new Date(auj.getFullYear(), auj.getMonth(), 1))
    const [evts, setEvts] = React.useState<any[]>([])
    const [sel, setSel] = React.useState<any | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const charger = React.useCallback(async () => {
        const { data, error } = await client.from("evenements").select("*").order("date_debut", { ascending: true, nullsFirst: false })
        if (error) setMsg({ t: error.message, err: true }); else setEvts(data ?? [])
    }, [])
    React.useEffect(() => { charger() }, [charger])

    const debut = new Date(mois); const decal = (debut.getDay() + 6) % 7
    const cases: Date[] = Array.from({ length: 42 }, (_, i) => new Date(mois.getFullYear(), mois.getMonth(), 1 - decal + i))
    const semaines = cases[35].getMonth() !== mois.getMonth() ? 5 : 6
    const duJour = (d: string) => evts.filter((e) => e.date_debut && e.date_debut <= d && (e.date_fin || e.date_debut) >= d)
    const sansDate = evts.filter((e) => !e.date_debut)
    const prochains = evts.filter((e) => e.date_debut && (e.date_fin || e.date_debut) >= iso(auj)).slice(0, 6)
    const nouveau = (d?: string) => { setMsg({ t: "", err: false }); setSel({ titre: "", date_debut: d || "", date_fin: "", heure: "", date_label: "", lieu: "", description: "", reserve_membres: false, inscription_ouverte: false, prix: 0, places: "", publie: true, __annoncer: false }) }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button style={small()} onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent">‹</button>
                        <h3 style={{ ...h2, fontSize: 22, margin: "0 8px", minWidth: 170, textAlign: "center", textTransform: "capitalize" }}>{mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3>
                        <button style={small()} onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant">›</button>
                        <button style={{ ...small(), marginLeft: 6 }} onClick={() => setMois(new Date(auj.getFullYear(), auj.getMonth(), 1))}>Aujourd’hui</button>
                    </div>
                    <button style={btn()} onClick={() => nouveau()}>Nouvel événement</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
                    {JOURS.map((j) => <div key={j} style={{ background: C.panel, padding: "6px 8px", fontSize: 12, color: C.mute, textTransform: "uppercase", letterSpacing: "0.06em" }}>{j}</div>)}
                    {cases.slice(0, semaines * 7).map((d) => {
                        const k = iso(d), horsMois = d.getMonth() !== mois.getMonth(), estAuj = k === iso(auj)
                        const liste = duJour(k)
                        return (
                            <div key={k} onClick={() => nouveau(k)} title="Cliquer pour ajouter un événement ce jour-là" style={{ background: horsMois ? C.bg : "#1f1813", minHeight: 86, padding: 6, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                                <span style={{ fontSize: 13, color: estAuj ? C.accentDark : horsMois ? "rgba(246,240,230,0.3)" : C.mute, background: estAuj ? C.accent : "transparent", alignSelf: "flex-start", padding: estAuj ? "0 6px" : 0, fontWeight: estAuj ? 700 : 400 }}>{d.getDate()}</span>
                                {liste.map((e) => (
                                    <button key={e.id} onClick={(x) => { x.stopPropagation(); setMsg({ t: "", err: false }); setSel({ ...e, prix: e.prix ?? 0, places: e.places ?? "", __annoncer: false }) }}
                                        style={{ textAlign: "left", background: e.inscription_ouverte ? "rgba(155,189,138,0.22)" : "rgba(246,240,230,0.08)", color: C.txt, border: "none", borderLeft: `3px solid ${e.inscription_ouverte ? C.accent : C.mute}`, borderRadius: 0, padding: "3px 6px", font: "inherit", fontSize: 12, lineHeight: 1.3, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: e.publie === false ? 0.5 : 1 }}>
                                        {e.heure ? e.heure + " · " : ""}{e.titre}
                                    </button>
                                ))}
                            </div>
                        )
                    })}
                </div>
                <p style={{ ...muted, fontSize: 13, marginTop: 10 }}>Cliquez sur un jour pour y créer un événement, ou sur un événement pour le modifier et voir les inscrits. En vert : inscriptions ouvertes.</p>
                <Msg text={msg.t} err={msg.err} />
            </div>

            {sel && <FicheEvenement e={sel} setE={setSel} moi={moi} fermer={() => setSel(null)} recharger={charger} ouvrirCampagne={ouvrirCampagne} />}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div style={box}>
                    <span style={label}>Prochains événements</span>
                    {prochains.length === 0 && <p style={muted}>Rien de prévu.</p>}
                    {prochains.map((e) => <button key={e.id} onClick={() => { setSel({ ...e, prix: e.prix ?? 0, places: e.places ?? "", __annoncer: false }); window.scrollTo({ top: 0, behavior: "smooth" }) }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 0", color: C.txt, font: "inherit", cursor: "pointer" }}><span style={{ color: C.accent, fontSize: 13 }}>{e.date_label}</span><br />{e.titre}</button>)}
                </div>
                <div style={box}>
                    <span style={label}>Dates à confirmer</span>
                    {sansDate.length === 0 && <p style={muted}>Aucun.</p>}
                    {sansDate.map((e) => <button key={e.id} onClick={() => setSel({ ...e, prix: e.prix ?? 0, places: e.places ?? "", __annoncer: false })} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 0", color: C.txt, font: "inherit", cursor: "pointer" }}><span style={{ color: C.accent, fontSize: 13 }}>{e.date_label}</span><br />{e.titre}</button>)}
                </div>
            </div>
        </div>
    )
}

function FicheEvenement({ e, setE, moi, fermer, recharger, ouvrirCampagne }: { e: any; setE: (e: any) => void; moi: string; fermer: () => void; recharger: () => void; ouvrirCampagne: (id: string) => void }) {
    const client = sb()
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, [e.id, e.date_debut === "" ? 0 : 1])
    const set = (k: string, v: any) => setE({ ...e, [k]: v })

    const enregistrer = async () => {
        if (!e.titre) return setMsg({ t: "Le titre est obligatoire.", err: true })
        const row: any = {}
        for (const c of CHAMPS_AGENDA) { let v = e[c.k]; if (v === "") v = null; if (c.type === "number" && v != null) v = Number(v); row[c.k] = v }
        row.publie = e.publie !== false
        if (row.date_debut) row.__auto = true
        const err = preparerEvenement(row); delete row.__auto
        if (err) return setMsg({ t: err, err: true })
        if (row.date_fin && (!row.date_debut || row.date_fin <= row.date_debut)) row.date_fin = null
        if (row.date_debut && row.date_fin) row.date_label = `Du ${JOURS_MOIS(row.date_debut).toLowerCase()} au ${JOURS_MOIS(row.date_fin).toLowerCase()}`
        const q = e.id ? client.from("evenements").update(row).eq("id", e.id).select().single() : client.from("evenements").insert(row).select().single()
        const { data, error } = await q
        if (error) return setMsg({ t: error.message, err: true })
        recharger()
        if (e.__annoncer) {
            const contenu = `Bonjour,\n\nNous vous donnons rendez-vous : ${data.titre}\n${data.date_label}${data.heure ? ", " + data.heure : ""}${data.lieu ? "\n" + data.lieu : ""}\n\n${data.description || ""}${data.inscription_ouverte ? `\n\nLes inscriptions sont ouvertes dans votre espace membre${data.prix > 0 ? ` (${euros(data.prix)} par personne)` : ""} : https://acs-armorique-cactus-succulentes.framer.website/espace-membre#evenements` : ""}\n\nÀ bientôt,\nLe bureau de l’ACS`
            const { data: c, error: e2 } = await client.from("campagnes").insert({ sujet: `${data.titre} · ${data.date_label}`, contenu, cible: "tous", auteur: moi }).select().single()
            if (e2) return setMsg({ t: "Événement enregistré, mais l’annonce n’a pas pu être préparée : " + e2.message, err: true })
            return ouvrirCampagne(c.id)
        }
        setE({ ...data, prix: data.prix ?? 0, places: data.places ?? "", __annoncer: false })
        setMsg({ t: "Enregistré.", err: false })
    }
    const supprimer = async () => {
        if (!window.confirm(`Supprimer « ${e.titre} » ? Les inscriptions restent dans l’historique.`)) return
        const { error } = await client.from("evenements").delete().eq("id", e.id)
        if (error) return setMsg({ t: error.message, err: true })
        recharger(); fermer()
    }
    const champs = CHAMPS_AGENDA.filter((c) => c.k !== "date_label" || !e.date_debut)

    return (
        <div ref={ref} style={{ ...box, borderColor: C.accent, scrollMarginTop: 90 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <h3 style={{ ...h2, fontSize: 22, margin: 0 }}>{e.id ? "Modifier l’événement" : "Nouvel événement"}</h3>
                <button style={small()} onClick={fermer}>Fermer</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                {champs.filter((c) => c.type !== "bool" && c.type !== "textarea").map((c) => <ChampForm key={c.k} c={c} v={e[c.k]} set={(v) => set(c.k, v)} />)}
            </div>
            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                {champs.filter((c) => c.type === "textarea").map((c) => <ChampForm key={c.k} c={c} v={e[c.k]} set={(v) => set(c.k, v)} />)}
                {champs.filter((c) => c.type === "bool").map((c) => <ChampForm key={c.k} c={c} v={e[c.k]} set={(v) => set(c.k, v)} />)}
                <ChampForm c={{ k: "publie", t: "Publié sur le site", type: "bool" }} v={e.publie !== false} set={(v) => set("publie", v)} />
                <ChampForm c={{ k: "__annoncer", t: "Annoncer par e-mail aux adhérents après l’enregistrement (vous relirez le message avant l’envoi)", type: "bool" }} v={e.__annoncer} set={(v) => set("__annoncer", v)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                <button style={btn()} onClick={enregistrer}>Enregistrer</button>
                {e.id && <button style={small(true)} onClick={supprimer}>Supprimer</button>}
            </div>
            <Msg text={msg.t} err={msg.err} />
            {e.id && <Inscrits evt={e} moi={moi} ouvrirCampagne={ouvrirCampagne} />}
        </div>
    )
}

function Inscrits({ evt, moi, ouvrirCampagne }: { evt: any; moi: string; ouvrirCampagne: (id: string) => void }) {
    const client = sb()
    const [liste, setListe] = React.useState<any[] | null>(null)
    const [adh, setAdh] = React.useState<any[]>([])
    const [f, setF] = React.useState({ email: "", nb: 1, statut: "valide", confirmer: true })
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const charger = React.useCallback(async () => {
        const { data } = await client.from("inscriptions").select("*").eq("evenement_id", evt.id).order("cree_le")
        setListe((data ?? []).filter((r: any) => r.statut !== "abandonne"))
    }, [evt.id])
    React.useEffect(() => { charger(); client.from("adherents").select("email,prenom,nom").eq("actif", true).order("nom").then(({ data }: any) => setAdh(data ?? [])) }, [charger])
    const nom = (email: string) => { const a = adh.find((x) => x.email === email); return a ? [a.prenom, a.nom].filter(Boolean).join(" ") : "" }
    const total = (liste ?? []).reduce((s, r) => s + (r.nb_personnes || 1), 0)

    const ajouter = async () => {
        const email = f.email.trim().toLowerCase()
        if (!/@/.test(email)) return setMsg({ t: "Adresse e-mail invalide.", err: true })
        const { error } = await client.from("inscriptions").insert({ email, formulaire: `${evt.titre} · ${evt.date_label}`, montant: (evt.prix || 0) * f.nb, statut: f.statut, evenement_id: evt.id, nb_personnes: f.nb })
        if (error) return setMsg({ t: error.message, err: true })
        let t = "Inscription ajoutée."
        if (f.confirmer) {
            const r = await envoyer({ a: [email], sujet: `Inscription confirmée : ${evt.titre}`, contenu: `Bonjour${nom(email) ? " " + nom(email).split(" ")[0] : ""},\n\nVotre inscription est bien enregistrée pour ${f.nb} personne${f.nb > 1 ? "s" : ""} :\n${evt.titre}\n${evt.date_label}${evt.heure ? ", " + evt.heure : ""}${evt.lieu ? "\n" + evt.lieu : ""}${evt.prix > 0 ? `\n\nMontant : ${euros(evt.prix * f.nb)}${f.statut === "en_attente" ? " (à régler)" : " (réglé)"}` : ""}\n\nÀ bientôt,\nLe bureau de l’ACS` })
            t += r.ok ? " Confirmation envoyée par e-mail." : " E-mail non envoyé : " + r.texte
        }
        setMsg({ t, err: false }); setF({ ...f, email: "", nb: 1 }); charger()
    }
    const changer = async (r: any, statut: string) => { await client.from("inscriptions").update({ statut }).eq("id", r.id); charger() }
    const ecrire = async () => {
        const { data, error } = await client.from("campagnes").insert({ sujet: `${evt.titre} · informations`, contenu: `Bonjour,\n\nVous êtes inscrit à « ${evt.titre} » (${evt.date_label}).\n\n\n\nÀ bientôt,\nLe bureau de l’ACS`, cible: "evenement", evenement_id: evt.id, dans_espace: false, auteur: moi }).select().single()
        if (error) return setMsg({ t: error.message, err: true })
        ouvrirCampagne(data.id)
    }

    return (
        <div style={{ marginTop: 28, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h4 style={{ fontFamily: serif, fontSize: 20, margin: 0 }}>Inscrits <span style={{ color: C.mute, fontWeight: 400, fontSize: 15 }}>{liste ? `${liste.length} inscription(s) · ${total} personne(s)${evt.places ? ` sur ${evt.places} places` : ""}` : ""}</span></h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {liste && liste.length > 0 && <button style={small()} onClick={() => exporter(`inscrits-${evt.titre}.csv`, ["E-mail", "Nom", "Personnes", "Montant", "Statut", "Inscrit le"], liste.map((r) => [r.email, nom(r.email), r.nb_personnes, r.montant, STATUTS[r.statut], r.cree_le]))}>Exporter (CSV)</button>}
                    {liste && liste.length > 0 && <button style={small()} onClick={ecrire}>Écrire aux inscrits</button>}
                </div>
            </div>
            {!evt.inscription_ouverte && <p style={{ ...muted, fontSize: 13, marginTop: 6 }}>Les inscriptions en ligne sont fermées pour cet événement : vous pouvez tout de même ajouter des inscrits à la main.</p>}
            <div style={{ marginTop: 10 }}>
                {(liste ?? []).map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
                        <span>{nom(r.email) || r.email} <span style={{ color: C.mute, fontSize: 13 }}>· {r.nb_personnes || 1} pers.{r.montant > 0 ? " · " + euros(r.montant) : ""}</span></span>
                        <span style={{ display: "flex", gap: 6 }}>
                            {r.statut === "en_attente" ? <button style={small()} onClick={() => changer(r, "valide")}>Marquer réglé</button> : <span style={{ fontSize: 12, color: C.accent, padding: "6px 0" }}>{STATUTS[r.statut]}</span>}
                            <button style={small(true)} onClick={() => window.confirm("Annuler cette inscription ?") && changer(r, "abandonne")}>Annuler</button>
                        </span>
                    </div>
                ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) 90px minmax(140px, 1fr)", gap: 10, marginTop: 14, alignItems: "end" }}>
                <div><span style={label}>Ajouter un inscrit</span><input style={input} list="acs-adh" placeholder="adresse e-mail" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} />
                    <datalist id="acs-adh">{adh.map((a) => <option key={a.email} value={a.email}>{[a.prenom, a.nom].filter(Boolean).join(" ")}</option>)}</datalist></div>
                <div><span style={label}>Pers.</span><input style={input} type="number" min={1} value={f.nb} onChange={(x) => setF({ ...f, nb: Math.max(1, Number(x.target.value) || 1) })} /></div>
                <div><span style={label}>Règlement</span><select style={input} value={f.statut} onChange={(x) => setF({ ...f, statut: x.target.value })}><option value="valide">Réglé / gratuit</option><option value="en_attente">À régler</option></select></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}><input type="checkbox" checked={f.confirmer} onChange={(x) => setF({ ...f, confirmer: x.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Envoyer une confirmation par e-mail</label>
                <button style={btn()} onClick={ajouter}>Ajouter</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Comptabilité ----------
function Compta() {
    const client = sb()
    const [annee, setAnnee] = React.useState(new Date().getFullYear())
    const [d, setD] = React.useState<{ adh: any[]; ins: any[]; dons: any[]; ecr: any[] } | null>(null)
    const [cle, setCle] = React.useState(0)
    React.useEffect(() => {
        const deb = `${annee}-01-01`, fin = `${annee + 1}-01-01`
        Promise.all([
            client.from("adhesions").select("*").eq("annee", annee),
            client.from("inscriptions").select("*").gte("cree_le", deb).lt("cree_le", fin),
            client.from("dons").select("*").gte("le", deb).lt("le", fin),
            client.from("ecritures").select("*").gte("le", deb).lt("le", fin).order("le"),
        ]).then(([a, i, dn, e]: any[]) => setD({ adh: a.data ?? [], ins: (i.data ?? []).filter((r: any) => r.statut === "valide"), dons: dn.data ?? [], ecr: e.data ?? [] }))
    }, [annee, cle])
    const somme = (l: any[]) => l.reduce((s, r) => s + (Number(r.montant) || 0), 0)
    const lignesRecettes: [string, number][] = d ? [["Adhésions", somme(d.adh)], ["Inscriptions et achats en ligne", somme(d.ins)], ["Dons", somme(d.dons)]] : []
    const parCat = (sens: string) => { const m = new Map<string, number>(); for (const r of d?.ecr ?? []) if (r.sens === sens) m.set(r.categorie || "Divers", (m.get(r.categorie || "Divers") || 0) + Number(r.montant)); return [...m.entries()].sort((a, b) => b[1] - a[1]) }
    const recettes = d ? somme(d.adh) + somme(d.ins) + somme(d.dons) + somme(d.ecr.filter((r) => r.sens === "recette")) : 0
    const depenses = d ? somme(d.ecr.filter((r) => r.sens === "depense")) : 0
    const journal = () => {
        if (!d) return
        const l: any[][] = [
            ...d.adh.map((r) => [r.debut || r.cree_le?.slice(0, 10), "Recette", "Adhésions", `Adhésion ${r.annee} · ${r.email}`, r.montant, r.source || ""]),
            ...d.ins.map((r) => [r.cree_le?.slice(0, 10), "Recette", "Inscriptions", `${r.formulaire} · ${r.email}`, r.montant, ""]),
            ...d.dons.map((r) => [r.le, "Recette", "Dons", `Don · ${r.email}`, r.montant, ""]),
            ...d.ecr.map((r) => [r.le, r.sens === "recette" ? "Recette" : "Dépense", r.categorie || "Divers", r.libelle, r.sens === "recette" ? r.montant : -r.montant, r.moyen || ""]),
        ].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
        exporter(`comptes-acs-${annee}.csv`, ["Date", "Type", "Catégorie", "Libellé", "Montant", "Moyen"], l)
    }
    const ligne = (t: string, v: number, fort = false) => <div key={t} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: `1px solid ${C.line}`, fontWeight: fort ? 700 : 400 }}><span>{t}</span><span>{euros(v)}</span></div>

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button style={small()} onClick={() => setAnnee(annee - 1)}>‹</button>
                        <h3 style={{ ...h2, fontSize: 22, margin: "0 8px" }}>Exercice {annee}</h3>
                        <button style={small()} onClick={() => setAnnee(annee + 1)}>›</button>
                    </div>
                    <button style={btn(false)} onClick={journal}>Exporter le journal (CSV)</button>
                </div>
                {!d ? <p style={muted}>Chargement…</p> : <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: C.line, border: `1px solid ${C.line}`, marginBottom: 20 }}>
                        {[["Recettes", recettes, C.accent], ["Dépenses", depenses, C.danger], ["Solde", recettes - depenses, recettes - depenses >= 0 ? C.txt : C.danger]].map(([t, v, c]) => <div key={t as string} style={{ background: C.panel, padding: "14px 16px" }}><div style={{ color: C.mute, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t}</div><div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: c as string }}>{euros(v as number)}</div></div>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
                        <div><span style={label}>Recettes</span>{lignesRecettes.map(([t, v]) => ligne(t, v))}{parCat("recette").map(([t, v]) => ligne(t, v))}{ligne("Total", recettes, true)}</div>
                        <div><span style={label}>Dépenses</span>{parCat("depense").length === 0 && <p style={{ ...muted, padding: "7px 0" }}>Aucune dépense saisie.</p>}{parCat("depense").map(([t, v]) => ligne(t, v))}{ligne("Total", depenses, true)}</div>
                    </div>
                    <p style={{ ...muted, fontSize: 13, marginTop: 16 }}>Les adhésions, inscriptions réglées et dons sont comptés automatiquement. Saisissez ci-dessous les autres recettes (ventes au salon, boutique…) et les dépenses.</p>
                </>}
            </div>
            <div onClick={() => setTimeout(() => setCle((x) => x + 1), 1500)}>
                <Editeur table="ecritures" ordre="le" desc titre="Recettes et dépenses saisies" champs={CHAMPS_ECR} nouveau={() => ({ le: new Date().toISOString().slice(0, 10), sens: "depense" })} resume={(r) => `${dateFr(r.le)} · ${r.sens === "recette" ? "+" : "−"}${euros(r.montant)} · ${r.libelle}${r.categorie ? " · " + r.categorie : ""}`} />
            </div>
        </div>
    )
}

// ---------- Campagnes e-mail ----------
function Campagnes({ moi, ouverte, setOuverte }: { moi: string; ouverte: string | null; setOuverte: (id: string | null) => void }) {
    const client = sb()
    const [liste, setListe] = React.useState<any[]>([])
    const [evts, setEvts] = React.useState<any[]>([])
    const [c, setC] = React.useState<any | null>(null)
    const [nb, setNb] = React.useState<number | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [occupe, setOccupe] = React.useState(false)
    const charger = React.useCallback(async () => {
        const { data } = await client.from("campagnes").select("*").order("cree_le", { ascending: false })
        setListe(data ?? [])
        return data ?? []
    }, [])
    React.useEffect(() => {
        charger().then((l: any[]) => { if (ouverte) { const x = l.find((r) => r.id === ouverte); if (x) setC(x); setOuverte(null) } })
        client.from("evenements").select("id,titre,date_label,date_debut").order("date_debut", { ascending: false }).then(({ data }: any) => setEvts(data ?? []))
    }, [])
    React.useEffect(() => {
        setNb(null)
        if (!c?.id) return
        client.rpc("destinataires", { c: c.id }).then(({ data }: any) => setNb(data ? data.length : null))
    }, [c?.id, c?.cible, c?.evenement_id, c?.__enr])

    const sauver = async (silencieux = false) => {
        if (!c.sujet || !c.contenu) { setMsg({ t: "Objet et message sont obligatoires.", err: true }); return null }
        const row = { sujet: c.sujet, contenu: c.contenu, cible: c.cible, evenement_id: c.cible === "evenement" ? c.evenement_id || null : null, dans_espace: !!c.dans_espace, auteur: moi }
        const { data, error } = c.id ? await client.from("campagnes").update(row).eq("id", c.id).select().single() : await client.from("campagnes").insert(row).select().single()
        if (error) { setMsg({ t: error.message, err: true }); return null }
        setC({ ...data, __enr: Date.now() }); charger()
        if (!silencieux) setMsg({ t: "Brouillon enregistré.", err: false })
        return data
    }
    const test = async () => {
        const d = await sauver(true); if (!d) return
        setOccupe(true); const r = await envoyer({ a: [moi], sujet: "[Test] " + d.sujet, contenu: d.contenu }); setOccupe(false)
        setMsg({ t: r.ok ? `Test envoyé à ${moi}.` : r.texte, err: !r.ok })
    }
    const envoyerTout = async () => {
        const d = await sauver(true); if (!d) return
        const { data: dest } = await client.rpc("destinataires", { c: d.id })
        const n = dest?.length ?? 0
        if (!n) return setMsg({ t: "Aucun destinataire pour cette cible.", err: true })
        if (!window.confirm(`Envoyer « ${d.sujet} » à ${n} personne(s) ? L’envoi ne peut pas être annulé.`)) return
        setOccupe(true); const r = await envoyer({ campagne_id: d.id }); setOccupe(false)
        setMsg({ t: r.texte, err: !r.ok })
        const l = await charger(); setC(l.find((x: any) => x.id === d.id) || null)
    }
    const supprimer = async (r: any) => { if (!window.confirm(`Supprimer le brouillon « ${r.sujet} » ?`)) return; await client.from("campagnes").delete().eq("id", r.id); setC(null); charger() }
    const STAT: Record<string, string> = { brouillon: "Brouillon", envoyee: "Envoyée", erreur: "Erreur" }

    if (c) {
        const envoyee = c.statut === "envoyee"
        return (
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <h3 style={{ ...h2, fontSize: 22, margin: 0 }}>{envoyee ? "Campagne envoyée" : c.id ? "Brouillon" : "Nouvelle campagne"}</h3>
                    <button style={small()} onClick={() => { setC(null); setMsg({ t: "", err: false }) }}>Retour à la liste</button>
                </div>
                {envoyee && <p style={{ ...muted, marginBottom: 16 }}>Envoyée le {dateFr(c.envoyee_le, true)} à {c.nb_envois} personne(s).</p>}
                <fieldset disabled={envoyee || occupe} style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
                    <div><span style={label}>Destinataires</span>
                        <select style={input} value={c.cible} onChange={(e) => setC({ ...c, cible: e.target.value })}>{CIBLES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
                        <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>Seuls les adhérents qui acceptent les e-mails (option du profil) sont concernés.{nb != null ? ` ${nb} destinataire(s).` : c.id ? "" : " Enregistrez le brouillon pour voir le nombre de destinataires."}</span></div>
                    {c.cible === "evenement" && <div><span style={label}>Événement</span>
                        <select style={input} value={c.evenement_id || ""} onChange={(e) => setC({ ...c, evenement_id: e.target.value })}><option value="">— choisir —</option>{evts.map((e) => <option key={e.id} value={e.id}>{e.date_label} — {e.titre}</option>)}</select></div>}
                    <div><span style={label}>Objet *</span><input style={input} value={c.sujet} onChange={(e) => setC({ ...c, sujet: e.target.value })} placeholder="Sortie du printemps, assemblée générale…" /></div>
                    <div><span style={label}>Message *</span><textarea style={{ ...input, minHeight: 260, resize: "vertical", lineHeight: 1.6 }} value={c.contenu} onChange={(e) => setC({ ...c, contenu: e.target.value })} placeholder={"Bonjour,\n\n…\n\nLe bureau de l’ACS"} />
                        <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>Texte simple : laissez une ligne vide entre les paragraphes. Les liens (https://…) deviennent cliquables. Un pied de page pour se désabonner est ajouté automatiquement.</span></div>
                    {c.cible !== "evenement" && <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><input type="checkbox" checked={!!c.dans_espace} onChange={(e) => setC({ ...c, dans_espace: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Afficher aussi ce message dans l’espace membre (rubrique Messages)</label>}
                </fieldset>
                {!envoyee && <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                    <button style={btn()} disabled={occupe} onClick={envoyerTout}>{occupe ? "Envoi…" : "Envoyer"}</button>
                    <button style={btn(false)} disabled={occupe} onClick={test}>M’envoyer un test</button>
                    <button style={btn(false)} disabled={occupe} onClick={() => sauver()}>Enregistrer le brouillon</button>
                    {c.id && <button style={small(true)} onClick={() => supprimer(c)}>Supprimer</button>}
                </div>}
                {c.statut === "erreur" && c.erreur && <p style={{ color: C.danger, fontSize: 13, marginTop: 12 }}>Dernière erreur : {c.erreur}</p>}
                <Msg text={msg.t} err={msg.err} />
            </div>
        )
    }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <Aide>Écrivez à tous les adhérents, à ceux qui doivent renouveler leur cotisation, au bureau ou aux inscrits d’une sortie. Envoyez-vous d’abord un test pour vérifier le rendu.</Aide>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>Campagnes <span style={{ color: C.mute, fontWeight: 400 }}>({liste.length})</span></h3>
                    <button style={btn()} onClick={() => { setMsg({ t: "", err: false }); setC({ sujet: "", contenu: "Bonjour,\n\n\n\nLe bureau de l’ACS", cible: "tous", dans_espace: true, statut: "brouillon" }) }}>Nouvelle campagne</button>
                </div>
                {liste.length === 0 && <p style={muted}>Aucune campagne pour l’instant.</p>}
                {liste.map((r) => (
                    <button key={r.id} onClick={() => { setMsg({ t: "", err: false }); setC(r) }} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 12, textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "12px 0", color: C.txt, font: "inherit", cursor: "pointer" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sujet}<span style={{ color: C.mute, fontSize: 13 }}> · {CIBLES.find(([k]) => k === r.cible)?.[1]}</span></span>
                        <span style={{ flex: "0 0 auto", fontSize: 13, color: r.statut === "envoyee" ? C.accent : r.statut === "erreur" ? C.danger : C.mute }}>{STAT[r.statut]}{r.statut === "envoyee" ? ` · ${dateFr(r.envoyee_le)} · ${r.nb_envois}` : ""}</span>
                    </button>
                ))}
                <Msg text={msg.t} err={msg.err} />
            </div>
        </div>
    )
}
