// Fonction Supabase « billet » : envoie à l'inscrit son billet (numéro + QR code) par e-mail, via Brevo.
// Appelée par l'adhérent lui-même (ses propres inscriptions) ou par un administrateur.
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })
const ech = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const cle = Deno.env.get("BREVO_API_KEY"), expediteur = Deno.env.get("EXPEDITEUR_EMAIL")
    const site = (Deno.env.get("SITE_URL") || "https://acs-armorique-cactus-succulentes.framer.website").replace(/\/$/, "")
    if (!cle || !expediteur) return json({ erreur: "Envoi non configuré." }, 500)
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    })
    const { data: u } = await db.auth.getUser()
    if (!u?.user) return json({ erreur: "Connexion requise." }, 401)
    const { id } = await req.json()
    // Les règles de la base ne laissent lire que ses propres inscriptions (ou toutes pour un admin)
    const { data: r } = await db.from("inscriptions").select("*").eq("id", id).maybeSingle()
    if (!r || !r.billet) return json({ erreur: "Billet introuvable." }, 404)
    if (r.statut === "abandonne" || r.statut === "rembourse") return json({ erreur: "Cette inscription est annulée." }, 400)
    const { data: e } = await db.from("evenements").select("*").eq("id", r.evenement_id).maybeSingle()
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(`${site}/admin?billet=${r.billet}`)}`
    const quand = [e?.date_label, e?.heure].filter(Boolean).join(" · ")
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#2b2420;line-height:1.5">
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;font-weight:bold">A.C.S. · Armorique Cactus Succulentes</p>
<p style="margin:0 0 18px">Bonjour,<br>voici votre billet. Présentez-le à l’entrée, sur votre téléphone ou imprimé.</p>
<div style="border:2px dashed #4f7a3c;padding:20px;text-align:center">
<p style="margin:0;font-size:12px;letter-spacing:2px;color:#4f7a3c;text-transform:uppercase">Billet</p>
<p style="margin:6px 0 4px;font-family:Georgia,serif;font-size:22px;font-weight:bold">${ech(e?.titre)}</p>
<p style="margin:0 0 4px">${ech(quand)}</p>
${e?.lieu ? `<p style="margin:0 0 10px;color:#666">${ech(e.lieu)}</p>` : ""}
<img src="${qr}" width="200" height="200" alt="QR code du billet ${ech(r.billet)}" style="display:block;margin:12px auto">
<p style="margin:0;font-family:monospace;font-size:20px;letter-spacing:2px">${ech(r.billet)}</p>
<p style="margin:10px 0 0">${r.nb_personnes || 1} personne${(r.nb_personnes || 1) > 1 ? "s" : ""}${r.montant > 0 ? ` · ${euros(Number(r.montant))}${r.statut === "en_attente" ? " <b>à régler sur place</b>" : " · réglé"}` : " · gratuit"}</p>
</div>
<p style="margin:18px 0 0;font-size:13px;color:#666">Retrouvez aussi ce billet dans votre espace adhérent : <a href="${site}/espace-membre#evenements" style="color:#4f7a3c">${site.replace(/^https?:\/\//, "")}/espace-membre</a>. Pour annuler, utilisez le même espace.</p>
</div>`
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "ACS Armorique Cactus Succulentes", email: expediteur }, to: [{ email: r.email }], subject: `Votre billet : ${e?.titre ?? "événement ACS"}`, htmlContent: html }),
    })
    if (!res.ok) return json({ erreur: `Brevo ${res.status} : ${await res.text()}` }, 500)
    return json({ ok: true })
  } catch (err) {
    return json({ erreur: String((err as Error).message || err) }, 500)
  }
})
