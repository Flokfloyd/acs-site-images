// AcsDemo.tsx — faux client Supabase en mémoire, pour prévisualiser l'espace membre
// dans l'éditeur Framer sans base de données. N'est utilisé que si le mode démo est choisi.

const data: Record<string, any[]> = {
    adherents: [
        { id: "1", email: "admin@exemple.fr", prenom: "Camille", nom: "Martin", role: "admin", cotisation_annee: 2026, actif: true },
        { id: "2", email: "marie.durand@exemple.fr", prenom: "Marie", nom: "Durand", role: "membre", cotisation_annee: 2025, actif: true },
        { id: "3", email: "paul.le-goff@exemple.fr", prenom: "Paul", nom: "Le Goff", role: "membre", cotisation_annee: 2026, actif: true },
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
        storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: (n: string) => ({ data: { publicUrl: "https://exemple.fr/" + n } }) }) },
    }
}
