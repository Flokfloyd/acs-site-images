// Fonction Supabase « stats-emails » : récupère chez Brevo ce qu'est devenue chaque adresse d'une campagne
// (reçu, ouvert, cliqué, erreur) et l'enregistre dans la base, pour que l'admin le consulte même plus tard.
// Réservée aux administrateurs. Secret utilisé : BREVO_API_KEY (déjà en place pour l'envoi).
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })
const jour = (d: Date) => d.toISOString().slice(0, 10)

type Suivi = { email: string; delivre: boolean; ouvert: boolean; clic: boolean; erreur: string | null; dernier: string | null }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const cle = Deno.env.get("BREVO_API_KEY")
    if (!cle) return json({ erreur: "Clé Brevo manquante (secret BREVO_API_KEY)." }, 500)
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    })
    const { data: admin } = await db.rpc("est_admin")
    if (admin !== true) return json({ erreur: "Réservé aux administrateurs." }, 403)
    const { campagne_id } = await req.json()
    const { data: c, error } = await db.from("campagnes").select("id,statut,envoyee_le,nb_envois").eq("id", campagne_id).single()
    if (error || !c) return json({ erreur: "Campagne introuvable." }, 404)
    if (c.statut !== "envoyee" || !c.envoyee_le) return json({ erreur: "Cette campagne n'a pas encore été envoyée." }, 400)

    // événements Brevo de cette campagne, depuis le jour de l'envoi (90 jours au plus)
    const debut = new Date(c.envoyee_le)
    const fin = new Date(Math.min(Date.now(), debut.getTime() + 89 * 86400000))
    // On lit tous les événements de la période puis on garde ceux de cette campagne (repérée par son étiquette,
    // ou à défaut par son sujet) : plus fiable que le filtre « tags » de Brevo.
    const tag = `acs-campagne-${c.id}`
    const { data: sujetRow } = await db.from("campagnes").select("sujet").eq("id", c.id).single()
    const sujet = sujetRow?.sujet ?? ""
    const tous: any[] = []
    for (let offset = 0; offset < 50000; offset += 2500) {
      const url = `https://api.brevo.com/v3/smtp/statistics/events?limit=2500&offset=${offset}&startDate=${jour(debut)}&endDate=${jour(fin)}&sort=asc`
      const r = await fetch(url, { headers: { "api-key": cle, accept: "application/json" } })
      if (!r.ok) return json({ erreur: `Brevo ${r.status} : ${await r.text()}` }, 502)
      const lot = (await r.json()).events ?? []
      tous.push(...lot)
      if (lot.length < 2500) break
    }
    const etiquettes = (e: any) => `${typeof e.tag === "string" ? e.tag : JSON.stringify(e.tag ?? "")} ${JSON.stringify(e.tags ?? [])}`
    const evts = tous.filter((e) => etiquettes(e).includes(tag) || (sujet && e.subject === sujet && !etiquettes(e).includes("acs-test")))

    // une ligne par adresse
    const parEmail = new Map<string, Suivi>()
    for (const e of evts) {
      const email = String(e.email || "").toLowerCase()
      if (!email) continue
      const s = parEmail.get(email) ?? { email, delivre: false, ouvert: false, clic: false, erreur: null, dernier: null }
      const t = String(e.event || "").toLowerCase()
      if (t.includes("deliver")) s.delivre = true
      else if (t.includes("open") || t.includes("proxy")) { s.ouvert = true; s.delivre = true }
      else if (t.includes("click")) { s.clic = true; s.ouvert = true; s.delivre = true }
      else if (t.includes("hardbounce") || t.includes("hard_bounce") || t.includes("invalid") || t.includes("blocked") || t.includes("error"))
        s.erreur = (t.includes("invalid") ? "adresse invalide" : t.includes("blocked") ? "bloqué" : "adresse en erreur") + (e.reason ? ` (${String(e.reason).slice(0, 120)})` : "")
      else if (t.includes("softbounce") || t.includes("soft_bounce") || t.includes("deferred")) { if (!s.delivre && !s.erreur) s.erreur = "boîte pleine ou indisponible pour l'instant" }
      else if (t.includes("spam")) s.erreur = "signalé comme indésirable"
      else if (t.includes("unsub")) s.erreur = "désinscrit"
      if (s.delivre && s.erreur && /boîte pleine/.test(s.erreur)) s.erreur = null
      s.dernier = e.date || s.dernier
      parEmail.set(email, s)
    }
    const lignes = [...parEmail.values()]
    if (lignes.length) {
      const { error: e2 } = await db.from("campagne_suivi").upsert(lignes.map((l) => ({ campagne_id: c.id, ...l, maj_le: new Date().toISOString() })), { onConflict: "campagne_id,email" })
      if (e2) return json({ erreur: e2.message }, 400)
    }
    const stats = {
      envoyes: c.nb_envois ?? lignes.length,
      delivres: lignes.filter((l) => l.delivre).length,
      ouverts: lignes.filter((l) => l.ouvert).length,
      cliques: lignes.filter((l) => l.clic).length,
      erreurs: lignes.filter((l) => l.erreur && !l.delivre).length,
      evenements: evts.length,
      evenements_periode: tous.length,
      maj_le: new Date().toISOString(),
    }
    await db.from("campagnes").update({ stats }).eq("id", c.id)
    return json({ ok: true, stats })
  } catch (err) {
    return json({ erreur: String((err as Error).message || err) }, 500)
  }
})
