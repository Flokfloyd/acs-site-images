// GuideAdmin.tsx — le mode d'emploi du site pour les administrateurs (onglet « Guide » de l'administration)
import * as React from "react"
import { C, font, serif } from "./AcsBase.tsx"

const p: React.CSSProperties = { margin: "0 0 10px", lineHeight: 1.65 }
const li: React.CSSProperties = { margin: "0 0 6px", lineHeight: 1.6 }
const code: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, background: "rgba(246,240,230,.08)", padding: "1px 5px" }
const A = (props: { href: string; children: React.ReactNode }) => <a href={props.href} target="_blank" rel="noreferrer" style={{ color: C.accent }}>{props.children}</a>

function Partie(props: { titre: string; ouvert?: boolean; children: React.ReactNode }) {
    return (
        <details open={props.ouvert} style={{ borderTop: `1px solid ${C.line}`, padding: "4px 0" }}>
            <summary style={{ cursor: "pointer", padding: "14px 0", fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.txt, listStyle: "revert" }}>{props.titre}</summary>
            <div style={{ padding: "0 0 18px", color: C.txt, maxWidth: 760 }}>{props.children}</div>
        </details>
    )
}

export default function GuideAdmin() {
    return (
        <div style={{ ...font, color: C.txt }}>
            <p style={{ ...p, color: C.mute, maxWidth: 760 }}>
                Ce qu’il faut savoir pour faire tourner le site au quotidien, et quoi faire quand quelque chose coince. Cliquez sur un titre pour l’ouvrir.
            </p>

            <Partie titre="Comment le site est fait" ouvert>
                <p style={p}>Le site repose sur quatre services gratuits, chacun avec son rôle :</p>
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}><b>Framer</b> : les pages, les textes, les photos et la mise en page. C’est là qu’on modifie ce que voit le public, puis on clique sur <i>Publish</i>.</li>
                    <li style={li}><b>Supabase</b> : la base de données. Adhérents, agenda, inscriptions, boutique, galerie, semestriels, demandes d’exposants, collections… Tout ce qu’on gère depuis cette administration y est rangé. C’est aussi lui qui gère la connexion des membres.</li>
                    <li style={li}><b>Brevo</b> : l’envoi des e-mails (codes de connexion, campagnes). 300 e-mails par jour au maximum.</li>
                    <li style={li}><b>GitHub</b> : un dépôt public qui contient les pages des anciens semestriels, le dépliant du salon, les listes de plantes de « Ma collection » et une petite tâche automatique qui empêche Supabase de se mettre en veille. Aucune donnée d’adhérent n’y est stockée, et il ne faut jamais en mettre.</li>
                </ul>
                <p style={p}>Au quotidien, on n’a besoin que de deux choses : cette administration pour le contenu qui change souvent, et Framer pour les textes et photos fixes des pages.</p>
            </Partie>

            <Partie titre="Les comptes et qui y a accès">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}><A href="https://framer.com">Framer</A> : compte « A.C.S. Armorique Cactus Succulentes », projet du site.</li>
                    <li style={li}><A href="https://supabase.com/dashboard">Supabase</A> : organisation « ACS », projet hébergé en Irlande. On s’y connecte avec le compte GitHub.</li>
                    <li style={li}><A href="https://github.com/Flokfloyd/acs-site-images">GitHub</A> : dépôt <span style={code}>Flokfloyd/acs-site-images</span>.</li>
                    <li style={li}><A href="https://app.brevo.com">Brevo</A> : envoi des e-mails, branché dans Supabase (Authentication › Emails › SMTP).</li>
                    <li style={li}>AssoConnect : toujours utilisé pour encaisser les adhésions et les ventes au salon.</li>
                </ul>
                <p style={p}>Aujourd’hui ces comptes sont au nom de Florentin. À terme, il faudrait les passer au nom de l’association, ou au moins y ajouter un deuxième administrateur, pour que le site ne dépende pas d’une seule personne. Les mots de passe ne sont écrits nulle part sur le site : ils se transmettent de vive voix.</p>
            </Partie>

            <Partie titre="Ce qu’on fait dans l’administration, onglet par onglet">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}><b>Agenda</b> : les sorties, réunions et le salon. Ce qui est publié s’affiche sur l’accueil et dans l’espace membre. On peut ouvrir les inscriptions aux adhérents, avec un prix (0 = gratuit) et un nombre de places.</li>
                    <li style={li}><b>Contrôle des billets</b> : le jour J, on scanne le QR code du billet avec le téléphone pour vérifier l’inscription.</li>
                    <li style={li}><b>Adhésions et paiements</b> : on importe l’export AssoConnect (une fois par mois suffit) et on note à la main les chèques et espèces. En bas, les <b>campagnes d’adhésion</b> : une ligne par année, avec la date à partir de laquelle elle s’affiche sur la page Adhésion, le tarif et le lien de paiement AssoConnect. Penser à créer l’année suivante chaque automne.</li>
                    <li style={li}><b>Adhérents</b> : la liste des membres, leur code de connexion personnel, leur statut. Un membre qui ne reçoit pas son code : vérifier qu’il est bien « actif » et que son e-mail est juste, puis lui renvoyer.</li>
                    <li style={li}><b>Comptabilité</b> : recettes et dépenses, avec la photo ou le PDF du justificatif.</li>
                    <li style={li}><b>Salon</b> : les demandes des exposants (en ligne ou papier). On accepte, on attribue la zone, les mètres et le stand, on ajuste la contribution, on coche « payé ». Les réglages du haut ouvrent ou ferment les demandes et fixent les tarifs au mètre. Deux exports : le tableau complet et la liste pour le dépliant. Quand les stands sont attribués, cocher « Publier la liste des exposants acceptés » : la page Salon affiche alors la nouvelle liste. Le dépliant se charge au même endroit, en PDF de 2 pages (recto puis verso, trois volets par page), puis on coche « Afficher ce dépliant ». Les dates du salon se saisissent en haut de cet écran.</li>
                    <li style={li}><b>Salon › Tâches des bénévoles</b> : un tableau façon agenda, avec les jours en colonnes (veille du salon pour le montage, lendemain pour le démontage) et les heures en lignes. On ajoute une tâche (montage, buvette…) avec le jour, les horaires et le nombre de personnes nécessaires. Les adhérents la voient dans la fiche du salon (page Agenda), touchent une case et s’inscrivent, eux ou leur conjoint noté dans leur fiche. En cliquant sur une case, le bureau peut inscrire ou retirer quelqu’un, changer les horaires ou le besoin. « Liste des tâches proposées » garde les intitulés d’une année sur l’autre, « Recopier les tâches de l’an dernier » refait le tableau aux nouvelles dates, « Imprimer » donne une feuille pour le jour J.</li>
                    <li style={li}><b>Salon › Rétroplanning</b> : la liste des choses à faire avant le salon, visible du bureau seulement. Chaque tâche est réglée en « semaines avant le salon », la date limite se calcule toute seule. On coche quand c’est fait. Ce qui est en retard ou à faire dans les 15 jours remonte dans un bandeau orange en haut de l’administration. Après le salon, « Préparer le salon de l’année suivante » recopie la liste.</li>
                    <li style={li}><b>Boutique</b> : les articles de la page Boutique. Sans prix ou avec un stock à 0, l’article s’affiche « Rupture ».</li>
                    <li style={li}><b>Campagnes e-mail</b> : écrire aux adhérents. Toujours s’envoyer un test d’abord, et vérifier la liste des destinataires avant d’envoyer à tout le monde.</li>
                    <li style={li}><b>Sondages</b> : questions posées aux membres dans leur espace.</li>
                    <li style={li}><b>Galerie</b> : les photos. Les 6 premières passent sur l’accueil. Pas de personne reconnaissable sans son accord.</li>
                    <li style={li}><b>Semestriels</b> : pour un nouveau numéro, on charge le PDF final et la couverture, on coche « Publier ». Il apparaît tout de suite dans la liseuse.</li>
                </ul>
                <p style={p}>Tout en bas de la page, le bouton <b>Sauvegarde</b> télécharge une copie de toutes les données. À faire une fois par mois, et à ranger dans le dossier Drive de l’association.</p>
            </Partie>

            <Partie titre="Modifier une page dans Framer">
                <ol style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}>Ouvrir le projet du site dans Framer (application ou navigateur).</li>
                    <li style={li}>Choisir la page à gauche, puis double-cliquer sur un texte pour le changer, ou sur une photo pour la remplacer.</li>
                    <li style={li}>Vérifier les trois tailles d’écran (ordinateur, tablette, téléphone) en haut de l’écran.</li>
                    <li style={li}>Cliquer sur <b>Publish</b> en haut à droite. Rien n’est en ligne tant qu’on n’a pas publié.</li>
                </ol>
                <p style={p}>Certains blocs sont des « composants de code » : l’agenda, la galerie, la boutique, la liseuse, le formulaire d’exposant, la page Adhésion, l’espace membre et cette administration. On peut les déplacer ou les supprimer, mais leur contenu se change ici, pas dans Framer. Ne pas ouvrir ni modifier leur code sans savoir ce qu’on fait.</p>
                <p style={p}>Si une modification tourne mal, Framer garde l’historique des versions : menu du site › Versions, puis on revient à la précédente.</p>
            </Partie>

            <Partie titre="Le calendrier de l’année">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}><b>Chaque mois</b> : import AssoConnect, sauvegarde.</li>
                    <li style={li}><b>Automne</b> : créer la campagne d’adhésion de l’année suivante sur AssoConnect, puis l’ajouter ici avec son lien. Elle s’affiche le 1er décembre (date modifiable).</li>
                    <li style={li}><b>Février</b> : assemblée générale. Mettre à jour la composition du bureau sur la page L’association (Framer) si elle change.</li>
                    <li style={li}><b>Hiver – printemps</b> : ouvrir les demandes d’exposants (onglet Salon), traiter les demandes au fil de l’eau, fixer les dates dans l’agenda. Quand le dépliant est prêt : charger le PDF et publier la liste des exposants.</li>
                    <li style={li}><b>Après le salon</b> : fermer les demandes, mettre à jour les chiffres de l’accueil (exposants, visiteurs) dans Framer.</li>
                    <li style={li}><b>Deux fois par an</b> : publier le nouveau semestriel.</li>
                    <li style={li}><b>Fin octobre</b> : renouveler la remise association de Framer (formule Basic offerte un an, jusqu’au 22 novembre). Un bandeau jaune l’annonce en haut de l’administration un mois avant, jusqu’à ce qu’on clique sur « C’est fait ».</li>
                </ul>
            </Partie>

            <Partie titre="Quand quelque chose ne marche pas">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}><b>L’espace membre reste sur « Chargement… », l’agenda ou la boutique sont vides.</b> Supabase s’est sans doute mis en veille (après une semaine sans aucune visite). Aller sur Supabase, ouvrir le projet et cliquer sur « Restore ». Rien n’est perdu, il faut quelques minutes.</li>
                    <li style={li}><b>Les codes de connexion n’arrivent plus.</b> Regarder d’abord dans les indésirables. Sinon, vérifier sur Brevo que le quota du jour n’est pas dépassé (300). Si la clé Brevo a été changée, il faut aussi la recopier dans Supabase › Authentication › Emails › SMTP.</li>
                    <li style={li}><b>Le site public ne s’affiche plus.</b> Vérifier dans Framer (Settings › Plans) que la formule Basic est toujours active : si la remise n’a pas été renouvelée, le site repasse en gratuit, limité à 1 Go de trafic par mois.</li>
                    <li style={li}><b>Les messages du formulaire Contact n’arrivent pas.</b> Dans Framer, vérifier que l’adresse de réception est bien validée (réglages du formulaire).</li>
                    <li style={li}><b>Un adhérent n’arrive pas à se connecter.</b> Vérifier dans l’onglet Adhérents son e-mail et son statut, lui renvoyer son code ou un e-mail de connexion.</li>
                </ul>
            </Partie>

            <Partie titre="Les limites des offres gratuites">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}>Framer : formule Basic offerte à l’association (50 Go de trafic par mois), à redemander chaque année.</li>
                    <li style={li}>Supabase : 500 Mo de données et 1 Go de fichiers (on en utilise une trentaine de Mo), pas de sauvegarde automatique, mise en veille après une semaine sans activité.</li>
                    <li style={li}>Brevo : 300 e-mails par jour. Une campagne aux 100 adhérents passe sans problème.</li>
                </ul>
                <p style={p}>Pour 100 à 200 adhérents, c’est largement suffisant. Le seul vrai point à surveiller est le renouvellement de la remise Framer chaque automne.</p>
            </Partie>

            <Partie titre="Ce qu’il ne faut pas faire">
                <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                    <li style={li}>Mettre des données d’adhérents (noms, e-mails, téléphones) sur GitHub ou dans une page publique.</li>
                    <li style={li}>Supprimer une table ou lancer un script dans Supabase sans savoir ce qu’il fait.</li>
                    <li style={li}>Envoyer une campagne e-mail sans s’être envoyé un test.</li>
                    <li style={li}>Donner les clés ou mots de passe par e-mail ou dans un message.</li>
                    <li style={li}>Oublier de cliquer sur Publish après une modification dans Framer.</li>
                </ul>
            </Partie>
        </div>
    )
}
