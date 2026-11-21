// Collection.tsx — gestionnaire de collection des adhérents (plantes, semis, rusticité, bourse d’échange)
// Utilisé comme onglet de l’espace membre. Base d’espèces légère chargée à la demande depuis un CDN.
import * as React from "react"
import { C, font, serif } from "./AcsBase.tsx"

const URL_ESPECES = "https://cdn.jsdelivr.net/gh/Flokfloyd/acs-site-images@64adc7b/data/especes.json"
const URL_XLSX = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"

export type Plante = {
    id?: string; email?: string; auteur?: string | null
    espece: string; genre?: string | null; type?: string | null; statut: "collection" | "semis"
    code?: string | null; origine?: string | null; n_collecte?: string | null; reference?: string | null; fournisseur?: string | null
    semis?: string | null; methode?: string | null; nb_graines?: number | null; nb_leves?: number | null; nb_vivants?: number | null
    acquis?: string | null; rempotage?: string | null
    exposition?: string | null; substrat?: number | null; t_min?: number | null; arrosage?: string | null
    exemplaires?: number | null; notes?: string | null; a_echanger?: boolean; graines_a_donner?: boolean; modifie_le?: string
}
type Echange = { id: string; espece: string; type?: string; statut: string; origine?: string; n_collecte?: string; exemplaires?: number; a_echanger: boolean; graines_a_donner: boolean; auteur: string; contact?: string | null }

// ---------- référentiels ----------
export const TYPES = ["Cactus", "Aizoacées", "Caudex", "Autres succulentes", "Bulbes", "Autre"]
export const SUB_COURT = ["", "Cactée classique", "Cactée gourmande", "Délicate, sud-afr.", "Succulente", "Épiphyte", "Semis"]
export const SUBSTRATS = ["", "Classique cactée", "Cactée gourmande", "Cactée délicate et sud-africaine", "Classique succulente", "Cactée épiphyte", "Semis"]
export const EXPOS = ["Soleil", "Mi-ombre", "Ombre"]
export const ICONE_EXPO: Record<string, string> = { Soleil: "☀️", "Mi-ombre": "⛅", Ombre: "☁️" }
export const ARROSAGES = ["Faible", "Modéré", "Régulier"]
export const GOUTTES: Record<string, string> = { Faible: "💧", "Modéré": "💧💧", "Régulier": "💧💧💧" }
const CERCLES = ["", "❶", "❷", "❸", "❹", "❺", "❻"]
// valeurs des fiches de genre (« Lumière vive ») ramenées aux trois expositions du club
export const normExpo = (e?: string | null) => (!e ? null : /soleil|☀/i.test(e) ? "Soleil" : /☁|^ombre/i.test(e) ? "Ombre" : "Mi-ombre")
const expoAff = (e?: string | null) => (e ? `${ICONE_EXPO[e] ?? ""} ${e}`.trim() : "")
const eauAff = (e?: string | null) => (e ? GOUTTES[e] ?? e : "")
const subAff = (n?: number | null, court = true) => (n ? `${CERCLES[n]} ${(court ? SUB_COURT : SUBSTRATS)[n]}` : "")
type Genres = Record<string, [string, string, [number | null, number, string, string] | null, string]>
let ESPECES: Promise<Genres> | null = null
const chargerEspeces = () => (ESPECES ??= fetch(URL_ESPECES).then((r) => r.json()).then((j) => j.genres as Genres).catch(() => { ESPECES = null; return {} as Genres }))

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const genreDe = (espece: string) => { const m = espece.trim().match(/^([A-Z][a-zé-]+)/); return m ? m[1] : "" }
const taux = (p: Plante) => (p.nb_graines ? Math.round(((p.nb_leves ?? 0) / p.nb_graines) * 100) : null)
const nbOuVide = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v))
// tri des dates libres (« 2021 », « 23/06/2020 », « 2020-06-23 »)
const cleDate = (s?: string | null) => {
    if (!s) return ""
    const t = s.trim(); let m
    if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
    if ((m = t.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/))) return `${m[1]}-${m[2] || "00"}-${m[3] || "00"}`
    return t
}

// ---------- styles (palette du site, angles droits) ----------
const box: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: "clamp(16px, 4vw, 26px)", color: C.txt, ...font }
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", colorScheme: "dark", background: C.bg, color: C.txt, border: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 12px", font: "inherit", fontSize: 15 }
const etiquette: React.CSSProperties = { display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, margin: "0 0 5px" }
const bouton = (plein = true): React.CSSProperties => ({ background: plein ? C.accent : "transparent", color: plein ? C.accentDark : C.txt, border: plein ? `1px solid ${C.accent}` : `1px solid ${C.line}`, borderRadius: 0, padding: "10px 16px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" })
const petit = (actif = false): React.CSSProperties => ({ background: actif ? C.accent : "transparent", color: actif ? C.accentDark : C.txt, border: `1px solid ${actif ? C.accent : C.line}`, borderRadius: 0, padding: "7px 12px", font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" })
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mute, fontWeight: 600, padding: "8px 10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", background: C.panel, position: "sticky", top: 0 }
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 14, whiteSpace: "nowrap", verticalAlign: "middle" }
const coche: React.CSSProperties = { width: 18, height: 18, accentColor: C.accent, cursor: "pointer", margin: 0 }

type Vue = "collection" | "semis" | "rusticite" | "echanges"
type Col = { k: string; t: string; v: (p: Plante) => any; tri?: (p: Plante) => any; w?: number }

