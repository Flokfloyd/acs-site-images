// Collection.tsx — gestionnaire de collection des adhérents (plantes, semis, rusticité, bourse d’échange)
// Utilisé comme onglet de l’espace membre. Base d’espèces légère chargée à la demande depuis un CDN.
import * as React from "react"
import { createPortal } from "react-dom"
import { C, font, serif } from "./AcsBase.tsx"
import { COTE_MONDE, GENRES as GENRES_CARTE, pt } from "./CarteMonde.tsx"

const URL_ESPECES = "https://cdn.jsdelivr.net/gh/Flokfloyd/acs-site-images@64adc7b/data/especes.json"
const URL_LODE = "https://cdn.jsdelivr.net/gh/Flokfloyd/acs-site-images@509be86/data/lode-index.json"
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
// icônes au trait du site (blanc cassé), plutôt que les emojis en couleur
const svgIco: React.CSSProperties = { width: 15, height: 15, verticalAlign: "-2px", flex: "0 0 auto" }
export function IcoExpo({ e }: { e?: string | null }) {
    if (!e) return null
    return (
        <svg viewBox="0 0 16 16" style={svgIco} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
            {e === "Soleil" && <><circle cx="8" cy="8" r="3" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="8" y1="1.2" x2="8" y2="2.8" transform={`rotate(${a} 8 8)`} />)}</>}
            {e === "Mi-ombre" && <><circle cx="6" cy="6" r="2.4" /><line x1="6" y1="1" x2="6" y2="1.9" /><line x1="1" y1="6" x2="1.9" y2="6" /><line x1="2.5" y1="2.5" x2="3.1" y2="3.1" /><path d="M5.2 14 a2.4 2.4 0 0 1 0.6-4.7 a3.2 3.2 0 0 1 6.1 0.8 a2 2 0 0 1 0.3 3.9 Z" fill={C.panel} /></>}
            {e === "Ombre" && <path d="M4.4 13 a2.7 2.7 0 0 1 0.6-5.3 a3.7 3.7 0 0 1 7 0.9 a2.3 2.3 0 0 1 0.3 4.4 Z" />}
        </svg>
    )
}
export function IcoEau({ e }: { e?: string | null }) {
    const n = e === "Régulier" ? 3 : e === "Modéré" ? 2 : e === "Faible" ? 1 : 0
    if (!n) return e ? <>{e}</> : null
    return <span style={{ display: "inline-flex", gap: 1 }} title={e || ""}>{Array.from({ length: n }, (_, i) => <svg key={i} viewBox="0 0 10 14" style={{ width: 9, height: 13, verticalAlign: "-2px" }} fill="currentColor" aria-hidden="true"><path d="M5 0.8 C5 0.8 1 5.6 1 8.6 a4 4 0 0 0 8 0 C9 5.6 5 0.8 5 0.8 Z" /></svg>)}</span>
}
const ExpoTxt = ({ e }: { e?: string | null }) => (e ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}><IcoExpo e={e} />{e}</span> : null)
const subAff = (n?: number | null, court = true) => (n ? `${CERCLES[n]} ${(court ? SUB_COURT : SUBSTRATS)[n]}` : "")
type Genres = Record<string, [string, string, [number | null, number, string, string] | null, string]>
let ESPECES: Promise<Genres> | null = null
type Lode = { acc: string[]; syn: Record<string, string>; nd: string[] }
let LODE: Promise<Lode | null> | null = null
const chargerLode = () => (LODE ??= fetch(URL_LODE).then((r) => r.json()).catch(() => { LODE = null; return null }))
const chargerEspeces = () => (ESPECES ??= fetch(URL_ESPECES).then((r) => r.json()).then((j) => j.genres as Genres).catch(() => { ESPECES = null; return {} as Genres }))

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
// semis avec au moins une levée et au moins un plant vivant : il compte aussi dans la collection
export const semisVivant = (p: Plante) => p.statut === "semis" && (p.nb_vivants ?? 0) >= 1
export const enCollection = (p: Plante) => p.statut === "collection" || semisVivant(p)
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

type Vue = "collection" | "semis" | "rusticite" | "synthese" | "echanges"
type Col = { k: string; t: string; v: (p: Plante) => any; tri?: (p: Plante) => any; w?: number }

