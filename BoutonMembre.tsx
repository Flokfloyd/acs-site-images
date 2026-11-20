// BoutonMembre.tsx — bouton de la barre de navigation : « Connexion » ou, une fois connecté, « Membres » avec un menu
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

const LIENS: [string, string][] = [["Vue d’ensemble", ""], ["Profil", "#profil"], ["Événements", "#evenements"], ["Annuaire", "#annuaire"]]

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function BoutonMembre(props: { page: string; compact: boolean }) {
    const page = props.page || "/espace-membre"
    const [connecte, setConnecte] = React.useState(false)
    const [ouvert, setOuvert] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const c = sb()
        if (!c) return
        c.auth.getSession().then(({ data }: any) => setConnecte(!!data.session))
        const { data } = c.auth.onAuthStateChange((_e: any, s: any) => setConnecte(!!s))
        return () => data.subscription.unsubscribe()
    }, [])
    React.useEffect(() => {
        if (!ouvert) return
        const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
        document.addEventListener("click", f)
        return () => document.removeEventListener("click", f)
    }, [ouvert])

    const style: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(246,240,230,0.4)", background: "transparent", color: "#f6f0e6", padding: props.compact ? "10px 14px" : "10px 20px", font: "600 14px Poppins, sans-serif", textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap", borderRadius: 0 }

    if (!connecte) return <a href={page} style={style}>Connexion</a>

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }} onMouseEnter={() => setOuvert(true)} onMouseLeave={() => setOuvert(false)}>
            <a href={page} style={style} onClick={(e) => { if (props.compact && !ouvert) { e.preventDefault(); setOuvert(true) } }}>
                Membres <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
            </a>
            {ouvert && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: 6, zIndex: 50 }}>
                    <div style={{ background: "#16120f", border: "1px solid rgba(246,240,230,0.2)", minWidth: 190, boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }}>
                        {LIENS.map(([t, h]) => (
                            <a key={t} href={page + h} onClick={() => setOuvert(false)} style={{ display: "block", padding: "11px 16px", color: "#f6f0e6", textDecoration: "none", font: "500 14px Poppins, sans-serif", borderBottom: "1px solid rgba(246,240,230,0.08)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(155,189,138,0.14)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{t}</a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

BoutonMembre.defaultProps = { page: "/espace-membre", compact: false }
addPropertyControls(BoutonMembre, {
    page: { type: ControlType.String, title: "Page", defaultValue: "/espace-membre" },
    compact: { type: ControlType.Boolean, title: "Compact", defaultValue: false },
})