const NomEspece = ({ p }: { p: { espece: string } }) => {
    // genre et épithète en italique, cultivars ('…'), var., subsp., fma. en romain
    const parts = p.espece.split(/(\s(?:var\.|subsp\.|ssp\.|fma\.|f\.|cv\.|x)\s|'[^']*'|‘[^’]*’|\([^)]*\))/g)
    return <span>{parts.map((s, i) => (i % 2 ? <span key={i}>{s}</span> : <em key={i} style={{ fontStyle: "italic" }}>{s}</em>))}</span>
}

const COLS: Record<Exclude<Vue, "echanges">, Col[]> = {
    collection: [
        { k: "espece", w: 270, t: "Espèce", v: (p) => <NomEspece p={p} />, tri: (p) => p.espece },
        { k: "code", w: 72, t: "N°", v: (p) => p.code },
        { k: "origine", w: 210, t: "Origine", v: (p) => p.origine },
        { k: "n_collecte", w: 110, t: "N° collecte", v: (p) => p.n_collecte },
        { k: "exposition", w: 112, t: "Exposition", v: (p) => expoAff(p.exposition) },
        { k: "substrat", w: 150, t: "Substrat", v: (p) => subAff(p.substrat) },
        { k: "t_min", w: 72, t: "T min", v: (p) => (p.t_min != null ? `${p.t_min} °C` : ""), tri: (p) => p.t_min ?? 99 },
        { k: "arrosage", w: 92, t: "Eau", v: (p) => eauAff(p.arrosage) },
        { k: "semis", w: 100, t: "Semis", v: (p) => p.semis, tri: (p) => cleDate(p.semis) },
        { k: "acquis", w: 84, t: "Acquis", v: (p) => p.acquis, tri: (p) => cleDate(p.acquis) },
        { k: "rempotage", w: 100, t: "Rempotage", v: (p) => p.rempotage, tri: (p) => cleDate(p.rempotage) },
        { k: "fournisseur", w: 140, t: "Achat", v: (p) => p.fournisseur },
        { k: "exemplaires", w: 56, t: "Ex.", v: (p) => p.exemplaires },
    ],
    semis: [
        { k: "espece", w: 270, t: "Espèce", v: (p) => <NomEspece p={p} />, tri: (p) => p.espece },
        { k: "semis", w: 100, t: "Semis", v: (p) => p.semis, tri: (p) => cleDate(p.semis) },
        { k: "taux", w: 78, t: "Levées", v: (p) => (p.nb_graines ? `${p.nb_leves ?? 0}/${p.nb_graines}` : ""), tri: (p) => taux(p) ?? -1 },
        { k: "pct", w: 62, t: "%", v: (p) => (taux(p) != null ? `${taux(p)} %` : ""), tri: (p) => taux(p) ?? -1 },
        { k: "nb_vivants", w: 76, t: "Vivants", v: (p) => p.nb_vivants },
        { k: "methode", w: 96, t: "Méthode", v: (p) => p.methode },
        { k: "reference", w: 130, t: "Réf.", v: (p) => p.reference },
        { k: "n_collecte", w: 110, t: "N° collecte", v: (p) => p.n_collecte },
        { k: "origine", w: 210, t: "Localisation", v: (p) => p.origine },
        { k: "fournisseur", w: 140, t: "Producteur", v: (p) => p.fournisseur },
        { k: "code", w: 72, t: "N°", v: (p) => p.code },
    ],
    rusticite: [
        { k: "espece", w: 270, t: "Espèce", v: (p) => <NomEspece p={p} />, tri: (p) => p.espece },
        { k: "t_min", w: 72, t: "T min", v: (p) => (p.t_min != null ? `${p.t_min} °C` : "—"), tri: (p) => p.t_min ?? 99 },
        { k: "exposition", w: 112, t: "Exposition", v: (p) => expoAff(p.exposition) },
        { k: "arrosage", w: 92, t: "Eau", v: (p) => eauAff(p.arrosage) },
        { k: "substrat", w: 150, t: "Substrat", v: (p) => subAff(p.substrat) },
        { k: "origine", w: 210, t: "Origine", v: (p) => p.origine },
    ],
}

// =====================================================================================
export default function Collection({ client, email, auteur }: { client: any; email: string; auteur: string }) {
    const [plantes, setPlantes] = React.useState<Plante[] | null>(null)
    const [err, setErr] = React.useState("")
    const [vue, setVue] = React.useState<Vue>("collection")
    const [q, setQ] = React.useState("")
    const [type, setType] = React.useState("")
    const [grouper, setGrouper] = React.useState(true)
    const [tri, setTri] = React.useState<{ k: string; sens: 1 | -1 }>({ k: "espece", sens: 1 })
    const [edit, setEdit] = React.useState<Plante | null>(null)
    const [imp, setImp] = React.useState<{ lignes: Plante[]; maj: { id: string; t_min: number }[]; ignores: string[]; doublons: number } | null>(null)
    const [msg, setMsg] = React.useState("")
    const [genres, setGenres] = React.useState<Genres>({})
    const [limite, setLimite] = React.useState(200)
    const ref = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(900)
    const etroit = w < 720

    React.useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect() }, [])
    React.useEffect(() => { chargerEspeces().then(setGenres) }, [])
    const charger = React.useCallback(() => {
        client.from("plantes").select("*").eq("email", email.toLowerCase()).order("espece").limit(5000).then(({ data, error }: any) => {
            if (error) setErr(/plantes/.test(error.message || "") && /exist|schema cache|not find/i.test(error.message || "") ? "La collection sera disponible dès que la base aura été mise à jour par le bureau." : error.message)
            else setPlantes(data ?? [])
        })
    }, [client, email])
    React.useEffect(() => { charger() }, [charger])
    React.useEffect(() => { setLimite(200) }, [vue, q, type])

    const basculer = async (p: Plante, k: "a_echanger" | "graines_a_donner") => {
        const v = !p[k]
        setPlantes((l) => l && l.map((x) => (x.id === p.id ? { ...x, [k]: v } : x)))
        const { error } = await client.from("plantes").update({ [k]: v }).eq("id", p.id)
        if (error) { setMsg("Modification impossible : " + error.message); charger() }
    }

    if (err) return <div ref={ref} style={box}><p style={{ margin: 0, color: C.mute }}>{err}</p></div>
    if (!plantes) return <div ref={ref} style={box}><p style={{ margin: 0, color: C.mute }}>Chargement de votre collection…</p></div>

    const nSemis = plantes.filter((p) => p.statut === "semis").length
    const nEch = plantes.filter((p) => p.a_echanger || p.graines_a_donner).length
    const onglets: [Vue, string][] = [["collection", `Collection (${plantes.length - nSemis})`], ["semis", `Semis (${nSemis})`], ["rusticite", "Rusticité"], ["echanges", "Bourse d’échange"]]

    const cherche = (p: Plante) => !q || sansAccent([p.espece, p.origine, p.n_collecte, p.code, p.fournisseur, p.reference, p.notes].join(" ")).includes(sansAccent(q))
    const liste = plantes
        .filter((p) => (vue === "collection" ? p.statut === "collection" : vue === "semis" ? p.statut === "semis" : true))
        .filter((p) => (!type || (p.type || "Autre") === type) && cherche(p))
    const cols = vue === "echanges" ? [] : COLS[vue]
    const col = cols.find((c) => c.k === tri.k) || cols[0]
    const val = (p: Plante) => { const x = col ? (col.tri ? col.tri(p) : col.v(p)) : p.espece; return typeof x === "string" ? sansAccent(x) : x ?? "" }
    const triee = [...liste].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * tri.sens || a.espece.localeCompare(b.espece))
    const groupes: [string, Plante[]][] = vue === "rusticite"
        ? (() => { const m = new Map<string, Plante[]>(); for (const p of [...liste].sort((a, b) => (a.t_min ?? 99) - (b.t_min ?? 99) || a.espece.localeCompare(b.espece))) { const k = p.t_min == null ? "Non renseignée" : `${p.t_min} °C`; m.set(k, [...(m.get(k) || []), p]) } return [...m.entries()] })()
        : grouper ? TYPES.map((t) => [t, triee.filter((p) => (p.type || "Autre") === t)] as [string, Plante[]]).filter(([, l]) => l.length) : [["", triee]]

    const nouvelle = (): Plante => ({ espece: "", statut: vue === "semis" ? "semis" : "collection", exemplaires: 1, a_echanger: false, graines_a_donner: false, substrat: vue === "semis" ? 6 : null })

    const exporter = async () => {
        setMsg("Préparation du fichier…")
        try {
            const X: any = await import(/* @vite-ignore */ URL_XLSX)
            const ligne = (p: Plante) => ({
                "N°": p.code ?? "", Espèce: p.espece, Type: p.type ?? "", Liste: p.statut === "semis" ? "Semis" : "Collection",
                Origine: p.origine ?? "", "N° collecte": p.n_collecte ?? "", Exposition: expoAff(p.exposition), Substrat: subAff(p.substrat, false),
                "T(°C)": p.t_min ?? "", Arrosage: eauAff(p.arrosage), Semis: p.semis ?? "", Méthode: p.methode ?? "", Graines: p.nb_graines ?? "", Levées: p.nb_leves ?? "",
                "%": taux(p) ?? "", Vivants: p.nb_vivants ?? "", "Réf.": p.reference ?? "", Acquis: p.acquis ?? "", Rempotage: p.rempotage ?? "", Achat: p.fournisseur ?? "",
                Exemplaires: p.exemplaires ?? "", "À échanger": p.a_echanger ? "oui" : "", "Graines à donner": p.graines_a_donner ? "oui" : "", Notes: p.notes ?? "",
            })
            const tri2 = (l: Plante[]) => [...l].sort((a, b) => a.espece.localeCompare(b.espece))
            const wb = X.utils.book_new()
            const feuille = (nom: string, l: any[]) => { const ws = X.utils.json_to_sheet(l); ws["!cols"] = Object.keys(l[0] || { a: 1 }).map((k) => ({ wch: k === "Espèce" ? 42 : k === "Notes" || k === "Origine" ? 30 : 12 })); X.utils.book_append_sheet(wb, ws, nom) }
            feuille("Collection", tri2(plantes.filter((p) => p.statut === "collection")).map(ligne))
            feuille("Semis", [...plantes.filter((p) => p.statut === "semis")].sort((a, b) => cleDate(a.semis).localeCompare(cleDate(b.semis)) || a.espece.localeCompare(b.espece)).map(ligne))
            feuille("Rusticité", [...plantes].sort((a, b) => (a.t_min ?? 99) - (b.t_min ?? 99) || a.espece.localeCompare(b.espece)).map((p) => ({ Espèce: p.espece, "T(°C)": p.t_min ?? "", Exposition: expoAff(p.exposition), Arrosage: eauAff(p.arrosage), Substrat: subAff(p.substrat, false) })))
            X.writeFile(wb, `Collection ACS ${new Date().toISOString().slice(0, 10)}.xlsx`)
            setMsg("")
        } catch (e: any) { setMsg("Export impossible : " + (e?.message || e)) }
    }

    const importer = async (f: File) => {
        setMsg("Lecture du fichier…")
        try {
            const X: any = await import(/* @vite-ignore */ URL_XLSX)
            const wb = X.read(await f.arrayBuffer(), { cellDates: false })
            const r = lireClasseur(X, wb, plantes, genres, email, auteur)
            setImp(r); setMsg(r.lignes.length || r.maj.length ? "" : "Aucune ligne reconnue : vérifiez qu’une colonne s’appelle « Espèce » (ou « Nom »).")
        } catch (e: any) { setMsg("Import impossible : " + (e?.message || e)) }
    }
    const validerImport = async () => {
        if (!imp) return
        setMsg("Enregistrement…")
        for (let i = 0; i < imp.lignes.length; i += 200) {
            const { error } = await client.from("plantes").insert(imp.lignes.slice(i, i + 200))
            if (error) { setMsg("Erreur à l’enregistrement : " + error.message); charger(); return }
        }
        for (const m of imp.maj) await client.from("plantes").update({ t_min: m.t_min }).eq("id", m.id)
        setMsg(`${imp.lignes.length} plante${imp.lignes.length > 1 ? "s" : ""} ajoutée${imp.lignes.length > 1 ? "s" : ""}${imp.maj.length ? `, ${imp.maj.length} rusticité${imp.maj.length > 1 ? "s" : ""} mise${imp.maj.length > 1 ? "s" : ""} à jour` : ""}.`)
        setImp(null); charger()
    }

    return (
        <div ref={ref} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, color: C.txt, ...font }}>
            <div style={box}>
                <h2 style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, margin: "0 0 6px", fontWeight: 600 }}>Ma collection</h2>
                <p style={{ margin: 0, color: C.mute, fontSize: 14 }}>Vos plantes et vos semis, visibles de vous seul. Cochez « À échanger » ou « Graines à donner » pour les proposer aux autres adhérents dans la bourse d’échange.</p>
                <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, overflowX: "auto", marginTop: 16 }}>
                    {onglets.map(([k, t]) => <button key={k} onClick={() => { setVue(k); setEdit(null); setImp(null); setTri({ k: k === "rusticite" ? "t_min" : k === "semis" ? "semis" : "espece", sens: 1 }) }} style={{ background: "transparent", color: vue === k ? C.txt : C.mute, border: "none", borderBottom: `2px solid ${vue === k ? C.accent : "transparent"}`, borderRadius: 0, padding: "10px 12px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>)}
                </div>
                {vue !== "echanges" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une espèce, un n° de collecte…" style={{ ...champ, flex: "1 1 220px", width: "auto" }} />
                        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...champ, flex: "0 1 190px", width: "auto" }}><option value="">Tous les types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                        {vue !== "rusticite" && <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.mute, cursor: "pointer" }}><input type="checkbox" checked={grouper} onChange={(e) => setGrouper(e.target.checked)} style={coche} />Classer par type</label>}
                    </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {vue !== "echanges" && <button style={bouton()} onClick={() => setEdit(nouvelle())}>{vue === "semis" ? "Nouveau semis" : "Ajouter une plante"}</button>}
                    <label style={{ ...bouton(false), display: "inline-flex", alignItems: "center" }}>Importer Excel<input type="file" accept=".xlsx,.xls,.ods,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = "" }} /></label>
                    <button style={bouton(false)} onClick={exporter} disabled={!plantes.length}>Exporter Excel</button>
                </div>
                {msg && <p style={{ margin: "12px 0 0", fontSize: 14, color: /impossible|Erreur|Aucune/.test(msg) ? C.danger : C.accent }}>{msg}</p>}
            </div>

            {imp && <ApercuImport imp={imp} onAnnuler={() => setImp(null)} onValider={validerImport} />}
            {edit && <Fiche p={edit} genres={genres} client={client} email={email} auteur={auteur} onFermer={(maj) => { setEdit(null); if (maj) charger() }} />}

            {vue === "echanges" ? <Bourse client={client} email={email} /> : (
                <div style={{ ...box, padding: etroit ? 0 : box.padding, background: etroit ? "transparent" : C.panel, border: etroit ? "none" : box.border }}>
                    {liste.length === 0 ? <p style={{ margin: 0, color: C.mute, padding: etroit ? 16 : 0, background: etroit ? C.panel : undefined }}>{plantes.length ? "Aucune plante ne correspond." : vue === "semis" ? "Aucun semis pour l’instant." : "Votre collection est vide. Ajoutez une plante ou importez votre fichier Excel."}</p>
                        : groupes.map(([g, l]) => {
                            let reste = limite
                            const vis = l.slice(0, Math.max(0, reste))
                            return (
                                <div key={g || "tout"} style={{ marginBottom: g ? 22 : 0 }}>
                                    {g && <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "4px 0 8px", padding: etroit ? "0 2px" : 0 }}><span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>{g}</span><span style={{ color: C.mute, fontSize: 13 }}>{l.length}</span></div>}
                                    {etroit ? <Cartes l={vis} vue={vue} onOuvrir={setEdit} basculer={basculer} />
                                        : <Tableau l={vis} cols={cols} tri={tri} setTri={setTri} onOuvrir={setEdit} basculer={basculer} vue={vue} />}
                                    {l.length > vis.length && <button style={{ ...petit(), marginTop: 10 }} onClick={() => setLimite((x) => x + 500)}>Afficher les {l.length - vis.length} suivantes</button>}
                                </div>
                            )
                        })}
                    {nEch > 0 && vue !== "rusticite" && <p style={{ margin: "14px 0 0", fontSize: 13, color: C.mute, padding: etroit ? "0 2px" : 0 }}>{nEch} plante{nEch > 1 ? "s" : ""} proposée{nEch > 1 ? "s" : ""} dans la bourse d’échange.</p>}
                </div>
            )}
        </div>
    )
}

