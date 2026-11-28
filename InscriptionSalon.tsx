// InscriptionSalon.tsx — demande d’emplacement des exposants au salon (formulaire en ligne + version papier à imprimer)
// Les demandes arrivent dans l’administration, onglet « Salon ». Aucun compte n’est nécessaire pour l’exposant.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { C, font, serif, sb } from "./AcsBase.tsx"

export const ZONES_SALON = ["Petite salle", "Entre les salles", "Grande salle", "Terrain de sport"] as const
const SURFACES = [4, 6, 8, 10, 12]   // m² ; une case libre permet d’en demander plus
const TABLES = [0, 1, 2, 3, 4]          // tables de 0,80 × 1,80 m, selon le stock

const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", colorScheme: "dark", background: "#0f0c0a", color: C.txt, border: `1px solid ${C.line}`, borderRadius: 0, padding: "11px 13px", font: "inherit", fontSize: 15, outline: "none" }
const etiq: React.CSSProperties = { display: "block", fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "0 0 6px" }
const aide: React.CSSProperties = { fontSize: 12.5, color: C.mute, margin: "5px 0 0" }
const bouton = (plein = true): React.CSSProperties => ({ background: plein ? C.accent : "transparent", color: plein ? C.accentDark : C.txt, border: plein ? `1px solid ${C.accent}` : `1px solid ${C.line}`, borderRadius: 0, padding: "13px 22px", font: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" })
const echap = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

type Reglages = { edition: number; ouvert: boolean; date_limite: string | null; message: string | null }
type Demande = { profil: "Amateur" | "Professionnel" | ""; nom: string; contact: string; email: string; telephone: string; ville: string; departement: string; siret: string; categorie: string; zone_1: string; zone_2: string; metres: number; tables: number; commentaire: string }
const vide: Demande = { profil: "", nom: "", contact: "", email: "", telephone: "", ville: "", departement: "", siret: "", categorie: "", zone_1: "", zone_2: "", metres: 4, tables: 1, commentaire: "" }

// version papier : même questions, cases à cocher et lignes à remplir, prête à imprimer ou enregistrer en PDF
export function ouvrirFormulairePapier(edition: number, rempli?: Demande) {
    const w = window.open("", "_blank")
    if (!w) return false
    const v = (x?: string | number) => (rempli && x != null && x !== "" ? `<span class="val">${echap(String(x))}</span>` : "")
    const coche = (ok: boolean) => `<span class="case">${ok ? "✕" : ""}</span>`
    const ligne = (titre: string, val?: string | number, note = "") => `<div class="l"><div class="t">${titre}${note ? `<small>${note}</small>` : ""}</div><div class="r">${v(val)}</div></div>`
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Demande d’emplacement · salon ${edition}</title><style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font:10.5pt/1.4 Arial,sans-serif;color:#1a1a1a;background:#e9e5df}
.page{max-width:182mm;margin:0 auto;background:#fff;padding:14mm;box-shadow:0 2px 12px rgba(0,0,0,.15)}
h1{font:600 17pt Georgia,serif;margin:0}h2{font:600 11.5pt Georgia,serif;margin:16pt 0 6pt;border-bottom:.8pt solid #1a1a1a;padding-bottom:2pt}
.sous{color:#555;margin:3pt 0 0}.l{display:flex;gap:8pt;align-items:flex-end;margin:7pt 0}.t{width:52mm;flex:none}.t small{display:block;color:#666;font-size:8.5pt}
.r{flex:1;border-bottom:.6pt dotted #777;min-height:15pt}.val{font-weight:600}.case{display:inline-block;width:10pt;height:10pt;border:.8pt solid #1a1a1a;margin-right:5pt;vertical-align:-1pt;text-align:center;font-size:8pt;line-height:10pt}
.choix{display:flex;flex-wrap:wrap;gap:6pt 16pt;margin:6pt 0}.cadre{border:.6pt solid #999;min-height:22mm;padding:4pt}.pied{margin-top:14pt;font-size:9pt;color:#444}
.barre{position:sticky;top:0;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px;background:#1d1612;color:#f6f0e6;font:14px Arial,sans-serif}
.barre button{background:#9bbd8a;color:#1d1612;border:0;padding:9px 16px;font:600 14px Arial,sans-serif;cursor:pointer}
@media print{body{background:#fff}.barre{display:none}.page{box-shadow:none;padding:0;max-width:none}}</style></head><body>
<div class="barre"><span>Imprimez cette page ou enregistrez-la en PDF.</span><button onclick="print()">Imprimer</button></div>
<div class="page"><h1>Salon des plantes de Bédée ${edition}</h1><p class="sous">Demande d’emplacement exposant · A.C.S. Armorique Cactus Succulentes</p>
<h2>Vous êtes</h2><div class="choix">${coche(rempli?.profil === "Amateur")}Amateur (collectionneur) ${coche(rempli?.profil === "Professionnel")}Professionnel (producteur, pépinière)</div>
${ligne("Nom de la pépinière, de l’association ou vos prénom et nom", rempli?.nom)}
${ligne("Personne à contacter", rempli?.contact)}
${ligne("E-mail", rempli?.email)}${ligne("Téléphone", rempli?.telephone)}
${ligne("Ville", rempli?.ville)}${ligne("Département", rempli?.departement)}
${ligne("N° SIRET", rempli?.siret, "professionnels")}
<h2>Ce que vous présentez</h2>
${ligne("Catégorie de végétaux", rempli?.categorie, "60 caractères au plus, repris dans le dépliant")}
<h2>Emplacement souhaité</h2><p class="sous">Les zones sont celles du plan du dépliant. Tables de 0,80 × 1,80 m prêtées selon le stock. Attribution selon les disponibilités.</p>
<div class="choix"><b style="width:100%">1er choix</b>${ZONES_SALON.map((z) => `${coche(rempli?.zone_1 === z)}${z}`).join(" ")}</div>
<div class="choix"><b style="width:100%">2e choix (facultatif)</b>${ZONES_SALON.map((z) => `${coche(rempli?.zone_2 === z)}${z}`).join(" ")}</div>
${ligne("Surface du stand demandée", rempli?.metres ? `${rempli.metres} m²` : "", "en m²")}
${ligne("Nombre de tables souhaitées", rempli ? String(rempli.tables ?? "") : "", "tables de 0,80 × 1,80 m, selon le stock")}
<h2>Remarques</h2><div class="cadre">${rempli?.commentaire ? echap(rempli.commentaire) : ""}</div>
<p class="pied">La contribution demandée est fixée par l’association selon la place attribuée ; elle vous sera communiquée avec la confirmation. Vos coordonnées servent uniquement à l’organisation du salon.<br>À renvoyer à : asso-acs@laposte.net · ou à remettre à un membre du bureau.</p>
${ligne("Date et signature", "")}</div></body></html>`)
    w.document.close()
    return true
}

export default function InscriptionSalon(props: { titre?: string }) {
    const [reg, setReg] = React.useState<Reglages | null | undefined>(undefined)
    const [d, setD] = React.useState<Demande>(vide)
    const [autre, setAutre] = React.useState("")   // surface libre (case « Autre »)
    const [autreT, setAutreT] = React.useState("") // nombre de tables libre (case « Autre »)
    const [piege, setPiege] = React.useState("")
    const [accord, setAccord] = React.useState(false)
    const [etat, setEtat] = React.useState<"" | "envoi" | "ok">("")
    const [err, setErr] = React.useState("")
    const ref = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(900)
    React.useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect() }, [])
    React.useEffect(() => {
        const t = setTimeout(() => setReg((r) => (r === undefined ? null : r)), 3500)   // sans réponse de la base, le formulaire s’affiche quand même
        const c = sb(); if (!c) { setReg(null); return () => clearTimeout(t) }
        c.from("salon_reglages").select("edition, ouvert, date_limite, message").order("edition", { ascending: false }).limit(1).then(({ data, error }: any) => setReg(error ? null : data?.[0] ?? null))
        return () => clearTimeout(t)
    }, [])
    const set = (k: keyof Demande, v: any) => setD((x) => ({ ...x, [k]: v }))
    const edition = reg?.edition ?? new Date().getFullYear() + 1
    const etroit = w < 620
    const grille: React.CSSProperties = { display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))", gap: 14 }

    const envoyer = async () => {
        setErr("")
        if (piege) return setEtat("ok")
        if (!d.profil) return setErr("Indiquez si vous êtes amateur ou professionnel.")
        if (d.nom.trim().length < 2) return setErr("Indiquez votre nom ou celui de votre structure.")
        if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return setErr("Indiquez une adresse e-mail valide.")
        if (d.categorie.trim().length < 2) return setErr("Indiquez la catégorie de végétaux.")
        if (!d.zone_1) return setErr("Choisissez l’emplacement souhaité.")
        if (!accord) return setErr("Merci d’accepter l’utilisation de vos coordonnées pour l’organisation du salon.")
        const c = sb(); if (!c) return setErr("Connexion indisponible, réessayez dans un instant.")
        setEtat("envoi")
        const t = (s: string) => s.trim() || null
        const { error } = await c.from("demandes_salon").insert({
            edition, profil: d.profil, nom: d.nom.trim(), contact: t(d.contact), email: d.email.trim().toLowerCase(), telephone: t(d.telephone), ville: t(d.ville),
            departement: t(d.departement), siret: d.profil === "Professionnel" ? t(d.siret) : null, categorie: d.categorie.trim(), zone_1: d.zone_1, zone_2: d.zone_2 || null, metres: Number(d.metres) || 4, tables: Number(d.tables) || 0, commentaire: t(d.commentaire),
        })
        if (error) { setEtat(""); setErr(/demandes_salon|schema cache|exist/i.test(error.message) ? "Les demandes en ligne ouvriront très bientôt. En attendant, utilisez le formulaire à imprimer." : /row-level|policy/i.test(error.message) ? "Les demandes pour cette édition sont closes. Écrivez-nous à asso-acs@laposte.net." : "Envoi impossible : " + error.message); return }
        setEtat("ok")
    }

    const radio = (nom: string, val: string, actuel: string, onCh: () => void, txt: React.ReactNode) => (
        <label style={{ display: "flex", gap: 9, alignItems: "center", cursor: "pointer", padding: "10px 12px", border: `1px solid ${actuel === val ? C.accent : C.line}`, background: actuel === val ? "rgba(155,189,138,0.1)" : "transparent" }}>
            <input type="radio" name={nom} checked={actuel === val} onChange={onCh} style={{ accentColor: C.accent, margin: 0, width: 17, height: 17 }} />{txt}
        </label>
    )

    const racine: React.CSSProperties = { width: "100%", minWidth: 0, contain: "inline-size", color: C.txt, ...font }
    if (reg === undefined) return <div ref={ref} style={racine}><p style={{ color: C.mute, margin: 0 }}>Chargement du formulaire…</p></div>

    const ferme = reg && !reg.ouvert
    const papier = <button style={{ ...bouton(false), padding: "11px 18px", fontSize: 14 }} onClick={() => ouvrirFormulairePapier(edition, etat === "ok" ? d : undefined)}>{etat === "ok" ? "Imprimer ma demande" : "Formulaire à imprimer"}</button>

    if (etat === "ok") return (
        <div ref={ref} style={racine}>
            <div style={{ border: `1px solid ${C.accent}`, padding: "clamp(18px, 4vw, 28px)", background: "rgba(155,189,138,0.06)" }}>
                <h3 style={{ fontFamily: serif, fontSize: 24, margin: 0, fontWeight: 600 }}>Demande envoyée, merci !</h3>
                <p style={{ margin: "8px 0 16px", color: C.mute }}>L’association étudie les demandes et vous répond par e-mail{d.email ? ` (${d.email})` : ""} avec l’emplacement attribué et la contribution demandée.</p>
                {papier}
            </div>
        </div>
    )

    return (
        <div ref={ref} style={racine}>
            {reg?.message && <p style={{ margin: "0 0 16px", color: C.mute }}>{reg.message}</p>}
            {ferme ? (
                <div style={{ border: `1px solid ${C.line}`, padding: 20 }}>
                    <p style={{ margin: "0 0 14px" }}>Les demandes en ligne pour le salon {edition} sont closes. Pour une demande tardive, écrivez à asso-acs@laposte.net.</p>
                    {papier}
                </div>
            ) : (
                <div style={{ display: "grid", gap: 22 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: C.mute, fontSize: 14 }}>Salon {edition}{reg?.date_limite ? ` · demandes jusqu’au ${new Date(reg.date_limite + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""} · réponse par e-mail</span>
                        {papier}
                    </div>

                    <div>
                        <span style={etiq}>Vous êtes</span>
                        <div style={{ ...grille, gap: 10 }}>
                            {radio("profil", "Amateur", d.profil, () => set("profil", "Amateur"), <span><b style={{ fontWeight: 600 }}>Amateur</b><span style={{ display: "block", fontSize: 13, color: C.mute }}>collectionneur, membre d’une association</span></span>)}
                            {radio("profil", "Professionnel", d.profil, () => set("profil", "Professionnel"), <span><b style={{ fontWeight: 600 }}>Professionnel</b><span style={{ display: "block", fontSize: 13, color: C.mute }}>producteur, pépinière, artisan</span></span>)}
                        </div>
                    </div>

                    <div style={grille}>
                        <div><label style={etiq} htmlFor="s-nom">{d.profil === "Amateur" ? "Vos prénom et nom" : "Nom de la pépinière ou de la structure"}</label><input id="s-nom" style={champ} value={d.nom} onChange={(e) => set("nom", e.target.value)} maxLength={120} autoComplete="organization" /></div>
                        <div><label style={etiq} htmlFor="s-contact">Personne à contacter</label><input id="s-contact" style={champ} value={d.contact} onChange={(e) => set("contact", e.target.value)} maxLength={120} autoComplete="name" /></div>
                        <div><label style={etiq} htmlFor="s-email">E-mail</label><input id="s-email" type="email" style={champ} value={d.email} onChange={(e) => set("email", e.target.value)} maxLength={160} autoComplete="email" /></div>
                        <div><label style={etiq} htmlFor="s-tel">Téléphone</label><input id="s-tel" type="tel" style={champ} value={d.telephone} onChange={(e) => set("telephone", e.target.value)} maxLength={40} autoComplete="tel" /></div>
                        <div><label style={etiq} htmlFor="s-ville">Ville</label><input id="s-ville" style={champ} value={d.ville} onChange={(e) => set("ville", e.target.value)} maxLength={120} autoComplete="address-level2" /></div>
                        <div style={{ display: "grid", gridTemplateColumns: d.profil === "Professionnel" ? "minmax(0,90px) minmax(0,1fr)" : "minmax(0,1fr)", gap: 10 }}>
                            <div><label style={etiq} htmlFor="s-dep">Dépt</label><input id="s-dep" style={champ} value={d.departement} onChange={(e) => set("departement", e.target.value.replace(/[^0-9ABab]/g, "").slice(0, 3))} placeholder="35" inputMode="numeric" /></div>
                            {d.profil === "Professionnel" && <div><label style={etiq} htmlFor="s-siret">N° SIRET</label><input id="s-siret" style={champ} value={d.siret} onChange={(e) => set("siret", e.target.value.replace(/[^0-9 ]/g, "").slice(0, 20))} inputMode="numeric" /></div>}
                        </div>
                    </div>

                    <div>
                        <label style={etiq} htmlFor="s-cat">Catégorie de végétaux</label>
                        <input id="s-cat" style={champ} value={d.categorie} onChange={(e) => set("categorie", e.target.value.slice(0, 60))} placeholder="Ex. : Cactées et succulentes, aloès" />
                        <p style={aide}>Reprise telle quelle dans le dépliant du salon · {60 - d.categorie.length} caractères restants</p>
                    </div>

                    <div>
                        <span style={etiq}>Emplacement souhaité</span>
                        <p style={{ ...aide, margin: "0 0 8px" }}>Zones du plan du dépliant. Attribution selon les disponibilités.</p>
                        <div style={{ display: "grid", gridTemplateColumns: etroit ? "minmax(0,1fr)" : "repeat(4, minmax(0,1fr))", gap: 8 }}>
                            {ZONES_SALON.map((z) => radio("zone1", z, d.zone_1, () => setD((x) => ({ ...x, zone_1: z, zone_2: x.zone_2 === z ? "" : x.zone_2 })), z))}
                        </div>
                        <div style={{ marginTop: 10, maxWidth: etroit ? "none" : 320 }}>
                            <label style={{ ...etiq, color: C.mute }} htmlFor="s-z2">2e choix (facultatif)</label>
                            <select id="s-z2" style={champ} value={d.zone_2} onChange={(e) => set("zone_2", e.target.value)}><option value="">Pas de 2e choix</option>{ZONES_SALON.filter((z) => z !== d.zone_1).map((z) => <option key={z}>{z}</option>)}</select>
                        </div>
                    </div>

                    <div>
                        <span style={etiq}>Surface du stand</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {SURFACES.map((m) => <button key={m} type="button" onClick={() => { setAutre(""); set("metres", m) }} aria-pressed={!autre && d.metres === m} style={{ ...bouton(!autre && d.metres === m), padding: "10px 14px", fontSize: 14, minWidth: 64 }}>{m} m²</button>)}
                            <label style={{ ...bouton(!!autre), display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 14, cursor: "text" }}>
                                <span>Autre :</span>
                                <input type="number" inputMode="numeric" min={4} max={40} step={1} placeholder="16"
                                    value={autre}
                                    onChange={(e) => { const v = e.target.value; setAutre(v); const n = Math.round(Number(v)); set("metres", v === "" || !(n > 0) ? 4 : Math.min(40, n)) }}
                                    style={{ width: 56, padding: "6px 6px", fontSize: 14, background: "transparent", color: "inherit", border: "1px solid currentColor", borderRadius: 0, textAlign: "center" }} aria-label="Autre surface en m²" />
                                <span>m²</span>
                            </label>
                        </div>
                        <p style={aide}>Pour un stand plus grand, indiquez la surface dans la case « Autre » (jusqu’à 40 m²).</p>
                    </div>

                    <div>
                        <span style={etiq}>Tables souhaitées</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {TABLES.map((m) => <button key={m} type="button" onClick={() => { setAutreT(""); set("tables", m) }} aria-pressed={!autreT && d.tables === m} style={{ ...bouton(!autreT && d.tables === m), padding: "10px 14px", fontSize: 14, minWidth: 64 }}>{m === 0 ? "Aucune" : m}</button>)}
                            <label style={{ ...bouton(!!autreT), display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 14, cursor: "text" }}>
                                <span>Autre :</span>
                                <input type="number" inputMode="numeric" min={1} max={20} step={1} placeholder="6"
                                    value={autreT}
                                    onChange={(e) => { const v = e.target.value; setAutreT(v); const n = Math.round(Number(v)); set("tables", v === "" || !(n >= 0) ? 1 : Math.min(20, n)) }}
                                    style={{ width: 56, padding: "6px 6px", fontSize: 14, background: "transparent", color: "inherit", border: "1px solid currentColor", borderRadius: 0, textAlign: "center" }} aria-label="Autre nombre de tables" />
                                <span>tables</span>
                            </label>
                        </div>
                        <p style={aide}>Tables de 0,80 × 1,80 m prêtées par l’association, selon le stock disponible. Pour plus de 4 tables, indiquez le nombre dans la case « Autre » (jusqu’à 20).</p>
                    </div>

                    <div>
                        <label style={etiq} htmlFor="s-com">Remarques</label>
                        <textarea id="s-com" style={{ ...champ, resize: "vertical" }} rows={3} maxLength={1500} value={d.commentaire} onChange={(e) => set("commentaire", e.target.value)} placeholder="Besoins particuliers, présence un seul jour, barnum personnel…" />
                    </div>
                    <input tabIndex={-1} autoComplete="off" aria-hidden value={piege} onChange={(e) => setPiege(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />

                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.mute, cursor: "pointer" }}>
                        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} style={{ accentColor: C.accent, width: 18, height: 18, margin: "2px 0 0", flex: "none" }} />
                        J’accepte que l’association utilise ces informations pour organiser le salon et me recontacter. La contribution est fixée par l’association selon la place attribuée.
                    </label>
                    {err && <p style={{ margin: 0, color: C.danger, fontSize: 14 }} role="alert">{err}</p>}
                    <div><button style={bouton()} onClick={envoyer} disabled={etat === "envoi"}>{etat === "envoi" ? "Envoi…" : "Envoyer ma demande"}</button></div>
                </div>
            )}
        </div>
    )
}

addPropertyControls(InscriptionSalon, { titre: { type: ControlType.String, title: "Titre", defaultValue: "" } })