const NomEspece = ({ p }: { p: { espece: string } }) => {
    // genre et épithète en italique, cultivars ('…'), var., subsp., fma. en romain
    const parts = p.espece.split(/(\s(?:var\.|subsp\.|ssp\.|fma\.|f\.|cv\.|x)\s|'[^']*'|‘[^’]*’|\([^)]*\))/g)
    return <span>{parts.map((s, i) => (i % 2 ? <span key={i}>{s}</span> : <em key={i} style={{ fontStyle: "italic" }}>{s}</em>))}</span>
}

const COLS: Record<Exclude<Vue, "echanges" | "synthese">, Col[]> = {
    collection: [
        { k: "espece", w: 270, t: "Espèce", v: (p) => <>{<NomEspece p={p} />}{p.statut === "semis" && <span title={`Semis du ${p.semis ?? "?"} : ${p.nb_vivants ?? p.nb_leves} plant(s)`} style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", color: C.accent, border: `1px solid ${C.accent}`, padding: "0 5px", fontStyle: "normal", whiteSpace: "nowrap" }}>SEMIS</span>}</>, tri: (p) => p.espece },
        { k: "code", w: 72, t: "N°", v: (p) => p.code },
        { k: "origine", w: 190, t: "Origine", v: (p) => p.origine },
        { k: "n_collecte", w: 110, t: "N° collecte", v: (p) => p.n_collecte },
        { k: "exposition", w: 112, t: "Exposition", v: (p) => <ExpoTxt e={p.exposition} /> },
        { k: "substrat", w: 178, t: "Substrat", v: (p) => subAff(p.substrat) },
        { k: "t_min", w: 72, t: "T min", v: (p) => (p.t_min != null ? `${p.t_min} °C` : ""), tri: (p) => p.t_min ?? 99 },
        { k: "arrosage", w: 92, t: "Eau", v: (p) => <IcoEau e={p.arrosage} /> },
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
        { k: "origine", w: 190, t: "Localisation", v: (p) => p.origine },
        { k: "fournisseur", w: 140, t: "Producteur", v: (p) => p.fournisseur },
        { k: "code", w: 72, t: "N°", v: (p) => p.code },
    ],
    rusticite: [
        { k: "espece", w: 270, t: "Espèce", v: (p) => <NomEspece p={p} />, tri: (p) => p.espece },
        { k: "t_min", w: 72, t: "T min", v: (p) => (p.t_min != null ? `${p.t_min} °C` : "—"), tri: (p) => p.t_min ?? 99 },
        { k: "exposition", w: 112, t: "Exposition", v: (p) => <ExpoTxt e={p.exposition} /> },
        { k: "arrosage", w: 92, t: "Eau", v: (p) => <IcoEau e={p.arrosage} /> },
        { k: "substrat", w: 178, t: "Substrat", v: (p) => subAff(p.substrat) },
        { k: "origine", w: 190, t: "Origine", v: (p) => p.origine },
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
    const [limite, setLimite] = React.useState(300)
    const [aide, setAide] = React.useState(false)
    const [etq, setEtq] = React.useState(false)
    const [cmd, setCmd] = React.useState(false)
    const [verif, setVerif] = React.useState(false)
    const [verifMsg, setVerifMsg] = React.useState("")
    const [pdf, setPdf] = React.useState(false)
    const [avecSemis, setAvecSemis] = React.useState(true)
    const [drapeau, setDrapeau] = React.useState<"" | "echange" | "graines" | "incomplete">("")
    const [replies, setReplies] = React.useState<Set<string>>(new Set())
    const [menu, setMenu] = React.useState<"" | "importer" | "exporter" | "colonnes">("")
    const [cachees, setCachees] = React.useState<Record<string, string[]>>(() => { try { const v = JSON.parse(localStorage.getItem("acs-collection-colonnes") || "null"); if (v && typeof v === "object") return v } catch {} return COLS_CACHEES })
    const cacher = (v: string, k: string) => setCachees((c) => { const l = c[v] || []; const n = { ...c, [v]: l.includes(k) ? l.filter((x) => x !== k) : [...l, k] }; try { localStorage.setItem("acs-collection-colonnes", JSON.stringify(n)) } catch {} return n })
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
    // onglet devenu sans objet (dernier semis supprimé…) : retour à la collection
    React.useEffect(() => {
        if (!plantes) return
        const ok = vue === "collection" || vue === "echanges" || (vue === "semis" && plantes.some((p) => p.statut === "semis")) || (vue === "rusticite" && plantes.some((p) => p.t_min != null)) || (vue === "synthese" && plantes.length >= SEUIL_SYNTHESE)
        if (!ok) setVue("collection")
    }, [plantes, vue])
    React.useEffect(() => { setLimite(300) }, [vue, q, type, drapeau])
    React.useEffect(() => { if (!menu) return; const f = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.("[data-menu]")) setMenu("") }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f) }, [menu])

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
    const nVivants = plantes.filter(semisVivant).length
    // une petite collection ne voit que ce qui la concerne : pas d’onglet Semis sans semis, pas de synthèse pour quelques plantes
    const onglets = ([["collection", `Collection (${plantes.length - nSemis + (avecSemis ? nVivants : 0)})`], nSemis > 0 && ["semis", `Semis (${nSemis})`], plantes.some((p) => p.t_min != null) && ["rusticite", "Rusticité"], plantes.length >= SEUIL_SYNTHESE && ["synthese", "Synthèse"], ["echanges", "Bourse d’échange"]] as ([Vue, string] | false)[]).filter(Boolean) as [Vue, string][]
    const outils = vue !== "echanges" && vue !== "synthese"

    const cherche = (p: Plante) => !q || sansAccent([p.espece, p.origine, p.n_collecte, p.code, p.fournisseur, p.reference, p.notes].join(" ")).includes(sansAccent(q))
    const incomplete = (p: Plante) => (p.statut === "semis" ? (p.nb_leves ?? 0) >= 1 && p.nb_vivants == null : p.t_min == null || !p.substrat || !p.exposition || !p.origine)
    const garde = (p: Plante) => (!type || (p.type || "Autre") === type) && cherche(p) && (drapeau === "echange" ? !!p.a_echanger : drapeau === "graines" ? !!p.graines_a_donner : drapeau === "incomplete" ? incomplete(p) : true)
    const dansVue = (p: Plante, v: Vue) => (v === "collection" ? (avecSemis ? enCollection(p) : p.statut === "collection") : v === "semis" ? p.statut === "semis" : enCollection(p))
    const liste = plantes.filter((p) => dansVue(p, vue) && garde(p))
    // filtres rapides : seulement ceux qui ont des plantes dans l’onglet (ou celui déjà choisi)
    const deVue = plantes.filter((p) => dansVue(p, vue))
    const puces = ([["", "Toutes", 1], ["echange", "À échanger", deVue.filter((p) => p.a_echanger).length], ["graines", "Graines à donner", deVue.filter((p) => p.graines_a_donner).length], ["incomplete", vue === "semis" ? "Vivants à compter" : "Fiches à compléter", deVue.filter(incomplete).length]] as ["" | "echange" | "graines" | "incomplete", string, number][]).filter(([k, , n]) => n > 0 || k === drapeau)
    const nTypes = new Set(deVue.map((p) => p.type || "Autre")).size
    const filtreTxt = [q && `recherche « ${q} »`, type, drapeau === "echange" ? "à échanger" : drapeau === "graines" ? "graines à donner" : drapeau === "incomplete" ? "fiches incomplètes" : ""].filter(Boolean).join(", ")
    // colonnes masquées par l’adhérent, et colonnes vides pour toute la liste affichée
    const champCol = (k: string) => (k === "taux" || k === "pct" ? "nb_graines" : k)
    const vide = (k: string) => liste.every((p) => { const v = (p as any)[champCol(k)]; return v == null || v === "" })
    const cols = !outils ? [] : COLS[vue as "collection"].filter((c) => c.k === "espece" || (!(cachees[vue] || []).includes(c.k) && !vide(c.k)))
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

    const modele = async () => {
        const X: any = await import(/* @vite-ignore */ URL_XLSX)
        const wb = X.utils.book_new()
        const lignes = [
            { "N°": "0-01", Espèce: "Ariocarpus retusus", Type: "Cactus", Liste: "Collection", Origine: "Mexique : San Luis Potosi", "N° collecte": "SB 127", Exposition: "☀️", Substrat: 3, "T(°C)": -4, Arrosage: "💧", Semis: "", Méthode: "", Graines: "", Levées: "", Vivants: "", "Réf.": "", Acquis: 2023, Rempotage: 2024, Achat: "Pépinière X", Exemplaires: 1, "À échanger": "", "Graines à donner": "oui", Notes: "" },
            { "N°": "1", Espèce: "Lithops lesliei var. albinica", Type: "Aizoacées", Liste: "Semis", Origine: "Afrique du Sud", "N° collecte": "C 141", Exposition: "⛅", Substrat: 6, "T(°C)": 5, Arrosage: "💧💧", Semis: "14/04/2025", Méthode: "Sachet", Graines: 20, Levées: 13, Vivants: 9, "Réf.": "[PR/20]", Acquis: "", Rempotage: "", Achat: "Producteur Y", Exemplaires: 1, "À échanger": "", "Graines à donner": "", Notes: "Semis en sachet de congélation" },
        ]
        const ws = X.utils.json_to_sheet(lignes)
        ws["!cols"] = Object.keys(lignes[0]).map((k) => ({ wch: k === "Espèce" ? 38 : k === "Origine" || k === "Notes" ? 28 : 12 }))
        X.utils.book_append_sheet(wb, ws, "Ma collection")
        const aideL = [
            ["Comment remplir ce fichier"],
            [""],
            ["Une ligne par plante (ou par lot de semis). Gardez la première ligne de titres telle quelle ; remplacez les deux exemples par vos plantes."],
            ["Seule la colonne Espèce est obligatoire. Les colonnes inutiles peuvent rester vides ou être supprimées."],
            [""],
            ["Colonne", "Ce qu’il faut écrire"],
            ["Espèce", "Nom latin : genre, espèce, puis var., subsp., fma. ou ‘Cultivar’ si besoin."],
            ["Type", "Cactus, Aizoacées, Caudex, Autres succulentes, Bulbes ou Autre. Vide : déduit du genre."],
            ["Liste", "Collection (plantes installées) ou Semis (lots de graines en cours)."],
            ["N°", "Votre numéro d’étiquette ou d’inventaire."],
            ["Exposition", "☀️ ou Soleil · ⛅ ou Mi-ombre · ☁️ ou Ombre."],
            ["Substrat", "Numéro du mélange de l’article « Des substrats à composer » : 1 à 6."],
            ["", "1 Classique cactée · 2 Cactée gourmande · 3 Cactée délicate et sud-africaine · 4 Classique succulente · 5 Cactée épiphyte · 6 Semis"],
            ["T(°C)", "Température minimale supportée (rusticité), par exemple -4."],
            ["Arrosage", "💧 faible · 💧💧 modéré · 💧💧💧 régulier (ou 1, 2, 3)."],
            ["Semis, Acquis, Rempotage", "Une année (2024) ou une date (14/04/2024)."],
            ["Graines, Levées, Vivants", "Pour les semis : nombre de graines semées, de levées, de plants encore vivants."],
            ["Réf., N° collecte, Achat", "Référence du lot, numéro de terrain (SB 127…), vendeur ou donateur."],
            ["Exemplaires", "Nombre de plantes identiques (1 par défaut)."],
            ["À échanger, Graines à donner", "Écrivez oui ou x pour proposer la plante dans la bourse d’échange."],
            [""],
            ["Ensuite : espace membre › Collection › Importer Excel. Un aperçu s’affiche avant l’enregistrement ; les lignes déjà présentes sont ignorées."],
        ]
        const wa = X.utils.aoa_to_sheet(aideL)
        wa["!cols"] = [{ wch: 28 }, { wch: 110 }]
        X.utils.book_append_sheet(wb, wa, "Mode d’emploi")
        X.writeFile(wb, "Modele collection ACS.xlsx")
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <h2 style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, margin: 0, fontWeight: 600 }}>Collection</h2>
                    {plantes.length > 0 && <span style={{ fontSize: 13, color: C.mute }}>{[`${plantes.length - nSemis} plante${plantes.length - nSemis > 1 ? "s" : ""}`, nSemis ? `${nSemis} semis` : "", nEch ? `${nEch} dans la bourse` : ""].filter(Boolean).join(" · ")}</span>}
                </div>
                <p style={{ margin: "6px 0 0", color: C.mute, fontSize: 14 }}>Visible de vous seul. {etroit ? "Touchez" : "Cliquez sur"} une plante pour ouvrir sa fiche. « À échanger » et « Graines à donner » la proposent aux autres adhérents dans la bourse d’échange.</p>
                <div role="tablist" style={{ display: etroit ? "grid" : "flex", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: etroit ? "none" : `1px solid ${C.line}`, marginTop: 16 }}>
                    {onglets.map(([k, t], i) => <button key={k} role="tab" aria-selected={vue === k} onClick={() => { setVue(k); setEdit(null); setImp(null); setPdf(false); setTri({ k: k === "rusticite" ? "t_min" : k === "semis" ? "semis" : "espece", sens: 1 }) }} style={{ background: etroit && vue === k ? C.panel2 : "transparent", color: vue === k ? C.txt : C.mute, border: etroit ? `1px solid ${C.line}` : "none", borderBottom: `2px solid ${vue === k ? C.accent : etroit ? C.line : "transparent"}`, borderRadius: 0, padding: "10px 12px", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", marginRight: etroit ? -1 : 0, marginBottom: etroit ? -1 : 0, gridColumn: etroit && i === onglets.length - 1 && onglets.length % 2 ? "1 / -1" : undefined }}>{t}</button>)}
                </div>
                {outils && plantes.length > 0 && <>
                    {(plantes.length >= 8 || q || type) && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
                        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 0 }}>
                            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ("") }} placeholder="Rechercher : espèce, n°, collecte, origine…" style={{ ...champ, paddingRight: 36 }} aria-label="Rechercher" />
                            {q && <button onClick={() => setQ("")} aria-label="Effacer la recherche" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.mute, fontSize: 20, cursor: "pointer", padding: "2px 8px" }}>×</button>}
                        </div>
                        {(new Set(plantes.map((p) => p.type || "Autre")).size > 1 || type) && <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...champ, flex: etroit ? "1 1 100%" : "0 1 190px", width: "auto" }} aria-label="Type"><option value="">Tous les types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>}
                    </div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
                        {puces.length > 1 && puces.map(([k, t]) => <button key={k} title={k === "incomplete" ? (vue === "semis" ? "Semis levés dont le nombre de plants vivants n’est pas renseigné" : "Température, substrat, exposition ou origine manquants") : undefined} style={{ ...petit(drapeau === k), padding: "6px 11px" }} aria-pressed={drapeau === k} onClick={() => setDrapeau(k)}>{t}</button>)}
                        <span style={{ display: "flex", gap: 16, flexWrap: "wrap", marginLeft: etroit ? 0 : "auto" }}>
                            {vue === "collection" && nVivants > 0 && <label title="Semis dont au moins un plant a levé et vit encore" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.mute, cursor: "pointer" }}><input type="checkbox" checked={avecSemis} onChange={(e) => setAvecSemis(e.target.checked)} style={coche} />Avec les semis levés ({nVivants})</label>}
                            {vue !== "rusticite" && nTypes > 1 && <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.mute, cursor: "pointer" }}><input type="checkbox" checked={grouper} onChange={(e) => setGrouper(e.target.checked)} style={coche} />Classer par type</label>}
                        </span>
                    </div>
                </>}
                {(plantes.length > 0 || vue === "echanges") && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`, alignItems: "center" }}>
                    {outils && <button style={bouton()} onClick={() => setEdit(nouvelle())}>{vue === "semis" ? "+ Nouveau semis" : "+ Ajouter une plante"}</button>}
                    <Menu id="importer" titre="Importer" ouvert={menu} setOuvert={setMenu} items={[
                        { t: "Fichier Excel…", d: "Votre tableau de collection ou de semis", fichier: (f: File) => importer(f) },
                        { t: "Commande de graines…", d: "Facture ADBLPS, SuccSeed, Köhres, Cono, Uhlig", f: () => { setCmd(true); setEtq(false); setPdf(false) } },
                        { t: "Mode d’emploi et modèle", d: "Fichier Excel à remplir", f: () => setAide(true) },
                    ]} />
                    {plantes.length > 0 && <Menu id="exporter" titre="Exporter" ouvert={menu} setOuvert={setMenu} items={[
                        { t: "Listes en PDF…", d: "Collection, semis, rusticité : à imprimer ou partager", f: () => { setPdf(true); setEtq(false); setCmd(false) } },
                        { t: "Tableau Excel", d: "Toutes vos plantes, une feuille par liste", f: exporter },
                    ]} />}
                    {outils && plantes.length > 0 && <button style={bouton(false)} onClick={() => { setEtq((x) => !x); setPdf(false); setCmd(false) }} aria-expanded={etq}>Étiquettes</button>}
                    {outils && !etroit && liste.length >= 15 && <Menu id="colonnes" titre="Colonnes" discret ouvert={menu} setOuvert={setMenu} cases={COLS[vue as "collection"].filter((c) => c.k !== "espece").map((c) => ({ t: c.t, actif: !(cachees[vue] || []).includes(c.k), f: () => cacher(vue, c.k) }))} />}
                </div>}
                {aide && <AideImport onModele={() => modele().catch((e: any) => setMsg("Téléchargement impossible : " + (e?.message || e)))} onFermer={() => setAide(false)} />}
                {msg && <p style={{ margin: "12px 0 0", fontSize: 14, color: /impossible|Erreur|Aucune/.test(msg) ? C.danger : C.accent }}>{msg}</p>}
            </div>

            {pdf && <PanneauPDF plantes={plantes} vue={vue} garde={garde} filtreTxt={filtreTxt} grouper={grouper} auteur={auteur} onFermer={() => setPdf(false)} />}
            {cmd && <PanneauCommande plantes={plantes} genres={genres} client={client} email={email} auteur={auteur} onFermer={(ok) => { setCmd(false); if (ok) { charger(); setVue("semis"); setMsg(ok) } }} />}
            {etq && outils && <PanneauEtiquettes liste={triee} vue={vue} auteur={auteur} genres={genres} onFermer={() => setEtq(false)} />}
            {imp && <ApercuImport imp={imp} onAnnuler={() => setImp(null)} onValider={validerImport} />}
            {edit && <Fiche p={edit} genres={genres} client={client} email={email} auteur={auteur} onFermer={(maj) => { setEdit(null); if (maj) charger() }} />}

            {vue === "echanges" ? <Bourse client={client} email={email} /> : vue === "synthese" ? <Synthese plantes={plantes} genres={genres} etroit={etroit} /> : (
                <div style={{ ...box, padding: etroit ? 0 : box.padding, background: etroit ? "transparent" : C.panel, border: etroit ? "none" : box.border }}>
                    {!plantes.length ? (
                        <div style={{ padding: etroit ? 16 : 0, background: etroit ? C.panel : undefined, border: etroit ? `1px solid ${C.line}` : "none" }}>
                            <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, margin: 0 }}>Commencez votre collection</h3>
                            <p style={{ margin: "6px 0 14px", color: C.mute, fontSize: 14 }}>Ajoutez vos plantes une par une (le nom se choisit dans une liste, la culture se pré-remplit d’après le genre), ou importez d’un coup le tableau que vous tenez déjà.</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button style={bouton()} onClick={() => setEdit(nouvelle())}>+ Ajouter une plante</button>
                                <label style={{ ...bouton(false), display: "inline-flex", alignItems: "center" }}>Importer mon tableau Excel<input type="file" accept=".xlsx,.xls,.ods,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = "" }} /></label>
                                <button style={{ ...bouton(false), border: "none", textDecoration: "underline", textUnderlineOffset: 3 }} onClick={() => setAide(true)}>Mode d’emploi et modèle à remplir</button>
                            </div>
                        </div>
                    ) : liste.length === 0 ? <p style={{ margin: 0, color: C.mute, padding: etroit ? 16 : 0, background: etroit ? C.panel : undefined }}>Aucune plante ne correspond.{drapeau || q || type ? <> <button style={{ ...petit(), marginLeft: 8 }} onClick={() => { setDrapeau(""); setQ(""); setType("") }}>Effacer les filtres</button></> : null}</p>
                        : groupes.map(([g, l]) => {
                            let reste = limite
                            const vis = l.slice(0, Math.max(0, reste))
                            return (
                                <div key={g || "tout"} style={{ marginBottom: g ? 18 : 0 }}>
                                    {g && <button onClick={() => setReplies((r) => { const n = new Set(r); n.has(g) ? n.delete(g) : n.add(g); return n })} aria-expanded={!replies.has(g)} style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "4px 0 8px", padding: etroit ? "0 2px" : 0, background: "none", border: "none", color: C.txt, cursor: "pointer", font: "inherit", width: "100%", textAlign: "left" }}><span aria-hidden style={{ display: "inline-block", width: 12, color: C.mute, fontSize: 12, transform: replies.has(g) ? "none" : "rotate(90deg)", transition: "transform .15s" }}>▶</span><span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>{g}</span><span style={{ color: C.mute, fontSize: 13 }}>{l.length}</span></button>}
                                    {replies.has(g) ? null : etroit ? <Cartes l={vis} vue={vue} onOuvrir={setEdit} basculer={basculer} />
                                        : <Tableau l={vis} cols={cols} tri={tri} setTri={setTri} onOuvrir={setEdit} basculer={basculer} vue={vue} />}
                                    {!replies.has(g) && l.length > vis.length && <button style={{ ...petit(), marginTop: 10 }} onClick={() => setLimite((x) => x + 500)}>Afficher les {l.length - vis.length} suivantes</button>}
                                </div>
                            )
                        })}
                    {nEch > 0 && vue !== "rusticite" && <p style={{ margin: "14px 0 0", fontSize: 13, color: C.mute, padding: etroit ? "0 2px" : 0 }}>{nEch} plante{nEch > 1 ? "s" : ""} proposée{nEch > 1 ? "s" : ""} dans la bourse d’échange.</p>}
                </div>
            )}

            {outils && plantes.some((p) => (p.type || genres[genreDe(p.espece)]?.[0]) === "Cactus") && (verif
                ? <PanneauVerif plantes={plantes} genres={genres} client={client} email={email} onFermer={(ok) => { setVerif(false); setVerifMsg(ok || ""); if (ok) charger() }} />
                : <div style={{ ...box, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                        <h3 style={{ fontFamily: serif, fontSize: 20, margin: 0, fontWeight: 600 }}>Vérifier les noms de cactus</h3>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: C.mute }}>Compare vos noms à l’index des taxons et synonymes de Joël Lodé et propose les noms acceptés.</p>
                        {verifMsg && <p style={{ margin: "6px 0 0", fontSize: 14, color: C.accent }}>{verifMsg}</p>}
                    </div>
                    <button style={bouton(false)} onClick={() => { setVerif(true); setVerifMsg("") }}>Lancer la vérification</button>
                </div>)}
        </div>
    )
}

// ---------- synthèse : chiffres, graphiques et carte de la collection ----------
type Carte = { COTE_MONDE: string; GENRES: { n: string; pts: [number, number][] }[]; pt: (lon: number, lat: number) => [number, number] }
// la carte du monde et l’aire des genres viennent de la carte de la page Cultiver
const chargerCarte = () => Promise.resolve<Carte | null>({ COTE_MONDE, GENRES: GENRES_CARTE, pt })

function Barres({ titre, sous, lignes, unite = "", max: maxImpose, fmt }: { titre: string; sous?: string; lignes: [string, number, string?][]; unite?: string; max?: number; fmt?: (v: number) => string }) {
    // la ligne « N autres » cumule le reste : elle ne fixe pas l’échelle et n’a pas de barre
    const autre = (l: string) => / autres$/.test(l)
    const max = maxImpose ?? Math.max(1, ...lignes.filter(([l]) => !autre(l)).map(([, v]) => v))
    return (
        <div style={{ ...box, padding: "clamp(14px, 3vw, 20px)" }}>
            <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, margin: 0 }}>{titre}</h4>
            {sous && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.mute }}>{sous}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr) auto", gap: "6px 10px", alignItems: "center", marginTop: 12 }}>
                {lignes.map(([l, v, aide]) => (
                    <React.Fragment key={l}>
                        <span title={aide || l} style={{ fontSize: 13, color: "rgba(246,240,230,0.86)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{l}</span>
                        <span title={`${l} : ${fmt ? fmt(v) : v}${unite}${aide ? " · " + aide : ""}`} style={{ height: 12, display: "block" }}>{!autre(l) && <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.max(v > 0 ? 1.5 : 0, (v / max) * 100))}%`, background: C.accent }} />}</span>
                        <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", textAlign: "right", color: C.txt }}>{fmt ? fmt(v) : v}{unite}</span>
                    </React.Fragment>
                ))}
            </div>
            {!lignes.length && <p style={{ margin: "10px 0 0", fontSize: 13, color: C.mute }}>Pas encore de données.</p>}
        </div>
    )
}

