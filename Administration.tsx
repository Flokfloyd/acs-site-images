// Administration.tsx — espace des administrateurs : agenda, inscriptions, adhérents, comptabilité, boutique, campagnes e-mail
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { C, font, serif } from "./AcsBase.tsx"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"
import {
    sb, box, input, label, btn, small, h2, muted, euros, dateFr, STATUTS, exporter, UI,
    localiserAdherent, preparerEvenement, JOURS_MOIS,
    CHAMPS_AGENDA, CHAMPS_SEM, CHAMPS_ADH, CHAMPS_ADHESION, CHAMPS_INSCR, CHAMPS_PHOTO, FichierForm,
} from "./EspaceMembre.tsx"
import { GALERIE } from "./GalerieAccueil.tsx"
import { ZONES_SALON, ouvrirFormulairePapier } from "./InscriptionSalon.tsx"
import GuideAdmin from "./GuideAdmin.tsx"
import ComptaAdmin, { VUES_COMPTA, type Vue as VueCompta } from "./ComptaAdmin.tsx"
import { NavSections, type Rubrique } from "./NavSections.tsx"
import { TachesAdmin, RetroplanningAdmin, AlertesRetroplanning } from "./PlanningSalon.tsx"
import type { Champ, Question } from "./EspaceMembre.tsx"
const { Msg, Aide, Editeur, ChampForm, ImportAdherents, ResultatsSondage } = UI

// Largeur disponible (pour passer en affichage mobile) : renvoie un « ref » à poser sur le conteneur
function useEtroit(seuil = 640): [(el: HTMLElement | null) => void, boolean] {
    const [el, setEl] = React.useState<HTMLElement | null>(null)
    const [etroit, setEtroit] = React.useState(false)
    React.useEffect(() => {
        if (!el || typeof ResizeObserver === "undefined") return
        const o = new ResizeObserver(([e]) => setEtroit(e.contentRect.width < seuil))
        o.observe(el)
        return () => o.disconnect()
    }, [el])
    return [setEl, etroit]
}

const ONGLETS = [["agenda", "Agenda"], ["billets", "Contrôle des billets"], ["paiements", "Adhésions et paiements"], ["adherents", "Adhérents"], ["compta", "Comptabilité"], ["salon", "Salon"], ["boutique", "Boutique"], ["campagnes", "Campagnes e-mail"], ["sondages", "Sondages"], ["galerie", "Galerie"], ["semestriels", "Semestriels"], ["cultiver", "Cultiver"], ["guide", "Guide"]] as const
type O = (typeof ONGLETS)[number][0]
const lireHash = (): O => {
    if (typeof window === "undefined") return "agenda"
    if (new URLSearchParams(window.location.search).get("billet")) return "billets" // QR code scanné avec l'appareil photo
    const h = window.location.hash.slice(1) as O
    return ONGLETS.some(([k]) => k === h) ? h : "agenda"
}
// rubriques de l'administration (grandes tuiles) et leurs sous-rubriques ; « salon:… » ouvre un volet du Salon
const RUBRIQUES: Rubrique[] = [
    { k: "evenements", titre: "Agenda et événements", desc: "Dates, inscriptions, billets, sondages", icone: "agenda", sous: [["agenda", "Agenda"], ["billets", "Contrôle des billets"], ["sondages", "Sondages"]] },
    { k: "membres", titre: "Adhérents", desc: "Fichier, adhésions et paiements, accès", icone: "adherents", sous: [["adherents:fichier", "Fichier des adhérents"], ["paiements", "Adhésions et paiements"], ["adherents:acces", "Accès et codes"]] },
    { k: "compta", titre: "Comptabilité", desc: "Tableau de bord, journal, états, budget", icone: "compta", sous: VUES_COMPTA.map(([k, t]) => ["compta:" + k, t] as [string, string]) },
    { k: "salon", titre: "Salon des plantes", desc: "Exposants, producteurs, bénévoles, rétroplanning", icone: "salon", sous: [["salon:exposants", "Exposants et réglages"], ["salon:fiches", "Fiches producteurs"], ["salon:planning", "Tâches des bénévoles"], ["salon:retro", "Rétroplanning"]] },
    { k: "communication", titre: "Communication", desc: "E-mails, galerie photos, semestriels", icone: "communication", sous: [["campagnes", "Campagnes e-mail"], ["galerie", "Galerie"], ["semestriels", "Semestriels"]] },
    { k: "site", titre: "Site et boutique", desc: "Articles et livres de Cultiver, boutique", icone: "site", sous: [["cultiver:articles", "Articles Cultiver"], ["cultiver:livres", "Bibliothèque"], ["boutique", "Boutique"]] },
    { k: "guide", titre: "Guide et rappels", desc: "Mode d’emploi, rappels de l’année", icone: "guide", sous: [["guide", "Guide"]] },
]
const rubriqueDe = (o: string) => RUBRIQUES.find((r) => r.sous!.some(([k]) => k.split(":")[0] === o))!
const CODE_BILLET = /ACS-[A-Z0-9]{4}-[A-Z0-9]{4}/i

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
    const [sousSalon, setSousSalon] = React.useState<"exposants" | "planning" | "retro" | "fiches">("exposants")
    const [ref, etroit] = useEtroit(760)
    const [ouvert, setOuvert] = React.useState(() => typeof window !== "undefined" && (!!window.location.hash || !!new URLSearchParams(window.location.search).get("billet")))

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
    const aller = (o: O) => { setO(o); setOuvert(true); try { history.replaceState(null, "", "#" + o) } catch (e) {} ; window.scrollTo({ top: 0, behavior: "smooth" }) }
    const [sousCultiver, setSousCultiver] = React.useState<"articles" | "livres">("articles")
    const [sousAdh, setSousAdh] = React.useState<"fichier" | "acces">("fichier")
    const [sousCompta, setSousCompta] = React.useState<VueCompta>("bord")
    const allerSous = (k: string) => { const [o, v] = k.split(":"); if (v && o === "salon") setSousSalon(v as any); if (v && o === "cultiver") setSousCultiver(v as any); if (v && o === "adherents") setSousAdh(v as any); if (v && o === "compta") setSousCompta(v as any); aller(o as O) }
    const choisirRubrique = (k: string | null) => {
        if (!k) { setOuvert(false); try { history.replaceState(null, "", location.pathname) } catch (e) {} ; return }
        allerSous(RUBRIQUES.find((r) => r.k === k)!.sous![0][0])
    }
    const ouvrirCampagne = (id: string) => { setCampagneOuverte(id); aller("campagnes") }

    const wrap = (c: React.ReactNode) => <div className="acs-large" style={{ width: "100%", maxWidth: "100%", minWidth: 0, contain: "inline-size", overflowWrap: "anywhere", overflowX: "clip", color: C.txt, ...font }}><style>{".acs-large input,.acs-large select,.acs-large textarea{max-width:100%;min-width:0;box-sizing:border-box}.acs-large img{max-width:100%}.acs-large *{scrollbar-width:thin;scrollbar-color:rgba(246,240,230,.32) transparent}.acs-large ::-webkit-scrollbar{width:8px;height:8px}.acs-large ::-webkit-scrollbar-track{background:transparent}.acs-large ::-webkit-scrollbar-thumb{background:rgba(246,240,230,.28);border-radius:0}.acs-large ::-webkit-scrollbar-thumb:hover{background:rgba(246,240,230,.5)}.acs-large ::-webkit-scrollbar-corner{background:transparent}.acs-large select option{background:#15100d;color:#f6f0e6}"}</style>{c}</div>
    if (!client) return wrap(<div style={box}><p style={muted}>Chargement…</p></div>) // page pré-générée côté serveur : la base se branche dans le navigateur
    if (etat === "chargement") return wrap(<div style={box}><p style={muted}>Chargement…</p></div>)
    if (etat === "deconnecte") return wrap(<div style={box}><h2 style={h2}>Réservé aux administrateurs</h2><p style={{ ...muted, marginBottom: 18 }}>Connectez-vous d’abord à l’espace membre.</p><a href={props.pageMembre || "/espace-membre"} style={{ ...btn(), textDecoration: "none", display: "inline-block" }}>Se connecter</a></div>)
    if (etat === "refuse") return wrap(<div style={box}><h2 style={h2}>Accès réservé</h2><p style={muted}>{email} n’est pas administrateur de l’association.</p></div>)

    return wrap(
        <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <RappelsEnCours />
            <AlertesRetroplanning client={client} ouvrir={() => { setSousSalon("retro"); aller("salon") }} />
            <NavSections rubriques={RUBRIQUES} actif={ouvert ? rubriqueDe(onglet).k : null} choisir={choisirRubrique} etroit={etroit}
                sousActif={onglet === "salon" ? "salon:" + sousSalon : onglet === "cultiver" ? "cultiver:" + sousCultiver : onglet === "adherents" ? "adherents:" + sousAdh : onglet === "compta" ? "compta:" + sousCompta : onglet} choisirSous={allerSous}>
            {onglet === "agenda" && <Agenda moi={email} ouvrirCampagne={ouvrirCampagne} etroit={etroit} />}
            {onglet === "billets" && <ControleBillets />}
            {onglet === "paiements" && <><Aide>Les paiements encaissés sur AssoConnect (en ligne ou au salon avec l’appli) s’ajoutent ici en important un export AssoConnect, par exemple une fois par mois. Notez à la main les adhésions réglées par chèque ou en espèces hors AssoConnect.</Aide>
                <ImportAssoConnect />
                <Editeur table="campagnes_adhesion" ordre="annee" desc titre="Campagnes d’adhésion (page Adhésion)" champs={CHAMPS_CAMPAGNE_ADH} nouveau={(l) => { const a = Math.max(new Date().getFullYear(), ...l.map((x: any) => x.annee)) + 1; return { annee: a, ouverture: `${a - 1}-12-01`, tarif: l[0]?.tarif ?? 20 } }} resume={(r) => `${r.annee} · affichée dès le ${dateFr(r.ouverture)} · ${r.tarif} €${r.lien ? "" : " · lien de paiement à ajouter"}`} />
                <Editeur table="adhesions" ordre="cree_le" desc titre="Adhésions" champs={CHAMPS_ADHESION} nouveau={() => { const a = new Date().getFullYear(); return { annee: a, montant: 20, formule: "Année complète", debut: `${a}-01-01`, fin: `${a}-12-31`, source: "Chèque" } }} resume={(r) => `${r.annee} · ${r.email} · ${euros(r.montant)} · ${r.formule}${r.source ? " · " + r.source : ""}`} />
                <Editeur table="inscriptions" ordre="cree_le" desc titre="Inscriptions et achats" champs={CHAMPS_INSCR} nouveau={() => ({ montant: 0, statut: "valide", nb_personnes: 1 })} resume={(r) => `${dateFr(r.cree_le)} · ${r.formulaire} · ${r.email}${r.nb_personnes > 1 ? " · " + r.nb_personnes + " pers." : ""} · ${euros(r.montant)}${r.statut !== "valide" ? " · " + STATUTS[r.statut] : ""}`} /></>}
            {onglet === "adherents" && <AdherentsAdmin moi={email} sous={sousAdh} />}
            {onglet === "compta" && <ComptaAdmin moi={email} vue={sousCompta} setVue={setSousCompta} />}
            {onglet === "salon" && sousSalon === "fiches" && <><Aide>Chaque fiche s’ouvre quand un visiteur clique sur le nom de l’exposant dans la liste des exposants de la page Salon. Écrivez le nom exactement comme dans la liste (le nom de la demande d’emplacement). Photo : un stand ou des plantes, sans personne reconnaissable sauf accord.</Aide>
                <Editeur table="producteurs" ordre="nom" titre="Fiches producteurs" champs={CHAMPS_PRODUCTEUR} nouveau={() => ({ visible: true })} resume={(r) => `${r.nom}${r.specialites ? " · " + r.specialites : ""}${r.visible ? "" : " (masquée)"}`} /></>}
            {onglet === "cultiver" && <CultiverAdmin sous={sousCultiver} />}
            {onglet === "salon" && sousSalon === "planning" && <TachesAdmin client={client} etroit={etroit} />}
            {onglet === "salon" && sousSalon === "retro" && <RetroplanningAdmin client={client} etroit={etroit} />}
            {onglet === "salon" && sousSalon === "exposants" && <><Aide>Les exposants déposent leur demande sur la page Salon (ou sur le formulaire papier). Acceptez, attribuez la zone, la surface (m²), les tables et le n° de stand, puis fixez la contribution : elle se calcule d’après les tarifs au m², et reste modifiable. Rien n’est envoyé aux exposants automatiquement.</Aide>
                <GestionSalon etroit={etroit} /></>}
            {onglet === "boutique" && <><AccesPage page="boutique" nom="Boutique" /><Aide>Les articles cochés « En vente » apparaissent sur la page Boutique du site, dans l’ordre indiqué. Laissez le stock vide si vous ne le suivez pas.</Aide>
                <Editeur table="produits" ordre="ordre" titre="Articles" champs={CHAMPS_PROD} nouveau={(l) => ({ actif: true, ordre: (l.length + 1) * 10 })} resume={(r) => `${r.categorie ? r.categorie + " · " : ""}${r.nom} · ${euros(r.prix)}${r.stock != null ? ` · stock ${r.stock}` : ""}${r.actif ? "" : " (retiré)"}`} /></>}
            {onglet === "campagnes" && <Campagnes moi={email} ouverte={campagneOuverte} setOuverte={setCampagneOuverte} />}
            {onglet === "sondages" && <SondagesAdmin moi={email} ouvrirCampagne={ouvrirCampagne} />}
            {onglet === "galerie" && <GalerieAdmin />}
            {onglet === "guide" && <><GuideAdmin /><Editeur table="rappels_admin" ordre="a_partir_du" titre="Rappels de l’administration" champs={CHAMPS_RAPPEL} nouveau={() => ({ chaque_annee: false, fait: false })} resume={(r) => `${r.titre} · affiché dès le ${dateFr(r.a_partir_du)}${r.fait ? " · fait" : ""}`} /></>}
            {onglet === "semestriels" && <><AccesPage page="semestriels" nom="Semestriels" reservee="Adhérents (visiteurs : 5 pages d’aperçu)" /><Aide>Pour un nouveau numéro : choisissez le PDF final, ajoutez la couverture (image) et cochez « Publier ». Il apparaît aussitôt dans la liseuse du site.</Aide>
                <Editeur table="semestriels" ordre="numero" desc titre="Semestriels" champs={CHAMPS_SEM} nouveau={(l) => ({ numero: Math.max(0, ...l.map((r) => r.numero || 0)) + 1 })} resume={(r) => `N°${r.numero} · ${r.date_label}${r.publie ? "" : " (non publié)"}`} /></>}
            </NavSections>
            <Sauvegarde />
        </div>
    )
}
Administration.defaultProps = { pageMembre: "/espace-membre" }
addPropertyControls(Administration, { pageMembre: { type: ControlType.String, title: "Page membre", defaultValue: "/espace-membre" } })

const CHAMPS_PRODUCTEUR: Champ[] = [
    { k: "nom", t: "Nom (comme dans la liste des exposants)", type: "text", requis: true },
    { k: "specialites", t: "Spécialités", type: "text", place: "Cactées et succulentes, aloès…" },
    { k: "ville", t: "Ville", type: "text" },
    { k: "departement", t: "Département (n°)", type: "text", place: "29" },
    { k: "presentation", t: "Présentation", type: "textarea" },
    { k: "site_web", t: "Site web ou page Facebook", type: "text", place: "https://…" },
    { k: "photo_url", t: "Photo (stand ou plantes)", type: "fichier", dossier: "producteurs", accept: "image/*", taille: 1200 },
    { k: "visible", t: "Fiche visible sur le site", type: "bool" },
]
const CHAMPS_LIVRE: Champ[] = [
    { k: "titre", t: "Titre", type: "text", requis: true },
    { k: "auteurs", t: "Auteur(s)", type: "text" },
    { k: "editeur", t: "Éditeur", type: "text" },
    { k: "annee", t: "Année", type: "number" },
    { k: "pages", t: "Nombre de pages", type: "number" },
    { k: "langue", t: "Langue", type: "text" },
    { k: "isbn", t: "ISBN", type: "text" },
    { k: "genres", t: "Genres et familles de plantes (mots-clés, séparés par des virgules)", type: "text", place: "Cactaceae, Mammillaria" },
    { k: "favori", t: "Favori (affiché d’emblée, 4 au plus)", type: "bool" },
    { k: "caracteristiques", t: "Caractéristiques", type: "textarea", place: "Format, illustrations, niveau…" },
    { k: "avis", t: "Pourquoi on le recommande", type: "textarea" },
    { k: "couverture_url", t: "Couverture (photo)", type: "fichier", dossier: "livres", accept: "image/*", taille: 500 },
    { k: "ordre", t: "Ordre d’affichage", type: "number" },
]

