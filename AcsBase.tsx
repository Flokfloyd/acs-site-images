// AcsBase.ts — configuration partagée de l'espace membre ACS
// Renseigner les deux valeurs ci-dessous (Supabase > Project Settings > API).
// La clé « anon » est publique par conception : la sécurité repose sur les
// règles d'accès (RLS) définies dans la base.
// @ts-ignore — import par URL, résolu par Framer à l’exécution
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
type SupabaseClient = any

export const SUPABASE_URL = "https://ofpouorpbhnnxwuihyyu.supabase.co"
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcG91b3JwYmhubnh3dWloeXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxOTIzMzYsImV4cCI6MjExMDc2ODMzNn0.Mo5s56R7lIQZT-kPa6I6hAYey87GlGmw_6t2EXPFevc"

// Un seul client pour toute la page (menu, bouton Membres, espace membre), partagé via window
export function sb(): SupabaseClient | null {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
    if (typeof window === "undefined") return null
    const w = window as any
    if (!w.__acsSupabase) w.__acsSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "acs-auth", lock: async (_n: string, _t: number, fn: () => Promise<any>) => await fn() } })
    return w.__acsSupabase
}

export const C = {
    bg: "#15100d",
    panel: "#241c17",
    panel2: "#2e241e",
    line: "rgba(246,240,230,0.16)",
    txt: "#f6f0e6",
    mute: "rgba(246,240,230,0.66)",
    accent: "#9bbd8a",
    accentDark: "#1d1612",
    danger: "#e08a73",
}

export const font = { fontFamily: "Poppins, sans-serif", fontSize: 15, lineHeight: 1.5 }
export const serif = "Fraunces, Georgia, serif"

// Images hébergées par Framer : on demande au CDN une version réduite (1024 px sur le plus grand côté)
// au lieu de l'original. C'est largement assez pour les vignettes, nettes même sur écran haute définition ;
// la photo agrandie garde l'original.
export function imgLeger(u?: string | null, _tailles?: string): { src?: string } {
    if (!u || !/framerusercontent\.com\/images\//.test(u) || /scale-down-to/.test(u)) return { src: u || undefined }
    return { src: u.split("?")[0] + "?scale-down-to=1024" }
}
