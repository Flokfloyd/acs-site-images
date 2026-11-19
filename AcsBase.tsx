// AcsBase.ts — configuration partagée de l'espace membre ACS
// Renseigner les deux valeurs ci-dessous (Supabase > Project Settings > API).
// La clé « anon » est publique par conception : la sécurité repose sur les
// règles d'accès (RLS) définies dans la base.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

export const SUPABASE_URL = "" // ex. "https://abcdefgh.supabase.co"
export const SUPABASE_ANON_KEY = "" // ex. "eyJhbGciOi..."

let client: SupabaseClient | null = null
export function sb(): SupabaseClient | null {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
    if (typeof window === "undefined") return null
    if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: "acs-auth" } })
    return client
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

export const font = { fontFamily: "inherit", fontSize: 15, lineHeight: 1.5 }
