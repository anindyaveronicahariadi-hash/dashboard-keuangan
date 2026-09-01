import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Supabase Auth wajib pakai format email, tapi staf RSUD login pakai
// "username" biasa. Jadi kita ubah username jadi email internal palsu
// di belakang layar, tanpa staf perlu tahu / punya email asli.
export const AUTH_DOMAIN = "internal.rsudsungailillin.local";
export const usernameToEmail = (username) =>
  `${username.trim().toLowerCase()}@${AUTH_DOMAIN}`;
export const emailToUsername = (email) => (email || "").split("@")[0];
