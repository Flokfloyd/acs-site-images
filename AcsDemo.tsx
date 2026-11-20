// AcsDemo.tsx — faux client Supabase en mémoire, pour prévisualiser l'espace membre
// dans l'éditeur Framer sans base de données. N'est utilisé que si le mode démo est choisi.

const data: Record<string, any[]> = {
    adherents: [
        { id: "1", email: "admin@exemple.fr", prenom: "Camille", nom: "Martin", fonction_bureau: "Présidente", ordre_bureau: 1, role: "admin", cotisation_annee: 2026, actif: true, annuaire: true, telephone: "06 00 00 00 01", code_postal: "35137", ville: "Bédée", lat: 48.18, lon: -1.95 },
        { id: "2", email: "marie.durand@exemple.fr", prenom: "Marie", nom: "Durand", conjoint: "Yann Durand", role: "membre", cotisation_annee: 2025, actif: true, annuaire: true, telephone: "06 00 00 00 02", code_postal: "29200", ville: "Brest", lat: 48.39, lon: -4.49 },
        { id: "3", email: "paul.le-goff@exemple.fr", prenom: "Paul", nom: "Le Goff", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, code_postal: "22300", ville: "Lannion", lat: 48.73, lon: -3.46 },
        { id: "4", email: "anne.riou@exemple.fr", prenom: "Anne", nom: "Riou", fonction_bureau: "Secrétaire", ordre_bureau: 2, role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, telephone: "06 00 00 00 04", code_postal: "56000", ville: "Vannes", lat: 47.66, lon: -2.76 },
        { id: "5", email: "luc.bernard@exemple.fr", prenom: "Luc", nom: "Bernard", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, code_postal: "44000", ville: "Nantes", lat: 47.22, lon: -1.55 },
        { id: "6", email: "sophie.hamon@exemple.fr", prenom: "Sophie", nom: "Hamon", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, code_postal: "35000", ville: "Rennes", lat: 48.11, lon: -1.68 },
        { id: "7", email: "jean.morel@exemple.fr", prenom: "Jean", nom: "Morel", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, telephone: "06 00 00 00 07", code_postal: "35000", ville: "Rennes", lat: 48.11, lon: -1.68 },
        { id: "8", email: "claire.petit@exemple.fr", prenom: "Claire", nom: "Petit", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, code_postal: "85270", ville: "Saint-Hilaire-de-Riez", lat: 46.74, lon: -1.98 },
        { id: "9", email: "hugo.leroy@exemple.fr", prenom: "Hugo", nom: "Leroy", role: "membre", cotisation_annee: 2026, actif: true, annuaire: true, code_postal: "29900", ville: "Concarneau", lat: 47.89, lon: -3.9 },
    ],
    adhesions: [2024, 2025].map((a) => ({ id: "a" + a, email: "marie.durand@exemple.fr", annee: a, formule: "Année complète pour un couple", montant: 20, debut: `${a}-01-01`, fin: `${a}-12-31`, source: "En ligne", recu_url: null, cree_le: `${a}-01-20T18:00:00Z` })),
    inscriptions: [
        { id: "i1", email: "marie.durand@exemple.fr", formulaire: "Sortie du 16 mai", montant: 0, statut: "valide", cree_le: "2026-05-05T16:31:00Z" },
        { id: "i2", email: "marie.durand@exemple.fr", formulaire: "Repas du samedi 13 juin", montant: 15, statut: "valide", cree_le: "2026-04-27T20:34:00Z" },
        { id: "i3", email: "marie.durand@exemple.fr", formulaire: "T-shirt ACS 10 ans", montant: 15, statut: "valide", cree_le: "2025-06-14T10:00:00Z" },
    ],
    dons: [],
    messages: [
        { id: "m1", sujet: "Sondage pour le voyage 2027", contenu: "Bonjour à toutes et à tous,\n\nNous préparons le voyage botanique 2027. Dites-nous vos envies de destination avant le 15 décembre.\n\nLe bureau", envoye_le: "2026-11-19T18:00:00Z" },
        { id: "m2", sujet: "Troc plantes le 27 septembre", contenu: "Rendez-vous à Bédée à 14 h pour notre troc d’automne.", envoye_le: "2026-09-16T12:00:00Z" },
        { id: "m3", sujet: "Salon de Bédée, bénévoles", contenu: "Merci de nous indiquer vos disponibilités pour le montage du salon.", envoye_le: "2026-05-10T11:27:00Z" },
    ],
    evenements: [
        { id: "e1", date_debut: "2027-06-01", date_label: "Juin 2027", titre: "Salon de l’A.C.S. à Bédée", lieu: "Bédée (35)", description: "Environ 40 exposants", reserve_membres: false, publie: true },
        { id: "e2", date_debut: null, date_label: "À venir", titre: "Assemblée générale", lieu: null, description: "Date communiquée dans le semestriel", reserve_membres: true, publie: true },
    ],
    semestriels: [1, 2, 3, 4].map((n) => ({ id: "s" + n, numero: n, date_label: ["Mars 2025", "Juillet 2025", "Février 2026", "Septembre 2026"][n - 1], titre: null, resume: null, sommaire: [["Édito", 2]], nb_pages: 16, couverture_url: `https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/1-couvertures/couverture-n${n}.jpg`, pdf_url: null, pages_base_url: null, publie: true })),
}

