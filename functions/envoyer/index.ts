// Fonction Supabase « envoyer » : envoie une campagne ou un e-mail ponctuel via Brevo.
// Réservée aux administrateurs (vérifié avec la session de la personne connectée).
// Secrets à définir dans Supabase (Edge Functions → Secrets) : BREVO_API_KEY, EXPEDITEUR_EMAIL, SITE_URL
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
function enHtml(texte: string, site: string, exposant = false) {
  const corps = echapper(texte)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#4f7a3c">$1</a>')
    .split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("")
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2420;line-height:1.55">
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:18px;font-weight:bold">A.C.S. · Armorique Cactus Succulentes</p>
${corps}
<hr style="border:none;border-top:1px solid #ddd;margin:26px 0 12px">
${exposant ? `<p style="color:#888;font-size:12px;margin:0">Vous recevez cet e-mail car vous avez demandé un emplacement au Salon des Plantes de l’ACS. Pour ne plus en recevoir, répondez simplement à ce message.</p>` : `<p style="color:#888;font-size:12px;margin:0">Vous recevez cet e-mail en tant qu’adhérent de l’association. Pour ne plus recevoir ces e-mails, décochez l’option dans votre profil : <a href="${site}/espace-membre#profil" style="color:#888">${site.replace(/^https?:\/\//, "")}/espace-membre</a>.</p>`}
</div>`
}

// tag : permet de retrouver ensuite les statistiques de l'envoi (reçus, ouverts, cliqués, erreurs)
async function brevo(cle: string, expediteur: string, sujet: string, html: string, dest: { email: string; prenom?: string | null }[], tag: string) {
  let envoyes = 0
  for (let i = 0; i < dest.length; i += 90) {
    const lot = dest.slice(i, i + 90)
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "ACS Armorique Cactus Succulentes", email: expediteur },
        subject: sujet,
        htmlContent: html,
        tags: [tag],
        messageVersions: lot.map((d) => ({ to: [{ email: d.email, ...(d.prenom ? { name: d.prenom } : {}) }] })),
      }),
    })
    if (!r.ok) throw new Error(`Brevo ${r.status} : ${await r.text()}`)
    envoyes += lot.length
  }
  return envoyes
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const cle = Deno.env.get("BREVO_API_KEY")
    const expediteur = Deno.env.get("EXPEDITEUR_EMAIL")
    const site = (Deno.env.get("SITE_URL") || "https://acs-armorique-cactus-succulentes.framer.website").replace(/\/$/, "")
    if (!cle || !expediteur) return json({ erreur: "Envoi non configuré : secrets BREVO_API_KEY et EXPEDITEUR_EMAIL manquants." }, 500)

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    })
    const { data: admin } = await db.rpc("est_admin")
    if (admin !== true) return json({ erreur: "Réservé aux administrateurs." }, 403)
    const { data: u } = await db.auth.getUser()
    const corps = await req.json()

    // E-mail ponctuel (confirmation d'inscription, message à quelques personnes)
    if (corps.a) {
      const dest = (corps.a as string[]).map((email) => ({ email }))
      const n = await brevo(cle, expediteur, corps.sujet, enHtml(corps.contenu, site), dest, "acs-ponctuel")
      return json({ ok: true, envois: n })
    }

    // Campagne
    const { data: c, error: e1 } = await db.from("campagnes").select("*").eq("id", corps.campagne_id).single()
    if (e1 || !c) return json({ erreur: "Campagne introuvable." }, 404)
    if (c.statut === "envoyee") return json({ erreur: "Cette campagne a déjà été envoyée." }, 400)
    const { data: dest, error: e2 } = await db.rpc("destinataires", { c: c.id })
    if (e2) return json({ erreur: e2.message }, 400)
    if (!dest?.length) return json({ erreur: "Aucun destinataire pour cette cible." }, 400)
    try {
      const n = await brevo(cle, expediteur, c.sujet, enHtml(c.contenu, site, String(c.cible).startsWith("exposants")), dest, c.cible === "test" ? "acs-test" : `acs-campagne-${c.id}`)
      await db.from("campagnes").update({ statut: c.cible === "test" ? "brouillon" : "envoyee", envoyee_le: new Date().toISOString(), nb_envois: n, erreur: null }).eq("id", c.id)
      if (c.dans_espace && ["tous", "a_jour", "retard"].includes(c.cible)) await db.from("messages").insert({ sujet: c.sujet, contenu: c.contenu, auteur: u?.user?.email ?? null })
      return json({ ok: true, envois: n })
    } catch (err) {
      await db.from("campagnes").update({ statut: "erreur", erreur: String(err) }).eq("id", c.id)
      throw err
    }
  } catch (err) {
    return json({ erreur: String((err as Error).message || err) }, 500)
  }
})