const CHAMPS_ARTICLE: Champ[] = [
    { k: "titre", t: "Titre", type: "text", requis: true },
    { k: "source", t: "Repère (au-dessus du titre)", type: "text", place: "N°4 · Septembre 2026 · p. 6" },
    { k: "chapo", t: "Chapeau (résumé affiché sur la carte)", type: "textarea" },
    { k: "photo_url", t: "Photo principale", type: "fichier", dossier: "articles", accept: "image/*", taille: 1600 },
    { k: "corps", t: "Texte de l’article", type: "textarea", place: "Une ligne vide entre les paragraphes.\n## Un intertitre\n- une puce\n**en gras**\n[photo 2]" },
    { k: "photo2_url", t: "Photo 2 (placée là où vous écrivez [photo 2])", type: "fichier", dossier: "articles", accept: "image/*", taille: 1600 },
    { k: "legende2", t: "Légende de la photo 2", type: "text" },
    { k: "photo3_url", t: "Photo 3 (placée là où vous écrivez [photo 3])", type: "fichier", dossier: "articles", accept: "image/*", taille: 1600 },
    { k: "legende3", t: "Légende de la photo 3", type: "text" },
    { k: "ordre", t: "Ordre d’affichage", type: "number" },
    { k: "publie", t: "Publié sur le site", type: "bool" },
]

// Onglet « Cultiver » : articles (sur le modèle des guides) et bibliothèque
function CultiverAdmin({ sous }: { sous: "articles" | "livres" }) {
    return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        {sous === "articles" ? <>
            <Aide>Les articles s’ajoutent sous les guides de la page Cultiver, avec la même présentation, et s’ouvrent sur une page à eux. Mise en forme du texte : une ligne vide entre les paragraphes, « ## » en début de ligne pour un intertitre, « - » pour une puce, **mots** pour du gras, et [photo 2] ou [photo 3] seuls sur une ligne pour placer les photos supplémentaires. Cochez « Publié » quand l’article est prêt.</Aide>
            <Editeur table="articles" ordre="ordre" titre="Articles" champs={CHAMPS_ARTICLE} nouveau={(l) => ({ ordre: (l.length + 1) * 10, publie: false })} resume={(r) => `${r.titre}${r.publie ? "" : " (brouillon)"}`} />
        </> : <>
            <Aide>La bibliothèque est en bas de la page Cultiver, visible de tous. Les 4 livres cochés « Favori » s’affichent d’emblée ; les autres apparaissent avec « Voir toute la bibliothèque », où l’on peut filtrer par plante. Mots-clés : uniquement des genres ou familles de plantes (Cactaceae, Lithops…). Photographiez la couverture : elle est réduite automatiquement.</Aide>
            <Editeur table="livres" ordre="ordre" titre="Livres" champs={CHAMPS_LIVRE} nouveau={(l) => ({ ordre: (l.length + 1) * 10, langue: "Français", favori: false })} resume={(r) => `${r.favori ? "★ " : ""}${r.titre}${r.auteurs ? " · " + r.auteurs : ""}`} />
        </>}
    </div>
}

// Page Adhésion : la campagne la plus récente dont la date d’ouverture est passée s’affiche (année, tarif, bouton)
const CHAMPS_CAMPAGNE_ADH: Champ[] = [
    { k: "annee", t: "Année d’adhésion", type: "number", requis: true },
    { k: "ouverture", t: "Affichée sur le site à partir du", type: "date", requis: true },
    { k: "tarif", t: "Cotisation (€)", type: "number", requis: true },
    { k: "lien", t: "Lien de paiement AssoConnect de cette campagne", type: "text", place: "https://www.armorique-cactus-succulentes.com/collect/…" },
    { k: "message", t: "Message en tête des formules (facultatif)", type: "textarea" },
]
const CHAMPS_PROD: Champ[] = [
    { k: "nom", t: "Nom de l’article", type: "text", requis: true, place: "Tee-shirt ACS" },
    { k: "categorie", t: "Catégorie", type: "text", place: "Tee-shirts, Substrats, Engrais…" },
    { k: "prix", t: "Prix (€, le plus bas s’il y a plusieurs formats)", type: "number", requis: true },
    { k: "variantes", t: "Formats ou tailles, un par ligne : nom ; prix (facultatif)", type: "textarea", place: "Petites 8,5 × 1,2 cm ; 5\nGrandes 10 × 2 cm ; 6,50" },
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
const CIBLES: [string, string][] = [["tous", "Tous les adhérents"], ["a_jour", "Adhérents à jour de cotisation"], ["retard", "Cotisation à renouveler"], ["bureau", "Membres du bureau"], ["benevoles", "Salon : bénévoles inscrits aux tâches"], ["non_benevoles", "Salon : adhérents pas encore inscrits aux tâches"], ["exposants", "Salon : exposants acceptés"], ["exposants_tous", "Salon : tous les exposants (sauf refusés et annulés)"], ["evenement", "Inscrits à un événement"], ["choix", "Choisir les personnes une à une"]]
const CIBLES_SALON = ["benevoles", "non_benevoles", "exposants", "exposants_tous"]
const CIBLES_ESPACE = ["tous", "a_jour", "retard"]   // seules ces campagnes peuvent être copiées dans « Messages »

// ---------- Rappels : bandeau en haut de l’administration, visible tant que ce n’est pas fait ----------
const CHAMPS_RAPPEL: Champ[] = [
    { k: "titre", t: "Rappel", type: "text", requis: true },
    { k: "details", t: "Ce qu’il faut faire", type: "textarea" },
    { k: "echeance", t: "Échéance", type: "date" },
    { k: "a_partir_du", t: "Afficher en haut de l’administration à partir du", type: "date", requis: true },
    { k: "chaque_annee", t: "Revient chaque année (recréé automatiquement un an plus tard)", type: "bool" },
    { k: "fait", t: "Fait", type: "bool" },
]
const plusUnAn = (d?: string | null) => { if (!d) return d; const [a, m, j] = d.split("-").map(Number); return `${a + 1}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}` }
function RappelsEnCours() {
    const client = sb()!
    const [l, setL] = React.useState<any[]>([])
    const charger = React.useCallback(() => {
        const auj = new Date().toISOString().slice(0, 10)
        client.from("rappels_admin").select("*").eq("fait", false).lte("a_partir_du", auj).order("echeance").then(({ data }: any) => setL(data ?? []))
    }, [])
    React.useEffect(() => { charger() }, [charger])
    const fait = async (r: any) => {
        if (!window.confirm(`Marquer comme fait : « ${r.titre} » ?`)) return
        await client.from("rappels_admin").update({ fait: true, fait_le: new Date().toISOString() }).eq("id", r.id)
        if (r.chaque_annee) await client.from("rappels_admin").insert({ titre: r.titre, details: r.details, echeance: plusUnAn(r.echeance), a_partir_du: plusUnAn(r.a_partir_du), chaque_annee: true })
        charger()
    }
    if (!l.length) return null
    return (
        <div style={{ display: "grid", gap: 10 }}>
            {l.map((r) => (
                <div key={r.id} style={{ border: `2px solid #d9a441`, background: "rgba(217,164,65,0.12)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#f3c86b" }}>À faire{r.echeance ? ` avant le ${dateFr(r.echeance)}` : ""} : {r.titre}</div>
                        {r.details && <div style={{ fontSize: 14, color: C.txt, marginTop: 4, lineHeight: 1.55 }}>{String(r.details).split(/((?:https?:\/\/|mailto:)\S+)/).map((x: string, i: number) => /^(https?:\/\/|mailto:)/.test(x) ? <a key={i} href={x} target={x.startsWith("mailto:") ? undefined : "_blank"} rel="noopener" style={{ color: "#f3c86b", fontWeight: 600 }}>{x.startsWith("mailto:") ? "écrire l’e-mail (déjà rédigé)" : /\.pdf($|\?)/i.test(x) ? "voir le justificatif (PDF)" : /mail\.google\.com/.test(x) ? "ouvrir l’e-mail" : "ouvrir le lien"}</a> : x)}</div>}
                    </div>
                    <button style={btn()} onClick={() => fait(r)}>C’est fait</button>
                </div>
            ))}
        </div>
    )
}

// ---------- Galerie ----------
// Gestion des photos : on coche des miniatures, puis on les range (catégorie, album), on les légende ou on les supprime.
// L'étoile choisit la couverture de la catégorie sur l'accueil (la seule photo publique).
function GestionPhotos({ rev, changer }: { rev: number; changer: () => void }) {
    const client = sb()!
    const [photos, setPhotos] = React.useState<any[] | null>(null)
    const [cat, setCat] = React.useState<string>("")
    const [serie, setSerie] = React.useState<string>("")
    const [sel, setSel] = React.useState<Set<string>>(new Set())
    const [versCat, setVersCat] = React.useState("")
    const [versAlbum, setVersAlbum] = React.useState("")
    const [legende, setLegende] = React.useState("")
    const [msg, setMsg] = React.useState<{ t: string; err: boolean } | null>(null)
    const [voir, setVoir] = React.useState<number | null>(null)
    React.useEffect(() => { client.from("photos").select("*").order("ordre").order("cree_le", { ascending: false }).then(({ data, error }: any) => { if (error) setMsg({ t: error.message, err: true }); setPhotos(data ?? []) }) }, [rev])
    if (!photos) return <div style={box}><p style={muted}>Chargement…</p></div>
    const albumsDe = (c?: string) => Array.from(new Set(photos.filter((p) => !c || GALERIE.categorie(p.album) === c).map((p) => p.serie).filter(Boolean))).sort((a: any, b: any) => a.localeCompare(b, "fr")) as string[]
    const liste = photos.filter((p) => (!cat || GALERIE.categorie(p.album) === cat) && (!serie || (serie === "—" ? !p.serie : p.serie === serie)))
    const choisis = photos.filter((p) => sel.has(p.id))
    const basculer = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
    const fin = (t: string) => { setMsg({ t, err: false }); setSel(new Set()); setVersCat(""); setVersAlbum(""); setLegende(""); changer() }
    const maj = async (champs: any, t: string) => {
        const { error } = await client.from("photos").update(champs).in("id", [...sel])
        if (error) return setMsg({ t: error.message, err: true })
        fin(t)
    }
    const ranger = async () => {
        const champs: any = {}
        if (versCat) champs.album = versCat
        if (versAlbum.trim()) champs.serie = versAlbum.trim()
        if (!Object.keys(champs).length) return setMsg({ t: "Choisissez une catégorie et/ou un album.", err: true })
        // une photo qui change de catégorie perd son statut de couverture
        if (versCat) champs.accueil = false
        await maj(champs, `${sel.size} photo${sel.size > 1 ? "s" : ""} rangée${sel.size > 1 ? "s" : ""}${versCat ? ` dans « ${versCat} »` : ""}${versAlbum.trim() ? `, album « ${versAlbum.trim()} »` : ""}.`)
        setVersAlbum("")
    }
    const sansAlbum = () => maj({ serie: null }, "Retirées de leur album.")
    const legender = () => maj({ legende: legende.trim() || null }, legende.trim() ? "Légende ajoutée." : "Légende effacée.")
    const supprimer = async () => {
        if (!window.confirm(`Supprimer définitivement ${sel.size} photo${sel.size > 1 ? "s" : ""} ?`)) return
        const { error } = await client.from("photos").delete().in("id", [...sel])
        if (error) return setMsg({ t: error.message, err: true })
        const chemins = choisis.flatMap((r) => [r.image_url, r.vignette_url]).filter((u: any) => typeof u === "string" && u.includes("/object/public/semestriels/")).map((u: string) => decodeURIComponent(u.split("/object/public/semestriels/")[1].split("?")[0]))
        if (chemins.length) await client.storage.from("semestriels").remove(chemins)
        fin("Photos supprimées.")
    }
    const couverture = async (p: any) => {
        const c = GALERIE.categorie(p.album)
        const autres = photos.filter((x) => GALERIE.categorie(x.album) === c && x.id !== p.id && x.accueil).map((x) => x.id)
        if (autres.length) await client.from("photos").update({ accueil: false }).in("id", autres)
        const { error } = await client.from("photos").update({ accueil: true, ordre: 1 }).eq("id", p.id)
        if (error) return setMsg({ t: error.message, err: true })
        fin(`Nouvelle couverture de « ${c} » sur l’accueil.`)
    }
    const puce = (a: boolean): React.CSSProperties => ({ ...small(), padding: "7px 12px", background: a ? C.accent : "transparent", color: a ? C.accentDark : C.txt, borderColor: a ? C.accent : C.line, fontWeight: 600 })
    const albumsVisibles = albumsDe(cat || undefined)
    const tousCoches = liste.length > 0 && liste.every((p) => sel.has(p.id))
    return (
        <div style={box}>
            <h2 style={h2}>Ranger les photos</h2>
            <p style={{ ...muted, fontSize: 14, marginBottom: 14 }}><b style={{ color: C.txt }}>Cochez</b> des photos (un clic sur la miniature), puis rangez-les en une fois dans une catégorie et un album. L’<b style={{ color: C.txt }}>étoile ☆</b> choisit la couverture de la catégorie sur l’accueil : c’est la seule photo que voit le public.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button style={puce(!cat)} onClick={() => { setCat(""); setSerie("") }}>Toutes ({photos.length})</button>
                {GALERIE.CATEGORIES.map((c) => { const n = photos.filter((p) => GALERIE.categorie(p.album) === c).length; return <button key={c} style={puce(cat === c)} onClick={() => { setCat(c); setSerie("") }}>{c} <span style={{ fontWeight: 400, opacity: 0.75 }}>({n}){n && !photos.some((p) => GALERIE.categorie(p.album) === c && p.accueil) ? " · sans couverture" : ""}</span></button> })}
            </div>
            {albumsVisibles.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.mute, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4 }}>Albums</span>
                    <button style={{ ...puce(!serie), fontWeight: 400 }} onClick={() => setSerie("")}>Tous</button>
                    {albumsVisibles.map((a) => <button key={a} style={{ ...puce(serie === a), fontWeight: 400 }} onClick={() => setSerie(a)}>{a} ({photos.filter((p) => p.serie === a).length})</button>)}
                    <button style={{ ...puce(serie === "—"), fontWeight: 400 }} onClick={() => setSerie("—")}>Sans album</button>
                </div>
            )}

            {/* barre d'actions, visible dès qu'une photo est cochée */}
            <div style={{ position: "sticky", top: 8, zIndex: 3, marginTop: 14, padding: "12px 14px", background: sel.size ? "#33402c" : C.bg, border: `1px solid ${sel.size ? C.accent : C.line}` }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <b style={{ fontWeight: 600 }}>{sel.size ? `${sel.size} photo${sel.size > 1 ? "s" : ""} cochée${sel.size > 1 ? "s" : ""}` : "Aucune photo cochée"}</b>
                    <button style={small()} onClick={() => setSel(tousCoches ? new Set() : new Set(liste.map((p) => p.id)))}>{tousCoches ? "Tout décocher" : `Tout cocher (${liste.length})`}</button>
                    {sel.size > 0 && <button style={small()} onClick={() => setSel(new Set())}>Annuler</button>}
                </div>
                {sel.size > 0 && <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 12, alignItems: "end" }}>
                        <div><span style={label}>Catégorie</span><select style={{ ...input, padding: "9px 11px" }} value={versCat} onChange={(e) => setVersCat(e.target.value)}><option value="">(ne pas changer)</option>{GALERIE.CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><span style={label}>Album</span><input style={{ ...input, padding: "9px 11px" }} list="acs-series" value={versAlbum} onChange={(e) => setVersAlbum(e.target.value)} placeholder="Ex. Salon des Plantes · juin 2026" /><datalist id="acs-series">{albumsDe(versCat || undefined).map((a) => <option key={a} value={a} />)}</datalist></div>
                        <button style={{ ...btn(), padding: "10px 16px" }} onClick={ranger}>Ranger</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10, alignItems: "end" }}>
                        <div><span style={label}>Légende</span><input style={{ ...input, padding: "9px 11px" }} value={legende} onChange={(e) => setLegende(e.target.value)} placeholder="Ex. Aloe polyphylla" /></div>
                        <button style={small()} onClick={legender}>Mettre cette légende</button>
                        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={small()} onClick={sansAlbum}>Sortir de l’album</button>
                            <button style={small(true)} onClick={supprimer}>Supprimer</button>
                        </span>
                    </div>
                </>}
                {msg && <Msg text={msg.t} err={msg.err} />}
            </div>

            {liste.length === 0 ? <p style={{ ...muted, marginTop: 14 }}>Aucune photo ici.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 14 }}>
                    {liste.map((p, i) => {
                        const coche = sel.has(p.id)
                        return (
                            <div key={p.id} style={{ position: "relative", outline: coche ? `3px solid ${C.accent}` : p.accueil ? `2px solid #f3c86b` : "none", outlineOffset: -3, background: "#2e241e" }}>
                                <button onClick={() => basculer(p.id)} title={coche ? "Décocher" : "Cocher"} style={{ display: "block", width: "100%", height: 120, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
                                    <img src={p.vignette_url || p.image_url} alt={p.legende || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: coche ? 0.75 : 1 }} />
                                </button>
                                <span style={{ position: "absolute", top: 6, left: 6, width: 22, height: 22, border: `2px solid ${coche ? C.accent : "#fff"}`, background: coche ? C.accent : "rgba(0,0,0,0.35)", color: C.accentDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, pointerEvents: "none" }}>{coche ? "✓" : ""}</span>
                                <button onClick={() => !p.accueil && couverture(p)} title={p.accueil ? "Couverture de la catégorie sur l’accueil" : "Choisir comme couverture sur l’accueil"} style={{ position: "absolute", top: 4, right: 4, border: "none", background: p.accueil ? "#f3c86b" : "rgba(0,0,0,0.45)", color: p.accueil ? "#1d1612" : "#fff", width: 28, height: 28, fontSize: 16, cursor: p.accueil ? "default" : "pointer", lineHeight: 1 }}>{p.accueil ? "★" : "☆"}</button>
                                <button onClick={() => setVoir(i)} title="Agrandir" style={{ position: "absolute", bottom: 30, right: 4, border: "none", background: "rgba(0,0,0,0.45)", color: "#fff", width: 26, height: 26, cursor: "zoom-in", fontSize: 13 }}>⤢</button>
                                <div style={{ padding: "5px 7px", fontSize: 11.5, lineHeight: 1.3, color: C.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={[GALERIE.categorie(p.album), p.serie, p.legende].filter(Boolean).join(" · ")}>{p.serie || <i>sans album</i>}{!cat ? ` · ${GALERIE.categorie(p.album)}` : ""}</div>
                            </div>
                        )
                    })}
                </div>
            )}
            {voir != null && <GALERIE.Diaporama photos={liste.map((p) => ({ ...p, album: [GALERIE.categorie(p.album), p.serie].filter(Boolean).join(" · ") }))} index={voir} fermer={() => setVoir(null)} />}
        </div>
    )
}

