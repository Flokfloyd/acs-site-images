// GaleriePage.tsx — page « Galerie » : toutes les photos de l'association, réservée aux adhérents connectés.
// Sans connexion, la page invite à se connecter puis y ramène automatiquement.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { C, font } from "./AcsBase.tsx"
import { sb, box, btn, h2, muted, GalerieMembres } from "./EspaceMembre.tsx"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function GaleriePage(props: { pageConnexion: string }) {
    const connexion = props.pageConnexion || "/espace-membre"
    const [etat, setEtat] = React.useState<"chargement" | "deconnecte" | "refuse" | "ok">("chargement")
    React.useEffect(() => {
        const c = sb()
        if (!c) return
        const verifier = async (s: any) => {
            if (!s) return setEtat("deconnecte")
            const { data } = await c.rpc("est_membre")
            setEtat(data === true ? "ok" : "refuse")
        }
        c.auth.getSession().then(({ data }: any) => verifier(data.session))
        const { data } = c.auth.onAuthStateChange((_e: any, s: any) => { if (!s) setEtat("deconnecte") })
        return () => data.subscription.unsubscribe()
    }, [])
    const seConnecter = () => { try { sessionStorage.setItem("acs-retour", location.pathname) } catch (e) {} ; window.location.href = connexion }
    const wrap = (x: React.ReactNode) => <div style={{ width: "100%", minWidth: 0, color: C.txt, ...font }}>{x}</div>
    if (etat === "chargement") return wrap(<div style={box}><p style={muted}>Chargement…</p></div>)
    if (etat === "deconnecte") return wrap(
        <div style={box}>
            <h2 style={h2}>Réservée aux adhérents</h2>
            <p style={{ ...muted, marginBottom: 18 }}>Les photos des salons, des sorties et des voyages de l’association sont visibles une fois connecté à l’espace adhérent.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn()} onClick={seConnecter}>Se connecter</button>
                <a href="/adhesion" style={{ ...btn(false), textDecoration: "none" }}>Adhérer à l’association</a>
            </div>
        </div>,
    )
    if (etat === "refuse") return wrap(<div style={box}><h2 style={h2}>Réservée aux adhérents</h2><p style={muted}>Votre adresse ne figure pas dans la liste des adhérents. Contactez le bureau de l’association.</p></div>)
    return wrap(<GalerieMembres />)
}

addPropertyControls(GaleriePage, {
    pageConnexion: { type: ControlType.String, title: "Page de connexion", defaultValue: "/espace-membre" },
})