// ---------- tableau (ordinateur) ----------
function Tableau({ l, cols, tri, setTri, onOuvrir, basculer, vue }: { l: Plante[]; cols: Col[]; tri: { k: string; sens: 1 | -1 }; setTri: (t: any) => void; onOuvrir: (p: Plante) => void; basculer: (p: Plante, k: "a_echanger" | "graines_a_donner") => void; vue: Vue }) {
    const cases = vue !== "rusticite"
    const largeur = cols.reduce((a, c) => a + (c.w || 100), 0) + (cases ? 192 : 0)
    const fixe = (k: string, entete = false): React.CSSProperties => (k === "espece" ? { position: "sticky", left: 0, zIndex: entete ? 3 : 1, background: C.panel, boxShadow: `1px 0 0 ${C.line}` } : {})
    return (
        <div style={{ overflowX: "auto", maxHeight: 640, border: `1px solid ${C.line}` }}>
            <style>{`.acs-ligne:hover td{background:${C.panel2}!important}`}</style>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: Math.max(largeur, 0), minWidth: "100%" }}>
                <colgroup>{cols.map((c) => <col key={c.k} style={{ width: c.w || 100 }} />)}{cases && <><col style={{ width: 96 }} /><col style={{ width: 96 }} /></>}</colgroup>
                <thead><tr>
                    {cols.map((c) => <th key={c.k} style={{ ...th, ...fixe(c.k, true), whiteSpace: "normal" }} onClick={() => setTri({ k: c.k, sens: tri.k === c.k ? -tri.sens : 1 })}>{c.t}{tri.k === c.k ? (tri.sens > 0 ? " ↑" : " ↓") : ""}</th>)}
                    {cases && <><th style={{ ...th, cursor: "default", textAlign: "center", whiteSpace: "normal" }}>À échanger</th><th style={{ ...th, cursor: "default", textAlign: "center", whiteSpace: "normal" }}>Graines à donner</th></>}
                </tr></thead>
                <tbody>
                    {l.map((p) => (
                        <tr key={p.id} onClick={() => onOuvrir(p)} style={{ cursor: "pointer" }} className="acs-ligne">
                            {cols.map((c) => <td key={c.k} style={{ ...td, ...fixe(c.k), whiteSpace: c.k === "espece" || c.k === "origine" ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.k === "espece" ? C.txt : "rgba(246,240,230,0.86)" }}>{c.v(p)}</td>)}
                            {cases && <>
                                <td style={{ ...td, textAlign: "center" }} onClick={(e) => e.stopPropagation()}><input type="checkbox" style={coche} checked={!!p.a_echanger} onChange={() => basculer(p, "a_echanger")} aria-label="À échanger" /></td>
                                <td style={{ ...td, textAlign: "center" }} onClick={(e) => e.stopPropagation()}><input type="checkbox" style={coche} checked={!!p.graines_a_donner} onChange={() => basculer(p, "graines_a_donner")} aria-label="Graines à donner" /></td>
                            </>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ---------- cartes (téléphone) ----------
function Cartes({ l, vue, onOuvrir, basculer }: { l: Plante[]; vue: Vue; onOuvrir: (p: Plante) => void; basculer: (p: Plante, k: "a_echanger" | "graines_a_donner") => void }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
            {l.map((p) => {
                const infos = vue === "semis"
                    ? [p.semis, p.nb_graines ? `${p.nb_leves ?? 0}/${p.nb_graines} levées (${taux(p)} %)` : "", p.nb_vivants != null ? `${p.nb_vivants} vivants` : "", p.n_collecte, p.fournisseur]
                    : vue === "rusticite" ? [expoAff(p.exposition), eauAff(p.arrosage), subAff(p.substrat)]
                        : [p.code, p.origine, p.n_collecte, p.t_min != null ? `${p.t_min} °C` : "", p.acquis ? `acquis ${p.acquis}` : p.semis ? `semé ${p.semis}` : ""]
                return (
                    <div key={p.id} style={{ background: C.panel, border: `1px solid ${C.line}`, padding: "12px 14px" }}>
                        <div onClick={() => onOuvrir(p)} style={{ cursor: "pointer" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                                <span style={{ fontSize: 16, lineHeight: 1.35 }}><NomEspece p={p} /></span>
                                {vue === "rusticite" && <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.t_min != null ? `${p.t_min} °C` : "—"}</span>}
                            </div>
                            <div style={{ fontSize: 13, color: C.mute, marginTop: 3 }}>{infos.filter(Boolean).join(" · ") || "Touchez pour compléter la fiche"}</div>
                        </div>
                        {vue !== "rusticite" && (
                            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 13 }}>
                                <label style={{ display: "flex", gap: 7, alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={coche} checked={!!p.a_echanger} onChange={() => basculer(p, "a_echanger")} />À échanger</label>
                                <label style={{ display: "flex", gap: 7, alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={coche} checked={!!p.graines_a_donner} onChange={() => basculer(p, "graines_a_donner")} />Graines à donner</label>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ---------- choix de l’espèce (liste déroulante avec recherche) ----------
function ChoixEspece({ valeur, genres, onChange }: { valeur: string; genres: Genres; onChange: (v: string) => void }) {
    const [ouvert, setOuvert] = React.useState(false)
    const [actif, setActif] = React.useState(0)
    const propositions = React.useMemo(() => {
        const t = sansAccent(valeur.trim())
        if (t.length < 2) return []
        const out: string[] = []
        const [g0, ...reste] = t.split(/\s+/)
        for (const [g, [, liste]] of Object.entries(genres)) {
            const gn = sansAccent(g)
            if (!gn.startsWith(g0) && !(reste.length === 0 && liste && sansAccent(liste).includes(g0))) continue
            if (gn.startsWith(g0) && !reste.length) out.push(g)
            for (const sp of liste ? liste.split("|") : []) {
                const nom = `${g} ${sp}`, n = sansAccent(nom)
                if (reste.length ? gn.startsWith(g0) && n.includes(reste.join(" ")) : gn.startsWith(g0) || sansAccent(sp).startsWith(g0)) out.push(nom)
                if (out.length > 60) break
            }
            if (out.length > 60) break
        }
        return out.slice(0, 40)
    }, [valeur, genres])
    const choisir = (v: string) => { onChange(v + (v.includes(" ") ? "" : " ")); setOuvert(v.includes(" ") ? false : true); setActif(0) }
    return (
        <>
        <div style={{ position: "relative" }}>
            <input value={valeur} autoFocus placeholder="Tapez le genre ou l’espèce : Ariocarpus retusus…" style={{ ...champ, fontStyle: valeur ? "italic" : "normal" }}
                onChange={(e) => { onChange(e.target.value); setOuvert(true); setActif(0) }} onFocus={() => setOuvert(true)} onBlur={() => setTimeout(() => setOuvert(false), 150)}
                onKeyDown={(e) => {
                    if (!ouvert || !propositions.length) return
                    if (e.key === "ArrowDown") { e.preventDefault(); setActif((a) => Math.min(a + 1, propositions.length - 1)) }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)) }
                    else if (e.key === "Enter") { e.preventDefault(); choisir(propositions[actif]) }
                    else if (e.key === "Escape") setOuvert(false)
                }} />
            {ouvert && propositions.length > 0 && (
                <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%", maxHeight: 260, overflowY: "auto", background: C.bg, border: `1px solid ${C.line}`, borderTop: "none" }}>
                    {propositions.map((s, i) => <div key={s} onMouseDown={(e) => { e.preventDefault(); choisir(s) }} onMouseEnter={() => setActif(i)} style={{ padding: "8px 12px", cursor: "pointer", background: i === actif ? C.panel2 : "transparent", fontStyle: "italic", fontSize: 14 }}>{s}{!s.includes(" ") && <span style={{ fontStyle: "normal", color: C.mute }}> · genre</span>}</div>)}
                </div>
            )}
        </div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 5 }}>Variété, forme, cultivar ou nom absent de la liste : complétez librement (var., fma., ‘Cultivar’).</div>
        </>
    )
}

// ---------- fiche d’édition ----------
function Fiche({ p, genres, client, email, auteur, onFermer }: { p: Plante; genres: Genres; client: any; email: string; auteur: string; onFermer: (maj: boolean) => void }) {
    const [f, setF] = React.useState<Plante>(p)
    const [err, setErr] = React.useState("")
    const [occupe, setOccupe] = React.useState(false)
    const set = (k: keyof Plante, v: any) => setF((x) => ({ ...x, [k]: v }))
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, [])

    // pré-remplissage depuis la fiche du genre, sans écraser ce que l’adhérent a saisi
    const g = genreDe(f.espece), info = genres[g]
    React.useEffect(() => {
        if (!info) return
        const [typ, , cult, pays] = info
        setF((x) => ({
            ...x, genre: g, type: x.type || typ,
            t_min: x.t_min ?? cult?.[0] ?? null, substrat: x.substrat ?? (x.statut === "semis" ? 6 : cult?.[1] ?? null),
            exposition: x.exposition || normExpo(cult?.[2]) || null, arrosage: x.arrosage || cult?.[3] || null,
            origine: x.origine || (pays ? pays.split("|").join(", ") : null),
        }))
    }, [g, !!info])

    const enregistrer = async () => {
        if (!f.espece.trim()) return setErr("Indiquez l’espèce.")
        setOccupe(true); setErr("")
        const ligne: any = { ...f, espece: f.espece.trim().replace(/\s+/g, " "), genre: genreDe(f.espece) || null, auteur }
        for (const k of ["nb_graines", "nb_leves", "nb_vivants", "substrat", "t_min", "exemplaires"]) ligne[k] = nbOuVide(ligne[k])
        for (const k of Object.keys(ligne)) if (ligne[k] === "") ligne[k] = null
        delete ligne.modifie_le
        const { error } = f.id ? await client.from("plantes").update(ligne).eq("id", f.id) : await client.from("plantes").insert({ ...ligne, email: email.toLowerCase() })
        setOccupe(false)
        if (error) setErr(error.message); else onFermer(true)
    }
    const supprimer = async () => {
        if (!f.id || !window.confirm(`Supprimer « ${f.espece} » de votre collection ?`)) return
        const { error } = await client.from("plantes").delete().eq("id", f.id)
        if (error) setErr(error.message); else onFermer(true)
    }
    const dupliquer = () => setF((x) => ({ ...x, id: undefined, code: null, modifie_le: undefined }))

    const T = (k: keyof Plante, t: string, ph = "", type = "text") => (
        <div><label style={etiquette}>{t}</label><input type={type} value={(f[k] as any) ?? ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} style={champ} inputMode={type === "number" ? "decimal" : undefined} /></div>
    )
    const S = (k: keyof Plante, t: string, opts: [any, string][]) => (
        <div><label style={etiquette}>{t}</label><select value={(f[k] as any) ?? ""} onChange={(e) => set(k, e.target.value === "" ? null : k === "substrat" ? Number(e.target.value) : e.target.value)} style={champ}><option value="">—</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    )
    const grille: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 148px), 1fr))", gap: 12 }
    const titre = (t: string) => <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, margin: "18px 0 10px", paddingTop: 14, borderTop: `1px solid ${C.line}` }}>{t}</div>
    const semee = f.statut === "semis" || !!f.semis || !!f.nb_graines

    return (
        <div ref={ref} style={{ ...box, border: `1px solid ${C.accent}`, scrollMarginTop: 90 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600 }}>{f.id ? "Modifier la fiche" : f.statut === "semis" ? "Nouveau semis" : "Nouvelle plante"}</h3>
                <button onClick={() => onFermer(false)} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            <div style={{ marginTop: 14 }}><label style={etiquette}>Espèce</label><ChoixEspece valeur={f.espece} genres={genres} onChange={(v) => set("espece", v)} /></div>
            <div style={{ ...grille, marginTop: 12 }}>
                {S("statut", "Liste", [["collection", "Collection"], ["semis", "Semis"]])}
                {S("type", "Type", TYPES.map((t) => [t, t]))}
                {T("code", "N° personnel", "0-88")}
                {T("exemplaires", "Exemplaires", "1", "number")}
            </div>

            {titre("Provenance")}
            <div style={grille}>
                {T("origine", "Origine, localité", "Mexique : Coahuila")}
                {T("n_collecte", "N° de collecte", "SB 127")}
                {T("fournisseur", f.statut === "semis" ? "Producteur des graines" : "Achat, don", "Pépinière, membre…")}
                {T("acquis", "Acquis le", "2024 ou 12/05/2024")}
                {T("semis", "Semé le", "2021 ou 14/04/2021")}
                {T("rempotage", "Rempotage", "2025")}
            </div>

            {semee && <>
                {titre("Semis")}
                <div style={grille}>
                    {T("methode", "Méthode", "Sachet, terrine…")}
                    {T("reference", "Réf. du lot", "[GK 1230/90]")}
                    {T("nb_graines", "Graines semées", "", "number")}
                    {T("nb_leves", "Levées", "", "number")}
                    {T("nb_vivants", "Vivants aujourd’hui", "", "number")}
                    <div><label style={etiquette}>Taux de levée</label><div style={{ ...champ, background: "transparent", border: `1px dashed ${C.line}` }}>{taux({ ...f, nb_graines: nbOuVide(f.nb_graines), nb_leves: nbOuVide(f.nb_leves) }) ?? "—"} %</div></div>
                </div>
            </>}

            {titre("Culture")}
            <div style={grille}>
                {T("t_min", "Température minimale (°C)", "-5", "number")}
                {S("exposition", "Exposition", EXPOS.map((e) => [e, `${ICONE_EXPO[e]} ${e}`]))}
                {S("arrosage", "Besoin en eau", ARROSAGES.map((e) => [e, `${GOUTTES[e]} ${e}`]))}
                {S("substrat", "Substrat", SUBSTRATS.slice(1).map((s, i) => [i + 1, `${CERCLES[i + 1]} ${s}`]))}
            </div>
            {info?.[2] && <p style={{ margin: "8px 0 0", fontSize: 12, color: C.mute }}>Pré-rempli d’après la fiche du genre {g} : modifiable selon votre expérience.</p>}

            <div style={{ marginTop: 14 }}><label style={etiquette}>Notes</label><textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} style={{ ...champ, resize: "vertical" }} /></div>

            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 16, fontSize: 15 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={coche} checked={!!f.a_echanger} onChange={(e) => set("a_echanger", e.target.checked)} />À échanger</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={coche} checked={!!f.graines_a_donner} onChange={(e) => set("graines_a_donner", e.target.checked)} />Graines à donner</label>
            </div>

            {err && <p style={{ margin: "12px 0 0", color: C.danger, fontSize: 14 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
                <button style={bouton()} onClick={enregistrer} disabled={occupe}>{occupe ? "Enregistrement…" : "Enregistrer"}</button>
                <button style={bouton(false)} onClick={() => onFermer(false)}>Annuler</button>
                {f.id && <button style={bouton(false)} onClick={dupliquer} title="Créer une nouvelle fiche à partir de celle-ci">Dupliquer</button>}
                {f.id && <button style={{ ...bouton(false), color: C.danger, borderColor: C.danger, marginLeft: "auto" }} onClick={supprimer}>Supprimer</button>}
            </div>
        </div>
    )
}

// ---------- aperçu avant import ----------
function ApercuImport({ imp, onAnnuler, onValider }: { imp: { lignes: Plante[]; maj: { id: string; t_min: number }[]; ignores: string[]; doublons: number }; onAnnuler: () => void; onValider: () => void }) {
    const nC = imp.lignes.filter((p) => p.statut === "collection").length, nS = imp.lignes.length - nC
    return (
        <div style={{ ...box, border: `1px solid ${C.accent}` }}>
            <h3 style={{ fontFamily: serif, fontSize: 22, margin: "0 0 8px", fontWeight: 600 }}>Aperçu de l’import</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
                {imp.lignes.length} plante{imp.lignes.length > 1 ? "s" : ""} à ajouter ({nC} en collection, {nS} en semis)
                {imp.maj.length ? `, ${imp.maj.length} température${imp.maj.length > 1 ? "s" : ""} minimale${imp.maj.length > 1 ? "s" : ""} à mettre à jour` : ""}.
                {imp.doublons ? ` ${imp.doublons} ligne${imp.doublons > 1 ? "s" : ""} déjà présente${imp.doublons > 1 ? "s" : ""} ignorée${imp.doublons > 1 ? "s" : ""}.` : ""}
            </p>
            {imp.ignores.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: C.mute }}>Non reconnu : {imp.ignores.slice(0, 6).join(" ; ")}{imp.ignores.length > 6 ? "…" : ""}</p>}
            {imp.lignes.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: 12, border: `1px solid ${C.line}`, maxHeight: 300 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                        <thead><tr>{["Espèce", "Liste", "Type", "Origine", "T min", "Semis", "Acquis", "Levées"].map((t) => <th key={t} style={{ ...th, cursor: "default" }}>{t}</th>)}</tr></thead>
                        <tbody>{imp.lignes.slice(0, 50).map((p, i) => (
                            <tr key={i}>
                                <td style={{ ...td, whiteSpace: "normal" }}><NomEspece p={p} /></td><td style={td}>{p.statut === "semis" ? "Semis" : "Collection"}</td><td style={td}>{p.type}</td><td style={td}>{p.origine}</td>
                                <td style={td}>{p.t_min != null ? `${p.t_min} °C` : ""}</td><td style={td}>{p.semis}</td><td style={td}>{p.acquis}</td><td style={td}>{p.nb_graines ? `${p.nb_leves ?? 0}/${p.nb_graines}` : ""}</td>
                            </tr>))}</tbody>
                    </table>
                </div>
            )}
            {imp.lignes.length > 50 && <p style={{ margin: "6px 0 0", fontSize: 13, color: C.mute }}>… et {imp.lignes.length - 50} autres lignes.</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button style={bouton()} onClick={onValider} disabled={!imp.lignes.length && !imp.maj.length}>Importer</button>
                <button style={bouton(false)} onClick={onAnnuler}>Annuler</button>
            </div>
        </div>
    )
}

// ---------- lecture d’un classeur Excel ----------
const ALIAS: Record<string, string[]> = {
    espece: ["espece", "espèce", "nom", "taxon", "plante", "nom scientifique", "espece / variete"],
    code: ["n°", "no", "numero", "n° perso", "code", "inventaire", "etiquette", "n° personnel"],
    type: ["type", "famille", "groupe"],
    statut: ["liste"],
    origine: ["origine", "localisation", "localite", "provenance geographique", "pays"],
    n_collecte: ["n° collect", "n° collecte", "collecte", "numero de terrain", "field number", "n° de collecte"],
    reference: ["ref.", "ref", "reference", "réf.", "réf"],
    fournisseur: ["achat", "producteur", "fournisseur", "vendeur", "source", "achat, don"],
    semis: ["semis", "date de semis", "seme le", "semé le"],
    methode: ["methode", "méthode"],
    nb_graines: ["graines", "nb graines", "graines semees", "nombre de graines"],
    nb_leves: ["levees", "levées", "leves", "nb levees"],
    taux: ["taux"],
    nb_vivants: ["vivants", "survivants"],
    acquis: ["acquis", "acquisition", "date d'acquisition", "acquis le"],
    rempotage: ["rempotage"],
    exposition: ["exposition", "expo"],
    substrat: ["substrat"],
    t_min: ["t(°c)", "t (°c)", "t°", "t min", "temperature", "rusticite", "t°c", "tmin", "t(c)"],
    arrosage: ["arrosage"],
    exemplaires: ["exemplaires", "ex.", "nb", "quantite", "qte"],
    notes: ["notes", "remarques", "commentaire", "commentaires"],
    a_echanger: ["a echanger", "à échanger", "echange"],
    graines_a_donner: ["graines a donner", "graines à donner"],
}
const normEntete = (s: any) => sansAccent(String(s ?? "")).replace(/\s+/g, " ").trim()
const champDe = (h: string) => { for (const [k, l] of Object.entries(ALIAS)) if (l.map(normEntete).includes(h)) return k; return "" }
const oui = (v: any) => /^(x|oui|o|yes|y|1|vrai|true|✓|✔)$/i.test(String(v ?? "").trim())
const texte = (v: any) => {
    if (v == null || v === "") return null
    if (v instanceof Date) return v.toLocaleDateString("fr-FR")
    const s = String(v).trim()
    return s && s !== "/" && s !== "-" ? s : null
}
const dateXL = (X: any, v: any) => {
    if (typeof v === "number" && v > 20000 && v < 80000) { const d = X.SSF.parse_date_code(v); return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}` }
    return texte(v)
}

const CHIFFRES_CERCLES = "①②③④⑤⑥❶❷❸❹❺❻➀➁➂➃➄➅"
const substratDe = (v: any) => {
    if (v == null || v === "") return null
    if (typeof v === "number") return v >= 1 && v <= 6 ? v : null
    const t = String(v).trim(), c = CHIFFRES_CERCLES.indexOf(t[0])
    if (c >= 0) return (c % 6) + 1
    if (/^[1-6]$/.test(t)) return Number(t)
    const k = SUBSTRATS.findIndex((x) => x && sansAccent(x) === sansAccent(t)); if (k > 0) return k
    const k2 = SUB_COURT.findIndex((x) => x && sansAccent(x) === sansAccent(t)); return k2 > 0 ? k2 : null
}
const expoDe = (v: any) => { const t = texte(v); if (!t) return null; if (/☀|soleil/i.test(t)) return "Soleil"; if (/⛅|🌤|🌥|◐|◑|mi-?ombre|vive|lumi/i.test(t)) return "Mi-ombre"; if (/☁|ombre/i.test(t)) return "Ombre"; return t }
const arrosageDe = (v: any) => { const t = texte(v); if (!t) return null; const g = (t.match(/[💧💦●•]/gu) || []).length; if (g) return g >= 3 ? "Régulier" : g === 2 ? "Modéré" : "Faible"; return t }

export function lireClasseur(X: any, wb: any, existantes: Plante[], genres: Genres, email: string, auteur: string) {
    const lignes: Plante[] = [], maj: { id: string; t_min: number }[] = [], ignores: string[] = []
    let doublons = 0, absentes = 0
    const cle = (p: Partial<Plante>) => [p.espece, p.code, p.n_collecte, p.semis, p.acquis].map((x) => sansAccent(String(x ?? ""))).join("|")
    const deja = new Set(existantes.map(cle))
    const parEspece = new Map<string, Plante[]>()
    for (const p of existantes) parEspece.set(sansAccent(p.espece), [...(parEspece.get(sansAccent(p.espece)) || []), p])
    const TYPE_NORM: Record<string, string> = { cactus: "Cactus", cactee: "Cactus", cactees: "Cactus", cactaceae: "Cactus", aizoacees: "Aizoacées", aizoaceae: "Aizoacées", mesemb: "Aizoacées", mesembs: "Aizoacées", caudex: "Caudex", bulbe: "Bulbes", bulbes: "Bulbes", succulente: "Autres succulentes", succulentes: "Autres succulentes" }
    const estNom = (v: any) => typeof v === "string" && /^[A-Z][a-zë-]+( [a-z(×x‘'"]|$)/.test(v.trim()) && !/^(TOTAL|SEMIS)/i.test(v.trim())

    for (const nomFeuille of wb.SheetNames) {
        const rows: any[][] = X.utils.sheet_to_json(wb.Sheets[nomFeuille], { header: 1, raw: true, defval: null })
        const fsemis = /semis/i.test(nomFeuille)
        const frustique = /rustic/i.test(nomFeuille)
        let champs: string[] | null = null
        let dateBloc: string | null = null
        let nLues = 0
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]
            if (!r || !r.some((c) => c != null && c !== "")) continue
            // ligne d’en-tête : au moins deux intitulés reconnus (les listes de semis en ont une par bloc « SEMIS jj/mm/aaaa »)
            const reconnus = r.map((c) => champDe(normEntete(c)))
            const semisEnTete = r.findIndex((c) => typeof c === "string" && /^semis\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4}/i.test(c.trim()))
            if (reconnus.filter(Boolean).length >= 2 || semisEnTete >= 0 || (!champs && reconnus.some(Boolean) && !r.some(estNom))) {
                champs = reconnus.slice()
                dateBloc = null
                if (semisEnTete >= 0) { champs[semisEnTete] = "espece"; dateBloc = String(r[semisEnTete]).trim().replace(/^semis\s+/i, "") }
                // colonne d’année seule (ex. « 2022 » : plants vivants cette année-là)
                r.forEach((c, j) => { if (champs && !champs[j] && /^(19|20)\d{2}$/.test(String(c ?? "").trim())) champs[j] = "nb_vivants" })
                // colonnes sans intitulé : noms d’espèces ou numéros personnels (0-88)
                const suite = rows.slice(i + 1, i + 25)
                r.forEach((c, j) => {
                    if (!champs || champs[j] || (c != null && String(c).trim() !== "")) return
                    const vals = suite.map((x) => x && x[j]).filter((x) => x != null && x !== "")
                    if (!vals.length) return
                    if (!champs.includes("espece") && vals.filter(estNom).length >= vals.length / 2) champs[j] = "espece"
                    else if (vals.every((x) => /^\d+[-–]\d+$/.test(String(x).trim()))) champs[j] = "code"
                })
                if (!champs.includes("espece")) {
                    const j = r.length ? [...Array(Math.max(...suite.map((x) => (x ? x.length : 0)), r.length)).keys()].find((j) => !champs![j] && suite.filter((x) => x && estNom(x[j])).length >= 2) : undefined
                    if (j != null) champs[j] = "espece"
                }
                continue
            }
            if (!champs) continue
            const v: Record<string, any> = {}
            champs.forEach((k, j) => { if (k && r[j] != null && r[j] !== "") v[k] = r[j] })
            const espece = texte(v.espece)?.replace(/\s+/g, " ")
            if (!espece || !estNom(espece)) continue
            nLues++
            const tmin = v.t_min != null && !isNaN(Number(String(v.t_min).replace(",", ".").replace("−", "-"))) ? Number(String(v.t_min).replace(",", ".").replace("−", "-")) : null
            const seulementT = frustique || champs.filter(Boolean).length <= 2
            if (seulementT) {
                if (tmin == null) continue
                const l = parEspece.get(sansAccent(espece)) || []
                const nouv = lignes.filter((p) => sansAccent(p.espece) === sansAccent(espece))
                for (const p of l) if (p.id && p.t_min !== tmin) maj.push({ id: p.id, t_min: tmin })
                for (const p of nouv) p.t_min = tmin
                if (!l.length && !nouv.length) absentes++
                continue
            }
            const g = genreDe(espece), info = genres[g]
            let nbG = v.nb_graines != null ? Number(v.nb_graines) : null, nbL = v.nb_leves != null ? Number(v.nb_leves) : null
            const tx = texte(v.taux)?.match(/^(\d+)\s*\/\s*(\d+)$/)
            if (tx) { nbL = Number(tx[1]); nbG = Number(tx[2]) }
            const statut: "semis" | "collection" = v.statut ? (/semis/i.test(String(v.statut)) ? "semis" : "collection") : fsemis || dateBloc || tx || v.methode ? "semis" : "collection"
            const sub = substratDe(v.substrat)
            const p: Plante = {
                email: email.toLowerCase(), auteur, espece, genre: g || null,
                type: (v.type && (TYPE_NORM[sansAccent(String(v.type))] || (TYPES.includes(String(v.type)) ? String(v.type) : null))) || info?.[0] || null,
                statut, code: texte(v.code), origine: texte(v.origine), n_collecte: texte(v.n_collecte), reference: texte(v.reference), fournisseur: texte(v.fournisseur),
                semis: dateXL(X, v.semis) ?? dateBloc, methode: texte(v.methode), nb_graines: nbG != null && !isNaN(nbG) ? nbG : null, nb_leves: nbL != null && !isNaN(nbL) ? nbL : null,
                nb_vivants: v.nb_vivants != null && !isNaN(Number(v.nb_vivants)) ? Number(v.nb_vivants) : null,
                acquis: dateXL(X, v.acquis), rempotage: dateXL(X, v.rempotage),
                exposition: expoDe(v.exposition) || normExpo(info?.[2]?.[2]) || null, arrosage: arrosageDe(v.arrosage) || info?.[2]?.[3] || null,
                substrat: sub ?? (statut === "semis" ? 6 : info?.[2]?.[1] ?? null),
                t_min: tmin ?? info?.[2]?.[0] ?? null,
                exemplaires: v.exemplaires != null && !isNaN(Number(v.exemplaires)) ? Number(v.exemplaires) : 1,
                notes: texte(v.notes), a_echanger: oui(v.a_echanger), graines_a_donner: oui(v.graines_a_donner),
            }
            const k = cle(p)
            if (deja.has(k)) { doublons++; continue }
            deja.add(k); lignes.push(p)
        }
        if (!nLues) ignores.push(`feuille « ${nomFeuille} » : aucune espèce reconnue`)
    }
    if (absentes) ignores.push(`${absentes} température${absentes > 1 ? "s" : ""} de rusticité pour des espèces absentes de la collection`)
    return { lignes, maj, ignores, doublons }
}

// ---------- bourse d’échange (plantes proposées par tous les adhérents) ----------
function Bourse({ client, email }: { client: any; email: string }) {
    const [l, setL] = React.useState<Echange[] | null>(null)
    const [err, setErr] = React.useState("")
    const [q, setQ] = React.useState("")
    const [quoi, setQuoi] = React.useState<"" | "plantes" | "graines">("")
    React.useEffect(() => { client.rpc("echanges").then(({ data, error }: any) => { if (error) setErr(error.message); else setL(data ?? []) }) }, [client])
    if (err) return <div style={box}><p style={{ margin: 0, color: C.mute }}>{/echanges/.test(err) ? "La bourse d’échange sera disponible dès que la base aura été mise à jour par le bureau." : err}</p></div>
    if (!l) return <div style={box}><p style={{ margin: 0, color: C.mute }}>Chargement de la bourse d’échange…</p></div>
    const vis = l.filter((x) => (!quoi || (quoi === "plantes" ? x.a_echanger : x.graines_a_donner)) && (!q || sansAccent([x.espece, x.auteur, x.origine, x.n_collecte].join(" ")).includes(sansAccent(q))))
    return (
        <div style={box}>
            <p style={{ margin: "0 0 12px", color: C.mute, fontSize: 14 }}>Plantes et graines proposées par les adhérents. L’adresse de contact n’apparaît que pour les membres inscrits dans l’annuaire ; sinon, retrouvez-les dans la discussion ou lors d’une sortie.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une espèce, un adhérent…" style={{ ...champ, flex: "1 1 220px", width: "auto" }} />
                {([["", "Tout"], ["plantes", "Plantes à échanger"], ["graines", "Graines à donner"]] as const).map(([k, t]) => <button key={k} style={petit(quoi === k)} onClick={() => setQuoi(k)}>{t}</button>)}
            </div>
            {vis.length === 0 ? <p style={{ margin: 0, color: C.mute }}>Rien de proposé pour l’instant. Cochez « À échanger » ou « Graines à donner » dans votre collection pour lancer la bourse.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)" }}>
                    {vis.map((x) => (
                        <div key={x.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "4px 16px", padding: "11px 0", borderTop: `1px solid ${C.line}` }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 15 }}><NomEspece p={x} />{x.exemplaires && x.exemplaires > 1 ? <span style={{ color: C.mute }}> · {x.exemplaires} ex.</span> : null}</div>
                                <div style={{ fontSize: 13, color: C.mute }}>{[x.type, x.origine, x.n_collecte].filter(Boolean).join(" · ")}</div>
                            </div>
                            <div style={{ fontSize: 13 }}>
                                <div style={{ color: C.accent, fontWeight: 600 }}>{[x.a_echanger && "À échanger", x.graines_a_donner && "Graines à donner"].filter(Boolean).join(" · ")}</div>
                                <div>{x.auteur}{x.contact && x.contact !== email.toLowerCase() ? <> · <a href={`mailto:${x.contact}?subject=${encodeURIComponent("Bourse d’échange ACS : " + x.espece)}`} style={{ color: C.txt }}>Écrire</a></> : x.contact === email.toLowerCase() ? <span style={{ color: C.mute }}> (vous)</span> : null}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
