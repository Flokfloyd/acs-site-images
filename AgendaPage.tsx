// AgendaPage.tsx — page « Agenda » : sorties, inscriptions, billets et tâches des bénévoles du salon.
// Réservée aux adhérents connectés (même fonctionnement que la page Galerie).
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { Evenements } from "./EspaceMembre.tsx"
import { ReserveAdherents } from "./GaleriePage.tsx"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function AgendaPage(props: { pageConnexion: string }) {
    return <ReserveAdherents pageConnexion={props.pageConnexion} texte="Les sorties, les inscriptions et les tâches des bénévoles du salon sont visibles une fois connecté à l’espace adhérent. Le salon, lui, est ouvert à tous : voir la page Salon." contenu={(moi) => <Evenements moi={moi} />} />
}

addPropertyControls(AgendaPage, {
    pageConnexion: { type: ControlType.String, title: "Page de connexion", defaultValue: "/espace-membre" },
})