class Q {
    rows: any[]; op = "select"; payload: any = null; filters: [string, any][] = []
    constructor(public table: string) { this.rows = data[table] }
    select() { return this }
    eq(k: string, v: any) { this.filters.push([k, v]); return this }
    or() { return this }
    limit() { return this }
    order(k: string, o?: { ascending?: boolean }) { const s = o?.ascending === false ? -1 : 1; this.rows = [...this.rows].sort((a, b) => (a[k] ?? "￿") > (b[k] ?? "￿") ? s : -s); return this }
    insert(r: any) { this.op = "insert"; this.payload = r; return this }
    update(r: any) { this.op = "update"; this.payload = r; return this }
    upsert(r: any) { this.op = "upsert"; this.payload = r; return this }
    delete() { this.op = "delete"; return this }
    maybeSingle() { return this.run().then((r: any) => ({ ...r, data: r.data[0] ?? null })) }
    then(res: any, rej?: any) { return this.run().then(res, rej) }
    run(): Promise<any> {
        const m = (r: any) => this.filters.every(([k, v]) => r[k] === v)
        const t = data[this.table]
        if (this.op === "insert") t.push({ id: String(Math.random()), ...this.payload })
        if (this.op === "upsert") for (const r of [].concat(this.payload)) if (!t.some((x) => x.email === (r as any).email)) t.push({ id: String(Math.random()), role: "membre", actif: true, ...(r as any) })
        if (this.op === "update") t.forEach((r) => m(r) && Object.assign(r, this.payload))
        if (this.op === "delete") data[this.table] = t.filter((r) => !m(r))
        return Promise.resolve({ data: this.op === "select" ? this.rows.filter(m) : null, error: null })
    }
}

export function demoClient(etat: "connexion" | "admin" | "membre") {
    let email: string | null = etat === "admin" ? "admin@exemple.fr" : etat === "membre" ? "marie.durand@exemple.fr" : null
    const subs: ((e: string, s: any) => void)[] = []
    const sess = () => (email ? { user: { email } } : null)
    const notify = () => subs.forEach((f) => f("change", sess()))
    return {
        auth: {
            getSession: () => Promise.resolve({ data: { session: sess() } }),
            onAuthStateChange: (f: any) => { subs.push(f); return { data: { subscription: { unsubscribe() {} } } } },
            signInWithOtp: () => Promise.resolve({ error: null }),
            verifyOtp: ({ email: e }: any) => { email = e; notify(); return Promise.resolve({ error: null }) },
            signOut: () => { email = null; notify(); return Promise.resolve({}) },
        },
        from: (t: string) => new Q(t),
        rpc: (nom: string, args: any) => {
            if (nom === "choisir_annuaire") { const r = data.adherents.find((a) => a.email === email); if (r) r.annuaire = args.visible; return Promise.resolve({ data: null, error: null }) }
            if (nom === "bureau") return Promise.resolve({ data: data.adherents.filter((a) => a.fonction_bureau).sort((a, b) => a.ordre_bureau - b.ordre_bureau).map((a) => ({ prenom: a.prenom, nom: a.nom, fonction: a.fonction_bureau, email: a.email, telephone: a.telephone })), error: null })
            if (nom === "maj_profil") { const r = data.adherents.find((a) => a.email === email); if (r) Object.assign(r, args.p); return Promise.resolve({ data: null, error: null }) }
            if (nom === "annuaire") return Promise.resolve({ data: [...data.adherents].filter((a) => a.actif && a.annuaire !== false).sort((a, b) => (a.nom > b.nom ? 1 : -1)), error: null })
            return Promise.resolve({ data: null, error: null })
        },
        storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: (n: string) => ({ data: { publicUrl: "https://exemple.fr/" + n } }) }) },
    }
}
