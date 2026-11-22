// BoutonMembre.tsx — barre de navigation : « Connexion », ou une fois connecté « Membres ▾ » (avec « Administration » pour les admins), puis Adhérer / nom du membre
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

const LIENS_MEMBRE: [string, string][] = [["Vue d’ensemble", ""], ["Profil", "#profil"], ["Collection", "#collection"], ["Sondages", "#sondages"], ["Discussion", "#discussion"], ["Annuaire", "#annuaire"]]
const POLICE = "Poppins, sans-serif"

// Barre de défilement aux couleurs du site (injectée une fois : ce composant est dans la barre de navigation de toutes les pages)
if (typeof document !== "undefined" && !document.getElementById("acs-defilement")) {
    const st = document.createElement("style")
    st.id = "acs-defilement"
    st.textContent = `html{scrollbar-width:thin;scrollbar-color:#9bbd8a #16120f}
html::-webkit-scrollbar{width:9px;height:9px}
html::-webkit-scrollbar-track{background:#16120f}
html::-webkit-scrollbar-thumb{background:#9bbd8a;border-radius:9px;border:2px solid #16120f}
html::-webkit-scrollbar-thumb:hover{background:#b5d1a6}`
    document.head.appendChild(st)
}
if (typeof document !== "undefined" && !document.getElementById("acs-menu-visiteur")) {
    const st = document.createElement("style")
    st.id = "acs-menu-visiteur"
    const lien = (p: string) => `[data-framer-name="Liens"] > *:has(a[href$="${p}"])`
    st.textContent = `html:not(.acs-membre) ${lien("agenda")}, html:not(.acs-membre) ${lien("galerie")}, html:not(.acs-membre):not(.acs-pub-boutique) ${lien("boutique")}, html:not(.acs-membre):not(.acs-pub-semestriels) ${lien("semestriels")} { display: none !important; }`
    document.head.appendChild(st)
}

function Deroulant({ titre, href, liens, compact, style, deconnexion, admin }: { titre: string; href: string; liens: [string, string][]; compact: boolean; style: React.CSSProperties; deconnexion?: boolean; admin?: string }) {
    const [ouvert, setOuvert] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!ouvert) return
        const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
        document.addEventListener("click", f)
        return () => document.removeEventListener("click", f)
    }, [ouvert])
    const item: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "11px 16px", color: "#f6f0e6", background: "transparent", border: "none", borderBottom: "1px solid rgba(246,240,230,0.08)", borderRadius: 0, textDecoration: "none", font: `500 14px ${POLICE}`, cursor: "pointer", boxSizing: "border-box" }
    const survol = { onMouseEnter: (e: any) => (e.currentTarget.style.background = "rgba(155,189,138,0.14)"), onMouseLeave: (e: any) => (e.currentTarget.style.background = "transparent") }
    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }} onMouseEnter={() => setOuvert(true)} onMouseLeave={() => setOuvert(false)}>
            <a href={href} style={style} onClick={(e) => { if (compact && !ouvert) { e.preventDefault(); setOuvert(true) } }}>
                {titre} <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
            </a>
            {ouvert && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: 6, zIndex: 50 }}>
                    <div style={{ background: "#16120f", border: "1px solid rgba(246,240,230,0.2)", minWidth: 210, boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }}>
                        {liens.map(([t, h]) => <a key={t} href={h.startsWith("/") ? h : href + h} onClick={() => setOuvert(false)} style={item} {...survol}>{t}</a>)}
                        {admin && <a href={admin} onClick={() => setOuvert(false)} style={{ ...item, color: "#9bbd8a", fontWeight: 600 }} {...survol}>Administration</a>}
                        {deconnexion && <button onClick={() => { setOuvert(false); sb()?.auth.signOut().finally(() => { window.location.href = "/" }) }} style={{ ...item, color: "rgba(246,240,230,0.7)", borderBottom: "none" }} {...survol}>Se déconnecter</button>}
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function BoutonMembre(props: { page: string; pageAdmin: string; compact: boolean; adhesion: boolean; accent: string }) {
    const page = props.page || "/espace-membre"
    const pageAdmin = props.pageAdmin || "/admin"
    const [connecte, setConnecte] = React.useState(false)
    const [email, setEmail] = React.useState<string | null>(null)
    const [moi, setMoi] = React.useState<{ prenom?: string; nom?: string; cotisation_annee?: number; role?: string } | null>(null)

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
        if (!c || !email) { setMoi(null); return }
        let fini = false
        c.from("adherents").select("prenom,nom,cotisation_annee,role").eq("email", email.toLowerCase()).maybeSingle().then(({ data }: any) => { if (!fini) setMoi(data ?? null) })
        return () => { fini = true }
    }, [email])
    // menu du haut : un visiteur non connecté ne voit que L'association, Salon, Cultiver et Contact
    // (Boutique et Semestriels réapparaissent si l'administration les a ouvertes à tous)
    React.useEffect(() => {
        const h = document.documentElement
        h.classList.toggle("acs-membre", !!moi)
        const c = sb(); if (!c || (window as any).__acsPagesLues) return
        ;(window as any).__acsPagesLues = true
        c.from("pages_acces").select("page,reserve").then(({ data }: any) => { for (const r of data ?? []) h.classList.toggle("acs-pub-" + r.page, r.reserve === false) })
    }, [moi])

    const style: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(246,240,230,0.4)", background: "transparent", color: "#f6f0e6", padding: props.compact ? "10px 14px" : "10px 20px", font: `600 14px ${POLICE}`, textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap", borderRadius: 0 }
    const accent = props.accent || "#9bbd8a"
    const annee = new Date().getFullYear()
    const aJour = !!moi && (moi.cotisation_annee ?? 0) >= annee
    const nomMembre = moi ? [moi.prenom, moi.nom].filter(Boolean).join(" ") : ""
    const plein: React.CSSProperties = { ...style, background: accent, border: `1px solid ${accent}`, color: "#16120f" }
    const adh = !props.adhesion ? null
        : connecte && aJour ? <a href={page + "#profil"} title={`Adhésion ${annee} à jour`} style={plein}>{nomMembre || "Adhérent"}</a>
        : connecte && moi ? <a href="/adhesion" style={plein}>Renouveler · 20 €</a>
        : <a href="/adhesion" style={plein}>Adhérer · 20 €</a>

    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {!connecte ? <a href={page} style={style}>Connexion</a>
                : <Deroulant titre="Membres" href={page} liens={LIENS_MEMBRE} compact={props.compact} style={style} deconnexion admin={moi?.role === "admin" ? pageAdmin : undefined} />}
            {adh}
        </div>
    )
}

BoutonMembre.defaultProps = { page: "/espace-membre", pageAdmin: "/admin", compact: false, adhesion: false, accent: "#9bbd8a" }
addPropertyControls(BoutonMembre, {
    page: { type: ControlType.String, title: "Page membre", defaultValue: "/espace-membre" },
    pageAdmin: { type: ControlType.String, title: "Page admin", defaultValue: "/admin" },
    compact: { type: ControlType.Boolean, title: "Compact", defaultValue: false },
    adhesion: { type: ControlType.Boolean, title: "Bouton Adhérer", defaultValue: false },
    accent: { type: ControlType.Color, title: "Accent", defaultValue: "#9bbd8a" },
})
