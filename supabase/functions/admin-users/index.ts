// Edge Function: admin-users
// Menangani tambah / ubah / hapus / daftar akun — hanya bisa dipanggil
// oleh pengguna yang rolenya "admin". Fungsi ini memakai SERVICE ROLE KEY
// (rahasia, tersimpan sebagai secret di Supabase, tidak pernah dikirim
// ke browser) supaya bisa membuat akun login baru.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AUTH_DOMAIN = "internal.rsudsungailillin.local";
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${AUTH_DOMAIN}`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Pastikan yang memanggil sudah login & rolenya admin
    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user) {
      return json({ error: "Tidak terautentikasi." }, 401);
    }
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.user.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return json({ error: "Hanya admin yang boleh mengelola akun." }, 403);
    }

    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { data, error } = await admin.from("profiles").select("*").order("created_at");
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "create") {
      const { username, password, nama, role } = body;
      if (!username || !password || !nama || !role) return json({ error: "Data tidak lengkap." }, 400);

      const { data: exists } = await admin.from("profiles").select("id").eq("username", username.trim().toLowerCase()).maybeSingle();
      if (exists) return json({ error: "Username sudah digunakan." }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: usernameToEmail(username),
        password,
        email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const { error: profileErr } = await admin.from("profiles").insert({
        id: created.user.id,
        username: username.trim().toLowerCase(),
        nama,
        role,
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id); // rollback
        return json({ error: profileErr.message }, 400);
      }
      return json({ ok: true });
    }

    if (action === "update") {
      const { id, nama, role, password } = body;
      if (!id) return json({ error: "ID akun tidak ada." }, 400);

      if (password) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password });
        if (pwErr) return json({ error: pwErr.message }, 400);
      }
      const { error: profErr } = await admin.from("profiles").update({ nama, role }).eq("id", id);
      if (profErr) return json({ error: profErr.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (id === caller.user.id) return json({ error: "Tidak bisa menghapus akun sendiri." }, 400);

      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      const { data: target } = await admin.from("profiles").select("role").eq("id", id).single();
      if (target?.role === "admin" && (count ?? 0) <= 1) {
        return json({ error: "Minimal harus ada satu akun admin." }, 400);
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(id);
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Aksi tidak dikenal." }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
