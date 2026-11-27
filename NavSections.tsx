// NavSections.tsx — navigation par grandes tuiles, commune à l'espace membre et à l'administration.
// Ordinateur : une colonne de tuiles à gauche (icône, titre, description), le contenu à droite.
// Téléphone : la liste des tuiles sert d'accueil ; une tuile ouvre sa rubrique, « ← Toutes les rubriques » y revient.
// Une rubrique peut avoir des sous-rubriques : elles s'affichent en onglets au-dessus du contenu.
import * as React from "react"
import { C, serif } from "./AcsBase.tsx"

export type Rubrique = { k: string; titre: string; desc?: string; icone: string; badge?: number | string; sous?: [string, string][] }

const P: Record<string, React.ReactNode> = {
    accueil: <><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
    profil: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
    plante: <><path d="M12 21V9" /><path d="M9 21h6" /><rect x="9" y="4" width="6" height="9" rx="3" /><path d="M9 8H6.5a1.5 1.5 0 0 0-1.5 1.5V11a2 2 0 0 0 2 2h2" /><path d="M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V12a2 2 0 0 1-2 2h-2" /></>,
    sondage: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 15v-3M12 15V8M16 15v-5" /></>,
    discussion: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
    annuaire: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="2.5" /><path d="M8.5 16c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" /></>,
    agenda: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="M8 14h2M12 14h2M8 17h2" /></>,
    adherents: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c1-3.4 3.2-5 6-5s5 1.6 6 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.4.2 4 1.7 5 4.3" /></>,
    compta: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8" /><path d="M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0" /></>,
    salon: <><path d="M3 10l9-6 9 6" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /><path d="M3 10h18" /></>,
    communication: <><path d="M4 10v4h3l6 4V6L7 10z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
    site: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18M8 21h8M12 18v3" /></>,
    guide: <><path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h9" /><path d="M9 8h5" /></>,
}
export function Icone({ nom, taille = 26 }: { nom: string; taille?: number }) {
    return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flexShrink: 0 }}>{P[nom] || P.accueil}</svg>
}

function Badge({ v }: { v?: number | string }) {
    if (!v) return null
    return <span style={{ marginLeft: "auto", alignSelf: "flex-start", background: C.accent, color: C.accentDark, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "1px 8px", lineHeight: 1.6 }}>{v}</span>
}

function Tuile({ r, actif, onClick, compacte }: { r: Rubrique; actif: boolean; onClick: () => void; compacte?: boolean }) {
    return (
        <button onClick={onClick} aria-current={actif ? "page" : undefined}
            style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", gap: 14, alignItems: compacte ? "center" : "flex-start", width: "100%", padding: compacte ? "14px 16px" : "16px 16px 16px 14px",
                background: actif ? C.panel2 : C.panel, border: `1px solid ${actif ? C.accent : C.line}`, borderLeft: `4px solid ${actif ? C.accent : "transparent"}`, color: C.txt, transition: "background .15s, border-color .15s" }}
            onMouseEnter={(e) => { if (!actif) e.currentTarget.style.background = C.panel2 }} onMouseLeave={(e) => { if (!actif) e.currentTarget.style.background = C.panel }}>
            <span style={{ color: actif ? C.accent : C.txt, opacity: actif ? 1 : 0.85, paddingTop: compacte ? 0 : 2 }}><Icone nom={r.icone} /></span>
            <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 15.5, lineHeight: 1.3 }}>{r.titre}</span>
                {r.desc && <span style={{ display: "block", fontSize: 13, color: C.mute, lineHeight: 1.4, marginTop: 3 }}>{r.desc}</span>}
            </span>
            <Badge v={r.badge} />
        </button>
    )
}

export function SousOnglets({ items, actif, choisir }: { items: [string, string][]; actif: string; choisir: (k: string) => void }) {
    return <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map(([k, t]) => <button key={k} role="tab" aria-selected={actif === k} onClick={() => choisir(k)} style={{ background: actif === k ? C.accent : "transparent", color: actif === k ? C.accentDark : C.txt, border: `1px solid ${actif === k ? C.accent : C.line}`, borderRadius: 0, padding: "8px 14px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t}</button>)}
    </div>
}

// rubriques : la liste des tuiles ; actif : la rubrique ouverte (null = liste des tuiles, sur téléphone)
export function NavSections({ rubriques, actif, choisir, etroit, children, sousActif, choisirSous }: {
    rubriques: Rubrique[]; actif: string | null; choisir: (k: string | null) => void; etroit: boolean; children: React.ReactNode; sousActif?: string; choisirSous?: (k: string) => void
}) {
    // largeur réelle du bloc : sous 860 px, présentation téléphone (tuiles en liste, une rubrique à la fois)
    const [l, setL] = React.useState(1200)
    const ro = React.useRef<ResizeObserver | null>(null)
    const boite = React.useCallback((el: HTMLElement | null) => {
        ro.current?.disconnect()
        if (el && typeof ResizeObserver !== "undefined") { ro.current = new ResizeObserver(([e]) => setL(e.contentRect.width)); ro.current.observe(el) }
    }, [])
    etroit = etroit || l < 860
    const r0 = rubriques.find((x) => x.k === actif) || null
    const r = r0 || (etroit ? null : rubriques[0])
    const entete = r && <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: C.accent }}><Icone nom={r.icone} taille={30} /></span>
            <div style={{ minWidth: 0 }}><h2 style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, margin: 0, fontWeight: 600 }}>{r.titre}</h2>{r.desc && <p style={{ margin: "2px 0 0", color: C.mute, fontSize: 14 }}>{r.desc}</p>}</div>
        </div>
        {r.sous && r.sous.length > 1 && choisirSous && <SousOnglets items={r.sous} actif={sousActif || r.sous[0][0]} choisir={choisirSous} />}
    </div>
    if (etroit) {
        if (!r) return <nav ref={boite} aria-label="Rubriques" style={{ display: "grid", gridTemplateColumns: l >= 520 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: 8 }}>{rubriques.map((x) => <Tuile key={x.k} r={x} actif={false} onClick={() => choisir(x.k)} compacte />)}</nav>
        return <div ref={boite} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <button onClick={() => choisir(null)} style={{ all: "unset", cursor: "pointer", color: C.accent, fontSize: 14.5, fontWeight: 600, padding: "4px 0" }}>← Toutes les rubriques</button>
            {entete}{children}
        </div>
    }
    return (
        <div ref={boite} style={{ display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", gap: 28, alignItems: "start" }}>
            <nav aria-label="Rubriques" style={{ display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 90 }}>
                {rubriques.map((x) => <Tuile key={x.k} r={x} actif={x.k === r!.k} onClick={() => choisir(x.k)} />)}
            </nav>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>{entete}{children}</div>
        </div>
    )
}