function Synthese({ plantes, genres, etroit }: { plantes: Plante[]; genres: Genres; etroit: boolean }) {
    const [carte, setCarte] = React.useState<Carte | null | undefined>(undefined)
    React.useEffect(() => { chargerCarte().then(setCarte) }, [])
    const d = React.useMemo(() => {
        const coll = plantes.filter(enCollection), semis = plantes.filter((p) => p.statut === "semis")
        const compte = (l: string[]) => { const m = new Map<string, number>(); for (const k of l) if (k) m.set(k, (m.get(k) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) }
        const taxon = (e: string) => e.replace(/\([^)]*\)/g, "").replace(/['‘][^'’]*['’]?/g, "").replace(/\s+/g, " ").trim().toLowerCase()
        const genresL = compte(coll.map((p) => genreDe(p.espece)))
        const pays = compte(coll.map((p) => paysPlante(p, genres) || ""))
        const types = compte(coll.map((p) => p.type || "Autre"))
        const bornes: [string, (t: number) => boolean][] = [["−10 °C et moins", (t) => t <= -10], ["−9 à −5 °C", (t) => t > -10 && t <= -5], ["−4 à −1 °C", (t) => t > -5 && t < 0], ["0 à 4 °C", (t) => t >= 0 && t < 5], ["5 °C et plus", (t) => t >= 5]]
        const rust: [string, number][] = bornes.map(([l, f]) => [l, coll.filter((p) => p.t_min != null && f(Number(p.t_min))).length])
        const sansT = coll.filter((p) => p.t_min == null).length
        const inst = plantes.filter((p) => p.statut === "collection")
        const expo = EXPOS.map((e) => [e, inst.filter((p) => p.exposition === e).length] as [string, number])
        const sub = [1, 2, 3, 4, 5].map((n) => [`${CERCLES[n]} ${SUB_COURT[n]}`, inst.filter((p) => p.substrat === n).length] as [string, number])
        const an = (p: Plante) => (cleDate(p.semis).match(/^\d{4}/) || [""])[0]
        const lev = (l: Plante[]) => { const g = l.reduce((a, p) => a + (p.nb_graines || 0), 0), v = l.filter((p) => p.nb_graines).reduce((a, p) => a + (p.nb_leves || 0), 0); return { g, v, t: g ? Math.round((v / g) * 100) : 0 } }
        const annees = [...new Set(semis.map(an).filter(Boolean))].sort()
        const parAn = annees.map((a) => { const l = semis.filter((p) => an(p) === a); const x = lev(l); return [a, x.t, `${l.length} lots · ${x.v} levées sur ${x.g} graines`] as [string, number, string] })
        const prods = compte(semis.map((p) => p.fournisseur || "")).filter(([, n]) => n >= 3).map(([f]) => { const l = semis.filter((p) => p.fournisseur === f); const x = lev(l); return [f, x.t, `${l.length} lots · ${x.v}/${x.g}`, x.g] as [string, number, string, number] }).filter((x) => x[3] >= 20).sort((a, b) => b[1] - a[1]).map(([f, t, a]) => [f, t, a] as [string, number, string])
        const tot = lev(semis)
        return {
            coll, semis, nVivants: coll.filter((p) => p.statut === "semis").length, especes: new Set(coll.map((p) => taxon(p.espece))).size, genresL, pays, types, rust, sansT, expo, sub, parAn, prods, tot,
            bourse: plantes.filter((p) => p.a_echanger || p.graines_a_donner).length,
        }
    }, [plantes, genres])
    const tuile = (v: React.ReactNode, l: string, s?: string) => (
        <div style={{ ...box, padding: "14px 16px" }}>
            <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            <div style={{ fontSize: 13, color: C.txt, marginTop: 4 }}>{l}</div>
            {s && <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{s}</div>}
        </div>
    )
    if (!plantes.length) return <div style={box}><p style={{ margin: 0, color: C.mute }}>La synthèse apparaîtra dès que votre collection contiendra des plantes.</p></div>
    const top = 12
    const autres = (l: [string, number][]) => (l.length > top ? [...l.slice(0, top), [`${l.length - top} autres`, l.slice(top).reduce((a, [, n]) => a + n, 0)] as [string, number]] : l)
    // carte : aire de répartition naturelle des genres présents, pastille proportionnelle au nombre de plantes
    const parGenre = new Map(d.genresL)
    const points: { x: number; y: number; n: number; g: string }[] = []
    if (carte) for (const g of carte.GENRES) { const n = parGenre.get(g.n); if (!n) continue; for (const [lon, lat] of g.pts) { const [x, y] = carte.pt(lon, lat); points.push({ x, y, n, g: g.n }) } }
    const surCarte = new Set(points.map((p) => p.g)).size
    const grille2: React.CSSProperties = { display: "grid", gridTemplateColumns: etroit ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", gap: 16 }
    return (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
                {tuile(d.coll.length, "plantes vivantes", d.nVivants ? `dont ${d.nVivants} issues de semis` : undefined)}
                {tuile(d.especes, "espèces et taxons")}
                {tuile(d.genresL.length, "genres")}
                {tuile(d.pays.length, "pays d’origine")}
                {tuile(d.semis.length, "lots de semis", d.tot.g ? `${d.tot.t} % de levée sur ${d.tot.g} graines` : undefined)}
                {tuile(d.bourse, "dans la bourse d’échange")}
            </div>
            <div style={{ ...box, padding: "clamp(14px, 3vw, 20px)" }}>
                <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, margin: 0 }}>D’où viennent vos plantes</h4>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.mute }}>Aire naturelle des genres de votre collection (fiches de la page Cultiver){carte ? ` : ${surCarte} genre${surCarte > 1 ? "s" : ""} sur ${d.genresL.length} placés` : ""}. Plus la pastille est grande, plus vous avez de plantes du genre.</p>
                <div style={{ marginTop: 12, overflow: "hidden", border: `1px solid ${C.line}`, background: C.bg }}>
                    {carte === undefined ? <p style={{ margin: 0, padding: 20, color: C.mute, fontSize: 13 }}>Chargement de la carte…</p>
                        : carte === null ? <p style={{ margin: 0, padding: 20, color: C.mute, fontSize: 13 }}>Carte indisponible.</p>
                        : <svg viewBox="80 20 870 420" style={{ display: "block", width: "100%", height: "auto" }} role="img" aria-label="Carte de l’aire naturelle des genres de la collection">
                            <path d={carte.COTE_MONDE} fill="none" stroke="rgba(246,240,230,0.28)" strokeWidth={0.8} />
                            {points.sort((a, b) => b.n - a.n).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.2 + Math.sqrt(p.n) * 1.6} fill="rgba(155,189,138,0.55)" stroke={C.bg} strokeWidth={0.8}><title>{`${p.g} : ${p.n} plante${p.n > 1 ? "s" : ""}`}</title></circle>)}
                        </svg>}
                </div>
            </div>
            <div style={grille2}>
                <Barres titre="Genres les plus présents" sous={`${d.genresL.length} genres au total`} lignes={autres(d.genresL)} />
                <Barres titre="Pays d’origine" sous="D’après la localité, sinon le pays du genre quand il est unique" lignes={autres(d.pays)} />
                <Barres titre="Types de plantes" lignes={d.types} />
                <Barres titre="Rusticité" sous={`Température minimale supportée${d.sansT ? ` · ${d.sansT} fiche${d.sansT > 1 ? "s" : ""} sans température` : ""}`} lignes={d.rust} />
                <Barres titre="Exposition" sous="Plantes installées, hors semis" lignes={d.expo} />
                <Barres titre="Substrats" sous="Plantes installées, hors semis · mélanges de l’article « Des substrats à composer »" lignes={d.sub} />
                <Barres titre="Taux de levée par année" sous="Levées sur graines semées, lots renseignés" lignes={d.parAn} unite=" %" max={100} />
                <Barres titre="Taux de levée par producteur" sous="Producteurs d’au moins 3 lots et 20 graines" lignes={d.prods} unite=" %" max={100} />
            </div>
        </div>
    )
}

const SEUIL_SYNTHESE = 10
// une ligne sur deux légèrement éclaircie (opaque, pour la colonne Espèce figée)
const ZEBRE = "#2c231d"
const COLS_CACHEES: Record<string, string[]> = { collection: ["rempotage", "fournisseur", "exemplaires"], semis: ["origine", "code"], rusticite: [] }

// ---------- menu déroulant (Importer, Exporter, Colonnes) ----------
type ItemMenu = { t: string; d?: string; f?: () => void; fichier?: (f: File) => void }
function Menu({ id, titre, items, cases, ouvert, setOuvert, discret }: { id: "importer" | "exporter" | "colonnes"; titre: string; items?: ItemMenu[]; cases?: { t: string; actif: boolean; f: () => void }[]; ouvert: string; setOuvert: (v: any) => void; discret?: boolean }) {
    const ouv = ouvert === id
    const ligne: React.CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.line}`, color: C.txt, padding: "10px 14px", font: "inherit", fontSize: 14, cursor: "pointer" }
    const sous = (d?: string) => (d ? <span style={{ display: "block", fontSize: 12, color: C.mute, marginTop: 2 }}>{d}</span> : null)
    return (
        <div data-menu style={{ position: "relative", marginLeft: discret ? "auto" : 0 }}>
            <button style={{ ...bouton(false), ...(discret ? { borderColor: "transparent", color: C.mute } : {}) }} aria-haspopup="menu" aria-expanded={ouv} onClick={() => setOuvert(ouv ? "" : id)}>{titre}<span aria-hidden style={{ fontSize: 9, marginLeft: 8, display: "inline-block", transform: ouv ? "rotate(180deg)" : "none" }}>▼</span></button>
            {ouv && (
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 4px)", ...(discret ? { right: 0 } : { left: 0 }), zIndex: 20, width: discret ? 220 : 300, maxWidth: "86vw", background: C.panel2, border: `1px solid ${C.line}`, boxShadow: "0 10px 30px rgba(0,0,0,.45)" }}>
                    <style>{`.acs-item:hover{background:${C.panel}}`}</style>
                    {items?.map((it) => it.fichier
                        ? <label key={it.t} role="menuitem" style={ligne} className="acs-item">{it.t}{sous(it.d)}<input type="file" accept=".xlsx,.xls,.ods,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) it.fichier!(f); e.target.value = ""; setOuvert("") }} /></label>
                        : <button key={it.t} role="menuitem" style={ligne} className="acs-item" onClick={() => { setOuvert(""); it.f?.() }}>{it.t}{sous(it.d)}</button>)}
                    {cases && <div style={{ padding: "8px 14px 4px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent }}>Colonnes affichées</div>}
                    {cases?.map((c) => <label key={c.t} style={{ ...ligne, display: "flex", gap: 10, alignItems: "center", padding: "7px 14px", borderBottom: "none" }} className="acs-item"><input type="checkbox" style={coche} checked={c.actif} onChange={c.f} />{c.t}</label>)}
                </div>
            )}
        </div>
    )
}

// ---------- export PDF : choix des listes ----------
function PanneauPDF({ plantes, vue, garde, filtreTxt, grouper, auteur, onFermer }: { plantes: Plante[]; vue: Vue; garde: (p: Plante) => boolean; filtreTxt: string; grouper: boolean; auteur: string; onFermer: () => void }) {
    const [listes, setListes] = React.useState<Set<"collection" | "semis" | "rusticite">>(() => new Set([vue === "echanges" || vue === "synthese" ? "collection" : vue]))
    const [filtre, setFiltre] = React.useState(!!filtreTxt)
    const [parType, setParType] = React.useState(grouper)
    const [msg, setMsg] = React.useState("")
    const base = plantes.filter((p) => !filtre || garde(p))
    const par = (l: Plante[]): [string, Plante[]][] => (parType ? TYPES.map((t) => [t, l.filter((p) => (p.type || "Autre") === t)] as [string, Plante[]]).filter(([, x]) => x.length) : [["", l]])
    const sections: SectionPdf[] = []
    if (listes.has("collection")) sections.push({ titre: "Collection", vue: "collection", groupes: par(base.filter(enCollection).sort((a, b) => a.espece.localeCompare(b.espece))) })
    if (listes.has("semis")) sections.push({ titre: "Semis", vue: "semis", groupes: par(base.filter((p) => p.statut === "semis").sort((a, b) => cleDate(a.semis).localeCompare(cleDate(b.semis)) || a.espece.localeCompare(b.espece))) })
    if (listes.has("rusticite")) sections.push({ titre: "Rusticité", vue: "rusticite", groupes: [["", base.filter(enCollection).sort((a, b) => (a.t_min ?? 99) - (b.t_min ?? 99) || a.espece.localeCompare(b.espece))]] })
    const n = sections.reduce((a, sec) => a + sec.groupes.reduce((x, [, l]) => x + l.length, 0), 0)
    const bascule = (k: "collection" | "semis" | "rusticite") => setListes((s) => { const x = new Set(s); x.has(k) ? x.delete(k) : x.add(k); return x })
    const ligne: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }
    const generer = () => {
        if (!n) return setMsg("Aucune ligne à exporter.")
        setMsg(ouvrirListes(sections, { auteur, filtre: filtre ? filtreTxt : "" }) ? "" : "Le navigateur a bloqué la fenêtre : autorisez les fenêtres pour ce site.")
    }
    return (
        <div style={{ ...box, border: `1px solid ${C.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Listes en PDF</h3>
                <button onClick={onFermer} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: C.mute }}>Mise en page A4 paysage, une liste par partie. Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » ou imprimez directement.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 16, marginTop: 14 }}>
                <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                    <span style={etiquette}>Listes à inclure</span>
                    <label style={ligne}><input type="checkbox" style={coche} checked={listes.has("collection")} onChange={() => bascule("collection")} />Collection, semis levés compris ({base.filter(enCollection).length})</label>
                    <label style={ligne}><input type="checkbox" style={coche} checked={listes.has("semis")} onChange={() => bascule("semis")} />Semis ({base.filter((p) => p.statut === "semis").length})</label>
                    <label style={ligne}><input type="checkbox" style={coche} checked={listes.has("rusticite")} onChange={() => bascule("rusticite")} />Rusticité, de la plus rustique à la plus frileuse ({base.filter(enCollection).length})</label>
                </div>
                <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                    <span style={etiquette}>Options</span>
                    <label style={{ ...ligne, opacity: filtreTxt ? 1 : 0.5 }}><input type="checkbox" style={coche} checked={filtre && !!filtreTxt} disabled={!filtreTxt} onChange={(e) => setFiltre(e.target.checked)} />Seulement le filtre en cours{filtreTxt ? ` (${filtreTxt})` : ""}</label>
                    <label style={ligne}><input type="checkbox" style={coche} checked={parType} onChange={(e) => setParType(e.target.checked)} />Classer par type (collection et semis)</label>
                </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
                <button style={bouton()} onClick={generer} disabled={!n}>Créer le PDF ({n} ligne{n > 1 ? "s" : ""})</button>
                {msg && <span style={{ fontSize: 14, color: C.danger }}>{msg}</span>}
            </div>
        </div>
    )
}

