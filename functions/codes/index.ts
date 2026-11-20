// Fonction Supabase « codes » : crée ou renouvelle le code personnel de connexion d'adhérents
// et le leur envoie par e-mail (Brevo). Réservée aux administrateurs.
// Utilise la clé de service fournie automatiquement par Supabase (jamais exposée au navigateur).
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })

// 8 caractères sans ambiguïté (pas de 0/O, 1/I/L), présentés XXXX-XXXX
function nouveauCode() {
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const v = crypto.getRandomValues(new Uint8Array(8))
  const c = Array.from(v, (x) => alpha[x % alpha.length]).join("")
  return c.slice(0, 4) + "-" + c.slice(4)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const cle = Deno.env.get("BREVO_API_KEY"), expediteur = Deno.env.get("EXPEDITEUR_EMAIL")
    const site = (Deno.env.get("SITE_URL") || "https://acs-armorique-cactus-succulentes.framer.website").replace(/\/$/, "")
    if (!cle || !expediteur) return json({ erreur: "Envoi d’e-mails non configuré." }, 500)

    const moi = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } })
    const { data: admin } = await moi.rpc("est_admin")
    if (admin !== true) return json({ erreur: "Réservé aux administrateurs." }, 403)
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } })

    const { emails } = await req.json() as { emails: string[] }
    if (!Array.isArray(emails) || !emails.length) return json({ erreur: "Aucune adresse." }, 400)
    if (emails.length > 25) return json({ erreur: "25 adresses au maximum par envoi." }, 400)

    const { data: adh } = await svc.from("adherents").select("email,prenom,actif").in("email", emails.map((e) => e.toLowerCase()))
    const comptes = new Map<string, string>()
    for (let page = 1; ; page++) {
      const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      for (const u of data.users) if (u.email) comptes.set(u.email.toLowerCase(), u.id)
      if (data.users.length < 1000) break
    }

    const resultats: { email: string; ok: boolean; erreur?: string }[] = []
    for (const a of adh ?? []) {
      if (!a.actif) { resultats.push({ email: a.email, ok: false, erreur: "adhérent désactivé" }); continue }
      const code = nouveauCode()
      try {
        const id = comptes.get(a.email)
        const r = id
          ? await svc.auth.admin.updateUserById(id, { password: code, email_confirm: true })
          : await svc.auth.admin.createUser({ email: a.email, password: code, email_confirm: true })
        if (r.error) throw r.error
        const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#2b2420;line-height:1.55">
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:18px;font-weight:bold">A.C.S. · Armorique Cactus Succulentes</p>
<p>Bonjour${a.prenom ? " " + a.prenom : ""},</p>
<p>Voici votre code personnel pour vous connecter à l’espace membre du site de l’association :</p>
<p style="font-size:28px;letter-spacing:4px;font-weight:bold;margin:18px 0">${code}</p>
<p>Rendez-vous sur <a href="${site}/espace-membre" style="color:#4f7a3c">${site.replace(/^https?:\/\//, "")}/espace-membre</a>, saisissez votre adresse e-mail (${a.email}) et ce code. Vous pourrez ensuite le remplacer par un code de votre choix dans votre profil.</p>
<p>Dans votre espace : votre adhésion, les inscriptions aux sorties, les messages de l’association et l’annuaire des adhérents.</p>
<p style="color:#888;font-size:12px;margin-top:26px">Ne transmettez ce code à personne. En cas d’oubli, utilisez « Code oublié » sur la page de connexion.</p>
</div>`
        const e = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: { name: "ACS Armorique Cactus Succulentes", email: expediteur }, to: [{ email: a.email }], subject: "Votre code de connexion à l’espace membre ACS", htmlContent: html }),
        })
        if (!e.ok) throw new Error(`Brevo ${e.status} : ${await e.text()}`)
        await svc.from("adherents").update({ code_envoye_le: new Date().toISOString() }).eq("email", a.email)
        resultats.push({ email: a.email, ok: true })
      } catch (err) {
        resultats.push({ email: a.email, ok: false, erreur: String((err as Error).message || err) })
      }
    }
    for (const e of emails) if (!resultats.some((r) => r.email === e.toLowerCase())) resultats.push({ email: e, ok: false, erreur: "pas dans la liste des adhérents" })
    return json({ ok: true, resultats })
  } catch (err) {
    return json({ erreur: String((err as Error).message || err) }, 500)
  }
})