// Réglage d'accès d'une page du site : réservée aux adhérents ou ouverte à tous
function AccesPage({ page, nom, reservee = "Réservée aux adhérents" }: { page: string; nom: string; reservee?: string }) {
    const client = sb()!
    const [reserve, setReserve] = React.useState<boolean | null>(null)
    const [msg, setMsg] = React.useState("")
    React.useEffect(() => { client.from("pages_acces").select("reserve").eq("page", page).maybeSingle().then(({ data, error }: any) => { if (error) setMsg(/pages_acces|schema cache|exist/i.test(error.message) ? "Réglage disponible après la mise à jour de la base." : error.message); setReserve(data ? data.reserve !== false : true) }) }, [])
    const changer = async (v: boolean) => { setReserve(v); const { error } = await client.from("pages_acces").upsert({ page, reserve: v }); setMsg(error ? error.message : v ? `La page ${nom} est réservée aux adhérents.` : `La page ${nom} est ouverte à tous.`) }
    if (reserve === null) return null
    return (
        <div style={{ ...box, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 18px" }}>
            <b style={{ fontWeight: 600 }}>Page {nom} du site :</b>
            <span style={{ display: "inline-flex", border: `1px solid ${C.line}` }}>
                {([[true, reservee], [false, "Ouverte à tous"]] as const).map(([v, t]) => <button key={t} onClick={() => changer(v)} style={{ ...small(), border: "none", padding: "8px 14px", fontWeight: 600, background: reserve === v ? C.accent : "transparent", color: reserve === v ? C.accentDark : C.txt }}>{t}</button>)}
            </span>
            {msg && <span style={{ fontSize: 13, color: C.mute }}>{msg}</span>}
        </div>
    )
}

function GalerieAdmin() {
    const client = sb()!
    const [rev, setRev] = React.useState(0)
    const [album, setAlbum] = React.useState("")
    const [serieEnvoi, setSerieEnvoi] = React.useState("")
    const [series, setSeries] = React.useState<string[]>([])
    React.useEffect(() => { client.from("photos").select("serie").then(({ data }: any) => setSeries(Array.from(new Set((data ?? []).map((r: any) => r.serie).filter(Boolean))) as string[])) }, [rev])
    const [etat, setEtat] = React.useState<{ t: string; err: boolean } | null>(null)
    const envoyer = async (fichiers: FileList | null) => {
        if (!fichiers || !fichiers.length) return
        if (!album) return setEtat({ t: "Choisissez d’abord la catégorie.", err: true })
        const liste = Array.from(fichiers).filter((f) => f.type.startsWith("image/"))
        let ok = 0
        for (const [n, f] of liste.entries()) {
            setEtat({ t: `Envoi ${n + 1} / ${liste.length}…`, err: false })
            try {
                const blob = await GALERIE.reduireImage(f)
                const nom = `galerie/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
                const up = await client.storage.from("semestriels").upload(nom, blob, { contentType: "image/jpeg", upsert: false })
                if (up.error) throw up.error
                const url = client.storage.from("semestriels").getPublicUrl(nom).data.publicUrl
                // petite version (800 px) pour les vignettes : la grande ne se charge qu’à l’agrandissement
                const nomV = nom.replace(/\.jpg$/, "-v.jpg")
                const upV = await client.storage.from("semestriels").upload(nomV, await GALERIE.reduireImage(f, 800, 0.8), { contentType: "image/jpeg", upsert: false })
                const vignette = upV.error ? null : client.storage.from("semestriels").getPublicUrl(nomV).data.publicUrl
                const legende = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/^(img|dsc|pxl|photo)\s*\d.*$/i, "").trim() || null
                const ins = await client.from("photos").insert({ image_url: url, vignette_url: vignette, legende, album, serie: serieEnvoi.trim() || null, accueil: false, ordre: 100 })
                if (ins.error) throw ins.error
                ok++
            } catch (e) { setEtat({ t: `Échec pour ${f.name} : ${String((e as any).message || e)}`, err: true }); return }
        }
        setEtat({ t: `${ok} photo${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""} dans « ${album}${serieEnvoi.trim() ? " · " + serieEnvoi.trim() : ""} ». Pour un nouvel envoi, choisissez à nouveau la catégorie.`, err: false })
        // on repart de zéro : impossible d'envoyer le lot suivant dans la mauvaise catégorie par oubli
        setAlbum(""); setSerieEnvoi("")
        setRev((x) => x + 1)
    }
    return (
        <>
            <Aide>Envoyez les photos avec leur catégorie (et un album si vous voulez), elles sont réduites automatiquement et réservées aux adhérents. Ensuite, dans « Ranger les photos », cochez-en plusieurs pour les déplacer d’un coup, et cliquez sur l’étoile ☆ de la photo qui sera la couverture publique de sa catégorie sur l’accueil.</Aide>
            <div style={box}>
                <h2 style={h2}>Ajouter des photos</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 8 }}>
                    <label style={{ display: "block" }}>
                        <span style={label}>Catégorie</span>
                        <select style={{ ...input, borderColor: album ? C.line : C.accent }} value={album} onChange={(e) => { setAlbum(e.target.value); setEtat(null) }}><option value="">— Choisir la catégorie —</option>{GALERIE.CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    </label>
                    <label style={{ display: "block" }}>
                        <span style={label}>Album (facultatif)</span>
                        <input style={input} list="acs-series-envoi" value={serieEnvoi} onChange={(e) => setSerieEnvoi(e.target.value)} placeholder="Ex. Salon des Plantes · juin 2026" />
                        <datalist id="acs-series-envoi">{series.map((a) => <option key={a} value={a} />)}</datalist>
                    </label>
                </div>
                <label style={{ ...btn(), display: "inline-block", marginTop: 16, cursor: album ? "pointer" : "not-allowed", opacity: album ? 1 : 0.45 }}>
                    Choisir des photos…
                    <input type="file" accept="image/*" multiple disabled={!album} style={{ display: "none" }} onChange={(e) => { envoyer(e.target.files); e.target.value = "" }} />
                </label>
                {etat && <div><Msg text={etat.t} err={etat.err} /></div>}
            </div>
            <GestionPhotos rev={rev} changer={() => setRev((x) => x + 1)} />
        </>
    )
}

// ---------- Contrôle des billets à l'entrée ----------
function ControleBillets() {
    const client = sb()
    const depuisUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("billet") || "" : ""
    const [code, setCode] = React.useState(depuisUrl)
    const [res, setRes] = React.useState<any>(null)
    const [occupe, setOccupe] = React.useState(false)
    const [camera, setCamera] = React.useState(false)
    const video = React.useRef<HTMLVideoElement>(null)
    const flux = React.useRef<MediaStream | null>(null)
    const scanPossible = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices
    const verifier = async (c: string, valider = false) => {
        const m = c.toUpperCase().match(CODE_BILLET)
        if (!m) { setRes({ etat: "format" }); return }
        setOccupe(true)
        const { data, error } = await client.rpc("controler_billet", { code: m[0], valider })
        setOccupe(false)
        setRes(error || !data ? { etat: "erreur", message: error?.message || "Pas de réponse : la base n’est peut-être pas à jour." } : { ...data, valide: valider && data.etat === "ok" })
        setCode(m[0])
    }
    React.useEffect(() => { if (depuisUrl) verifier(depuisUrl) }, [])
    const arreter = () => { flux.current?.getTracks().forEach((t) => t.stop()); flux.current = null; setCamera(false) }
    React.useEffect(() => () => arreter(), [])
    const scanner = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            flux.current = s; setCamera(true)
            await new Promise((r) => setTimeout(r, 50))
            if (!video.current) return
            video.current.srcObject = s; await video.current.play()
            const det = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
            const boucle = async () => {
                if (!flux.current || !video.current) return
                try { const t = await det.detect(video.current); const v = t.map((x: any) => x.rawValue).find((x: string) => CODE_BILLET.test(x)); if (v) { arreter(); verifier(v); return } } catch (e) {}
                requestAnimationFrame(boucle)
            }
            boucle()
        } catch (e) { setCamera(false); setRes({ etat: "erreur", message: "Caméra indisponible : saisissez le numéro du billet." }) }
    }
    const couleur = !res ? C.line : res.etat === "ok" ? C.accent : res.etat === "deja" ? "#d8a24a" : "#c8664f"
    const titre: Record<string, string> = {
        ok: res?.valide ? "Entrée validée" : "Billet valide", deja: "Billet déjà utilisé", annule: "Inscription annulée",
        inconnu: "Billet inconnu", format: "Numéro incomplet", refuse: "Réservé aux administrateurs", erreur: "Erreur",
    }
    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <Aide>À l’entrée, scannez le QR code du billet (sur téléphone ou papier) ou tapez son numéro, puis validez l’entrée. Un billet ne peut être validé qu’une fois. Vous pouvez aussi scanner le QR code avec l’appareil photo du téléphone : il ouvre directement cette page.</Aide>
            <div style={box}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <label style={{ flex: "1 1 220px" }}><span style={label}>Numéro du billet</span>
                        <input style={{ ...input, fontFamily: "monospace", fontSize: 18, letterSpacing: 1.5, textTransform: "uppercase" }} value={code} placeholder="ACS-XXXX-XXXX" onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") verifier(code) }} />
                    </label>
                    <button style={btn()} onClick={() => verifier(code)} disabled={occupe}>Vérifier</button>
                    {scanPossible && !camera && <button style={small()} onClick={scanner}>Scanner avec la caméra</button>}
                    {camera && <button style={small(true)} onClick={arreter}>Arrêter la caméra</button>}
                </div>
                {camera && <video ref={video} playsInline muted style={{ width: "100%", maxWidth: 420, marginTop: 14, display: "block", background: "#000" }} />}
            </div>
            {res && (
                <div style={{ ...box, borderColor: couleur, borderWidth: 2 }}>
                    <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: couleur }}>{titre[res.etat] || res.etat}</div>
                    {res.message && <p style={muted}>{res.message}</p>}
                    {res.nom && (
                        <div style={{ marginTop: 10, lineHeight: 1.7 }}>
                            <div style={{ fontSize: 20 }}><strong>{res.nom}</strong> · {res.personnes || 1} personne{(res.personnes || 1) > 1 ? "s" : ""}</div>
                            <div style={muted}>{res.evenement}{res.date ? " · " + res.date : ""}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 15, marginTop: 4 }}>{res.billet}</div>
                            {res.montant > 0 && <div style={{ marginTop: 6, color: res.statut === "en_attente" ? "#d8a24a" : C.accent }}>{euros(res.montant)} · {res.statut === "en_attente" ? "à régler sur place" : "réglé"}</div>}
                            {res.etat === "deja" && res.scanne_le && <div style={{ marginTop: 6 }}>Entré le {dateFr(res.scanne_le, true)}</div>}
                        </div>
                    )}
                    {res.etat === "ok" && !res.valide && <button style={{ ...btn(), marginTop: 14 }} onClick={() => verifier(res.billet, true)} disabled={occupe}>Valider l’entrée</button>}
                    {res.etat === "ok" && res.statut === "en_attente" && !res.valide && <p style={{ ...muted, fontSize: 13, marginTop: 8 }}>Pensez à encaisser puis à marquer l’inscription « réglée » dans l’agenda.</p>}
                    {(res.valide || res.etat !== "ok") && <button style={{ ...small(), marginTop: 14 }} onClick={() => { setRes(null); setCode(""); if (scanPossible) scanner() }}>Billet suivant</button>}
                </div>
            )}
        </div>
    )
}

// ---------- Sauvegarde complète (classeur Excel, une feuille par table) ----------
const TABLES_SAUVEGARDE: [string, string][] = [["adherents", "nom"], ["adhesions", "cree_le"], ["inscriptions", "cree_le"], ["dons", "le"], ["evenements", "date_debut"], ["ecritures", "le"], ["produits", "ordre"], ["campagnes", "cree_le"], ["messages", "envoye_le"], ["sondages", "cree_le"], ["reponses", "cree_le"], ["photos", "ordre"], ["semestriels", "numero"]]
function Sauvegarde() {
    const [derniere, setDerniere] = React.useState<string | null>(null)
    const [etat, setEtat] = React.useState("")
    React.useEffect(() => { try { setDerniere(localStorage.getItem("acs-derniere-sauvegarde")) } catch (e) {} }, [])
    const jours = derniere ? Math.floor((Date.now() - new Date(derniere).getTime()) / 86400000) : null
    const enRetard = jours == null || jours > 35
    const telecharger = async () => {
        setEtat("Préparation…")
        try {
            const wb = XLSX.utils.book_new()
            for (const [t, ordre] of TABLES_SAUVEGARDE) {
                let lignes: any[] = []
                for (let k = 0; ; k += 1000) {
                    const { data, error } = await sb().from(t).select("*").order(ordre, { ascending: true, nullsFirst: true }).range(k, k + 999)
                    if (error) throw new Error(`${t} : ${error.message}`)
                    lignes = lignes.concat(data ?? [])
                    if (!data || data.length < 1000) break
                }
                const plat = lignes.map((r) => Object.fromEntries(Object.entries(r).map(([c, v]) => [c, v != null && typeof v === "object" ? JSON.stringify(v) : v])))
                XLSX.utils.book_append_sheet(wb, plat.length ? XLSX.utils.json_to_sheet(plat) : XLSX.utils.aoa_to_sheet([["(vide)"]]), t.slice(0, 31))
            }
            const d = new Date(); const j = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            XLSX.writeFile(wb, `sauvegarde-acs-${j}.xlsx`)
            try { localStorage.setItem("acs-derniere-sauvegarde", d.toISOString()) } catch (e) {}
            setDerniere(d.toISOString()); setEtat("")
        } catch (e) { setEtat("Échec : " + String((e as Error).message || e)) }
    }
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", border: `1px solid ${enRetard ? C.accent : C.line}`, background: enRetard ? "rgba(155,189,138,0.08)" : "transparent", fontSize: 14 }}>
            <span style={{ color: enRetard ? C.txt : C.mute }}>{etat || (derniere ? `Dernière sauvegarde depuis cet appareil : ${dateFr(derniere)}${enRetard ? " — pensez à en refaire une (une fois par mois)." : "."}` : "Aucune sauvegarde depuis cet appareil. Téléchargez-en une chaque mois et rangez-la dans un dossier du bureau.")}</span>
            <button style={small()} onClick={telecharger}>Télécharger une sauvegarde complète (Excel)</button>
        </div>
    )
}

// ---------- Adhérents ----------
function AdherentsAdmin({ moi, sous }: { moi: string; sous: "fichier" | "acces" }) {
    const annee = new Date().getFullYear()
    const [cle, setCle] = React.useState(0)
    if (sous === "acces") return <>
        <Aide>Les administrateurs ont accès à toute cette administration. Chaque adhérent se connecte à l’espace membre avec un code personnel reçu par e-mail.</Aide>
        <Administrateurs moi={moi} changer={() => setCle((x) => x + 1)} />
        <CodesConnexion moi={moi} />
    </>
    return <>
        <Aide>Seules les adresses de cette liste peuvent se connecter. Pour le bureau, remplissez « Fonction au bureau » : la personne apparaît alors dans les contacts du bureau.</Aide>
        <ImportAdherents />
        <Editeur key={cle} table="adherents" ordre="nom" titre="Adhérents" champs={CHAMPS_ADH} avant={localiserAdherent} resume={(r) => `${[r.prenom, r.nom].filter(Boolean).join(" ") || "—"} · ${r.email}${r.fonction_bureau ? " · " + r.fonction_bureau : ""}${r.role === "admin" ? " · admin" : ""}${r.cotisation_annee && r.cotisation_annee < annee ? " · cotisation " + r.cotisation_annee : ""}${r.actif ? "" : " (désactivé)"}`} />
    </>
}

function Administrateurs({ moi, changer }: { moi: string; changer: () => void }) {
    const client = sb()
    const [tous, setTous] = React.useState<any[]>([])
    const [choix, setChoix] = React.useState("")
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const charger = React.useCallback(async () => {
        const { data } = await client.from("adherents").select("id,email,prenom,nom,role,actif").order("nom")
        setTous(data ?? [])
    }, [])
    React.useEffect(() => { charger() }, [charger])
    const admins = tous.filter((a) => a.role === "admin")
    const nom = (a: any) => [a.prenom, a.nom].filter(Boolean).join(" ") || a.email
    const definir = async (a: any, role: "admin" | "membre") => {
        if (role === "membre") {
            if (a.email === moi) return setMsg({ t: "Vous ne pouvez pas retirer vos propres droits : demandez à un autre administrateur.", err: true })
            if (admins.length <= 1) return setMsg({ t: "Il faut garder au moins un administrateur.", err: true })
            if (!window.confirm(`Retirer les droits d’administration de ${nom(a)} ?`)) return
        }
        const { error } = await client.from("adherents").update({ role }).eq("id", a.id)
        if (error) return setMsg({ t: error.message, err: true })
        setMsg({ t: role === "admin" ? `${nom(a)} est maintenant administrateur.` : `${nom(a)} n’est plus administrateur.`, err: false })
        setChoix(""); await charger(); changer()
    }
    return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>Administrateurs <span style={{ color: C.mute, fontWeight: 400 }}>({admins.length})</span></h3>
            <p style={{ ...muted, fontSize: 14, marginBottom: 12 }}>Ils ont accès à cette administration : agenda, adhérents, comptabilité, boutique et envoi d’e-mails.</p>
            {admins.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
                    <span style={{ minWidth: 0 }}>{nom(a)} <span style={{ color: C.mute, fontSize: 13, wordBreak: "break-all" }}>· {a.email}{a.email === moi ? " (vous)" : ""}</span></span>
                    {a.email !== moi && <button style={small(true)} onClick={() => definir(a, "membre")}>Retirer</button>}
                </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <select style={{ ...input, flex: "1 1 240px", width: "auto" }} value={choix} onChange={(e) => setChoix(e.target.value)}>
                    <option value="">Ajouter un administrateur…</option>
                    {tous.filter((a) => a.role !== "admin" && a.actif).map((a) => <option key={a.id} value={a.id}>{nom(a)}{a.prenom || a.nom ? ` (${a.email})` : ""}</option>)}
                </select>
                <button style={btn()} disabled={!choix} onClick={() => { const a = tous.find((x) => x.id === choix); if (a) definir(a, "admin") }}>Ajouter</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Import des exports AssoConnect (adhésions, contacts, dons) ----------
type Plan = { type: string; nouveauxAdh: any[]; maj: any[]; reactives: any[]; adhesions: any[]; dons: any[]; ignores: number }
const _em = (v: any) => String(v ?? "").trim().toLowerCase()
const _iso = (v: any) => { if (!v) return null; if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`; const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }
const _tel = (v: any) => { if (v == null || v === "") return null; let d = String(v).replace(/\D/g, ""); if (d.length === 9) d = "0" + d; if (d.startsWith("33") && d.length === 11) d = "0" + d.slice(2); return d.replace(/(\d{2})(?=\d)/g, "$1 ").trim() }
const _cp = (v: any) => (v == null || v === "" ? null : String(v).padStart(5, "0"))

function ImportAssoConnect() {
    const client = sb()
    const [plan, setPlan] = React.useState<Plan | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [occupe, setOccupe] = React.useState(false)
    const [ouvert, setOuvert] = React.useState(false)

    const analyser = async (f: File) => {
        setMsg({ t: "Lecture du fichier…", err: false }); setPlan(null)
        try {
            const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true })
            const lignes: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
            if (!lignes.length) return setMsg({ t: "Ce fichier ne contient aucune ligne (seulement les en-têtes). Vérifiez les filtres dans AssoConnect avant d’exporter.", err: true })
            const h = Object.keys(lignes[0])
            const type = h.includes("Id Transaction") ? "adhesions" : h.includes("Date d’adhésion la plus récente") ? "contacts" : h.includes("Montant donné") ? "dons" : ""
            if (!type) return setMsg({ t: "Export non reconnu. Utilisez l’export des adhésions, des contacts adhérents ou des donateurs d’AssoConnect.", err: true })
            const { data: adh } = await client.from("adherents").select("id,email,actif,prenom,nom,telephone,adresse,code_postal,ville")
            const parEmail = new Map<string, any>((adh ?? []).map((a: any) => [a.email, a]))
            const an = new Date().getFullYear()
            const p: Plan = { type, nouveauxAdh: [], maj: [], reactives: [], adhesions: [], dons: [], ignores: 0 }
            const contact = (r: any, actif: boolean) => {
                const email = _em(r["Email"]); if (!email) return null
                const c = { email, prenom: r["Prénom"] || null, nom: r["Nom"] || null, telephone: _tel(r["Téléphone mobile"]) || _tel(r["Téléphone fixe"]), adresse: [r["Adresse postale"], r["Complément d’adresse"]].filter(Boolean).join(", ") || null, code_postal: _cp(r["Code Postal"]), ville: r["Ville"] || null }
                const ex = parEmail.get(email)
                if (!ex) { if (!p.nouveauxAdh.some((x) => x.email === email)) p.nouveauxAdh.push({ ...c, actif, annuaire: actif }) }
                else {
                    const vide: any = {}
                    for (const k of ["prenom", "nom", "telephone", "adresse", "code_postal", "ville"]) if (!ex[k] && (c as any)[k]) vide[k] = (c as any)[k]
                    if (Object.keys(vide).length && !p.maj.some((x) => x.id === ex.id)) p.maj.push({ id: ex.id, ...vide })
                    if (actif && !ex.actif && !p.reactives.includes(ex.id)) p.reactives.push(ex.id)
                }
                return email
            }
            if (type === "adhesions") {
                const { data: exist } = await client.from("adhesions").select("email,annee,montant")
                const cle = new Set((exist ?? []).map((x: any) => `${x.email}|${x.annee}|${Number(x.montant)}`))
                for (const r of lignes) {
                    if (r["Statut du paiement"] !== "Paiement reçu") { p.ignores++; continue }
                    const col = String(r["Nom de la collecte d’adhésion associée"] || "")
                    const debut = _iso(r["Date de début d’adhésion"])
                    const annee = Number((col.match(/20\d\d/) || [])[0] || (debut || "").slice(0, 4))
                    const email = contact(r, annee >= an); if (!email || !annee) { p.ignores++; continue }
                    const montant = Number(r["Montant de l’opération"] || 0)
                    const k = `${email}|${annee}|${montant}`; if (cle.has(k)) continue; cle.add(k)
                    const moy = String(r["Moyen de paiement utilisé"] || "")
                    p.adhesions.push({ email, annee, montant, debut, fin: _iso(r["Date de fin d’adhésion"]), formule: /1\/2/.test(col) ? "Demi-année" : /bedee|salon/i.test(col) ? "Avec l’inscription au salon" : "Année complète", source: moy === "En ligne" ? "En ligne (AssoConnect)" : moy === "Carte bancaire (externe au logiciel)" ? "Carte bancaire" : moy || "AssoConnect", cree_le: (_iso(r["Date de l’opération"]) || debut || new Date().toISOString().slice(0, 10)) + "T12:00:00Z" })
                }
            } else if (type === "contacts") {
                for (const r of lignes) { const d = _iso(r["Date d’adhésion la plus récente"]); if (!contact(r, !!d && Number(d.slice(0, 4)) >= an)) p.ignores++ }
            } else {
                const { data: exist } = await client.from("dons").select("email,montant,le")
                const cle = new Set((exist ?? []).map((x: any) => `${x.email}|${Number(x.montant)}|${x.le}`))
                for (const r of lignes) {
                    const email = contact(r, false); if (!email) { p.ignores++; continue }
                    const der = _iso(r["Date du dernier don"]) || `${an}-01-01`, prem = _iso(r["Date du premier don"]) || der
                    const a26 = Number(r[`Montant donné sur ${an}`] || 0), a25 = Number(r[`Montant donné sur ${an - 1}`] || 0), reste = Math.round((Number(r["Montant donné"] || 0) - a26 - a25) * 100) / 100
                    const lignesDon: [number, string][] = []
                    if (a26) lignesDon.push([a26, der.startsWith(String(an)) ? der : `${an}-01-01`])
                    if (a25) lignesDon.push([a25, der.startsWith(String(an - 1)) ? der : prem.startsWith(String(an - 1)) ? prem : `${an - 1}-06-30`])
                    if (reste > 0) lignesDon.push([reste, Number(prem.slice(0, 4)) < an - 1 ? prem : `${an - 2}-12-31`])
                    for (const [montant, le] of lignesDon) { const k = `${email}|${montant}|${le}`; if (!cle.has(k)) { cle.add(k); p.dons.push({ email, montant, le }) } }
                }
            }
            setPlan(p); setMsg({ t: "", err: false })
        } catch (e) { setMsg({ t: "Lecture impossible : " + String((e as Error).message || e), err: true }) }
    }

    const importer = async () => {
        if (!plan) return
        setOccupe(true); setMsg({ t: "Import en cours…", err: false })
        try {
            for (const a of plan.nouveauxAdh) { if (a.ville) await localiserAdherent(a, {}) }
            const ops: any[] = []
            if (plan.nouveauxAdh.length) ops.push(client.from("adherents").upsert(plan.nouveauxAdh, { onConflict: "email", ignoreDuplicates: true }))
            for (const m of plan.maj) { const { id, ...v } = m; ops.push(client.from("adherents").update(v).eq("id", id)) }
            if (plan.reactives.length) ops.push(client.from("adherents").update({ actif: true, annuaire: true }).in("id", plan.reactives))
            for (const r of await Promise.all(ops)) if (r.error) throw r.error
            for (let k = 0; k < plan.adhesions.length; k += 200) { const { error } = await client.from("adhesions").insert(plan.adhesions.slice(k, k + 200)); if (error) throw error }
            if (plan.dons.length) { const { error } = await client.from("dons").insert(plan.dons); if (error) throw error }
            setMsg({ t: `Import terminé : ${plan.adhesions.length} adhésion(s), ${plan.dons.length} don(s), ${plan.nouveauxAdh.length} nouvelle(s) fiche(s), ${plan.maj.length} fiche(s) complétée(s), ${plan.reactives.length} réactivée(s). Rechargez la page pour voir les listes à jour.`, err: false })
            setPlan(null)
        } catch (e) { setMsg({ t: "Erreur pendant l’import : " + String((e as any).message || e), err: true }) }
        setOccupe(false)
    }

    if (!ouvert) return <div><button style={btn(false)} onClick={() => setOuvert(true)}>Importer un export AssoConnect</button></div>
    const rien = plan && !plan.adhesions.length && !plan.dons.length && !plan.nouveauxAdh.length && !plan.maj.length && !plan.reactives.length
    return (
        <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>Importer un export AssoConnect</h3>
                <button style={small()} onClick={() => { setOuvert(false); setPlan(null); setMsg({ t: "", err: false }) }}>Fermer</button>
            </div>
            <p style={{ ...muted, fontSize: 14, margin: "10px 0 14px" }}>Dans AssoConnect, exportez au format Excel la liste des <strong style={{ color: C.txt }}>adhésions</strong> (paiements), des <strong style={{ color: C.txt }}>contacts adhérents</strong> ou des <strong style={{ color: C.txt }}>donateurs</strong>, puis choisissez le fichier ici. Rien n’est enregistré avant votre validation, et ce qui existe déjà n’est pas ajouté deux fois.</p>
            <input type="file" accept=".xlsx,.xls,.csv" disabled={occupe} onChange={(e) => e.target.files?.[0] && analyser(e.target.files[0])} style={{ color: C.mute, font: "inherit" }} />
            {plan && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                    <span style={label}>{plan.type === "adhesions" ? "Export des adhésions" : plan.type === "contacts" ? "Export des contacts adhérents" : "Export des donateurs"}</span>
                    {rien ? <p style={muted}>Tout est déjà à jour : rien à importer.</p> : (
                        <ul style={{ margin: "4px 0 14px", paddingLeft: 18, color: C.txt, lineHeight: 1.8 }}>
                            {plan.adhesions.length > 0 && <li>{plan.adhesions.length} nouvelle(s) adhésion(s), pour {euros(plan.adhesions.reduce((s, a) => s + a.montant, 0))}</li>}
                            {plan.dons.length > 0 && <li>{plan.dons.length} don(s), pour {euros(plan.dons.reduce((s, a) => s + a.montant, 0))}</li>}
                            {plan.nouveauxAdh.length > 0 && <li>{plan.nouveauxAdh.length} nouvelle(s) fiche(s) : {plan.nouveauxAdh.slice(0, 6).map((a) => [a.prenom, a.nom].filter(Boolean).join(" ") || a.email).join(", ")}{plan.nouveauxAdh.length > 6 ? "…" : ""}</li>}
                            {plan.reactives.length > 0 && <li>{plan.reactives.length} ancien(s) adhérent(s) de retour, réactivé(s)</li>}
                            {plan.maj.length > 0 && <li>{plan.maj.length} fiche(s) complétée(s) (téléphone, adresse… seulement là où c’était vide)</li>}
                            {plan.ignores > 0 && <li style={{ color: C.mute }}>{plan.ignores} ligne(s) ignorée(s) (paiement non reçu ou sans e-mail)</li>}
                        </ul>
                    )}
                    {!rien && <button style={btn()} disabled={occupe} onClick={importer}>{occupe ? "Import…" : "Importer"}</button>}
                </div>
            )}
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Codes personnels de connexion ----------
async function envoyerCodes(emails: string[]): Promise<{ ok: number; erreurs: string[] }> {
    let ok = 0; const erreurs: string[] = []
    for (let k = 0; k < emails.length; k += 20) {
        const { data, error } = await sb().functions.invoke("codes", { body: { emails: emails.slice(k, k + 20) } })
        if (error) {
            let t = error.message; try { const j = await error.context.json(); t = j.erreur || t } catch (e) {}
            if (/Failed to send|not found|404/i.test(t)) t = "La fonction d’envoi des codes n’est pas encore installée."
            erreurs.push(t); break
        }
        for (const r of data.resultats) r.ok ? ok++ : erreurs.push(`${r.email} : ${r.erreur}`)
    }
    return { ok, erreurs }
}

function CodesConnexion({ moi }: { moi: string }) {
    const client = sb()
    const [liste, setListe] = React.useState<any[]>([])
    const [choix, setChoix] = React.useState("")
    const [occupe, setOccupe] = React.useState("")
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const charger = React.useCallback(async () => {
        const { data } = await client.from("adherents").select("id,email,prenom,nom,actif,code_envoye_le").eq("actif", true).order("nom")
        setListe(data ?? [])
    }, [])
    React.useEffect(() => { charger() }, [charger])
    const sans = liste.filter((a) => !a.code_envoye_le)
    const nom = (a: any) => [a.prenom, a.nom].filter(Boolean).join(" ") || a.email
    const lancer = async (emails: string[], quoi: string) => {
        setOccupe(quoi); setMsg({ t: "", err: false })
        const r = await envoyerCodes(emails)
        setOccupe(""); charger()
        setMsg({ t: `${r.ok} code(s) envoyé(s).${r.erreurs.length ? " Problèmes : " + r.erreurs.slice(0, 5).join(" ; ") + (r.erreurs.length > 5 ? "…" : "") : ""}`, err: r.erreurs.length > 0 })
    }
    return (
        <div style={box}>
            <h3 style={{ ...h2, fontSize: 20 }}>Codes de connexion</h3>
            <p style={{ ...muted, fontSize: 14, marginBottom: 14 }}>Chaque adhérent reçoit par e-mail un code personnel pour se connecter, qu’il peut ensuite changer dans son profil. Envoyer un nouveau code remplace l’ancien. {liste.length ? `${liste.length - sans.length} adhérent(s) sur ${liste.length} ont déjà reçu un code.` : ""}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn(false)} disabled={!!occupe} onClick={() => lancer([moi], "test")}>{occupe === "test" ? "Envoi…" : "M’envoyer mon code (essai)"}</button>
                <button style={btn()} disabled={!!occupe || !sans.length} onClick={() => { if (window.confirm(`Envoyer un code personnel par e-mail à ${sans.length} adhérent(s) qui n’en ont pas encore reçu ?`)) lancer(sans.map((a) => a.email), "tous") }}>{occupe === "tous" ? "Envoi en cours…" : `Envoyer aux ${sans.length} sans code`}</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <select style={{ ...input, flex: "1 1 240px", width: "auto" }} value={choix} onChange={(e) => setChoix(e.target.value)}>
                    <option value="">Envoyer un nouveau code à…</option>
                    {liste.map((a) => <option key={a.id} value={a.email}>{nom(a)}{a.code_envoye_le ? ` · code envoyé le ${dateFr(a.code_envoye_le)}` : " · pas encore de code"}</option>)}
                </select>
                <button style={btn(false)} disabled={!choix || !!occupe} onClick={() => { const a = liste.find((x) => x.email === choix); if (a && window.confirm(`Envoyer un nouveau code à ${nom(a)} ? L’ancien ne fonctionnera plus.`)) lancer([choix], "un") }}>{occupe === "un" ? "Envoi…" : "Envoyer"}</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
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

function Agenda({ moi, ouvrirCampagne, etroit }: { moi: string; ouvrirCampagne: (id: string) => void; etroit: boolean }) {
    const client = sb()
    const auj = new Date()
    const [mois, setMois] = React.useState(new Date(auj.getFullYear(), auj.getMonth(), 1))
    const [evts, setEvts] = React.useState<any[]>([])
    const [sel, setSel] = React.useState<any | null>(null)
    const [jour, setJour] = React.useState<string | null>(null)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const ouvrir = (e: any) => { setMsg({ t: "", err: false }); setSel({ ...e, prix: e.prix ?? 0, places: e.places ?? "", __annoncer: false }) }
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
    const nouveau = (d?: string) => { setMsg({ t: "", err: false }); setSel({ titre: "", date_debut: d || "", date_fin: "", heure: "", date_label: "", lieu: "", description: "", reserve_membres: true, inscription_ouverte: false, prix: 0, places: "", publie: true, __annoncer: false }) }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: etroit ? "wrap" : "nowrap", flex: etroit ? "1 1 100%" : "0 1 auto", justifyContent: etroit ? "space-between" : "flex-start" }}>
                        <button style={small()} onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent">‹</button>
                        <h3 style={{ ...h2, fontSize: etroit ? 18 : 22, margin: "0 4px", minWidth: etroit ? 120 : 170, textAlign: "center", textTransform: "capitalize", whiteSpace: "nowrap" }}>{mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3>
                        <button style={small()} onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant">›</button>
                        <button style={{ ...small(), marginLeft: etroit ? 0 : 6, whiteSpace: "nowrap", flex: etroit ? "1 1 100%" : "0 0 auto" }} onClick={() => setMois(new Date(auj.getFullYear(), auj.getMonth(), 1))}>{etroit ? "Revenir à aujourd’hui" : "Aujourd’hui"}</button>
                    </div>
                    <button style={{ ...btn(), ...(etroit ? { width: "100%" } : {}) }} onClick={() => nouveau()}>Nouvel événement</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, background: C.line, border: `1px solid ${C.line}` }}>
                    {JOURS.map((j) => <div key={j} style={{ background: C.panel, padding: etroit ? "6px 2px" : "6px 8px", textAlign: etroit ? "center" : "left", fontSize: etroit ? 11 : 12, color: C.mute, textTransform: "uppercase", letterSpacing: "0.06em" }}>{j}</div>)}
                    {cases.slice(0, semaines * 7).map((d) => {
                        const k = iso(d), horsMois = d.getMonth() !== mois.getMonth(), estAuj = k === iso(auj)
                        const liste = duJour(k)
                        if (etroit) return (
                            <button key={k} onClick={() => setJour(jour === k ? null : k)} style={{ background: jour === k ? "rgba(155,189,138,0.18)" : horsMois ? C.bg : "#1f1813", border: "none", borderRadius: 0, minHeight: 48, padding: "6px 2px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, font: "inherit" }}>
                                <span style={{ fontSize: 13, color: estAuj ? C.accentDark : horsMois ? "rgba(246,240,230,0.3)" : C.txt, background: estAuj ? C.accent : "transparent", padding: "0 5px", fontWeight: estAuj ? 700 : 400 }}>{d.getDate()}</span>
                                <span style={{ display: "flex", gap: 3 }}>{liste.slice(0, 3).map((e) => <span key={e.id} style={{ width: 6, height: 6, background: e.inscription_ouverte ? C.accent : C.mute }} />)}</span>
                            </button>
                        )
                        return (
                            <div key={k} onClick={() => nouveau(k)} title="Cliquer pour ajouter un événement ce jour-là" style={{ background: horsMois ? C.bg : "#1f1813", minHeight: 86, padding: 6, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                                <span style={{ fontSize: 13, color: estAuj ? C.accentDark : horsMois ? "rgba(246,240,230,0.3)" : C.mute, background: estAuj ? C.accent : "transparent", alignSelf: "flex-start", padding: estAuj ? "0 6px" : 0, fontWeight: estAuj ? 700 : 400 }}>{d.getDate()}</span>
                                {liste.map((e) => (
                                    <button key={e.id} onClick={(x) => { x.stopPropagation(); ouvrir(e) }}
                                        style={{ textAlign: "left", background: e.inscription_ouverte ? "rgba(155,189,138,0.22)" : "rgba(246,240,230,0.08)", color: C.txt, border: "none", borderLeft: `3px solid ${e.inscription_ouverte ? C.accent : C.mute}`, borderRadius: 0, padding: "3px 6px", font: "inherit", fontSize: 12, lineHeight: 1.3, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: e.publie === false ? 0.5 : 1 }}>
                                        {e.heure ? e.heure + " · " : ""}{e.titre}{e.publie === false ? " (non publié)" : ""}
                                    </button>
                                ))}
                            </div>
                        )
                    })}
                </div>
                {etroit && jour && (
                    <div style={{ marginTop: 14 }}>
                        <span style={label}>{JOURS_MOIS(jour)}</span>
                        {duJour(jour).map((e) => <button key={e.id} onClick={() => ouvrir(e)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 0", color: C.txt, font: "inherit", cursor: "pointer" }}>{e.heure ? <span style={{ color: C.accent, fontSize: 13 }}>{e.heure} · </span> : null}{e.titre}</button>)}
                        <button style={{ ...btn(false), marginTop: 8, width: "100%" }} onClick={() => nouveau(jour)}>Ajouter un événement ce jour-là</button>
                    </div>
                )}
                <p style={{ ...muted, fontSize: 13, marginTop: 10 }}>{etroit ? "Touchez un jour pour voir ses événements ou en ajouter un." : "Cliquez sur un jour pour y créer un événement, ou sur un événement pour le modifier et voir les inscrits."} En vert : inscriptions ouvertes.</p>
                <Msg text={msg.t} err={msg.err} />
            </div>

            {sel && <FicheEvenement e={sel} setE={setSel} moi={moi} fermer={() => setSel(null)} recharger={charger} ouvrirCampagne={ouvrirCampagne} />}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div style={box}>
                    <span style={label}>Prochains événements</span>
                    {prochains.length === 0 && <p style={muted}>Rien de prévu.</p>}
                    {prochains.map((e) => <button key={e.id} onClick={() => ouvrir(e)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 0", color: C.txt, font: "inherit", cursor: "pointer" }}><span style={{ color: C.accent, fontSize: 13 }}>{e.date_label}</span><br />{e.titre}</button>)}
                </div>
                <div style={box}>
                    <span style={label}>Dates à confirmer</span>
                    {sansDate.length === 0 && <p style={muted}>Aucun.</p>}
                    {sansDate.map((e) => <button key={e.id} onClick={() => ouvrir(e)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 0", color: C.txt, font: "inherit", cursor: "pointer" }}><span style={{ color: C.accent, fontSize: 13 }}>{e.date_label}</span><br />{e.titre}</button>)}
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
            const contenu = `Bonjour,\n\nNous vous donnons rendez-vous : ${data.titre}\n${data.date_label}${data.heure ? ", " + data.heure : ""}${data.lieu ? "\n" + data.lieu : ""}\n\n${data.description || ""}${data.inscription_ouverte ? `\n\nLes inscriptions sont ouvertes dans votre espace membre${data.prix > 0 ? ` (${euros(data.prix)} par personne)` : ""} : https://acs-armorique-cactus-succulentes.framer.website/agenda` : ""}\n\nÀ bientôt,\nLe bureau de l’ACS`
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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, marginTop: 16 }}>
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
    const [f, setF] = React.useState({ email: "", nb: 1, statut: "valide", confirmer: false })
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
        const { data: cree, error } = await client.from("inscriptions").insert({ email, formulaire: `${evt.titre} · ${evt.date_label}`, montant: (evt.prix || 0) * f.nb, statut: f.statut, evenement_id: evt.id, nb_personnes: f.nb }).select().single()
        if (error) return setMsg({ t: error.message, err: true })
        let t = "Inscription ajoutée."
        if (f.confirmer && cree) {
            const { data: r, error: er } = await client.functions.invoke("billet", { body: { id: cree.id } })
            t += !er && r?.ok ? " Billet envoyé par e-mail." : " E-mail non envoyé : " + (r?.erreur || er?.message || "erreur")
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
                    {liste && liste.length > 0 && <button style={small()} onClick={() => exporter(`inscrits-${evt.titre}.csv`, ["E-mail", "Nom", "Personnes", "Montant", "Statut", "Inscrit le", "Billet", "Entré le"], liste.map((r) => [r.email, nom(r.email), r.nb_personnes, r.montant, STATUTS[r.statut], r.cree_le, r.billet || "", r.scanne_le || ""]))}>Exporter (CSV)</button>}
                    {liste && liste.length > 0 && <button style={small()} onClick={ecrire}>Écrire aux inscrits</button>}
                </div>
            </div>
            {!evt.inscription_ouverte && <p style={{ ...muted, fontSize: 13, marginTop: 6 }}>Les inscriptions en ligne sont fermées pour cet événement : vous pouvez tout de même ajouter des inscrits à la main.</p>}
            <div style={{ marginTop: 10 }}>
                {(liste ?? []).map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
                        <span>{nom(r.email) || r.email} <span style={{ color: C.mute, fontSize: 13 }}>· {r.nb_personnes || 1} pers.{r.montant > 0 ? " · " + euros(r.montant) : ""}{r.billet ? " · " + r.billet : ""}{r.scanne_le ? " · entré ✓" : ""}</span></span>
                        <span style={{ display: "flex", gap: 6 }}>
                            {r.statut === "en_attente" ? <button style={small()} onClick={() => changer(r, "valide")}>Marquer réglé</button> : <span style={{ fontSize: 12, color: C.accent, padding: "6px 0" }}>{STATUTS[r.statut]}</span>}
                            <button style={small(true)} onClick={() => window.confirm("Annuler cette inscription ?") && changer(r, "abandonne")}>Annuler</button>
                        </span>
                    </div>
                ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14, alignItems: "end" }}>
                <div><span style={label}>Ajouter un inscrit</span><input style={input} list="acs-adh" placeholder="adresse e-mail" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} />
                    <datalist id="acs-adh">{adh.map((a) => <option key={a.email} value={a.email}>{[a.prenom, a.nom].filter(Boolean).join(" ")}</option>)}</datalist></div>
                <div><span style={label}>Pers.</span><input style={input} type="number" min={1} value={f.nb} onChange={(x) => setF({ ...f, nb: Math.max(1, Number(x.target.value) || 1) })} /></div>
                <div><span style={label}>Règlement</span><select style={input} value={f.statut} onChange={(x) => setF({ ...f, statut: x.target.value })}><option value="valide">Réglé / gratuit</option><option value="en_attente">À régler</option></select></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}><input type="checkbox" checked={f.confirmer} onChange={(x) => setF({ ...f, confirmer: x.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Envoyer le billet par e-mail</label>
                <button style={btn()} onClick={ajouter}>Ajouter</button>
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// ---------- Comptabilité ----------
// ---------- Sondages ----------
const TYPES_Q: [Question["type"], string][] = [["unique", "Un seul choix"], ["multiple", "Plusieurs choix"], ["nombre", "Nombre"], ["texte", "Réponse libre"]]
const nid = () => Math.random().toString(36).slice(2, 8)
const etatSondage = (s: any) => (!s.ouvert ? "Brouillon" : s.cloture_le && s.cloture_le < new Date().toISOString().slice(0, 10) ? "Clos" : "Ouvert")

function SondagesAdmin({ moi, ouvrirCampagne }: { moi: string; ouvrirCampagne: (id: string) => void }) {
    const client = sb()
    const [liste, setListe] = React.useState<any[]>([])
    const [nb, setNb] = React.useState<Record<string, number>>({})
    const [evts, setEvts] = React.useState<any[]>([])
    const [produits, setProduits] = React.useState<any[]>([])
    const [sel, setSel] = React.useState<any | null>(null)
    const [vue, setVue] = React.useState<"edition" | "resultats">("edition")
    const charger = React.useCallback(async () => {
        const [{ data: so }, { data: re }] = await Promise.all([client.from("sondages").select("*").order("cree_le", { ascending: false }), client.from("reponses").select("sondage_id")])
        setListe(so ?? [])
        const c: Record<string, number> = {}; for (const r of re ?? []) c[r.sondage_id] = (c[r.sondage_id] || 0) + 1; setNb(c)
    }, [])
    React.useEffect(() => {
        charger()
        const auj = new Date().toISOString().slice(0, 10)
        client.from("evenements").select("id,titre,date_label,date_debut").or(`date_debut.gte.${auj},date_debut.is.null`).order("date_debut", { ascending: true, nullsFirst: false }).then(({ data }: any) => setEvts(data ?? []))
        client.from("produits").select("nom").eq("actif", true).order("ordre").then(({ data }: any) => setProduits(data ?? []))
    }, [charger])
    const modeles: [string, () => any][] = [
        ["Vide", () => ({ titre: "", description: "", questions: [{ id: nid(), intitule: "", type: "unique", options: ["Oui", "Non"], obligatoire: true }] })],
        ["Repas d’une sortie", () => ({ titre: "Qui vient au repas ?", description: "Pour réserver le bon nombre de places au restaurant.", questions: [{ id: nid(), intitule: "Serez-vous au repas ?", type: "unique", options: ["Oui", "Non"], obligatoire: true }, { id: nid(), intitule: "Nombre de personnes (vous compris)", type: "nombre", obligatoire: false }, { id: nid(), intitule: "Régime ou allergie à signaler", type: "texte", obligatoire: false }] })],
        ["Précommande boutique", () => ({ titre: "Précommande boutique", description: "Indiquez ce que vous souhaitez : nous préparons les commandes pour la prochaine rencontre.", questions: [{ id: nid(), intitule: "Articles souhaités", type: "multiple", options: produits.length ? produits.map((p) => p.nom) : ["Tee-shirt", "Ponce", "Chabasite"], obligatoire: true }, { id: nid(), intitule: "Taille du tee-shirt", type: "unique", options: ["S", "M", "L", "XL", "XXL"], obligatoire: false }, { id: nid(), intitule: "Quantités et précisions", type: "texte", obligatoire: false }] })],
        ["Choix d’une date", () => ({ titre: "Quelle date vous convient ?", description: "", questions: [{ id: nid(), intitule: "Dates possibles", type: "multiple", options: ["Samedi …", "Dimanche …"], obligatoire: true }] })],
    ]
    const nouveau = (m: () => any) => { setVue("edition"); setSel({ ...m(), evenement_id: "", cloture_le: "", ouvert: false, resultats_visibles: false }) }

    if (sel) return sel.id && vue === "resultats"
        ? <ResultatsAdmin so={sel} retour={() => setSel(null)} editer={() => setVue("edition")} moi={moi} ouvrirCampagne={ouvrirCampagne} />
        : <EditeurSondage so={sel} setSo={setSel} evts={evts} retour={() => { setSel(null); charger() }} voirResultats={() => setVue("resultats")} />

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <Aide>Créez un sondage pour les adhérents : qui vient au repas d’une sortie, précommandes de la boutique, choix d’une date… Il apparaît dans leur espace membre tant qu’il est ouvert, et peut être lié à un événement.</Aide>
            <div style={box}>
                <span style={label}>Nouveau sondage</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {modeles.map(([t, m]) => <button key={t} style={t === "Vide" ? btn() : btn(false)} onClick={() => nouveau(m)}>{t === "Vide" ? "Sondage vierge" : "Modèle : " + t}</button>)}
                </div>
            </div>
            <div style={box}>
                <h3 style={{ ...h2, fontSize: 20 }}>Sondages <span style={{ color: C.mute, fontWeight: 400 }}>({liste.length})</span></h3>
                {liste.length === 0 && <p style={muted}>Aucun sondage pour l’instant.</p>}
                {liste.map((so) => (
                    <div key={so.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
                        <span style={{ flex: "1 1 220px", minWidth: 0 }}>{so.titre}<span style={{ color: etatSondage(so) === "Ouvert" ? C.accent : C.mute, fontSize: 13 }}> · {etatSondage(so)}{so.cloture_le ? ` jusqu’au ${dateFr(so.cloture_le)}` : ""} · {nb[so.id] || 0} réponse(s)</span></span>
                        <span style={{ display: "flex", gap: 8 }}>
                            <button style={small()} onClick={() => { setVue("resultats"); setSel(so) }}>Résultats</button>
                            <button style={small()} onClick={() => { setVue("edition"); setSel(so) }}>Modifier</button>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function EditeurSondage({ so, setSo, evts, retour, voirResultats }: { so: any; setSo: (s: any) => void; evts: any[]; retour: () => void; voirResultats: () => void }) {
    const client = sb()
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const qs: Question[] = so.questions || []
    const setQ = (k: number, q: Partial<Question>) => setSo({ ...so, questions: qs.map((x, i) => (i === k ? { ...x, ...q } : x)) })
    const deplacer = (k: number, d: number) => { const l = [...qs]; const [x] = l.splice(k, 1); l.splice(k + d, 0, x); setSo({ ...so, questions: l }) }
    const enregistrer = async () => {
        if (!so.titre) return setMsg({ t: "Le titre est obligatoire.", err: true })
        if (!qs.length || qs.some((q) => !q.intitule)) return setMsg({ t: "Chaque question doit avoir un intitulé.", err: true })
        if (qs.some((q) => (q.type === "unique" || q.type === "multiple") && !(q.options || []).filter(Boolean).length)) return setMsg({ t: "Les questions à choix ont besoin d’au moins une réponse possible.", err: true })
        const row = { titre: so.titre, description: so.description || null, questions: qs.map((q) => ({ ...q, options: q.type === "unique" || q.type === "multiple" ? (q.options || []).map((o) => o.trim()).filter(Boolean) : undefined })), evenement_id: so.evenement_id || null, cloture_le: so.cloture_le || null, ouvert: !!so.ouvert, resultats_visibles: !!so.resultats_visibles }
        const { data, error } = so.id ? await client.from("sondages").update(row).eq("id", so.id).select().single() : await client.from("sondages").insert(row).select().single()
        if (error) return setMsg({ t: error.message, err: true })
        setSo(data); setMsg({ t: data.ouvert ? "Enregistré : le sondage est visible des adhérents." : "Enregistré en brouillon (pas encore visible des adhérents).", err: false })
    }
    const supprimer = async () => {
        if (!window.confirm(`Supprimer le sondage « ${so.titre} » et toutes ses réponses ?`)) return
        await client.from("sondages").delete().eq("id", so.id); retour()
    }
    const coche = (k: string, t: string, aide?: string) => <label style={{ display: "flex", gap: 10, cursor: "pointer", alignItems: "flex-start" }}><input type="checkbox" checked={!!so[k]} onChange={(e) => setSo({ ...so, [k]: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent, marginTop: 2 }} /><span>{t}{aide && <span style={{ display: "block", color: C.mute, fontSize: 13 }}>{aide}</span>}</span></label>
    return (
        <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <h3 style={{ ...h2, fontSize: 22, margin: 0 }}>{so.id ? "Modifier le sondage" : "Nouveau sondage"}</h3>
                <span style={{ display: "flex", gap: 8 }}>{so.id && <button style={small()} onClick={voirResultats}>Voir les résultats</button>}<button style={small()} onClick={retour}>Retour à la liste</button></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
                <div><span style={label}>Titre *</span><input style={input} value={so.titre} onChange={(e) => setSo({ ...so, titre: e.target.value })} placeholder="Qui vient au repas du 14 juin ?" /></div>
                <div><span style={label}>Présentation</span><textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={so.description || ""} onChange={(e) => setSo({ ...so, description: e.target.value })} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                    <div><span style={label}>Lié à un événement</span><select style={input} value={so.evenement_id || ""} onChange={(e) => setSo({ ...so, evenement_id: e.target.value })}><option value="">— aucun —</option>{evts.map((e) => <option key={e.id} value={e.id}>{e.date_label} — {e.titre}</option>)}</select></div>
                    <div><span style={label}>Réponses jusqu’au (inclus)</span><input style={input} type="date" value={so.cloture_le || ""} onChange={(e) => setSo({ ...so, cloture_le: e.target.value })} /></div>
                </div>
            </div>
            <div style={{ marginTop: 24 }}>
                <span style={label}>Questions</span>
                {qs.map((q, k) => (
                    <div key={q.id} style={{ border: `1px solid ${C.line}`, padding: 14, marginTop: 10, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            <input style={{ ...input, flex: "3 1 280px", width: "auto" }} value={q.intitule} placeholder={`Question ${k + 1}`} onChange={(e) => setQ(k, { intitule: e.target.value })} />
                            <select style={{ ...input, flex: "1 1 160px", width: "auto" }} value={q.type} onChange={(e) => setQ(k, { type: e.target.value as any, options: q.options?.length ? q.options : ["Oui", "Non"] })}>{TYPES_Q.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select>
                        </div>
                        {(q.type === "unique" || q.type === "multiple") && <div><span style={{ fontSize: 13, color: C.mute }}>Réponses possibles, une par ligne</span><textarea style={{ ...input, minHeight: 80, resize: "vertical", marginTop: 4 }} value={(q.options || []).join("\n")} onChange={(e) => setQ(k, { options: e.target.value.split("\n") })} /></div>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={!!q.obligatoire} onChange={(e) => setQ(k, { obligatoire: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.accent }} />Réponse obligatoire</label>
                            <span style={{ display: "flex", gap: 6 }}>
                                <button style={small()} disabled={k === 0} onClick={() => deplacer(k, -1)} aria-label="Monter">↑</button>
                                <button style={small()} disabled={k === qs.length - 1} onClick={() => deplacer(k, 1)} aria-label="Descendre">↓</button>
                                <button style={small(true)} onClick={() => setSo({ ...so, questions: qs.filter((_, i) => i !== k) })}>Retirer</button>
                            </span>
                        </div>
                    </div>
                ))}
                <button style={{ ...btn(false), marginTop: 10 }} onClick={() => setSo({ ...so, questions: [...qs, { id: nid(), intitule: "", type: "unique", options: ["Oui", "Non"], obligatoire: false }] })}>Ajouter une question</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, marginTop: 24 }}>
                {coche("ouvert", "Ouvert aux adhérents", "Décoché : brouillon, invisible des adhérents. Le sondage se ferme seul après la date limite.")}
                {coche("resultats_visibles", "Montrer les résultats aux adhérents", "Totaux seulement, sans les noms ni les réponses libres.")}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                <button style={btn()} onClick={enregistrer}>Enregistrer</button>
                {so.id && <button style={small(true)} onClick={supprimer}>Supprimer</button>}
            </div>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

function ResultatsAdmin({ so, retour, editer, moi, ouvrirCampagne }: { so: any; retour: () => void; editer: () => void; moi: string; ouvrirCampagne: (id: string) => void }) {
    const client = sb()
    const [reps, setReps] = React.useState<any[] | null>(null)
    const [adh, setAdh] = React.useState<Record<string, any>>({})
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const qs: Question[] = so.questions || []
    React.useEffect(() => {
        client.from("reponses").select("*").eq("sondage_id", so.id).order("maj_le", { ascending: false }).then(({ data }: any) => setReps(data ?? []))
        client.from("adherents").select("email,prenom,nom").then(({ data }: any) => setAdh(Object.fromEntries((data ?? []).map((a: any) => [a.email, a]))))
    }, [so.id])
    const nom = (e: string) => { const a = adh[e]; return a ? [a.prenom, a.nom].filter(Boolean).join(" ") || e : e }
    const val = (x: any) => (Array.isArray(x) ? x.join(", ") : x ?? "")
    const annoncer = async () => {
        const lien = "https://acs-armorique-cactus-succulentes.framer.website/espace-membre#sondages"
        const { data, error } = await client.from("campagnes").insert({ sujet: `Sondage : ${so.titre}`, contenu: `Bonjour,\n\n${so.description ? so.description + "\n\n" : ""}Merci de répondre au sondage « ${so.titre} »${so.cloture_le ? ` avant le ${dateFr(so.cloture_le)}` : ""}, dans votre espace membre :\n${lien}\n\nÀ bientôt,\nLe bureau de l’ACS`, cible: so.evenement_id ? "evenement" : "tous", evenement_id: so.evenement_id || null, dans_espace: false, auteur: moi }).select().single()
        if (error) return setMsg({ t: error.message, err: true })
        ouvrirCampagne(data.id)
    }
    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div><span style={label}>{etatSondage(so)}{so.cloture_le ? ` · jusqu’au ${dateFr(so.cloture_le)}` : ""}</span><h3 style={{ ...h2, fontSize: 22, margin: 0 }}>{so.titre}</h3></div>
                    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={small()} onClick={annoncer}>Annoncer par e-mail</button>
                        {reps && reps.length > 0 && <button style={small()} onClick={() => exporter(`sondage-${so.titre}.csv`, ["Nom", "E-mail", "Répondu le", ...qs.map((q) => q.intitule)], reps.map((r) => [nom(r.email), r.email, r.maj_le?.slice(0, 10), ...qs.map((q) => val(r.valeurs?.[q.id]))]))}>Exporter (CSV)</button>}
                        <button style={small()} onClick={editer}>Modifier</button>
                        <button style={small()} onClick={retour}>Retour</button>
                    </span>
                </div>
                <ResultatsSondage so={so} detail />
                <Msg text={msg.t} err={msg.err} />
            </div>
            <div style={box}>
                <h3 style={{ ...h2, fontSize: 20 }}>Réponses <span style={{ color: C.mute, fontWeight: 400 }}>({reps?.length ?? "…"})</span></h3>
                {reps && reps.length === 0 && <p style={muted}>Pas encore de réponse.</p>}
                <div style={{ overflowX: "auto" }}>
                    {reps && reps.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                            <thead><tr>{["Adhérent", ...qs.map((q) => q.intitule)].map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.line}`, color: C.mute, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                            <tbody>{reps.map((r) => <tr key={r.id}><td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{nom(r.email)}</td>{qs.map((q) => <td key={q.id} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>{String(val(r.valeurs?.[q.id]))}</td>)}</tr>)}</tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

// ---------- Campagnes e-mail ----------
// Statistiques d'une campagne envoyée : reçus, ouverts, cliqués, erreurs (données de Brevo)
function StatsCampagne({ c, majListe }: { c: any; majListe: () => void }) {
    const client = sb()!
    const [stats, setStats] = React.useState<any>(c.stats || null)
    const [suivi, setSuivi] = React.useState<any[]>([])
    const [noms, setNoms] = React.useState<Record<string, string>>({})
    const [occupe, setOccupe] = React.useState(false)
    const [msg, setMsg] = React.useState({ t: "", err: false })
    const [voir, setVoir] = React.useState<"" | "erreurs" | "nonouverts" | "ouverts">("")
    const lireSuivi = React.useCallback(async () => {
        const { data } = await client.from("campagne_suivi").select("*").eq("campagne_id", c.id)
        setSuivi(data ?? [])
    }, [c.id])
    const actualiser = async () => {
        setOccupe(true); setMsg({ t: "", err: false })
        const { data, error } = await client.functions.invoke("stats-emails", { body: { campagne_id: c.id } })
        setOccupe(false)
        if (error || !data?.ok) {
            let t = error?.message || data?.erreur || "Erreur"
            try { const j = await error.context.json(); t = j.erreur || t } catch (e) {}
            if (/Failed to send|not found|404/i.test(t)) t = "Les statistiques ne sont pas encore branchées (fonction « stats-emails » à installer)."
            return setMsg({ t, err: true })
        }
        setStats(data.stats); lireSuivi(); majListe()
        if (!data.stats.evenements) setMsg({ t: "Aucune donnée chez Brevo pour cet envoi. Les campagnes envoyées avant la mise en place des statistiques ne peuvent pas être suivies ; pour une campagne récente, réessayez dans quelques minutes.", err: false })
    }
    React.useEffect(() => {
        lireSuivi()
        client.from("adherents").select("email,prenom,nom").then(({ data }: any) => { const m: Record<string, string> = {}; for (const a of data ?? []) m[String(a.email).toLowerCase()] = [a.prenom, a.nom].filter(Boolean).join(" "); setNoms(m) })
        // actualisation automatique si les chiffres datent de plus d'une heure
        if (!c.stats || Date.now() - new Date(c.stats.maj_le).getTime() > 3600000) actualiser()
    }, [c.id])
    const pct = (n: number) => (stats?.envoyes ? Math.round((100 * n) / stats.envoyes) : 0)
    const tuile = (titre: string, n: number, couleur: string, cle?: typeof voir, aide?: string) => (
        <button onClick={() => cle && setVoir(voir === cle ? "" : cle)} disabled={!cle} title={aide} style={{ flex: "1 1 130px", textAlign: "left", background: voir && voir === cle ? "rgba(155,189,138,0.12)" : C.bg, border: `1px solid ${voir && voir === cle ? C.accent : C.line}`, padding: "12px 14px", color: C.txt, font: "inherit", cursor: cle ? "pointer" : "default" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mute }}>{titre}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: couleur, lineHeight: 1.2 }}>{n}<span style={{ fontSize: 14, color: C.mute, fontWeight: 400 }}>{stats?.envoyes ? ` · ${pct(n)} %` : ""}</span></div>
        </button>
    )
    const nom = (e: string) => noms[e.toLowerCase()] || e
    const liste = voir === "erreurs" ? suivi.filter((s) => s.erreur && !s.delivre) : voir === "nonouverts" ? suivi.filter((s) => s.delivre && !s.ouvert) : voir === "ouverts" ? suivi.filter((s) => s.ouvert) : []
    return (
        <div style={{ border: `1px solid ${C.line}`, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <b style={{ fontWeight: 600 }}>Ce que sont devenus les e-mails</b>
                <span style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: C.mute }}>{stats?.maj_le ? `à jour le ${dateFr(stats.maj_le, true)}` : ""}<button style={{ ...small(), whiteSpace: "nowrap" }} disabled={occupe} onClick={actualiser}>{occupe ? "Mise à jour…" : "Actualiser"}</button></span>
            </div>
            {stats ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {tuile("Reçus", stats.delivres, C.txt)}
                {tuile("Ouverts", stats.ouverts, C.accent, "ouverts", "Voir qui a ouvert")}
                {tuile("Cliqués", stats.cliques, C.accent, undefined, "Ont cliqué sur un lien")}
                {tuile("Pas ouverts", Math.max(0, stats.delivres - stats.ouverts), C.txt, "nonouverts", "Voir qui n’a pas ouvert")}
                {tuile("Erreurs", stats.erreurs, stats.erreurs ? C.danger : C.txt, "erreurs", "Voir les adresses en erreur")}
            </div> : <p style={{ ...muted, fontSize: 14 }}>{occupe ? "Récupération des chiffres auprès de Brevo…" : "Pas encore de chiffres."}</p>}
            {voir && <div style={{ marginTop: 12 }}>
                {liste.length === 0 ? <p style={{ ...muted, fontSize: 14 }}>Personne.</p> : liste.map((s) => (
                    <div key={s.email} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                        <span>{nom(s.email)}{noms[s.email.toLowerCase()] ? <span style={{ color: C.mute }}> · {s.email}</span> : null}</span>
                        {s.erreur && <span style={{ color: C.danger, fontSize: 13 }}>{s.erreur}</span>}
                    </div>
                ))}
                {voir === "erreurs" && liste.length > 0 && <p style={{ ...muted, fontSize: 13, marginTop: 8 }}>Corrigez ces adresses dans Adhérents › Fichier des adhérents : sinon ces personnes ne reçoivent rien, ni campagnes ni codes de connexion.</p>}
            </div>}
            <p style={{ ...muted, fontSize: 12.5, marginTop: 10 }}>Les « ouverts » sont une estimation : certains logiciels de messagerie (Apple Mail notamment) comptent un e-mail comme ouvert sans qu’il soit lu, d’autres bloquent ce suivi.</p>
            <Msg text={msg.t} err={msg.err} />
        </div>
    )
}

// Modèles d'e-mails prêts à adapter (les [crochets] sont à remplacer avant l'envoi)
const MODELES_EMAIL: { nom: string; cible: string; sujet: string; contenu: string }[] = [
    { nom: "Convocation à l’assemblée générale", cible: "tous", sujet: "Convocation à l’assemblée générale de l’ACS",
      contenu: "Bonjour,\n\nVous êtes convié(e) à l’assemblée générale de l’ACS, le [date] à [heure], à [lieu].\n\nOrdre du jour :\n- rapport moral et rapport d’activité\n- rapport financier et vote des comptes\n- montant de la cotisation\n- renouvellement du bureau\n- questions diverses\n\nSi vous ne pouvez pas venir, vous pouvez donner votre pouvoir à un autre adhérent.\n\nÀ bientôt,\n\nLe bureau de l’ACS" },
    { nom: "Rappel de cotisation", cible: "retard", sujet: "Votre cotisation à l’ACS",
      contenu: "Bonjour,\n\nSauf erreur de notre part, votre cotisation pour [année] n’est pas encore réglée.\n\nElle permet à l’association de continuer ses sorties, le salon et les semestriels. Vous pouvez la régler [moyen de paiement].\n\nSi c’est déjà fait, merci et ne tenez pas compte de ce message.\n\nLe bureau de l’ACS" },
    { nom: "Annonce d’une sortie", cible: "tous", sujet: "Sortie du [date] : [lieu]",
      contenu: "Bonjour,\n\nNous organisons une sortie le [date] à [lieu].\n\nRendez-vous à [heure] à [point de rendez-vous]. [Covoiturage, repas, prix éventuel.]\n\nInscriptions dans l’agenda de l’espace membre : [SITE]/agenda\n\nÀ bientôt,\n\nLe bureau de l’ACS" },
    { nom: "Informations aux exposants du salon", cible: "exposants", sujet: "Salon des Plantes : informations pratiques",
      contenu: "Bonjour,\n\nVotre emplacement au Salon des Plantes ([dates]) est confirmé. Voici les informations pratiques :\n\n- installation : [jour et heure]\n- adresse : [lieu]\n- emplacement : [zone]\n- [repas, contribution, autres précisions]\n\nPour toute question, répondez simplement à ce message.\n\nÀ bientôt,\n\nLe bureau de l’ACS" },
    { nom: "Remerciements après le salon", cible: "tous", sujet: "Merci pour le Salon des Plantes",
      contenu: "Bonjour,\n\nUn grand merci à toutes celles et ceux qui ont participé au Salon des Plantes : montage, accueil, tombola, démontage… Sans vous, rien ne serait possible.\n\n[Quelques chiffres ou anecdotes.]\n\nLes photos sont dans la galerie de l’espace membre : [SITE]/galerie\n\nLe bureau de l’ACS" },
    { nom: "Appel aux bénévoles pour le salon", cible: "tous", sujet: "Salon des Plantes : on a besoin de vous",
      contenu: "Bonjour,\n\nLe Salon des Plantes approche ([dates]). Les tâches des bénévoles sont ouvertes : montage le vendredi, accueil, caisse, tombola, démontage le lundi…\n\nInscrivez-vous en quelques clics depuis l’événement du salon dans l’agenda : [SITE]/agenda\n\nMerci d’avance,\n\nLe bureau de l’ACS" },
]

function Campagnes({ moi, ouverte, setOuverte }: { moi: string; ouverte: string | null; setOuverte: (id: string | null) => void }) {
    const client = sb()
    const [liste, setListe] = React.useState<any[]>([])
    const [evts, setEvts] = React.useState<any[]>([])
    const [c, setC] = React.useState<any | null>(null)
    const [nb, setNb] = React.useState<number | null>(null)
    const [editions, setEditions] = React.useState<number[]>([])
    const [gens, setGens] = React.useState<any[]>([])
    const [cherche, setCherche] = React.useState("")
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
        client.from("salon_reglages").select("edition").order("edition", { ascending: false }).then(({ data }: any) => setEditions((data ?? []).map((r: any) => r.edition)))
        client.from("adherents").select("email,prenom,nom,actif,recoit_emails").order("nom").then(({ data }: any) => setGens((data ?? []).filter((a: any) => a.actif && a.recoit_emails !== false && a.email)
            .sort((x: any, y: any) => ([x.prenom, x.nom].filter(Boolean).join(" ") || x.email).localeCompare([y.prenom, y.nom].filter(Boolean).join(" ") || y.email, "fr", { sensitivity: "base" }))))
    }, [])
    React.useEffect(() => {
        setNb(null)
        if (!c || c.statut === "envoyee") return
        const t = setTimeout(() => {
            client.rpc("destinataires_cible", { p_cible: c.cible, p_evenement: c.evenement_id || null, p_edition: c.edition || null, p_emails: c.emails || [] })
                .then(({ data, error }: any) => { if (!error) setNb(data ? data.length : 0); else if (c.id) client.rpc("destinataires", { c: c.id }).then(({ data }: any) => setNb(data ? data.length : null)) })
        }, 250)
        return () => clearTimeout(t)
    }, [c?.id, c?.cible, c?.evenement_id, c?.edition, (c?.emails || []).join(","), c?.__enr])

    const sauver = async (silencieux = false) => {
        if (!c.sujet || !c.contenu) { setMsg({ t: "Objet et message sont obligatoires.", err: true }); return null }
        if (c.cible === "choix" && !(c.emails || []).length) { setMsg({ t: "Cochez au moins une personne.", err: true }); return null }
        const row = { sujet: c.sujet, contenu: c.contenu, cible: c.cible, evenement_id: c.cible === "evenement" ? c.evenement_id || null : null, edition: CIBLES_SALON.includes(c.cible) ? c.edition || editions[0] || null : null, emails: c.cible === "choix" ? c.emails : null, dans_espace: CIBLES_ESPACE.includes(c.cible) && !!c.dans_espace, auteur: moi }
        const { data, error } = c.id ? await client.from("campagnes").update(row).eq("id", c.id).select().single() : await client.from("campagnes").insert(row).select().single()
        if (error) { setMsg({ t: error.message, err: true }); return null }
        setC({ ...data, __enr: Date.now() }); charger()
        if (!silencieux) setMsg({ t: "Brouillon enregistré.", err: false })
        return data
    }
    const [aConfirmer, setAConfirmer] = React.useState<{ id: string; sujet: string; n: number; cible: string } | null>(null)
    React.useEffect(() => setAConfirmer(null), [c?.id, c?.cible, c?.sujet, c?.contenu, (c?.emails || []).join(",")])
    const test = async () => {
        const d = await sauver(true); if (!d) return
        setOccupe(true); const r = await envoyer({ a: [moi], sujet: "[Test] " + d.sujet, contenu: d.contenu }); setOccupe(false)
        setMsg({ t: r.ok ? `Test envoyé à ${moi}.` : r.texte, err: !r.ok })
    }
    const envoyerTout = async () => {
        const d = await sauver(true); if (!d) return
        if (/\[[^\]]{2,40}\]/.test(d.sujet + d.contenu) && !window.confirm("Le message contient encore des passages entre [crochets] à remplacer. Envoyer quand même ?")) return
        const { data: dest } = await client.rpc("destinataires", { c: d.id })
        const n = dest?.length ?? 0
        if (!n) return setMsg({ t: "Aucun destinataire pour cette cible.", err: true })
        // confirmation dans la page, avec le nombre de destinataires, pour éviter un envoi par erreur
        setAConfirmer({ id: d.id, sujet: d.sujet, n, cible: (CIBLES.find(([v]) => v === d.cible) || ["", d.cible])[1] })
    }
    const confirmerEnvoi = async () => {
        const k = aConfirmer; if (!k) return
        setAConfirmer(null)
        const d = { id: k.id }
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
                {envoyee && c.cible !== "test" && <StatsCampagne c={c} majListe={charger} />}
                {!c.id && !envoyee && <div style={{ marginBottom: 16 }}><span style={label}>Partir d’un modèle</span>
                    <select style={input} value="" onChange={(e) => { const m = MODELES_EMAIL[Number(e.target.value)]; if (!m) return; const site = typeof window !== "undefined" ? window.location.origin : ""; setC({ ...c, cible: m.cible, sujet: m.sujet, contenu: m.contenu.replace(/\[SITE\]/g, site) }) }}>
                        <option value="">— Message vierge ou choisir un modèle —</option>{MODELES_EMAIL.map((m, i) => <option key={i} value={i}>{m.nom}</option>)}</select>
                    <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>Remplacez ensuite les passages entre [crochets].</span></div>}
                <fieldset disabled={envoyee || occupe} style={{ border: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
                    <div><span style={label}>Destinataires</span>
                        <select style={input} value={c.cible} onChange={(e) => setC({ ...c, cible: e.target.value })}>{CIBLES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
                        <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>{nb != null && <b style={{ color: C.txt, fontWeight: 600 }}>{nb} destinataire{nb > 1 ? "s" : ""}. </b>}{c.cible.startsWith("exposants") || c.cible === "evenement" ? "" : "Seuls les adhérents qui acceptent les e-mails (option du profil) sont concernés."}</span></div>
                    {CIBLES_SALON.includes(c.cible) && <div><span style={label}>Salon</span>
                        <select style={input} value={c.edition || editions[0] || ""} onChange={(e) => setC({ ...c, edition: Number(e.target.value) })}>{editions.map((ed) => <option key={ed} value={ed}>Salon {ed}</option>)}</select>
                        {c.cible.startsWith("exposants") && <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>Les exposants ne sont pas forcément adhérents : le bas de l’e-mail leur explique pourquoi ils le reçoivent.</span>}</div>}
                    {c.cible === "choix" && (() => {
                        const choisis: string[] = c.emails || []
                        const estChoisi = (e: string) => choisis.some((x) => x.toLowerCase() === e.toLowerCase())
                        const basculer = (e: string) => setC({ ...c, emails: estChoisi(e) ? choisis.filter((x) => x.toLowerCase() !== e.toLowerCase()) : [...choisis, e] })
                        const q = cherche.trim().toLowerCase()
                        const sa = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                        const vus = gens.filter((a) => !q || sa(q).split(/\s+/).every((m) => sa(`${a.prenom || ""} ${a.nom || ""} ${a.email}`).includes(m)))
                        return <div><span style={label}>Personnes ({choisis.length} cochée{choisis.length > 1 ? "s" : ""})</span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                <input style={{ ...input, flex: "1 1 200px" }} value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Rechercher un nom…" />
                                {choisis.length > 0 && <button type="button" style={small()} onClick={() => setC({ ...c, emails: [] })}>Tout décocher</button>}
                            </div>
                            <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.line}` }}>
                                {vus.map((a) => <label key={a.email} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", fontSize: 14, background: estChoisi(a.email) ? "rgba(155,189,138,0.10)" : "transparent" }}>
                                    <input type="checkbox" checked={estChoisi(a.email)} onChange={() => basculer(a.email)} style={{ width: 16, height: 16, accentColor: C.accent, flex: "0 0 auto" }} />
                                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[a.prenom, a.nom].filter(Boolean).join(" ") || a.email}<span style={{ color: C.mute }}> · {a.email}</span></span>
                                </label>)}
                                {vus.length === 0 && <p style={{ ...muted, fontSize: 14, padding: 10, margin: 0 }}>Personne ne correspond.</p>}
                            </div></div>
                    })()}
                    {c.cible === "evenement" && <div><span style={label}>Événement</span>
                        <select style={input} value={c.evenement_id || ""} onChange={(e) => setC({ ...c, evenement_id: e.target.value })}><option value="">— choisir —</option>{evts.map((e) => <option key={e.id} value={e.id}>{e.date_label} — {e.titre}</option>)}</select></div>}
                    <div><span style={label}>Objet *</span><input style={input} value={c.sujet} onChange={(e) => setC({ ...c, sujet: e.target.value })} placeholder="Sortie du printemps, assemblée générale…" /></div>
                    <div><span style={label}>Message *</span><textarea style={{ ...input, minHeight: 260, resize: "vertical", lineHeight: 1.6 }} value={c.contenu} onChange={(e) => setC({ ...c, contenu: e.target.value })} placeholder={"Bonjour,\n\n…\n\nLe bureau de l’ACS"} />
                        <span style={{ display: "block", fontSize: 13, color: C.mute, marginTop: 4 }}>Texte simple : laissez une ligne vide entre les paragraphes. Les liens (https://…) deviennent cliquables. Un pied de page pour se désabonner est ajouté automatiquement.</span></div>
                    {CIBLES_ESPACE.includes(c.cible) && <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><input type="checkbox" checked={!!c.dans_espace} onChange={(e) => setC({ ...c, dans_espace: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Afficher aussi ce message dans l’espace membre (rubrique Messages)</label>}
                </fieldset>
                {!envoyee && !aConfirmer && <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                    <button style={btn(false)} disabled={occupe} onClick={test}>M’envoyer un test</button>
                    <button style={btn(false)} disabled={occupe} onClick={() => sauver()}>Enregistrer le brouillon</button>
                    <button style={btn()} disabled={occupe} onClick={envoyerTout}>{occupe ? "Envoi…" : "Envoyer…"}</button>
                    {c.id && <button style={small(true)} onClick={() => supprimer(c)}>Supprimer</button>}
                </div>}
                {!envoyee && aConfirmer && <div role="alertdialog" style={{ marginTop: 22, border: `2px solid ${C.accent}`, background: "rgba(155,189,138,0.08)", padding: "16px 18px" }}>
                    <b style={{ display: "block", fontSize: 17, marginBottom: 6 }}>Confirmer l’envoi</b>
                    <p style={{ margin: "0 0 14px", lineHeight: 1.5 }}>« {aConfirmer.sujet} » va partir à <b>{aConfirmer.n} personne{aConfirmer.n > 1 ? "s" : ""}</b> ({aConfirmer.cible}). L’envoi ne peut pas être annulé.</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button style={btn(false)} onClick={() => setAConfirmer(null)}>Non, revenir au message</button>
                        <button style={btn()} disabled={occupe} onClick={confirmerEnvoi}>Oui, envoyer à {aConfirmer.n} personne{aConfirmer.n > 1 ? "s" : ""}</button>
                    </div>
                </div>}
                {c.statut === "erreur" && c.erreur && <p style={{ color: C.danger, fontSize: 13, marginTop: 12 }}>Dernière erreur : {c.erreur}</p>}
                <Msg text={msg.t} err={msg.err} />
            </div>
        )
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            <Aide>Écrivez à tous les adhérents, à ceux qui doivent renouveler leur cotisation, au bureau ou aux inscrits d’une sortie. Envoyez-vous d’abord un test pour vérifier le rendu.</Aide>
            <div style={box}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ ...h2, fontSize: 20, margin: 0 }}>Campagnes <span style={{ color: C.mute, fontWeight: 400 }}>({liste.length})</span></h3>
                    <button style={btn()} onClick={() => { setMsg({ t: "", err: false }); setC({ sujet: "", contenu: "Bonjour,\n\n\n\nLe bureau de l’ACS", cible: "tous", dans_espace: true, statut: "brouillon" }) }}>Nouvelle campagne</button>
                </div>
                {liste.length === 0 && <p style={muted}>Aucune campagne pour l’instant.</p>}
                {liste.map((r) => (
                    <button key={r.id} onClick={() => { setMsg({ t: "", err: false }); setC(r) }} style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: "4px 12px", flexWrap: "wrap", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, borderRadius: 0, padding: "12px 0", color: C.txt, font: "inherit", cursor: "pointer" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sujet}<span style={{ color: C.mute, fontSize: 13 }}> · {CIBLES.find(([k]) => k === r.cible)?.[1]}</span></span>
                        <span style={{ flex: "0 0 auto", fontSize: 13, color: r.statut === "envoyee" ? C.accent : r.statut === "erreur" ? C.danger : C.mute }}>{STAT[r.statut]}{r.statut === "envoyee" ? ` · ${dateFr(r.envoyee_le)} · ${r.nb_envois}${r.stats?.envoyes ? ` · ${Math.round((100 * r.stats.ouverts) / r.stats.envoyes)} % ouverts` : ""}` : ""}</span>
                    </button>
                ))}
                <Msg text={msg.t} err={msg.err} />
            </div>
        </div>
    )
}

// ---------- Salon : demandes d’emplacement des exposants ----------
const STATUTS_SALON: [string, string, string][] = [["nouvelle", "Nouvelle", "#d7b56d"], ["acceptee", "Acceptée", "#9bbd8a"], ["attente", "Liste d’attente", "#b9a3d6"], ["refusee", "Refusée", "#e08a73"], ["annulee", "Annulée", "rgba(246,240,230,0.45)"]]
function GestionSalon({ etroit }: { etroit: boolean }) {
    const [reg, setReg] = React.useState<any | null>(null)
    const [l, setL] = React.useState<any[] | null>(null)
    const [err, setErr] = React.useState("")
    const [filtre, setFiltre] = React.useState("")
    const [ouverte, setOuverte] = React.useState<string | null>(null)
    const [msg, setMsg] = React.useState("")
    const charger = React.useCallback(async () => {
        const c = sb(); if (!c) return
        const r = await c.from("salon_reglages").select("*").order("edition", { ascending: false }).limit(1)
        if (r.error) { setErr(/salon_reglages|schema cache|exist/i.test(r.error.message) ? "La gestion du salon sera disponible dès que la base aura été mise à jour (script « 16. Salon »)." : r.error.message); return }
        const g = r.data?.[0] ?? { edition: new Date().getFullYear() + 1, ouvert: false }
        setReg(g)
        const d = await c.from("demandes_salon").select("*").eq("edition", g.edition).order("cree_le", { ascending: true })
        if (d.error) setErr(d.error.message); else setL(d.data ?? [])
    }, [])
    React.useEffect(() => { charger() }, [charger])
    if (err) return <div style={box}><p style={muted}>{err}</p></div>
    if (!reg || !l) return <div style={box}><p style={muted}>Chargement…</p></div>

    const tarif = (d: any) => Number(d.profil === "Professionnel" ? reg.tarif_pro : reg.tarif_amateur) || 0
    const suggere = (d: any) => Math.round((Number(d.metres_attribues ?? d.metres) || 0) * tarif(d) * 100) / 100
    const majReg = async (k: string, v: any) => { setReg((x: any) => ({ ...x, [k]: v })); const { error } = await sb()!.from("salon_reglages").upsert({ ...reg, [k]: v, maj_le: new Date().toISOString() }); if (error) setMsg("Réglage non enregistré : " + error.message) }
    const maj = async (d: any, champs: any) => {
        setL((x) => x && x.map((y) => (y.id === d.id ? { ...y, ...champs } : y)))
        const { error } = await sb()!.from("demandes_salon").update(champs).eq("id", d.id)
        if (error) { setMsg("Modification non enregistrée : " + error.message); charger() }
    }
    const nouvelle = async () => {
        const { data, error } = await sb()!.from("demandes_salon").insert({ edition: reg.edition, source: "papier", profil: "Professionnel", nom: "Nouvel exposant", email: "a-completer@exemple.fr", categorie: "À compléter", zone_1: ZONES_SALON[2], metres: 2 }).select().single()
        if (error) return setMsg(error.message)
        setL((x) => [...(x || []), data]); setOuverte(data.id)
    }
    const supprimer = async (d: any) => { if (!window.confirm(`Supprimer la demande de « ${d.nom} » ?`)) return; const { error } = await sb()!.from("demandes_salon").delete().eq("id", d.id); if (error) setMsg(error.message); else setL((x) => x && x.filter((y) => y.id !== d.id)) }
    const vis = l.filter((d) => !filtre || d.statut === filtre)
    const parZone = ZONES_SALON.map((z) => {
        const dem = l.filter((d) => d.zone_1 === z && !["refusee", "annulee"].includes(d.statut))
        const att = l.filter((d) => d.statut === "acceptee" && d.zone_attribuee === z)
        return { z, n: dem.length, m: dem.reduce((a, d) => a + Number(d.metres || 0), 0), na: att.length, ma: att.reduce((a, d) => a + Number(d.metres_attribues || 0), 0), ta: att.reduce((a, d) => a + Number(d.tables_attribuees ?? d.tables ?? 0), 0) }
    })
    const acceptees = l.filter((d) => d.statut === "acceptee")
    const totalContrib = acceptees.reduce((a, d) => a + Number(d.contribution || 0), 0), encaisse = acceptees.filter((d) => d.paye).reduce((a, d) => a + Number(d.contribution || 0), 0)
    const nomDepliant = (d: any) => (d.profil === "Amateur" ? d.nom.trim().replace(/^(\S+)\s+(\S).*$/, "$1 $2.") : d.nom)
    const cellule: React.CSSProperties = { padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 14, verticalAlign: "top" }
    const zebre = "#2c231d"
    const champ2: React.CSSProperties = { ...input, padding: "8px 10px", fontSize: 14 }
    const coul = (s: string) => STATUTS_SALON.find((x) => x[0] === s)?.[2] || C.mute
    return (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1fr)" }}>
            <div style={box}>
                <h3 style={{ ...h2, fontSize: 22 }}>Salon {reg.edition}</h3>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 10 }}>
                    <div><span style={label}>Édition</span><input style={input} type="number" value={reg.edition} onChange={(e) => setReg((x: any) => ({ ...x, edition: Number(e.target.value) }))} onBlur={async () => { await sb()!.from("salon_reglages").upsert({ ...reg }); charger() }} /></div>
                    <div><span style={label}>Date limite</span><input style={input} type="date" value={reg.date_limite || ""} onChange={(e) => majReg("date_limite", e.target.value || null)} /></div>
                    <div><span style={label}>Tarif pro (€ / m²)</span><input style={input} type="number" min={0} step={0.5} value={reg.tarif_pro ?? ""} onChange={(e) => majReg("tarif_pro", e.target.value === "" ? null : Number(e.target.value))} /></div>
                    <div><span style={label}>Tarif amateur (€ / m²)</span><input style={input} type="number" min={0} step={0.5} value={reg.tarif_amateur ?? ""} onChange={(e) => majReg("tarif_amateur", e.target.value === "" ? null : Number(e.target.value))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr) minmax(0,1fr)" : "repeat(4, minmax(0,1fr))", gap: 12, marginTop: 12 }}>
                    <div><span style={label}>Premier jour du salon</span><input style={input} type="date" value={reg.date_debut || ""} onChange={(e) => majReg("date_debut", e.target.value || null)} /></div>
                    <div><span style={label}>Dernier jour</span><input style={input} type="date" value={reg.date_fin || ""} onChange={(e) => majReg("date_fin", e.target.value || null)} /></div>
                    <p style={{ ...muted, fontSize: 13, gridColumn: etroit ? "1 / -1" : "span 2", alignSelf: "end" }}>Ces dates servent aux tâches des bénévoles (montage la veille, démontage le lendemain) et aux dates limites du rétroplanning. Pensez à mettre aussi le salon à jour dans l’Agenda : c’est lui qui s’affiche sur l’accueil.</p>
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, cursor: "pointer" }}><input type="checkbox" checked={!!reg.ouvert} onChange={(e) => majReg("ouvert", e.target.checked)} style={{ width: 18, height: 18, accentColor: C.accent }} />Demandes en ligne ouvertes sur la page Salon</label>
                <div style={{ marginTop: 12 }}><span style={label}>Message au-dessus du formulaire (facultatif)</span><input style={input} value={reg.message || ""} onChange={(e) => setReg((x: any) => ({ ...x, message: e.target.value }))} onBlur={(e) => majReg("message", e.target.value || null)} placeholder="Ex. : la grande salle est presque complète" /></div>
                <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                    <div>
                        <span style={label}>Page Salon · liste des exposants</span>
                        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14 }}><input type="checkbox" checked={!!reg.liste_publiee} onChange={(e) => majReg("liste_publiee", e.target.checked)} style={{ width: 18, height: 18, flex: "none", marginTop: 2, accentColor: C.accent }} />
                            <span>Publier la liste des exposants acceptés {reg.edition} ({acceptees.length}). Seuls le stand, la zone, le nom (prénom et initiale pour les amateurs), le département et la catégorie s’affichent. Tant que la case n’est pas cochée, la page montre la dernière liste publiée.</span></label>
                    </div>
                    <div>
                        <span style={label}>Page Salon · dépliant (PDF de 2 pages : recto puis verso)</span>
                        <FichierForm v={reg.depliant_url || ""} set={(u: string) => majReg("depliant_url", u || null)} dossier="depliant" accept="application/pdf" />
                        <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 14, marginTop: 8 }}><input type="checkbox" checked={!!reg.depliant_publie} disabled={!reg.depliant_url} onChange={(e) => majReg("depliant_publie", e.target.checked)} style={{ width: 18, height: 18, flex: "none", accentColor: C.accent }} />Afficher ce dépliant sur la page Salon</label>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: etroit ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 10 }}>
                {parZone.map((z) => (
                    <div key={z.z} style={{ ...box, padding: "14px 16px" }}>
                        <div style={{ fontSize: 13, color: C.mute }}>{z.z}</div>
                        <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{z.ma} m² <span style={{ fontSize: 14, color: C.mute, fontFamily: "inherit", fontWeight: 400 }}>attribués</span></div>
                        <div style={{ fontSize: 12.5, color: C.mute }}>{z.na} stand{z.na > 1 ? "s" : ""} · {z.ta} table{z.ta > 1 ? "s" : ""} · {z.n} demande{z.n > 1 ? "s" : ""} pour {z.m} m²</div>
                    </div>
                ))}
            </div>

            <div style={box}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {[["", `Toutes (${l.length})`], ...STATUTS_SALON.map(([k, t]) => [k, `${t} (${l.filter((d) => d.statut === k).length})`])].map(([k, t]) => <button key={k} onClick={() => setFiltre(k)} style={{ ...small(), background: filtre === k ? C.accent : "transparent", color: filtre === k ? C.accentDark : C.txt, borderColor: filtre === k ? C.accent : C.line }}>{t}</button>)}
                    <span style={{ flex: 1 }} />
                    <button style={small()} onClick={nouvelle}>+ Demande papier</button>
                    <button style={small()} onClick={() => ouvrirFormulairePapier(reg.edition)}>Formulaire vierge</button>
                    <button style={small()} onClick={() => exporter(`demandes-salon-${reg.edition}.csv`, ["Reçue le", "Source", "Profil", "Nom", "Contact", "E-mail", "Téléphone", "Ville", "Dépt", "SIRET", "Catégorie", "Zone 1", "Zone 2", "Surface demandée (m²)", "Tables demandées", "Statut", "Zone attribuée", "Surface attribuée (m²)", "Tables attribuées", "Stand", "Contribution", "Payé", "Remarques", "Note"], l.map((d) => [dateFr(d.cree_le), d.source, d.profil, d.nom, d.contact, d.email, d.telephone, d.ville, d.departement, d.siret, d.categorie, d.zone_1, d.zone_2, d.metres, d.tables, STATUTS_SALON.find((x) => x[0] === d.statut)?.[1], d.zone_attribuee, d.metres_attribues, d.tables_attribuees, d.stand, d.contribution, d.paye ? "oui" : "", d.commentaire, d.note]))}>Exporter (Excel)</button>
                    <button style={small()} disabled={!acceptees.length} onClick={() => exporter(`depliant-exposants-${reg.edition}.csv`, ["Stand", "Zone", "Nom", "Dépt", "Catégorie", "Type"], [...acceptees].sort((a, b) => ZONES_SALON.indexOf(a.zone_attribuee) - ZONES_SALON.indexOf(b.zone_attribuee) || String(a.stand || "").localeCompare(String(b.stand || ""), "fr", { numeric: true })).map((d) => [d.stand, d.zone_attribuee, nomDepliant(d), d.profil === "Professionnel" ? d.departement : "", d.categorie, d.profil === "Amateur" ? "amateur" : ""]))}>Liste pour le dépliant</button>
                </div>
                {msg && <p style={{ margin: "10px 0 0", color: C.danger, fontSize: 14 }}>{msg}</p>}
                <p style={{ ...muted, fontSize: 13, marginTop: 10 }}>Contributions des demandes acceptées : {euros(totalContrib)}, dont {euros(encaisse)} encaissés.</p>
                {vis.length === 0 ? <p style={{ ...muted, marginTop: 14 }}>Aucune demande{filtre ? " dans ce statut" : " pour l’instant"}.</p> : (
                    <div style={{ marginTop: 12, border: `1px solid ${C.line}`, overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
                            <thead><tr>{["Exposant", "Catégorie", "Souhait", "Statut", "Attribution", "Contribution"].map((t) => <th key={t} style={{ ...cellule, textAlign: "left", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mute, fontWeight: 600 }}>{t}</th>)}</tr></thead>
                            <tbody>{vis.map((d, i) => (
                                <React.Fragment key={d.id}>
                                    <tr style={{ background: i % 2 ? zebre : undefined, cursor: "pointer" }} onClick={() => setOuverte(ouverte === d.id ? null : d.id)}>
                                        <td style={cellule}><b style={{ fontWeight: 600 }}>{d.nom}</b><span style={{ display: "block", fontSize: 12.5, color: C.mute }}>{d.profil}{d.departement ? ` · ${d.departement}` : ""}{d.source === "papier" ? " · papier" : ""} · {dateFr(d.cree_le)}</span></td>
                                        <td style={cellule}>{d.categorie}</td>
                                        <td style={cellule}>{d.zone_1}{d.zone_2 ? <span style={{ color: C.mute }}> (ou {d.zone_2})</span> : null}<span style={{ display: "block", fontSize: 12.5, color: C.mute }}>{d.metres} m²{d.tables != null ? ` · ${d.tables} table${d.tables > 1 ? "s" : ""}` : ""}</span></td>
                                        <td style={{ ...cellule, color: coul(d.statut), fontWeight: 600, fontSize: 13 }}>{STATUTS_SALON.find((x) => x[0] === d.statut)?.[1]}</td>
                                        <td style={cellule}>{d.zone_attribuee ? `${d.zone_attribuee} · ${d.metres_attribues ?? "?"} m²${d.tables_attribuees != null ? ` · ${d.tables_attribuees} table${d.tables_attribuees > 1 ? "s" : ""}` : ""}${d.stand ? ` · stand ${d.stand}` : ""}` : <span style={{ color: C.mute }}>—</span>}</td>
                                        <td style={cellule}>{d.contribution != null ? euros(d.contribution) : <span style={{ color: C.mute }}>—</span>}{d.paye ? <span style={{ display: "block", fontSize: 12.5, color: C.accent }}>payé</span> : null}</td>
                                    </tr>
                                    {ouverte === d.id && (
                                        <tr><td colSpan={6} style={{ ...cellule, background: "#1b1511" }}>
                                            <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                                                <div><span style={label}>Statut</span><select style={champ2} value={d.statut} onChange={(e) => maj(d, { statut: e.target.value, ...(e.target.value === "acceptee" && !d.zone_attribuee ? { zone_attribuee: d.zone_1, metres_attribues: d.metres } : {}) })}>{STATUTS_SALON.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
                                                <div><span style={label}>Zone attribuée</span><select style={champ2} value={d.zone_attribuee || ""} onChange={(e) => maj(d, { zone_attribuee: e.target.value || null })}><option value="">—</option>{ZONES_SALON.map((z) => <option key={z}>{z}</option>)}</select></div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                    <div><span style={label}>Surface (m²)</span><input style={champ2} type="number" min={0} step={1} value={d.metres_attribues ?? ""} onChange={(e) => maj(d, { metres_attribues: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                                    <div><span style={label}>Tables</span><input style={champ2} type="number" min={0} step={1} value={d.tables_attribuees ?? ""} placeholder={d.tables != null ? String(d.tables) : ""} onChange={(e) => maj(d, { tables_attribuees: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                                                    <div><span style={label}>Stand n°</span><input style={champ2} value={d.stand || ""} onChange={(e) => setL((x) => x && x.map((y) => (y.id === d.id ? { ...y, stand: e.target.value } : y)))} onBlur={(e) => maj(d, { stand: e.target.value || null })} /></div>
                                                </div>
                                                <div><span style={label}>Contribution (€)</span>
                                                    <div style={{ display: "flex", gap: 6 }}><input style={champ2} type="number" min={0} step={0.5} value={d.contribution ?? ""} onChange={(e) => maj(d, { contribution: e.target.value === "" ? null : Number(e.target.value) })} />
                                                        {tarif(d) > 0 && <button style={{ ...small(), whiteSpace: "nowrap" }} title={`${d.metres_attribues ?? d.metres} m² × ${tarif(d)} €`} onClick={() => maj(d, { contribution: suggere(d) })}>= {euros(suggere(d))}</button>}</div></div>
                                                <label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 22, cursor: "pointer" }}><input type="checkbox" checked={!!d.paye} onChange={(e) => maj(d, { paye: e.target.checked })} style={{ width: 18, height: 18, accentColor: C.accent }} />Contribution payée</label>
                                                <div><span style={label}>Note du bureau</span><input style={champ2} value={d.note || ""} onChange={(e) => setL((x) => x && x.map((y) => (y.id === d.id ? { ...y, note: e.target.value } : y)))} onBlur={(e) => maj(d, { note: e.target.value || null })} /></div>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 12 }}>
                                                {([["nom", "Nom"], ["contact", "Contact"], ["email", "E-mail"], ["telephone", "Téléphone"], ["ville", "Ville"], ["departement", "Dépt"], ["siret", "SIRET"], ["categorie", "Catégorie (dépliant)"]] as const).map(([k, t]) => (
                                                    <div key={k}><span style={{ ...label, color: C.mute }}>{t}</span><input style={champ2} value={d[k] || ""} maxLength={k === "categorie" ? 60 : 160} onChange={(e) => setL((x) => x && x.map((y) => (y.id === d.id ? { ...y, [k]: e.target.value } : y)))} onBlur={(e) => maj(d, { [k]: e.target.value || (k === "nom" || k === "email" || k === "categorie" ? d[k] : null) })} /></div>
                                                ))}
                                                <div><span style={{ ...label, color: C.mute }}>Profil</span><select style={champ2} value={d.profil} onChange={(e) => maj(d, { profil: e.target.value })}><option>Amateur</option><option>Professionnel</option></select></div>
                                            </div>
                                            {d.commentaire && <p style={{ margin: "12px 0 0", fontSize: 14 }}><span style={{ color: C.mute }}>Remarques de l’exposant : </span>{d.commentaire}</p>}
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                                {d.email && !/exemple\.fr$/.test(d.email) && <a style={{ ...small(), textDecoration: "none" }} href={`mailto:${d.email}?subject=${encodeURIComponent(`Salon de Bédée ${reg.edition} : votre emplacement`)}&body=${encodeURIComponent(d.statut === "acceptee" ? `Bonjour,\n\nVotre demande pour le salon ${reg.edition} est acceptée : ${d.zone_attribuee || d.zone_1}, ${d.metres_attribues ?? d.metres} m${d.stand ? `, stand n° ${d.stand}` : ""}.${d.contribution != null ? `\nContribution : ${euros(d.contribution)}.` : ""}\n\nÀ bientôt,\nL’A.C.S.` : "Bonjour,\n\n")}`}>Écrire à l’exposant</a>}
                                                <button style={small()} onClick={() => ouvrirFormulairePapier(reg.edition, d)}>Imprimer la demande</button>
                                                <button style={small(true)} onClick={() => supprimer(d)}>Supprimer</button>
                                            </div>
                                        </td></tr>
                                    )}
                                </React.Fragment>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
