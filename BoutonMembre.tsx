// BoutonMembre.tsx — bouton de la barre de navigation : « Connexion » ou, une fois connecté, « Membres » avec un menu
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

const LIENS: [string, string][] = [["Vue d’ensemble", ""], ["Profil", "#profil"], ["Événements", "#evenements"], ["Annuaire", "#annuaire"]]

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function BoutonMembre(props: { page: string; compact: boolean; adhesion: boolean; accent: string }) {
    const page = props.page || "/espace-membre"
    const [connecte, setConnecte] = React.useState(false)
    const [email, setEmail] = React.useState<string | null>(null)
    const [moi, setMoi] = React.useState<{ prenom?: string; nom?: string; cotisation_annee?: number } | null>(null)
    const [ouvert, setOuvert] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const c = sb()
        if (!c) return
        const maj = (s: any) => { setConnecte(!!s); setEmail(s?.user?.email ?? null) }
        c.auth.getSession().then(({ data }: any) => maj(data.session))
        const { data } = c.auth.onAuthStateChange((_e: any, s: any) => maj(s))
        return () => data.subscription.unsubscribe()
    }, [])
    React.useEffect(() => {
        const c = sb()
        if (!c || !email || !props.adhesion) { setMoi(null); return }
        let fini = false
        c.from("adherents").select("prenom,nom,cotisation_annee").eq("email", email.toLowerCase()).maybeSingle().then(({ data }: any) => { if (!fini) setMoi(data ?? null) })
        return () => { fini = true }
    }, [email, props.adhesion])
    React.useEffect(() => {
        if (!ouvert) return
        const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
        document.addEventListener("click", f)
        return () => document.removeEventListener("click", f)
    }, [ouvert])

    const style: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(246,240,230,0.4)", background: "transparent", color: "#f6f0e6", padding: props.compact ? "10px 14px" : "10px 20px", font: "600 14px Poppins, sans-serif", textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap", borderRadius: 0 }

    const accent = props.accent || "#9bbd8a"
    const annee = new Date().getFullYear()
    const aJour = !!moi && (moi.cotisation_annee ?? 0) >= annee
    const nomMembre = moi ? [moi.prenom, moi.nom].filter(Boolean).join(" ") : ""
    const plein: React.CSSProperties = { ...style, background: accent, border: `1px solid ${accent}`, color: "#16120f" }
    const adh = !props.adhesion ? null
        : connecte && aJour ? <a href={page + "#profil"} title={`Adhésion ${annee} à jour`} style={plein}>{nomMembre || "Adhérent"} <span aria-hidden>✓</span></a>
        : connecte && moi ? <a href="/#adhesion" style={plein}>Renouveler · 20 €</a>
        : <a href="/#adhesion" style={plein}>Adhérer · 20 €</a>

    return <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{bouton()}{adh}</div>

    function bouton() {
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
}

BoutonMembre.defaultProps = { page: "/espace-membre", compact: false, adhesion: false, accent: "#9bbd8a" }
addPropertyControls(BoutonMembre, {
    page: { type: ControlType.String, title: "Page", defaultValue: "/espace-membre" },
    compact: { type: ControlType.Boolean, title: "Compact", defaultValue: false },
    adhesion: { type: ControlType.Boolean, title: "Bouton Adhérer", defaultValue: false },
    accent: { type: ControlType.Color, title: "Accent", defaultValue: "#9bbd8a" },
})
