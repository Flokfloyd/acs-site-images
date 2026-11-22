// PorteAdherents.tsx — à placer en tête d'une page : tant que le visiteur n'est pas un adhérent connecté,
// le reste de la page est masqué et remplacé par une invitation à se connecter (retour automatique ensuite).
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb, C, font, serif } from "./AcsBase.tsx"

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function PorteAdherents(props: { titre: string; texte: string; pageConnexion: string }) {
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
    if (etat === "ok") return <div className="acs-porte-ouverte" style={{ height: 0 }} />
    const seConnecter = () => { try { sessionStorage.setItem("acs-retour", location.pathname) } catch (e) {} ; window.location.href = props.pageConnexion || "/espace-membre" }
    const bouton = (plein: boolean): React.CSSProperties => ({ background: plein ? C.accent : "transparent", color: plein ? C.accentDark : C.txt, border: plein ? "none" : `1px solid ${C.line}`, borderRadius: 0, padding: "12px 20px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" })
    return (
        <div className="acs-porte" style={{ width: "100%", background: "#16120f", color: C.txt, ...font, padding: "clamp(56px, 9vw, 96px) clamp(20px, 4vw, 40px)", boxSizing: "border-box", minHeight: "60vh" }}>
            {/* masque le reste de la page tant que l'accès n'est pas confirmé */}
            <style>{":has(> .acs-porte) ~ *, :has(> * > .acs-porte) ~ * { display: none !important; }"}</style>
            <div style={{ maxWidth: 1120, margin: "0 auto" }}>
                <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, fontWeight: 600 }}>Réservé aux adhérents</div>
                <h1 style={{ fontFamily: serif, fontSize: "clamp(34px, 5vw, 52px)", lineHeight: 1.1, fontWeight: 600, margin: "14px 0 28px" }}>{props.titre}</h1>
                <div style={{ background: C.panel, border: `1px solid ${C.line}`, padding: "clamp(18px, 4vw, 28px)", maxWidth: 720 }}>
                    {etat === "chargement" ? <p style={{ margin: 0, color: C.mute }}>Chargement…</p> : etat === "refuse" ? (
                        <p style={{ margin: 0, color: C.mute }}>Votre adresse ne figure pas dans la liste des adhérents. Contactez le bureau de l’association.</p>
                    ) : <>
                        <p style={{ margin: "0 0 18px", color: C.mute }}>{props.texte}</p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button style={bouton(true)} onClick={seConnecter}>Se connecter</button>
                            <a href="/adhesion" style={bouton(false)}>Adhérer à l’association</a>
                        </div>
                    </>}
                </div>
            </div>
        </div>
    )
}

PorteAdherents.defaultProps = { titre: "Page réservée", texte: "Cette page est réservée aux adhérents de l’association.", pageConnexion: "/espace-membre" }
addPropertyControls(PorteAdherents, {
    titre: { type: ControlType.String, title: "Titre", defaultValue: "Page réservée" },
    texte: { type: ControlType.String, title: "Texte", displayTextArea: true, defaultValue: "Cette page est réservée aux adhérents de l’association." },
    pageConnexion: { type: ControlType.String, title: "Page de connexion", defaultValue: "/espace-membre" },
})