// ---------- tableau (ordinateur) ----------
function Tableau({ l, cols, tri, setTri, onOuvrir, basculer, vue }: { l: Plante[]; cols: Col[]; tri: { k: string; sens: 1 | -1 }; setTri: (t: any) => void; onOuvrir: (p: Plante) => void; basculer: (p: Plante, k: "a_echanger" | "graines_a_donner") => void; vue: Vue }) {
    const cases = vue !== "rusticite"
    const largeur = cols.reduce((a, c) => a + (c.w || 100), 0) + (cases ? 176 : 0)
    const fixe = (k: string, entete = false): React.CSSProperties => (k === "espece" ? { position: "sticky", left: 0, zIndex: entete ? 3 : 1, background: C.panel, boxShadow: `1px 0 0 ${C.line}` } : {})
    return (
        <div style={{ overflow: "auto", maxHeight: "min(72vh, 760px)", border: `1px solid ${C.line}` }}>
            <style>{`.acs-paire td{background:${ZEBRE}!important}.acs-ligne:hover td{background:${C.panel2}!important}`}</style>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: Math.max(largeur, 0), minWidth: "100%" }}>
                <colgroup>{cols.map((c) => <col key={c.k} style={{ width: c.w || 100 }} />)}{cases && <><col style={{ width: 88 }} /><col style={{ width: 88 }} /></>}</colgroup>
                <thead><tr>
                    {cols.map((c) => <th key={c.k} style={{ ...th, ...fixe(c.k, true), whiteSpace: "normal" }} onClick={() => setTri({ k: c.k, sens: tri.k === c.k ? -tri.sens : 1 })}>{c.t}{tri.k === c.k ? (tri.sens > 0 ? " ↑" : " ↓") : ""}</th>)}
                    {cases && <><th title="Proposer la plante à l’échange" style={{ ...th, cursor: "default", textAlign: "center", whiteSpace: "normal" }}>Échange</th><th title="Proposer des graines" style={{ ...th, cursor: "default", textAlign: "center", whiteSpace: "normal" }}>Graines</th></>}
                </tr></thead>
                <tbody>
                    {l.map((p, i) => (
                        <tr key={p.id} onClick={() => onOuvrir(p)} style={{ cursor: "pointer" }} className={i % 2 ? "acs-ligne acs-paire" : "acs-ligne"}>
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

// ---------- cartes (téléphone) : une ligne compacte par plante, la fiche s’ouvre au toucher ----------
function Cartes({ l, vue, onOuvrir }: { l: Plante[]; vue: Vue; onOuvrir: (p: Plante) => void; basculer?: (p: Plante, k: "a_echanger" | "graines_a_donner") => void }) {
    const badge: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color: C.accent, border: `1px solid ${C.accent}`, padding: "1px 6px", whiteSpace: "nowrap" }
    return (
        <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
            {l.map((p, i) => {
                const infos = vue === "semis"
                    ? [p.semis, p.nb_graines ? `${p.nb_leves ?? 0}/${p.nb_graines} levées` : "", p.nb_vivants != null ? `${p.nb_vivants} viv.` : "", p.n_collecte]
                    : vue === "rusticite" ? [p.exposition ? <ExpoTxt e={p.exposition} /> : "", p.arrosage ? <IcoEau e={p.arrosage} /> : "", subAff(p.substrat)]
                        : [p.code, p.origine, p.n_collecte]
                const droite = vue === "semis" ? (taux(p) != null ? `${taux(p)} %` : "") : p.t_min != null ? `${p.t_min} °C` : ""
                return (
                    <button key={p.id} onClick={() => onOuvrir(p)} style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "left", background: i % 2 ? ZEBRE : "none", border: "none", borderTop: i ? `1px solid ${C.line}` : "none", color: C.txt, padding: "10px 12px", font: "inherit", cursor: "pointer" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 15, lineHeight: 1.3 }}><NomEspece p={p} /></span>
                            <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "center", fontSize: 12.5, color: C.mute, marginTop: 2 }}>
                                {(infos.filter(Boolean) as React.ReactNode[]).map((x, k) => <span key={k}>{x}</span>)}
                                {vue === "collection" && p.statut === "semis" && <span style={badge}>Semis</span>}
                                {p.a_echanger && <span style={badge}>Échange</span>}
                                {p.graines_a_donner && <span style={badge}>Graines</span>}
                            </span>
                        </span>
                        {droite && <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", color: "rgba(246,240,230,0.86)" }}>{droite}</span>}
                        <span aria-hidden style={{ color: C.mute, fontSize: 16 }}>›</span>
                    </button>
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
    // fenêtre par-dessus la liste : Échap ferme, la page derrière ne défile pas
    React.useEffect(() => {
        const avant = document.body.style.overflow; document.body.style.overflow = "hidden"
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(false) }
        document.addEventListener("keydown", k)
        ref.current?.focus()
        return () => { document.body.style.overflow = avant; document.removeEventListener("keydown", k) }
    }, [])

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

    return createPortal(
        <div onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(false) }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,7,5,0.72)", display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "max(12px, 4vh) 12px", boxSizing: "border-box" }}>
        <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={f.espece || "Fiche"} style={{ ...box, border: `1px solid ${C.accent}`, width: "100%", maxWidth: 820, boxSizing: "border-box", outline: "none", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600, minWidth: 0 }}>{f.id ? <NomEspece p={f} /> : f.statut === "semis" ? "Nouveau semis" : "Nouvelle plante"}</h3>
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
                {S("exposition", "Exposition", EXPOS.map((e) => [e, e]))}
                {S("arrosage", "Besoin en eau", ARROSAGES.map((e, i) => [e, `${e} (${i + 1} goutte${i ? "s" : ""})`]))}
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
        </div>,
        document.body
    )
}

// ---------- vérification des noms de cactus (index Lodé) ----------
const ORDRE_VERIF = ["SYNONYME", "GENRE", "RANG", "PROCHE", "DOUTE", "NONRETENU", "INCONNUE", "INCONNU", "INFRA"]
function PanneauVerif({ plantes, genres, client, email, onFermer }: { plantes: Plante[]; genres: Genres; client: any; email: string; onFermer: (ok?: string) => void }) {
    const [infra, setInfra] = React.useState(false)
    const [props, setProps] = React.useState<Record<string, string>>({})
    const [coches, setCoches] = React.useState<Set<string> | null>(null)
    const [occupe, setOccupe] = React.useState(false)
    const [err, setErr] = React.useState("")
    const [lode, setLode] = React.useState<Lode | null | undefined>(undefined)
    React.useEffect(() => { chargerLode().then((l) => setLode(l)) }, [])
    const res = React.useMemo(() => {
        if (!Object.keys(genres).length || lode === undefined) return null
        const ix = indexLode(genres, lode)
        const compte = new Map<string, number>()
        for (const p of plantes) if ((p.type || genres[genreDe(p.espece)]?.[0]) === "Cactus" || ix.genres.has(normTaxo(genreDe(p.espece)))) compte.set(p.espece, (compte.get(p.espece) || 0) + 1)
        const l: Verif[] = []
        for (const [nom, n] of compte) { const v = verifierNom(nom, ix); if (v.statut !== "OK") l.push({ ...v, n }) }
        l.sort((a, b) => ORDRE_VERIF.indexOf(a.statut) - ORDRE_VERIF.indexOf(b.statut) || a.nom.localeCompare(b.nom))
        return { l, total: compte.size }
    }, [plantes, genres, lode])
    if (!res) return <div style={box}><p style={{ margin: 0, color: C.mute }}>Chargement de l’index de Joël Lodé…</p></div>
    const vis = res.l.filter((v) => infra || v.statut !== "INFRA")
    const parDefaut = new Set(res.l.filter((v) => v.proposition && ["GENRE", "SYNONYME", "RANG", "PROCHE"].includes(v.statut)).map((v) => v.nom))
    const sel = coches ?? parDefaut
    const proposition = (v: Verif) => props[v.nom] ?? v.proposition
    const aAppliquer = vis.filter((v) => sel.has(v.nom) && proposition(v).trim() && proposition(v).trim() !== v.nom)
    const appliquer = async () => {
        setOccupe(true); setErr("")
        let n = 0
        for (const v of aAppliquer) {
            const nouveau = proposition(v).trim()
            const { error } = await client.from("plantes").update({ espece: nouveau, genre: genreDe(nouveau) || null }).eq("email", email.toLowerCase()).eq("espece", v.nom)
            if (error) { setErr(error.message); setOccupe(false); return }
            n += v.n
        }
        setOccupe(false)
        onFermer(`${aAppliquer.length} nom${aAppliquer.length > 1 ? "s" : ""} corrigé${aAppliquer.length > 1 ? "s" : ""} (${n} plante${n > 1 ? "s" : ""}).`)
    }
    const COUL: Record<string, string> = { GENRE: "#d7b56d", SYNONYME: "#d7b56d", DOUTE: "#d7b56d", RANG: "#9bbd8a", PROCHE: "#b9a3d6", NONRETENU: "#e08a73", INCONNUE: "#e08a73", INCONNU: "#e08a73", INFRA: "rgba(246,240,230,0.5)" }
    const nInfra = res.l.filter((v) => v.statut === "INFRA").length
    return (
        <div style={{ ...box, border: `1px solid ${C.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Vérifier les noms de cactus</h3>
                <button onClick={() => onFermer()} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: C.mute }}>Comparaison avec l’index des taxons et synonymes de Joël Lodé (Taxonomy of the Cactaceae, version en ligne 2026.2) : {res.total} noms de cactus vérifiés, {res.l.length - nInfra} à revoir. Les propositions sont modifiables ; seules les lignes cochées sont appliquées, à toutes vos plantes portant ce nom.</p>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 10, cursor: "pointer" }}><input type="checkbox" style={coche} checked={infra} onChange={(e) => setInfra(e.target.checked)} />Afficher aussi les variétés et formes non distinguées par Lodé ({nInfra})</label>
            {lode === null && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.danger }}>L’index complet n’a pas pu être chargé : vérification limitée aux noms acceptés, sans les synonymes.</p>}
            {vis.length === 0 ? <p style={{ margin: "14px 0 0", color: C.accent }}>Tous les noms sont conformes à l’index.</p> : (
                <div style={{ marginTop: 12, border: `1px solid ${C.line}`, maxHeight: 460, overflow: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
                        <thead><tr>{["", "Nom actuel", "Constat", "Proposition", "Explication"].map((t) => <th key={t} style={{ ...th, cursor: "default" }}>{t}</th>)}</tr></thead>
                        <tbody>{vis.map((v, i) => (
                            <tr key={v.nom} style={{ background: i % 2 ? ZEBRE : undefined }}>
                                <td style={td}><input type="checkbox" style={coche} disabled={!proposition(v).trim()} checked={sel.has(v.nom)} onChange={() => setCoches(() => { const x = new Set(sel); x.has(v.nom) ? x.delete(v.nom) : x.add(v.nom); return x })} /></td>
                                <td style={{ ...td, whiteSpace: "normal", minWidth: 200 }}><NomEspece p={{ espece: v.nom }} />{v.n > 1 && <span style={{ color: C.mute, fontSize: 12 }}> ×{v.n}</span>}</td>
                                <td style={{ ...td, color: COUL[v.statut], fontWeight: 600, fontSize: 13 }}>{v.libelle}</td>
                                <td style={{ ...td, minWidth: 240 }}><input value={proposition(v)} placeholder="—" onChange={(e) => setProps((x) => ({ ...x, [v.nom]: e.target.value }))} style={{ ...champ, padding: "6px 8px", fontSize: 14, fontStyle: "italic" }} /></td>
                                <td style={{ ...td, whiteSpace: "normal", fontSize: 13, color: C.mute, minWidth: 220 }}>{v.note}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            {err && <p style={{ margin: "12px 0 0", color: C.danger, fontSize: 14 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button style={bouton()} onClick={appliquer} disabled={occupe || !aAppliquer.length}>{occupe ? "Correction…" : `Appliquer les corrections cochées (${aAppliquer.length})`}</button>
                <button style={bouton(false)} onClick={() => onFermer()}>Fermer</button>
            </div>
        </div>
    )
}

// ---------- import d’une commande de graines ----------
function PanneauCommande({ plantes, genres, client, email, auteur, onFermer }: { plantes: Plante[]; genres: Genres; client: any; email: string; auteur: string; onFermer: (ok?: string) => void }) {
    const auj = new Date().toLocaleDateString("fr-FR")
    const [texte, setTexte] = React.useState("")
    const [force, setForce] = React.useState<"" | (typeof FOURNISSEURS)[number]>("")
    const [date, setDate] = React.useState(auj)
    const [methode, setMethode] = React.useState("Sachet")
    const [exclus, setExclus] = React.useState<Set<number>>(new Set())
    const [err, setErr] = React.useState("")
    const [occupe, setOccupe] = React.useState(false)
    const res = React.useMemo(() => (texte.trim() ? lireCommande(texte, force) : null), [texte, force])
    const prochain = Math.max(0, ...plantes.filter((p) => p.statut === "semis").map((p) => Number(p.code)).filter((n) => Number.isFinite(n))) + 1
    const retenus = res ? res.articles.filter((_, i) => !exclus.has(i)) : []
    const creer = async () => {
        if (!res || !retenus.length) return
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date.trim())) return setErr("Date du semis au format JJ/MM/AAAA.")
        setOccupe(true); setErr("")
        const lignes = retenus.map((a, i) => {
            const g = genreDe(a.nom), info = genres[g]
            return {
                email: email.toLowerCase(), auteur, espece: a.nom, genre: g || null, type: info?.[0] || (res.fournisseur === "Cono’s Paradise" ? "Aizoacées" : "Cactus"),
                statut: "semis", code: String(prochain + i), origine: a.loc || null, n_collecte: a.collect || null, reference: a.ref || null,
                fournisseur: res.fournisseur, semis: date.trim(), methode: methode || null, nb_graines: a.qte || null, substrat: 6,
                t_min: info?.[2]?.[0] ?? null, exposition: normExpo(info?.[2]?.[2]) || null, arrosage: info?.[2]?.[3] || null, exemplaires: 1,
            }
        })
        const { error } = await client.from("plantes").insert(lignes)
        setOccupe(false)
        if (error) setErr(error.message)
        else onFermer(`Semis du ${date.trim()} créé : ${lignes.length} lot${lignes.length > 1 ? "s" : ""} (n° ${prochain} à ${prochain + lignes.length - 1}).`)
    }
    return (
        <div style={{ ...box, border: `1px solid ${C.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Importer une commande de graines</h3>
                <button onClick={() => onFermer()} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: C.mute }}>Copiez le texte de la facture ou du courriel de commande (ADBLPS, SuccSeed, Köhres, Cono’s Paradise, Uhlig) et collez-le ici : un lot de semis est créé par graine commandée, numéroté à la suite de vos semis.</p>
            <textarea value={texte} onChange={(e) => { setTexte(e.target.value); setExclus(new Set()) }} rows={8} placeholder="Collez ici le texte de la commande…" style={{ ...champ, marginTop: 12, resize: "vertical", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))", gap: 12, marginTop: 12 }}>
                <div><label style={etiquette}>Fournisseur</label><select value={force} onChange={(e) => setForce(e.target.value as any)} style={champ}><option value="">{res ? `Détecté : ${res.fournisseur}` : "Détection automatique"}</option>{FOURNISSEURS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
                <div><label style={etiquette}>Date du semis</label><input value={date} onChange={(e) => setDate(e.target.value)} placeholder="JJ/MM/AAAA" style={champ} /></div>
                <div><label style={etiquette}>Méthode</label><input value={methode} onChange={(e) => setMethode(e.target.value)} style={champ} /></div>
            </div>
            {res && (
                <div style={{ marginTop: 14, border: `1px solid ${C.line}`, maxHeight: 300, overflow: "auto" }}>
                    {res.articles.length === 0 ? <p style={{ margin: 0, padding: 12, color: C.danger, fontSize: 14 }}>Aucune graine reconnue. Vérifiez le fournisseur ou collez le texte complet de la commande.</p> : (
                        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
                            <thead><tr>{["", "N°", "Espèce", "Graines", "Réf.", "N° collecte", "Localité"].map((t) => <th key={t} style={{ ...th, cursor: "default" }}>{t}</th>)}</tr></thead>
                            <tbody>{res.articles.map((a, i) => {
                                const pris = !exclus.has(i), n = pris ? prochain + res.articles.slice(0, i).filter((_, j) => !exclus.has(j)).length : null
                                return (
                                    <tr key={i} style={{ opacity: pris ? 1 : 0.45, background: i % 2 ? ZEBRE : undefined }}>
                                        <td style={td}><input type="checkbox" style={coche} checked={pris} onChange={() => setExclus((x) => { const s = new Set(x); s.has(i) ? s.delete(i) : s.add(i); return s })} /></td>
                                        <td style={td}>{n ?? ""}</td>
                                        <td style={{ ...td, whiteSpace: "normal" }}><NomEspece p={{ espece: a.nom }} /></td>
                                        <td style={td}>{a.qte}</td><td style={td}>{a.ref}</td><td style={td}>{a.collect}</td><td style={{ ...td, whiteSpace: "normal" }}>{a.loc}</td>
                                    </tr>
                                )
                            })}</tbody>
                        </table>
                    )}
                </div>
            )}
            {err && <p style={{ margin: "12px 0 0", color: C.danger, fontSize: 14 }}>{err}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button style={bouton()} onClick={creer} disabled={occupe || !retenus.length}>{occupe ? "Création…" : `Créer le semis (${retenus.length} lot${retenus.length > 1 ? "s" : ""})`}</button>
                <button style={bouton(false)} onClick={() => onFermer()}>Annuler</button>
            </div>
        </div>
    )
}

// ---------- panneau des étiquettes ----------
function PanneauEtiquettes({ liste, vue, auteur, genres, onFermer }: { liste: Plante[]; vue: Vue; auteur: string; genres: Genres; onFermer: () => void }) {
    const lots = React.useMemo(() => {
        const m = new Map<string, number>()
        for (const p of liste) if (p.statut === "semis" && p.semis) m.set(p.semis, (m.get(p.semis) || 0) + 1)
        return [...m.entries()].sort((a, b) => cleDate(b[0]).localeCompare(cleDate(a[0])))
    }, [liste])
    const [lot, setLot] = React.useState("")
    const [sansLevee, setSansLevee] = React.useState(true)
    const [selon, setSelon] = React.useState(false)
    const [debut, setDebut] = React.useState(1)
    const [contours, setContours] = React.useState(true)
    const [choix, setChoix] = React.useState<Set<string> | null>(null)
    const [msg, setMsg] = React.useState("")
    const base = liste.filter((p) => (!lot || p.semis === lot) && !(sansLevee && p.statut === "semis" && ((p.nb_vivants != null && p.nb_vivants === 0) || (p.nb_vivants == null && p.nb_leves === 0))))
    const coches = base.filter((p) => !choix || choix.has(p.id!))
    const items = coches.map((p) => ({ ...p, _pays: paysPlante(p, genres), _sub: p.substrat ?? genres[genreDe(p.espece)]?.[2]?.[1] ?? null } as Plante)).flatMap((p) => Array(Math.max(1, Math.min(50, selon ? (p.statut === "semis" ? p.nb_vivants ?? p.nb_leves ?? 1 : p.exemplaires ?? 1) : 1))).fill(p))
    const manques = coches.filter((p) => tempEtiquette(p) == null || !paysPlante(p, genres))
    const bascule = (id: string) => setChoix((c) => { const n = new Set(c ?? base.map((p) => p.id!)); n.has(id) ? n.delete(id) : n.add(id); return n })
    const imprimer = () => {
        if (!items.length) return setMsg("Aucune étiquette à imprimer.")
        const titre = lot ? `Semis du ${lot}` : vue === "semis" ? "Semis" : vue === "rusticite" ? "Collection" : "Collection"
        if (!ouvrirImpression(items, { debut, contours, titre, auteur })) setMsg("Le navigateur a bloqué la fenêtre d’impression : autorisez les fenêtres pour ce site.")
        else setMsg("")
    }
    const ligne: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }
    return (
        <div style={{ ...box, border: `1px solid ${C.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Étiquettes à piquer</h3>
                <button onClick={onFermer} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: C.mute }}>Planche A4 de 44 étiquettes (gabarit LINAD) : n° de substrat dans le rond, nom latin, n° de collecte, température minimale, pays, date et exposition. Les plantes viennent de la liste affichée (onglet, recherche et filtre de type).</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 12, marginTop: 14 }}>
                {lots.length > 0 && <div><label style={etiquette}>Lot de semis</label><select value={lot} onChange={(e) => { setLot(e.target.value); setChoix(null) }} style={champ}><option value="">Tous les lots affichés</option>{lots.map(([d, n]) => <option key={d} value={d}>Semis du {d} ({n})</option>)}</select></div>}
                <div><label style={etiquette}>Commencer à l’étiquette</label><input type="number" min={1} max={44} value={debut} onChange={(e) => setDebut(Math.max(1, Math.min(44, Number(e.target.value) || 1)))} style={champ} /><div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Pour finir une planche entamée (1 à 22 à gauche, 23 à 44 à droite).</div></div>
                <div style={{ display: "grid", gap: 8, alignContent: "start", paddingTop: 18 }}>
                    <label style={ligne}><input type="checkbox" style={coche} checked={sansLevee} onChange={(e) => setSansLevee(e.target.checked)} />Ignorer les semis sans plant vivant</label>
                    <label style={ligne}><input type="checkbox" style={coche} checked={selon} onChange={(e) => setSelon(e.target.checked)} />Une étiquette par plant (exemplaires ou vivants)</label>
                    <label style={ligne}><input type="checkbox" style={coche} checked={contours} onChange={(e) => setContours(e.target.checked)} />Imprimer les traits de découpe</label>
                </div>
            </div>
            <div style={{ marginTop: 14, border: `1px solid ${C.line}`, maxHeight: 240, overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.mute, position: "sticky", top: 0, background: C.panel }}>
                    <span>{coches.length} plante{coches.length > 1 ? "s" : ""} sur {base.length}</span>
                    <span><button style={{ ...petit(), padding: "3px 8px" }} onClick={() => setChoix(null)}>Tout</button> <button style={{ ...petit(), padding: "3px 8px" }} onClick={() => setChoix(new Set())}>Aucune</button></span>
                </div>
                {base.slice(0, 600).map((p) => (
                    <label key={p.id} style={{ ...ligne, padding: "6px 12px", borderBottom: `1px solid ${C.line}` }}>
                        <input type="checkbox" style={coche} checked={!choix || choix.has(p.id!)} onChange={() => bascule(p.id!)} />
                        <span style={{ flex: 1, minWidth: 0 }}><NomEspece p={p} /></span>
                        <span style={{ fontSize: 12, color: C.mute, whiteSpace: "nowrap" }}>{[p.n_collecte, p.statut === "semis" ? p.semis : p.code].filter(Boolean).join(" · ")}</span>
                    </label>
                ))}
            </div>
            {manques.length > 0 && (
                <details style={{ marginTop: 12, fontSize: 13 }}>
                    <summary style={{ cursor: "pointer", color: C.danger }}>{manques.length} étiquette{manques.length > 1 ? "s" : ""} à compléter (température ou pays manquant)</summary>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: "4px 14px", marginTop: 8, color: C.mute }}>
                        <span style={{ fontWeight: 600 }}>Plante</span><span style={{ fontWeight: 600 }}>T°</span><span style={{ fontWeight: 600 }}>Pays</span>
                        {manques.slice(0, 200).map((p) => <React.Fragment key={p.id}><span><NomEspece p={p} /></span><span>{tempEtiquette(p) == null ? "✗" : ""}</span><span>{paysPlante(p, genres) ? "" : "✗"}</span></React.Fragment>)}
                    </div>
                    <p style={{ margin: "8px 0 0", color: C.mute }}>Elles s’impriment avec « (?°C) » ou « Pays ? » : complétez la fiche pour corriger.</p>
                </details>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
                <button style={bouton()} onClick={imprimer} disabled={!items.length}>Aperçu et impression ({items.length} étiquette{items.length > 1 ? "s" : ""}, {Math.max(1, Math.ceil((items.length + debut - 1) / 44))} planche{Math.ceil((items.length + debut - 1) / 44) > 1 ? "s" : ""})</button>
                {msg && <span style={{ fontSize: 14, color: C.danger }}>{msg}</span>}
            </div>
        </div>
    )
}

// ---------- mode d’emploi de l’import ----------
function AideImport({ onModele, onFermer }: { onModele: () => void; onFermer: () => void }) {
    const etape = (n: number, titre: string, texte: React.ReactNode) => (
        <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: serif, fontSize: 20, color: C.accent, lineHeight: 1.2 }}>{n}</span>
            <div><div style={{ fontWeight: 600, fontSize: 15 }}>{titre}</div><div style={{ fontSize: 14, color: C.mute, marginTop: 2 }}>{texte}</div></div>
        </div>
    )
    return (
        <div style={{ marginTop: 16, border: `1px solid ${C.line}`, background: C.bg, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Comment importer sa collection ?</span>
                <button onClick={onFermer} style={{ background: "none", border: "none", color: C.mute, fontSize: 22, cursor: "pointer", padding: 0 }} aria-label="Fermer">×</button>
            </div>
            {etape(1, "Téléchargez le modèle", <>Un fichier Excel avec les bonnes colonnes, deux lignes d’exemple et un onglet « Mode d’emploi ». <button onClick={onModele} style={{ ...petit(true), marginTop: 8, display: "inline-block" }}>Télécharger le modèle Excel</button></>)}
            {etape(2, "Remplissez une ligne par plante", <>Seule la colonne <strong>Espèce</strong> est obligatoire. Mettez <em>Semis</em> dans la colonne Liste pour un lot de graines. Exposition : Soleil, Mi-ombre ou Ombre (ou ☀️ ⛅ ☁️) ; substrat : 1 à 6 (les mélanges de l’article sur les substrats) ; arrosage : 1 à 3 gouttes ; T(°C) : la température minimale.</>)}
            {etape(3, "Importez le fichier", <>Bouton <strong>Importer Excel</strong> ci-dessus. Un aperçu montre ce qui sera ajouté avant d’enregistrer ; les lignes déjà présentes ne sont pas dupliquées.</>)}
            {etape(4, "Vous avez déjà votre propre tableau ?", <>Importez-le tel quel : les colonnes sont reconnues par leur titre (Espèce ou Nom, Origine, T(°C), Semis, Acquis, N° collecte, Taux « 13/20 »…). Si une colonne n’est pas lue, renommez son titre comme dans le modèle.</>)}
            <div style={{ fontSize: 13, color: C.mute, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>Pour sauvegarder ou partager votre collection, <strong style={{ color: C.txt }}>Exporter Excel</strong> produit un fichier au même format, réimportable.</div>
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
                            <tr key={i} style={{ background: i % 2 ? ZEBRE : undefined }}>
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
const arrosageDe = (v: any) => { const t = texte(v); if (!t) return null; const g = (t.match(/[💧💦●•]/gu) || []).length; if (g) return g >= 3 ? "Régulier" : g === 2 ? "Modéré" : "Faible"; if (/^[123]$/.test(t)) return ["Faible", "Modéré", "Régulier"][Number(t) - 1]; if (/faible|peu/i.test(t)) return "Faible"; if (/mod/i.test(t)) return "Modéré"; if (/r[ée]gul|abond|g[ée]n[ée]r/i.test(t)) return "Régulier"; return t }

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
        if (/mode d.emploi|^aide|notice|lisez/i.test(nomFeuille)) continue
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

// =====================================================================================
// ÉTIQUETTES À PIQUER — gabarit A4 LINAD (44 étiquettes, 2 colonnes imbriquées)
// d’après le générateur d’étiquettes de Florentin Guitton (macro Excel + InDesign, LINAD 2026)
// =====================================================================================
const ETQ = { h: 32.64, corps: 269.16, pointe: 325.8, page: 594.84, hautG: 69.68, hautD: 53.36, n: 22 }
const ABREV = ["var.", "subsp.", "ssp.", "fma.", "v.", "f.", "cv."]

// coupe du nom sur deux lignes : jamais avant la fin de l’espèce, jamais autour d’une abréviation
export function couperNom(nom: string, max = 44): [string, string] {
    const t = nom.trim().replace(/\s+/g, " ")
    if (t.length <= max) return [t, ""]
    // espaces autorisés : hors parenthèses et hors ‘cultivar’, après la fin de l’espèce
    const ok: number[] = []
    let par = 0, guill = false, mots = 0
    for (let k = 0; k < t.length; k++) {
        const ch = t[k]
        if (ch === "(") par++
        else if (ch === ")") par = Math.max(0, par - 1)
        else if ((ch === "'" || ch === "‘" || ch === "’") && (ch !== "’" || guill)) guill = ch === "‘" ? true : ch === "’" ? false : !guill
        else if (ch === " ") { mots++; if (!par && !guill && mots >= 2) ok.push(k) }
    }
    const abrev = (k: number) => ABREV.includes((t.slice(k + 1).split(" ")[0] || "").toLowerCase()) || ABREV.includes((t.slice(0, k).split(" ").pop() || "").toLowerCase())
    const bons = ok.filter((k) => !abrev(k))
    if (!bons.some((k) => k <= max + 16) && t.length <= max + 16) return [t, ""]
    const c = [...bons].reverse().find((k) => k <= max) ?? [...bons].reverse().find((k) => k <= max + 16) ?? bons[0] ?? [...ok].reverse().find((k) => k <= max) ?? ok[0]
    if (c == null) return [t, ""]
    return [t.slice(0, c).trim(), t.slice(c + 1).trim()]
}

// pays à partir de la localité (« Cuatrocienagas/COAH/Mexique », « Mexique : Coahuila », « Salta »…)
const PAYS: [RegExp, string][] = [
    [/horticole|cultivar|hybride/i, "Horticole"],
    [/baja california|\bbcs?\b|san luis potos|\bslp\b|m[ée]xi(que|co)|\bmex\b|coahuila|\bcoah\b|nuevo le[oó]n|\bn\.?l\.?\b|tamaulipas|\btamps\b|oaxaca|\boax\b|durango|\bdgo\b|chihuahua|\bchih\b|quer[ée]taro|\bqro\b|hidalgo|\bhgo\b|zacatecas|\bzac\b|sonora|\bson\b|puebla|\bpue\b|guanajuato|\bgto\b|jalisco|\bjal\b|sinaloa|aguascalientes|michoac/i, "Mexique"],
    [/\busa\b|[ée]tats-unis|united states|texas|\btx\b|new mexico|\bnm\b|arizona|\baz\b|utah|\but\b|nevada|\bnv\b|wyoming|colorado|californi/i, "USA"],
    [/argentin|salta|jujuy|catamarca|la rioja|c[oó]rdoba|san juan|tucum[aá]n|mendoza|neuqu[ée]n|santiago del estero|\barg\b/i, "Argentine"],
    [/bolivi|cochabamba|chuquisaca|tarija|santa cruz|potos[ií]|oruro|\bbol\b/i, "Bolivie"],
    [/chil[ie]|atacama|antofagasta|coquimbo|tarapac|valpara[ií]so|huasco|taltal/i, "Chili"],
    [/p[ée]rou|peru|ayacucho|arequipa|ancash|lima\b/i, "Pérou"],
    [/br[ée]sil|brazil|minas gerais|\bmg\b|bahia|\bba\b|rio grande do sul|\brgs\b|santa catarina/i, "Brésil"],
    [/paraguay/i, "Paraguay"], [/uruguay/i, "Uruguay"], [/[ée]quateur|ecuador/i, "Équateur"], [/cuba\b/i, "Cuba"],
    [/afrique du sud|south africa|\brsa\b|cape|namaqualand|karoo|kwazulu|limpopo|mpumalanga/i, "Afrique du Sud"],
    [/namibi/i, "Namibie"], [/madagascar/i, "Madagascar"], [/y[ée]men|socotra/i, "Yémen"], [/somali/i, "Somalie"],
    [/kenya/i, "Kenya"], [/tanzani/i, "Tanzanie"], [/maroc|morocco/i, "Maroc"], [/canaries|canary/i, "Canaries"],
]
export function paysDe(origine?: string | null): string | null {
    const t = (origine || "").trim()
    if (!t) return null
    for (const [re, p] of PAYS) if (re.test(t)) return p
    const dernier = t.split(/[\/,:]/).map((s) => s.trim()).filter(Boolean).pop() || ""
    return dernier.length <= 22 && !/\d/.test(dernier) && /^[A-ZÉ]/.test(dernier) ? dernier : null
}
// pays de la plante : localité, sinon pays d’origine du genre quand il n’y en a qu’un
export const paysPlante = (p: Plante, genres?: Genres) => {
    const d = paysDe(p.origine)
    if (d) return d
    const g = genres?.[p.espece.split(" ")[0]]
    const l = g?.[3] ? g[3].split("|") : []
    return l.length === 1 ? l[0] : null
}

// exposition par défaut d’après le genre (listes du générateur LINAD) si la fiche n’en a pas
const OMBRE = "SCHLUMBERGERA,RHIPSALIS,EPIPHYLLUM,HATIORA,LEPISMIUM,HYLOCEREUS,SELENICEREUS,DISOCACTUS,WEBEROCEREUS,PSEUDORHIPSALIS,WEBERBAUEROCEREUS,DEAMIA,APOROCACTUS,CRYPTOCEREUS,STROPHOCACTUS,WIGGINSIA,PARODIA,NOTOCACTUS".split(",")
const MIOMBRE = "GYMNOCALYCIUM,DISCOCACTUS,MELOCACTUS,BLOSSFELDIA,STROMBOCACTUS,OBREGONIA,AZTEKIUM,EPITHELANTHA,PELECYPHORA,LOPHOPHORA,PTEROCACTUS,HAWORTHIA,HAWORTHIOPSIS,GASTERIA,ALOE,ADROMISCHUS,COTYLEDON,LITHOPS,CONOPHYTUM,DINTERANTHUS,FENESTRARIA,FRITHIA,PLEIOSPILOS,FAUCARIA,TITANOPSIS,ALOINOPSIS,ARGYRODERMA,GIBBAEUM,GLOTTIPHYLLUM,CONICOSIA,LAPIDARIA,CEROPEGIA,CRASSULA".split(",")
export const expoEtiquette = (p: Plante) => {
    if (p.exposition) return normExpo(p.exposition) || "Soleil"
    const g = (p.espece.split(" ")[0] || "").toUpperCase()
    return OMBRE.includes(g) ? "Ombre" : MIOMBRE.includes(g) ? "Mi-ombre" : "Soleil"
}

const PALIERS: [number, string[]][] = [
    [-10, ["ECHINOCEREUS", "ESCOBARIA", "PEDIOCACTUS", "SCLEROCACTUS", "MAIHUENIA", "TEPHROCACTUS"]],
    [-5, ["REBUTIA", "LOBIVIA", "GYMNOCALYCIUM", "ECHINOPSIS", "TRICHOCEREUS", "WEINGARTIA", "ACANTHOCALYCIUM", "SULCOREBUTIA"]],
    [-2, ["ASTROPHYTUM", "MAMMILLARIA", "THELOCACTUS", "TURBINICARPUS", "CORYPHANTHA", "NOTOCACTUS", "FEROCACTUS"]],
    [0, ["FRITHIA", "LITHOPS", "CONOPHYTUM", "TITANOPSIS", "PLEIOSPILOS", "ALOINOPSIS", "COPIAPOA", "ERIOSYCE", "MELOCACTUS", "DISCOCACTUS", "FRAILEA", "PARODIA", "ARIZONOCEREUS", "AEONIUM", "SINNINGIA"]],
]
export const tempEtiquette = (p: Plante): number | null => {
    if (p.t_min != null) return Number(p.t_min)
    const g = (p.espece.split(" ")[0] || "").toUpperCase()
    for (const [t, l] of PALIERS) if (l.includes(g)) return t
    return null
}

const echXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
// segments du nom : genre/épithètes en italique ; abréviations, ‘cultivars’ et (synonymes) en romain
const segmentsNom = (s: string) => s.split(/(\s(?:var\.|subsp\.|ssp\.|fma\.|f\.|v\.|cv\.|x)(?=\s)|'[^']*'?|‘[^’]*’?|\([^)]*\)?)/g).filter((x) => x !== "")
    .map((x, i, a) => `<tspan font-style="${/^\s?(var\.|subsp\.|ssp\.|fma\.|f\.|v\.|cv\.|x)$|^['‘(]/.test(x.trim()) || /^\s(var|subsp|ssp|fma|f|v|cv)\.$/.test(x) ? "normal" : "italic"}">${echXml(x)}</tspan>`).join("")

export type OptEtq = { debut: number; contours: boolean; titre: string; auteur: string }
export type LigneEtq = { p: Plante }

function etiquetteSVG(p: Plante, x0: number, y0: number, droite: boolean, contours: boolean) {
    const { h, corps, pointe } = ETQ
    const [l1, l2] = couperNom(p.espece)
    const tv = tempEtiquette(p)
    const t = tv != null ? `(${String(tv).replace("-", "−")}°C)` : "(?°C)"
    const pays = (p as any)._pays || paysDe(p.origine) || "Pays ?"
    const date = p.statut === "semis" ? p.semis || "" : p.acquis ? p.acquis : p.semis || ""
    const expo = expoEtiquette(p)
    // n° du mélange (1 à 6, article « Des substrats à composer ») dans le rond
    const sv = Number((p as any)._sub ?? p.substrat), sub = sv >= 1 && sv <= 6 ? String(sv) : ""
    const forme = `M0,0 L${corps},0 L${pointe},${h / 2} L${corps},${h} L0,${h} Z`
    const tr = droite ? `translate(${(x0).toFixed(2)},${(y0 + h).toFixed(2)}) rotate(180)` : `translate(${x0.toFixed(2)},${y0.toFixed(2)})`
    return `<g transform="${tr}">
${contours ? `<path d="${forme}" fill="none" stroke="#9a9a9a" stroke-width="0.35"/>` : ""}
<circle cx="9.5" cy="${h / 2}" r="3.7" fill="none" stroke="#222" stroke-width="0.6"/>
${sub ? `<text x="9.5" y="${(h / 2 + 1.95).toFixed(2)}" font-size="5.6" font-weight="700" font-style="normal" text-anchor="middle">${sub}</text>` : ""}
<text class="l1" x="18" y="13.4" font-size="9.4">${segmentsNom(l1)}</text>
<text class="l2" x="18" y="25.6" font-size="8.6">${l2 ? segmentsNom(l2) + "<tspan> </tspan>" : ""}${p.n_collecte ? `<tspan font-style="normal">${echXml(p.n_collecte)} </tspan>` : ""}<tspan font-style="normal" font-size="5.4" dy="-0.2">${echXml(t)} </tspan><tspan font-style="normal" font-weight="600" dy="0.2">${echXml(pays)}</tspan>${date ? `<tspan font-style="normal" font-size="5.4"> ${echXml(date)}</tspan>` : ""}</text>
<use class="ico" href="#ico-${expo === "Ombre" ? "ombre" : expo === "Mi-ombre" ? "miombre" : "soleil"}" x="0" y="${h - 10.6}"/>
</g>`
}

export function pagesEtiquettes(plantes: Plante[], o: OptEtq) {
    const { h, page, hautG, hautD, n } = ETQ
    const places: Array<{ x: number; y: number; droite: boolean }> = []
    for (let i = 0; i < n; i++) places.push({ x: 0, y: hautG + i * h, droite: false })
    for (let i = 0; i < n; i++) places.push({ x: page, y: hautD + i * h, droite: true })
    const file: (Plante | null)[] = [...Array(Math.max(0, Math.min(43, o.debut - 1))).fill(null), ...plantes]
    const nbPages = Math.max(1, Math.ceil(file.length / places.length))
    const date = new Date().toLocaleDateString("fr-FR")
    const ico = `<defs>
<g id="ico-soleil"><circle cx="3.2" cy="3.2" r="1.7" fill="#111"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="3.2" y1="0.3" x2="3.2" y2="1.05" stroke="#111" stroke-width="0.55" transform="rotate(${a} 3.2 3.2)"/>`).join("")}</g>
<g id="ico-miombre"><circle cx="2.6" cy="2.6" r="1.6" fill="#111"/><path d="M1.9,5.9 a1.35,1.35 0 0 1 0.6,-2.55 a1.75,1.75 0 0 1 3.3,0.35 a1.15,1.15 0 0 1 0.3,2.2 Z" fill="#fff" stroke="#111" stroke-width="0.5"/></g>
<g id="ico-ombre"><path d="M1.2,5.6 a1.4,1.4 0 0 1 0.6,-2.7 a1.9,1.9 0 0 1 3.6,0.3 a1.25,1.25 0 0 1 0.4,2.4 Z" fill="#111"/></g>
</defs>`
    let svg = ""
    for (let pg = 0; pg < nbPages; pg++) {
        const bloc: (Plante | null)[] = file.slice(pg * places.length, (pg + 1) * places.length)
        while (bloc.length < places.length) bloc.push(null)
        svg += `<section class="feuille"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.28 841.89" width="210mm" height="297mm">${ico}
<g font-family="'Roboto Condensed','Arial Narrow',sans-serif" fill="#111">
<text x="18" y="22" font-size="7" font-weight="700" letter-spacing="0.4">${echXml(o.auteur.toUpperCase())}</text>
<text x="18" y="32" font-size="6.3">${echXml(o.titre)} · ${date}</text>
<line x1="18" y1="36.5" x2="250" y2="36.5" stroke="#111" stroke-width="0.4"/>
<text x="18" y="45" font-size="5.6" fill="#555">Feuille ${pg + 1}/${nbPages} · ${bloc.filter(Boolean).length} étiquette${bloc.filter(Boolean).length > 1 ? "s" : ""}</text>
<text x="576" y="22" font-size="6.3" text-anchor="end" font-weight="700" letter-spacing="0.4">A.C.S. ARMORIQUE CACTUS SUCCULENTES</text>
<text x="576" y="32" font-size="5.6" text-anchor="end" fill="#555">Générateur d’étiquettes LINAD</text>
${bloc.map((p, i) => (p ? etiquetteSVG(p, places[i].x, places[i].y, places[i].droite, o.contours) : o.contours ? etiquetteVide(places[i].x, places[i].y, places[i].droite) : "")).join("\n")}
</g></svg></section>`
    }
    return { svg, nbPages }
}
function etiquetteVide(x0: number, y0: number, droite: boolean) {
    const { h, corps, pointe } = ETQ
    const tr = droite ? `translate(${x0},${y0 + h}) rotate(180)` : `translate(${x0},${y0})`
    return `<g transform="${tr}"><path d="M0,0 L${corps},0 L${pointe},${h / 2} L${corps},${h} L0,${h} Z" fill="none" stroke="#cfcfcf" stroke-width="0.3"/></g>`
}

export function ouvrirImpression(plantes: Plante[], o: OptEtq) {
    const { svg } = pagesEtiquettes(plantes, o)
    const w = window.open("", "_blank")
    if (!w) return false
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Étiquettes ${echXml(o.titre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0 }
html, body { margin: 0; padding: 0; background: #e9e5df }
.feuille { width: 210mm; height: 297mm; margin: 10mm auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.18); page-break-after: always; break-after: page; overflow: hidden }
.feuille svg { display: block }
.barre { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 10px; background: #1d1612; color: #f6f0e6; font: 14px Poppins, Arial, sans-serif }
.barre button { background: #9bbd8a; color: #1d1612; border: 0; padding: 9px 16px; font: 600 14px Poppins, Arial, sans-serif; cursor: pointer }
@media print { html, body { background: #fff } .barre { display: none } .feuille { margin: 0; box-shadow: none } }
</style></head><body>
<div class="barre"><span>Imprimez à 100 % (taille réelle), sans marges ni mise à l’échelle.</span><button id="imprimer">Imprimer</button></div>
${svg}
</body></html>`)
    w.document.close()
    const placer = () => {
        w.document.querySelectorAll("g[transform]").forEach((g: any) => {
            const l1 = g.querySelector("text.l1"), l2 = g.querySelector("text.l2"), ico = g.querySelector("use.ico")
            const max = 282
            for (const t of [l1, l2]) if (t && t.getComputedTextLength() > max) { t.setAttribute("textLength", String(max)); t.setAttribute("lengthAdjust", "spacingAndGlyphs") }
            if (l2 && ico) ico.setAttribute("x", String(18 + Math.min(l2.getComputedTextLength(), max) + 3))
        })
    }
    try { placer() } catch {}
    const bt = w.document.getElementById("imprimer"); if (bt) bt.addEventListener("click", () => w.print())
    const polices: Promise<any> = (w.document as any).fonts ? (w.document as any).fonts.ready : Promise.resolve()
    Promise.race([polices, new Promise((r) => setTimeout(r, 2500))]).then(() => {
        try { placer() } catch {}
        setTimeout(() => { try { w.focus(); w.print() } catch {} }, 300)
    })
    return true
}

// =====================================================================================
// EXPORT PDF DES LISTES — page imprimable (A4 paysage), enregistrée en PDF par le navigateur
// =====================================================================================
type ColPdf = [string, (p: Plante) => string, number?]
const nomHtml = (s: string) => s.split(/(\s(?:var\.|subsp\.|ssp\.|fma\.|f\.|cv\.|x)\s|'[^']*'|‘[^’]*’|\([^)]*\))/g).map((x, i) => (i % 2 ? echXml(x) : `<i>${echXml(x)}</i>`)).join("")
const COLS_PDF: Record<"collection" | "semis" | "rusticite", ColPdf[]> = {
    collection: [["N°", (p) => p.code ?? "", 6], ["Espèce", (p) => p.espece, 29], ["Origine", (p) => p.origine ?? "", 15], ["N° collecte", (p) => p.n_collecte ?? "", 9], ["Expo.", (p) => p.exposition ?? "", 7.5], ["Substrat", (p) => (p.substrat ? `${CERCLES[p.substrat]} ${SUB_COURT[p.substrat] ?? ""}` : ""), 14], ["T min", (p) => (p.t_min != null ? `${p.t_min} °C` : ""), 5.5], ["Eau", (p) => p.arrosage ?? "", 6.5], ["Depuis", (p) => p.acquis || p.semis || "", 6.5], ["Bourse", (p) => [p.a_echanger ? "échange" : "", p.graines_a_donner ? "graines" : ""].filter(Boolean).join(", "), 6]],
    semis: [["N°", (p) => p.code ?? "", 5], ["Espèce", (p) => p.espece, 28], ["Semé le", (p) => p.semis ?? "", 9], ["Méthode", (p) => p.methode ?? "", 8], ["Graines", (p) => (p.nb_graines ?? "") + "", 6], ["Levées", (p) => (p.nb_leves ?? "") + "", 6], ["%", (p) => (taux(p) != null ? `${taux(p)} %` : ""), 5], ["Vivants", (p) => (p.nb_vivants ?? "") + "", 6], ["N° collecte", (p) => p.n_collecte ?? "", 9], ["Réf.", (p) => p.reference ?? "", 10], ["Producteur", (p) => p.fournisseur ?? "", 10]],
    rusticite: [["T min", (p) => (p.t_min != null ? `${p.t_min} °C` : "—"), 7], ["Espèce", (p) => p.espece, 36], ["Liste", (p) => (p.statut === "semis" ? "Semis" : "Collection"), 9], ["Expo.", (p) => p.exposition ?? "", 9], ["Eau", (p) => p.arrosage ?? "", 9], ["Substrat", (p) => (p.substrat ? `${CERCLES[p.substrat]} ${SUB_COURT[p.substrat] ?? ""}` : ""), 15], ["Origine", (p) => p.origine ?? "", 15]],
}
export type SectionPdf = { titre: string; vue: "collection" | "semis" | "rusticite"; groupes: [string, Plante[]][] }
export function htmlListes(sections: SectionPdf[], o: { auteur: string; filtre: string }) {
    const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    const total = (sec: SectionPdf) => sec.groupes.reduce((a, [, l]) => a + l.length, 0)
    const corps = sections.map((sec) => {
        const cols = COLS_PDF[sec.vue]
        const tete = `<tr>${cols.map(([t, , w]) => `<th style="width:${w}%">${echXml(t)}</th>`).join("")}</tr>`
        return `<section class="liste"><h2${sections.length === 1 ? ' class="seul"' : ""}>${echXml(sec.titre)} <span>${total(sec)} ligne${total(sec) > 1 ? "s" : ""}</span></h2>${sec.groupes.map(([g, l]) => `
${g ? `<h3>${echXml(g)} <span>${l.length}</span></h3>` : ""}<table><thead>${tete}</thead><tbody>${l.map((p) => `<tr>${cols.map(([t, f]) => `<td${t === "Espèce" ? ' class="nom"' : ["Origine", "Substrat", "Réf.", "Producteur", "N° collecte", "Bourse"].includes(t) ? "" : ' class="court"'}>${t === "Espèce" ? nomHtml(f(p)) : echXml(f(p))}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("")}</section>`
    }).join("")
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${echXml(sections.map((s) => s.titre).join(", "))} · ${echXml(o.auteur)}</title>
<style>
@page { size: A4 landscape; margin: 12mm 11mm 14mm }
* { box-sizing: border-box }
body { margin: 0; font: 9pt/1.35 "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; background: #e9e5df }
.page { max-width: 277mm; margin: 0 auto; background: #fff; padding: 12mm 11mm; box-shadow: 0 2px 12px rgba(0,0,0,.15) }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.2pt solid #1a1a1a; padding-bottom: 4pt; margin-bottom: 10pt }
header h1 { font: 600 16pt/1.1 Georgia, "Times New Roman", serif; margin: 0 }
header p { margin: 2pt 0 0; color: #555; font-size: 8pt }
header .club { text-align: right; font-size: 7.5pt; letter-spacing: .04em; color: #555 }
h2 { font: 600 13pt Georgia, serif; margin: 14pt 0 4pt } h2 span, h3 span { font: 400 8pt Arial, sans-serif; color: #777; margin-left: 4pt }
h3 { font: 600 10pt Georgia, serif; margin: 8pt 0 3pt } h2.seul { font-size: 0; margin: 0 } h2.seul span { font-size: 8pt; margin: 0 }
.liste + .liste { break-before: page; page-break-before: always }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 4pt }
th { text-align: left; font-size: 7pt; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: .8pt solid #1a1a1a; padding: 3pt 4pt }
td { padding: 2.6pt 4pt; border-bottom: .4pt solid #d6d0c8; vertical-align: top; overflow-wrap: break-word }
tr { break-inside: avoid; page-break-inside: avoid } thead { display: table-header-group }
tbody tr:nth-child(even) td { background: #f3efe9 } td.nom { font-size: 9.2pt } td.court { white-space: nowrap; overflow-wrap: normal }
.barre { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px; background: #1d1612; color: #f6f0e6; font: 14px Poppins, Arial, sans-serif }
.barre button { background: #9bbd8a; color: #1d1612; border: 0; padding: 9px 16px; font: 600 14px Poppins, Arial, sans-serif; cursor: pointer }
@media print { body { background: #fff } .barre { display: none } .page { box-shadow: none; padding: 0; max-width: none } }
</style></head><body>
<div class="barre"><span>Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».</span><button id="imprimer">Enregistrer en PDF</button></div>
<div class="page"><header><div><h1>${echXml(sections.length === 1 ? sections[0].titre : "Ma collection")}</h1><p>${echXml(o.auteur)} · ${date}${o.filtre ? ` · ${echXml(o.filtre)}` : ""}</p></div><div class="club">A.C.S. ARMORIQUE CACTUS SUCCULENTES</div></header>
${corps}</div></body></html>`
}
export function ouvrirListes(sections: SectionPdf[], o: { auteur: string; filtre: string }) {
    const w = window.open("", "_blank")
    if (!w) return false
    w.document.write(htmlListes(sections, o))
    w.document.close()
    const bt = w.document.getElementById("imprimer"); if (bt) bt.addEventListener("click", () => w.print())
    setTimeout(() => { try { w.focus(); w.print() } catch {} }, 400)
    return true
}

// =====================================================================================
// IMPORT DE COMMANDE DE GRAINES — d’après la macro IMPORT_COMMANDE (Florentin Guitton, LINAD 2026)
// Fournisseurs : ADBLPS, SuccSeed, Köhres Kakteen, Cono’s Paradise, Uhlig Kakteen
// =====================================================================================
export type Article = { nom: string; ref: string; collect: string; qte: number; loc: string }
export const FOURNISSEURS = ["ADBLPS", "SuccSeed", "Köhres Kakteen", "Cono’s Paradise", "Uhlig Kakteen"] as const
type Four = (typeof FOURNISSEURS)[number]

const ABRV: Record<string, string> = { "var.": "var.", "v.": "var.", "subsp.": "subsp.", "ssp.": "subsp.", "fma.": "fma.", "fa.": "fma.", "f.": "fma." }
const maj1 = (m: string) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
const espaces = (s: string) => s.replace(/\s+/g, " ").trim()
const nettoyerCollect = (m: string) => espaces(m.replace(/[\[\]]/g, "").replace(/_/g, " "))
const normaliserAbrev = (t: string) => espaces(` ${t} `.replace(/ v\. /g, " var. ").replace(/ ssp\. /g, " subsp. ").replace(/ fa?\. /g, " fma. "))

export function detecterFournisseur(lignes: string[]): Four {
    const sc: Record<Four, number> = { ADBLPS: 0, SuccSeed: 0, "Köhres Kakteen": 0, "Cono’s Paradise": 0, "Uhlig Kakteen": 0 }
    for (const l of lignes.slice(0, 80)) {
        if (/ADBLPS/.test(l)) sc.ADBLPS += 5
        if (/\[[^\]]*\/[^\]]*\]/.test(l) && !/CITES/.test(l)) sc.ADBLPS += 1
        if (/^[A-Z]{5,}\s/.test(l)) sc.ADBLPS += 1
        if (/SuccSeed|succseed\.com/i.test(l)) sc.SuccSeed += 5
        if (/CITES/.test(l)) sc.SuccSeed += 2
        if (/Vat (ex|in)cl/i.test(l)) sc.SuccSeed += 3
        if (/K(ö|oe?)hres/i.test(l)) sc["Köhres Kakteen"] += 5
        if (/Tri:Portion|Menge:Morceau/i.test(l)) sc["Köhres Kakteen"] += 3
        if (/Cono/i.test(l)) sc["Cono’s Paradise"] += 5
        if (/\s[×x]\s*C\w*,\s*\d+\s*S\s*:/.test(l)) sc["Cono’s Paradise"] += 3
        if (/uhlig/i.test(l)) sc["Uhlig Kakteen"] += 5
        if (/\d+\s*Graines\d{5,6}/.test(l)) sc["Uhlig Kakteen"] += 3
        if (/\(Graines\)/.test(l)) sc["Uhlig Kakteen"] += 2
    }
    return (Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0] as Four)
}

// ---------- ADBLPS : « GYMNOCALYCIUM affine RH_3609 > San Francisco [RH/16] » puis « 20 graines »
function parserADBLPS(lignes: string[]): Article[] {
    const out: Article[] = []
    let cur: Article | null = null, epuise = false
    const pousser = () => { if (cur && cur.qte > 0 && !epuise) out.push(cur) }
    for (const brut of lignes) {
        const l = brut.trim()
        if (!l) continue
        const m1 = l.split(" ")[0]
        if (m1.length >= 5 && /^[A-Z]+$/.test(m1)) {
            pousser(); epuise = /[ée]puis[ée]/i.test(l)
            let t = l.replace(/\s*-\s*[ÉEé]puis[ée]?/gi, "")
            let ref = ""
            t = t.replace(/\[([^\]]+)\]/g, (x, c) => (c.includes("/") && c.length > 3 ? ((ref = `[${c}]`), "") : x))
            let loc = ""
            const gt = t.indexOf(" > ")
            if (gt > 0) { loc = t.slice(gt + 3).trim(); t = t.slice(0, gt) }
            const mots = espaces(t).split(" ")
            let collect = ""
            for (let j = mots.length - 1; j > 0; j--) {
                const s = mots[j].replace(/[\[\]]/g, "")
                if (/[A-Za-z]/.test(s) && /\d/.test(s)) { collect = nettoyerCollect(mots[j]); mots.splice(j, 1); break }
            }
            mots[0] = maj1(mots[0])
            const nom = mots.map((m, i) => (i && ["SSP.", "VAR.", "FMA.", "FA."].includes(m) ? (m === "SSP." ? "subsp." : m === "VAR." ? "var." : "fma.") : m)).join(" ")
            cur = { nom: normaliserAbrev(nom), ref, collect, qte: 0, loc }
            continue
        }
        if (!cur) continue
        if (/graines/i.test(l)) { const q = parseFloat(l); if (q > 0) cur.qte = q; continue }
        if (/puis/i.test(l) || (l === "0" && cur.qte > 0)) { epuise = true; continue }
    }
    pousser()
    return out
}

// ---------- SuccSeed : « Ariocarpus retusus SB 310 (Cuesta la Muralla, COA) », 20 graines par sachet
function codeCollect(m: string, suivant?: string, minMaj = 2) {
    const n = (m.match(/^[A-Z]+/) || [""])[0].length
    if (n < minMaj || n > 4) return false
    const suite = m.slice(n)
    return suite === "" ? !!suivant && /^\d/.test(suivant) && !suivant.includes(",") : /^[\d.]/.test(suite)
}
function ligneSuccSeed(l: string): Article {
    let t = l.trim(), loc = ""
    const o = t.indexOf("("), c = t.indexOf(")")
    if (o > 0 && c > o) { loc = t.slice(o + 1, c).trim(); t = t.slice(0, o).trim() }
    const ci = t.indexOf("CITES"); if (ci > 0) t = t.slice(0, ci).trim()
    const mots = t.split(" ").filter(Boolean)
    let fin = mots.length, collect = "", avant = 0
    for (let i = 0; i < mots.length; i++) {
        const m = mots[i]
        if (ABRV[m] || m.startsWith("'")) { avant++; continue }
        if (avant >= 1 && codeCollect(m, mots[i + 1])) { collect = nettoyerCollect(mots.slice(i).join(" ")); fin = i; break }
        avant++
    }
    return { nom: normaliserAbrev(mots.slice(0, fin).join(" ")), ref: "", collect, qte: 20, loc }
}
function parserSuccSeed(lignes: string[]): Article[] {
    const out: Article[] = []
    let dans = false
    for (const brut of lignes) {
        const l = brut.trim(); if (!l) continue
        if (/Quantity/.test(l) && /Article/.test(l)) { dans = true; continue }
        if (/Postage|ORDERED BY|Total/.test(l)) { dans = false; continue }
        const r = l.match(/^\d+\s+(\d{4,6})\s+(.*)$/)
        if (dans && r && /^[A-Z][a-z]+ [a-z]/.test(r[2])) { const a = ligneSuccSeed(r[2]); a.ref = r[1]; out.push(a) }
        else if (dans && /^[A-Z][a-z]+ [a-z]/.test(l)) out.push(ligneSuccSeed(l))
    }
    if (out.length) return out
    let ref = ""
    for (const brut of lignes) {
        const l = brut.trim(); if (!l) continue
        if (/^\d{4,6}$/.test(l)) { ref = l; continue }
        if (/Vat|Postage|CITES|SuccSeed|NORDEA|IBAN/i.test(l)) continue
        if (/^[A-Z][a-z]+ [a-z]/.test(l)) { const a = ligneSuccSeed(l); a.ref = ref; out.push(a); ref = "" }
    }
    return out
}

// ---------- Köhres : « 1 x » / « TITANOPSIS calcarea 10K JAA 2102 » / « 6358 1,50 EUR … »
function nomKohres(ligne: string): [string, string, string] {
    let t = ligne.trim()
    for (const n of [" rote Bluete", " rote Blüte", " weisse Bluete", " weisse Blüte", " gelbe Bluete", " gelbe Blüte", " rosa Bluete", " rosa Blüte", " orange Bluete", " grosse Form", " kleine Form", " Mischung", " Riesen"]) t = t.split(n).join("")
    t = espaces(t.replace(/\b\d+K\b/g, ""))
    let syn = ""
    const tiret = t.indexOf("-")
    if (tiret > 0) {
        const avant = t.slice(0, tiret), apres = t.slice(tiret + 1).trim(), p = apres.split(" ")[0]
        if (/^[A-Z][A-Z]+$/.test(p)) {
            if (avant.includes(" ")) { t = avant; syn = `(=${maj1(p)})` }
            else {
                const ms = apres.split(" "), k = ms.findIndex((m) => /^[a-z]/.test(m))
                if (k >= 0) t = [avant, ...ms.slice(k)].join(" ")
                else { t = avant; syn = `(=${maj1(p)})` }
            }
        }
    }
    const eg = t.indexOf("=")
    if (eg > 0 && !syn) { syn = `(${t.slice(eg + 1).trim().split(" ")[0]})`; t = t.slice(0, eg).trim() }
    const mots = t.split(" ").filter(Boolean), nom: string[] = []
    let fini = false, collect = "", loc: string[] = []
    for (let i = 0; i < mots.length; i++) {
        const m = mots[i]
        if (ABRV[m.toLowerCase()]) { if (!fini) nom.push(ABRV[m.toLowerCase()]); continue }
        if (/^[a-z]/.test(m) && !fini) { nom.push(m); continue }
        if (m.startsWith("'") && !fini) { nom.push(m); continue }
        if (/^[A-Z]/.test(m) && nom.length >= 1) {
            fini = true
            if (!collect && codeCollect(m, mots[i + 1])) { collect = nettoyerCollect(m); if (mots[i + 1] && /^\d/.test(mots[i + 1]) && !/\d/.test(m)) { collect += " " + mots[i + 1]; i++ } continue }
            loc.push(maj1(m)); continue
        }
        if (!nom.length) nom.push(maj1(m.split("-")[0]))
    }
    return [espaces(nom.join(" ") + (syn ? " " + syn : "")), collect, loc.join(" ")]
}
function parserKohres(lignes: string[]): Article[] {
    const out: Article[] = []
    let cur: Article | null = null, attend = false, fois = 1
    for (const brut of lignes) {
        const l = brut.trim(); if (!l) continue
        const q = l.match(/^(\d{1,2})\s*[xX×]$/)
        if (q) { if (cur) out.push(cur); cur = null; fois = Number(q[1]); attend = true; continue }
        if (/^(tri:portion|menge:morceau)$/i.test(l)) continue
        if (/EUR/.test(l)) { if (cur && !cur.ref) cur.ref = (l.split(" ").find((m) => /^\d{4,6}$/.test(m)) || ""); attend = false; continue }
        if (/k(ö|oe?)hres|bestellung|rechnung|versand|gesamtsumme|mwst|datum/i.test(l)) continue
        const g = l.split(" ")[0].split("-")[0]
        if (attend && g.length >= 4 && /^[A-Z]+$/.test(g)) {
            const [nom, collect, loc] = nomKohres(l)
            const k = l.match(/\b(\d{1,3})K\b/)
            cur = { nom, ref: "", collect, loc, qte: fois * (k ? Number(k[1]) : 20) }
            attend = false
        }
    }
    if (cur) out.push(cur)
    return out
}

// ---------- Cono’s Paradise : « 1 × C36A, 20S: Lithops lesliei ssp. lesliei v. lesliei 'Albinica', € 2 »
function parserCono(lignes: string[]): Article[] {
    const out: Article[] = []
    for (const brut of lignes) {
        let t = brut.trim()
        if (!/×|\sx\s/i.test(t) || !t.includes(": ")) continue
        if (!/^[A-Z]/.test(t.slice(t.indexOf(": ") + 2).trim())) continue
        const p = t.indexOf("×"); t = p >= 0 ? t.slice(p + 1).trim() : t.slice(t.toLowerCase().indexOf(" x ") + 3).trim()
        const v = t.indexOf(","); if (v < 0) continue
        const ref = t.slice(0, v).trim(); t = t.slice(v + 1).trim()
        const c = t.indexOf(":"); if (c < 0) continue
        const qte = Number(t.slice(0, c).replace(/s/gi, "").replace(/\s/g, "")) || 20
        t = t.slice(c + 1).trim()
        const e = t.indexOf("€")
        if (e >= 0) { const av = t.slice(0, e); const dv = av.lastIndexOf(","); t = (dv > 0 ? t.slice(0, dv) : av).trim() }
        out.push({ nom: normaliserAbrev(t), ref, collect: "", qte, loc: "" })
    }
    return out
}

// ---------- Uhlig : « Ferocactus chrysacanthus L010 Punta Norte,Isla Cedros,BajaCalifornia,Mexico(Graines) » puis « 20 Graines208717 »
function nomUhlig(ligne: string): [string, string, string] {
    let t = ligne.replace("(Graines)", "").replace(/CITES\s*not\s*outside\s*EU|CITES/g, "")
    t = espaces(t).replace(/,?\s*\d+(-\d+)?\s*m\s*$/i, "").trim()
    const mots = t.split(" "), nom: string[] = []
    let fini = false, collect = "", loc: string[] = []
    for (let i = 0; i < mots.length; i++) {
        const m = mots[i]; if (!m) continue
        if (ABRV[m.toLowerCase()]) { if (!fini) nom.push(ABRV[m.toLowerCase()]); continue }
        if (m.startsWith("'") && !fini) { nom.push(m); continue }
        if (/^[a-z]/.test(m) && !fini) { nom.push(m); continue }
        if (!nom.length && /^[A-Z]/.test(m)) { nom.push(maj1(m)); continue }
        if (nom.length >= 2) {
            fini = true
            if (!collect && codeCollect(m, mots[i + 1], 1)) { collect = nettoyerCollect(m); if (mots[i + 1] && /^\d/.test(mots[i + 1]) && !mots[i + 1].includes(",") && !/\d/.test(m)) { collect += " " + mots[i + 1]; i++ } continue }
            loc.push(m.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/,/g, ", "))
        }
    }
    return [nom.join(" "), collect, espaces(loc.join(" ")).replace(/[,\s]+$/, "").replace(/\s,/g, ",")]
}
function parserUhlig(lignes: string[]): Article[] {
    const out: Article[] = []
    let cur: [string, string, string] | null = null
    for (const brut of lignes) {
        const l = brut.trim(); if (!l) continue
        if (/co[uû]ts de paiement|sous-total/i.test(l)) break
        const q = l.match(/^(\d+)\s*Graines(\d*)/)
        if (cur && q && !l.includes("(Graines)")) { out.push({ nom: cur[0], collect: cur[1], loc: cur[2], qte: Number(q[1]), ref: q[2] || "" }); cur = null; continue }
        if (cur && !q) cur = null
        if (l.includes("(Graines)")) cur = nomUhlig(l)
    }
    return out
}

export function lireCommande(texte: string, force?: Four | ""): { fournisseur: Four; articles: Article[] } {
    const lignes = texte.replace(/\r/g, "").split("\n")
    const fournisseur = force || detecterFournisseur(lignes)
    const articles = fournisseur === "ADBLPS" ? parserADBLPS(lignes) : fournisseur === "Köhres Kakteen" ? parserKohres(lignes) : fournisseur === "Cono’s Paradise" ? parserCono(lignes) : fournisseur === "Uhlig Kakteen" ? parserUhlig(lignes) : parserSuccSeed(lignes)
    return { fournisseur, articles: articles.filter((a) => a.nom && /^[A-Z][a-z]/.test(a.nom)) }
}

// =====================================================================================
// VALIDATION TAXONOMIQUE DES CACTUS — index de Joël Lodé (Taxonomie des Cactaceae, vol. 3 à 6, 2026)
// d’après le module de validation de Florentin Guitton (LINAD 2026, v3.1)
// =====================================================================================
export type Verif = { nom: string; statut: string; libelle: string; proposition: string; note: string; n: number }
const normTaxo = (s: string) => sansAccent(s).replace(/-/g, "").replace(/[^a-z0-9 .]/g, " ").replace(/\s+/g, " ").trim()
const RANGS: Record<string, string> = { "subsp.": "subsp.", "ssp.": "subsp.", "var.": "var.", "v.": "var.", "fma.": "fma.", "f.": "fma.", "fa.": "fma." }
const GROUPES = [["eriosyce", "neoporteria", "guerreroa", "islaya", "thelocephala", "horridocactus", "pyrrhocactus", "rodentiophila"], ["sulcorebutia", "weingartia", "cintia"], ["turbinicarpus", "rapicactus", "gymnocactus", "kadenicarpus"], ["notocactus", "parodia", "eriocephala", "brasiliparodia", "acanthocephala", "wigginsia", "malacocarpus"], ["rebutia", "aylostera", "mediolobivia", "digitorebutia"], ["echinopsis", "lobivia", "trichocereus", "soehrensia", "chamaecereus", "leucostele"], ["echinofossulocactus", "stenocactus"], ["neolloydia", "cumarinia"], ["coryphantha", "lepidocoryphantha", "escobaria", "neobesseya"], ["hamatocactus", "glandulicactus", "ancistrocactus", "sclerocactus", "ferocactus", "thelocactus"]]

type IndexTaxo = { orig: Map<string, string>; taxa: Set<string>; parGenre: Map<string, string[]>; parEpithete: Map<string, string[]>; exGenre: Map<string, string>; exEpithete: Map<string, string>; genres: Map<string, string>; syn: Map<string, string>; nr: Set<string>; complet: boolean }
let INDEX: IndexTaxo | null = null
// clé normalisée « genre espece [subsp. x] » (rangs unifiés)
export const cleTaxo = (nom: string) => normTaxo(nom).split(" ").map((m) => RANGS[m] || m).join(" ")
export function indexLode(genres: Genres, lode?: Lode | null): IndexTaxo {
    if (INDEX && (INDEX.complet || !lode)) return INDEX
    const ix: IndexTaxo = { orig: new Map(), taxa: new Set(), parGenre: new Map(), parEpithete: new Map(), exGenre: new Map(), exEpithete: new Map(), genres: new Map(), syn: new Map(), nr: new Set(), complet: !!lode }
    const ajouter = (gAff: string, gn: string, sp: string, aff: string) => {
        const cle = `${gn} ${sp}`
        if (ix.taxa.has(cle)) return
        ix.taxa.add(cle); ix.orig.set(cle, aff)
        if (!ix.genres.has(gn)) ix.genres.set(gn, gAff)
        ix.parGenre.set(gn, [...(ix.parGenre.get(gn) || []), sp])
        const ep = sp.split(" ")[0]
        if (!sp.includes(" ")) ix.parEpithete.set(ep, [...(ix.parEpithete.get(ep) || []), cle])
        const m = sp.match(/subsp\. (\S+)$/)
        if (m) ix.parEpithete.set("subsp:" + m[1], [...(ix.parEpithete.get("subsp:" + m[1]) || []), cle])
    }
    for (const [g, v] of Object.entries(genres)) {
        if (v[0] !== "Cactus" || !v[1]) continue
        const gn = normTaxo(g)
        ix.genres.set(gn, g)
        for (const brut of v[1].split("|")) {
            const ex = brut.match(/\((?:ex|maintenant)\s+([^)]+)\)/i)
            const sp = normTaxo(brut.replace(/\([^)]*\)/g, ""))
            if (!sp) continue
            const cle = `${gn} ${sp}`
            ajouter(g, gn, sp, `${g} ${brut.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim()}`)
            if (ex && !/^maintenant/i.test(ex[0].slice(1))) {
                const a = ex[1].trim()
                if (/^[A-Z]/.test(a)) { const ancien = normTaxo(a.replace(/^Ech\.?$/, "Echinopsis")); ix.exGenre.set(`${ancien} ${sp}`, cle) }
                else ix.exEpithete.set(`${gn} ${normTaxo(a)}`, cle)
            }
        }
    }
    // index complet de Lodé (2026.2) : noms acceptés, synonymes et noms non retenus
    if (lode) {
        for (const a of lode.acc) { const k = cleTaxo(a); const [gn, ...r] = k.split(" "); if (gn && r.length) ajouter(a.split(" ")[0], gn, r.join(" "), a) }
        for (const [a, b] of Object.entries(lode.syn)) ix.syn.set(cleTaxo(a), b)
        for (const a of lode.nd) ix.nr.add(cleTaxo(a))
    }
    return (INDEX = ix)
}
const lev = (a: string, b: string) => {
    if (Math.abs(a.length - b.length) > 5) return 99
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 1; j <= b.length; j++) d[0][j] = j
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    return d[a.length][b.length]
}
const affiche = (ix: IndexTaxo, cle: string) => { if (ix.orig.has(cle)) return ix.orig.get(cle)!; const [g, ...r] = cle.split(" "); return [ix.genres.get(g) || g, ...r].join(" ") }

// décompose « Genre espèce subsp. x 'Cultivar' (=Synonyme) »
function decomposer(nom: string) {
    const annexes: string[] = []
    let t = nom.replace(/\([^)]*\)?/g, (x) => (annexes.push(x.trim()), " ")).replace(/['‘][^'’]*['’]?/g, (x) => (annexes.push(x.trim()), " "))
    const cv = t.search(/\s(cv\.|x\s|×)/i)
    if (cv > 0) { annexes.unshift(t.slice(cv).trim()); t = t.slice(0, cv) }
    const mots = t.trim().split(/\s+/).filter(Boolean)
    const genre = mots[0] || "", espece = (mots[1] || "").toLowerCase()
    const infra: [string, string][] = []
    for (let i = 2; i < mots.length; i++) {
        const r = RANGS[mots[i].toLowerCase()]
        if (r && mots[i + 1]) { infra.push([r, mots[i + 1].toLowerCase()]); i++ }
        else if (/^\(/.test(mots[i])) break
    }
    return { genre, espece, infra, annexes: annexes.filter((a) => !/^\(\s*(\?|subsp\.?|var\.?|ssp\.?)\s*\)$/i.test(a)) }
}

export function verifierNom(nom: string, ix: IndexTaxo): Omit<Verif, "n"> {
    const { genre, espece, infra, annexes } = decomposer(nom)
    const g = normTaxo(genre), e = normTaxo(espece)
    const base = { nom }
    if (!g || !e || /hybride|^hort/i.test(nom)) return { ...base, statut: "OK", libelle: "", proposition: "", note: "" }
    const recompose = (cle: string, ancienGenre?: string, aff?: string) => {
        const nom2 = aff || affiche(ix, cle)
        const nouveau = sansAccent(nom2.split(" ")[0])
        const nouveauNorm = normTaxo(nom2), nouvelEp = nouveauNorm.split(" ").slice(1)
        const redit = (a: string) => {
            const x = normTaxo(a.replace(/^\(=?|\)$/g, "")); if (!x) return false
            if (x === nouveauNorm || nouvelEp.includes(x) || nouveauNorm.endsWith(" " + x)) return true
            const [g0, ...r] = x.split(" ")   // (=W. mentosa) quand la proposition est Weingartia mentosa subsp. …
            return r.length > 0 && nouveauNorm.startsWith(g0.replace(/\.$/, "")) && r.every((m) => nouvelEp.includes(m))
        }
        const extra = annexes.filter((a) => !redit(a) && !(ancienGenre && sansAccent(a).includes(sansAccent(ancienGenre))) && !(/^\(=/.test(a) && sansAccent(a).startsWith("(=" + nouveau)))
        if (ancienGenre && !annexes.some((a) => sansAccent(a).includes(sansAccent(ancienGenre)))) extra.push(`(=${ancienGenre})`)
        return [nom2, ...extra].join(" ")
    }
    const avecInfra = (cle: string) => {
        // garde la sous-espèce d’origine si elle existe sous le nouveau nom
        const [r, ep] = infra[0] || []
        if (r && ep && ep !== e) { const c2 = `${cle} subsp. ${normTaxo(ep)}`; if (ix.taxa.has(c2)) return c2 }
        return cle
    }
    const cle = `${g} ${e}`
    // synonyme donné par l’index de Lodé
    const parSyn = (cible: string, src: string, garderInfra = false) => {
        const sur = /\?\s*$/.test(cible), c = cible.replace(/\?\s*$/, "").trim()
        const k = cleTaxo(c)
        const k2 = k.split(" ").length === 2 ? avecInfra(k) : k
        let aff = ix.orig.get(k2) ?? (k2 === k ? c : affiche(ix, k2))
        const cibleAff = aff
        // la variété ou forme d’origine est conservée quand Lodé ne rattache que l’espèce
        if (garderInfra && k2 === k && k.split(" ").length === 2 && infra.length) aff += " " + infra.map(([r, x]) => `${r} ${x}`).join(" ")
        const autreGenre = k.split(" ")[0] !== g
        return { ...base, statut: sur ? "DOUTE" : "SYNONYME", libelle: sur ? "Synonyme probable" : autreGenre ? "Synonyme, autre genre" : "Synonyme", proposition: recompose(k2, autreGenre ? maj1(genre) : undefined, aff), note: `${src} = ${cibleAff} chez Lodé${sur ? " (rattachement marqué « ? » dans l’index)" : ""}` }
    }
    const [r0, ep0] = infra[0] || []
    const complet = r0 && ep0 ? `${cle} ${r0} ${normTaxo(ep0)}` : ""
    if (complet && !ix.taxa.has(complet) && ix.syn.has(complet)) return parSyn(ix.syn.get(complet)!, `${maj1(genre)} ${espece} ${r0} ${ep0}`)
    // 1. espèce reconnue
    if (ix.taxa.has(cle)) {
        const [r, ep] = infra[0] || []
        if (!r || normTaxo(ep) === e) return { ...base, statut: "OK", libelle: "", proposition: "", note: "" }
        const cs = `${cle} subsp. ${normTaxo(ep)}`
        if (ix.taxa.has(cs)) return r === "subsp." ? { ...base, statut: "OK", libelle: "", proposition: "", note: "" }
            : { ...base, statut: "RANG", libelle: "Rang différent", proposition: recompose(cs), note: `${r} ${ep} est une sous-espèce chez Lodé` }
        // l’épithète infra est-elle une espèce à part entière ?
        const ce = `${g} ${normTaxo(ep)}`
        if (ix.taxa.has(ce)) return { ...base, statut: "RANG", libelle: "Rang différent", proposition: recompose(ce), note: `${ep} est une espèce à part entière chez Lodé` }
        return { ...base, statut: "INFRA", libelle: "Variété ou forme non retenue", proposition: "", note: `${affiche(ix, cle)} est valide ; ${r} ${ep} n’est pas distingué dans l’index` }
    }
    // 1 ter. synonyme de l’espèce dans l’index de Lodé
    if (ix.syn.has(cle)) return parSyn(ix.syn.get(cle)!, `${maj1(genre)} ${espece}`, true)
    // même nom dans un genre équivalent (Sulcorebutia albissima = Weingartia albissima)
    for (const ga of [...(GROUPES.find((l) => l.includes(g)) || []), ...annexes.map((a) => normTaxo((a.match(/^\(=?\s*([A-Z][a-z]+)/) || [])[1] || ""))]) {
        if (!ga || ga === g) continue
        if (ix.syn.has(`${ga} ${e}`)) return parSyn(ix.syn.get(`${ga} ${e}`)!, `${maj1(genre)} ${espece}`, true)
    }
    // 1 bis. nom indiqué entre parenthèses : (=Eriocephala), (=Sclerocactus papyracanthus)
    for (const a of annexes) {
        const m = a.match(/^\(=?\s*([A-Z][a-z]*)(\.?)(?:\s+([a-z-]+))?/)
        if (!m) continue
        const ep = m[3] ? normTaxo(m[3]) : e
        let gp = normTaxo(m[1])
        if (m[2]) { const c = [...ix.genres.keys()].filter((k) => k.startsWith(gp) && ix.taxa.has(`${k} ${ep}`)); if (c.length !== 1) continue; gp = c[0] }
        else if (m[1].length < 3) continue
        const c = `${gp} ${ep}`
        if (gp !== g && ix.taxa.has(c)) return { ...base, statut: "GENRE", libelle: "Nom accepté entre parenthèses", proposition: recompose(avecInfra(c), maj1(genre) + (m[3] ? " " + espece : "")), note: `${affiche(ix, c)} est le nom retenu par Lodé` }
    }
    // 2. ancienne épithète (ex …) dans le même genre
    const exE = ix.exEpithete.get(cle)
    if (exE) return { ...base, statut: "SYNONYME", libelle: "Synonyme", proposition: recompose(exE), note: `${espece} = ${affiche(ix, exE)}` }
    // 3. genre transféré, indiqué dans l’index (ex Genre)
    const exG = ix.exGenre.get(cle)
    if (exG) return { ...base, statut: "GENRE", libelle: "Genre transféré", proposition: recompose(avecInfra(exG), maj1(genre)), note: `${maj1(genre)} ${espece} est classé en ${affiche(ix, exG).split(" ")[0]}` }
    const genreConnu = ix.parGenre.has(g)
    // 4. épithète devenue sous-espèce dans le même genre (Sulcorebutia candiae -> S. arenacea subsp. candiae)
    const sub = (ix.parEpithete.get("subsp:" + e) || []).filter((c) => c.startsWith(g + " "))
    if (sub.length) return { ...base, statut: "SYNONYME", libelle: "Devenue sous-espèce", proposition: recompose(sub[0]), note: `${espece} est une sous-espèce chez Lodé` }
    // 5. même épithète dans un genre équivalent ou ailleurs dans l’index
    const ailleurs = ix.parEpithete.get(e) || []
    const groupe = GROUPES.find((l) => l.includes(g)) || []
    const choix = ailleurs.find((c) => groupe.includes(c.split(" ")[0]) || annexes.some((a) => sansAccent(a).includes(c.split(" ")[0]))) || ""
    if (choix && choix.split(" ")[0] !== g) return { ...base, statut: "GENRE", libelle: genreConnu ? "Autre genre chez Lodé" : "Genre non retenu", proposition: recompose(avecInfra(choix), maj1(genre)), note: `${espece} est classé en ${affiche(ix, choix).split(" ")[0]}${ailleurs.length > 1 ? ` (aussi : ${ailleurs.filter((c) => c !== choix).map((c) => affiche(ix, c)).join(", ")})` : ""}` }
    // 5 bis. nom cité par Lodé sans nom de rattachement
    if (ix.nr.has(cle) || (complet && ix.nr.has(complet))) return { ...base, statut: "NONRETENU", libelle: "Nom non retenu", proposition: "", note: `Lodé cite ${maj1(genre)} ${espece}${complet && ix.nr.has(complet) ? ` ${r0} ${ep0}` : ""} sans le rattacher à une espèce acceptée` }
    // 6. faute de frappe probable dans le genre
    if (genreConnu) {
        const max = Math.max(1, Math.floor(e.length / 5))
        let best = "", d = 99
        for (const sp of ix.parGenre.get(g)!) { if (sp.includes(" ") || sp[0] !== e[0]) continue; const x = lev(e, sp); if (x < d) { d = x; best = sp } }
        if (best && d <= max) return { ...base, statut: "PROCHE", libelle: "Orthographe proche", proposition: recompose(avecInfra(`${g} ${best}`)), note: `vouliez-vous dire ${affiche(ix, `${g} ${best}`)} ?` }
        return { ...base, statut: "INCONNUE", libelle: "Espèce absente de l’index", proposition: "", note: `${maj1(genre)} existe, mais pas ${espece}${ailleurs.length ? ` (présent en : ${ailleurs.slice(0, 3).map((c) => affiche(ix, c)).join(", ")})` : ""}` }
    }
    let gBest = "", gd = 99
    for (const k of ix.genres.keys()) { const x = lev(g, k); if (x < gd) { gd = x; gBest = k } }
    if (gBest && gd <= Math.max(2, Math.floor(g.length / 3)) && ix.taxa.has(`${gBest} ${e}`)) return { ...base, statut: "PROCHE", libelle: "Orthographe du genre", proposition: recompose(`${gBest} ${e}`), note: `vouliez-vous dire ${affiche(ix, `${gBest} ${e}`)} ?` }
    return { ...base, statut: "INCONNU", libelle: "Genre absent de l’index", proposition: "", note: ailleurs.length ? `${espece} présent en : ${ailleurs.slice(0, 3).map((c) => affiche(ix, c)).join(", ")}` : gBest && gd <= 2 ? `genre proche : ${ix.genres.get(gBest)}` : "" }
}
