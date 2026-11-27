import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"
import { sb } from "./AcsBase.tsx"

// [titre, lien, accès] : "public", "membre", ou le nom de la page réglable dans l'administration
const LINKS: [string, string, string][] = [
  ["L’association", "/association", "public"], ["Agenda", "/agenda", "membre"], ["Salon", "/salon", "public"], ["Cultiver", "/cultiver", "public"],
  ["Semestriels", "/semestriels", "semestriels"], ["Galerie", "/galerie", "membre"], ["Boutique", "/boutique", "boutique"], ["Contact", "/contact", "public"],
]
const FONT = "Poppins, sans-serif"

export default function MenuMobile(props: { accent: string }) {
  const [open, setOpen] = React.useState(false)
  const [connecte, setConnecte] = React.useState(false)
  const [admin, setAdmin] = React.useState(false)
  const [publiques, setPubliques] = React.useState<string[]>([])
  React.useEffect(() => { const c = sb(); if (!c) return; c.from("pages_acces").select("page,reserve").then(({ data }: any) => setPubliques((data ?? []).filter((r: any) => r.reserve === false).map((r: any) => r.page))) }, [])
  React.useEffect(() => {
    const c = sb(); if (!c) return
    const maj = (s: any) => {
      setConnecte(!!s)
      if (!s) return setAdmin(false)
      c.from("adherents").select("role").eq("email", String(s.user.email).toLowerCase()).maybeSingle().then(({ data }: any) => setAdmin(data?.role === "admin"))
    }
    c.auth.getSession().then(({ data }: any) => maj(data.session))
    const { data } = c.auth.onAuthStateChange((_e: any, s: any) => maj(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const accent = props.accent || "#9bbd8a"
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", k)
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", k) }
  }, [open])
  const bar: React.CSSProperties = { display: "block", width: 22, height: 2, background: "#f6f0e6" }
  return (
    <div style={{ width: "100%", height: 44, display: "flex", justifyContent: "flex-end" }}>
      <button aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)}
        style={{ width: 44, height: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, background: "transparent", border: "1px solid rgba(246,240,230,0.25)", borderRadius: 0, cursor: "pointer", padding: 0 }}>
        <span style={bar} /><span style={bar} /><span style={bar} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#16120f", color: "#f6f0e6", fontFamily: FONT, display: "flex", flexDirection: "column", padding: "20px 24px 32px", overflowY: "auto", animation: "acsMenuIn 220ms ease" }}>
          <style>{"@keyframes acsMenuIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}"}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ font: "600 12px " + FONT, letterSpacing: "0.12em", textTransform: "uppercase", color: accent }}>Menu</span>
            <button aria-label="Fermer le menu" onClick={() => setOpen(false)} style={{ width: 44, height: 44, background: "transparent", border: "1px solid rgba(246,240,230,0.25)", borderRadius: 0, color: "#f6f0e6", font: "400 20px " + FONT, cursor: "pointer" }}>✕</button>
          </div>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {LINKS.filter(([, , a]) => a === "public" || connecte || publiques.includes(a)).map(([t, h]) => (
              <a key={t} href={h} onClick={() => setOpen(false)} style={{ font: "600 30px Fraunces, serif", color: "#f6f0e6", textDecoration: "none", padding: "14px 0", borderBottom: "1px solid rgba(246,240,230,0.12)" }}>{t}</a>
            ))}
          </nav>
          <div style={{ marginTop: 28, border: "1px solid rgba(246,240,230,0.2)", padding: "16px 18px" }}>
            <span style={{ font: "600 12px " + FONT, letterSpacing: "0.12em", textTransform: "uppercase", color: accent }}>Membres</span>
            {connecte ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                {[["Vue d’ensemble", ""], ["Profil", "#profil"], ["Collection", "#collection"], ["Sondages", "#sondages"], ["Discussion", "#discussion"], ["Annuaire", "#annuaire"], ["Bibliothèque", "/bibliotheque"]].map(([t, h]) => (
                  <a key={t} href={h.startsWith("/") ? h : "/espace-membre" + h} onClick={() => setOpen(false)} style={{ font: "500 15px " + FONT, color: "#f6f0e6", textDecoration: "none", padding: "10px 12px", border: "1px solid rgba(246,240,230,0.14)" }}>{t}</a>
                ))}
              </div>
            ) : null}
            {connecte && admin && <a href="/admin" onClick={() => setOpen(false)} style={{ display: "block", marginTop: 8, font: "600 15px " + FONT, color: accent, textDecoration: "none", padding: "10px 12px", border: "1px solid " + accent }}>Administration →</a>}
            {connecte && <button onClick={() => { setOpen(false); sb()?.auth.signOut().finally(() => { window.location.href = "/" }) }} style={{ marginTop: 10, background: "transparent", border: "none", padding: 0, font: "500 14px " + FONT, color: "rgba(246,240,230,0.7)", cursor: "pointer", textDecoration: "underline" }}>Se déconnecter</button>}
            {!connecte && (
              <a href="/espace-membre" onClick={() => setOpen(false)} style={{ display: "block", marginTop: 10, font: "600 16px " + FONT, color: "#f6f0e6", textDecoration: "none" }}>Se connecter à l’espace membre →</a>
            )}
          </div>
          <a href="/adhesion" onClick={() => setOpen(false)} style={{ marginTop: 16, background: accent, color: "#16120f", font: "600 16px " + FONT, textDecoration: "none", textAlign: "center", padding: "16px 24px" }}>Adhérer · 20 €</a>
          <a href="/mentions-legales" onClick={() => setOpen(false)} style={{ marginTop: 20, font: "400 13px " + FONT, color: "#8a7d6f", textDecoration: "none", textAlign: "center" }}>Mentions légales et confidentialité</a>
        </div>, document.body)}
    </div>
  )
}
;(MenuMobile as any).defaultProps = { accent: "#9bbd8a", width: 56, height: 44 }
addPropertyControls(MenuMobile, { accent: { type: ControlType.Color, title: "Accent", defaultValue: "#9bbd8a" } })
