-- =====================================================================
-- SKEMA DATABASE - Dashboard Keuangan RSUD Sungai Lilin
-- Jalankan seluruh file ini di Supabase: SQL Editor > New Query > Run
-- =====================================================================

-- 1) Tabel profil pengguna (menyimpan nama, username & peran/role)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  nama text not null,
  role text not null check (role in ('admin','direktur','pendapatan','utang','piutang','belanja')),
  created_at timestamptz default now()
);

-- 2) Tabel Pendapatan
create table if not exists public.pendapatan (
  id uuid primary key default gen_random_uuid(),
  tahun int not null,
  bulan int not null check (bulan between 1 and 12),
  tanggal date,
  kategori text not null,
  kelompok text,
  jumlah numeric not null default 0,
  keterangan text,
  petugas text,
  created_at timestamptz default now()
);

-- Kalau tabel pendapatan sudah pernah dibuat sebelumnya (proyek lama),
-- baris di bawah ini menambahkan kolom tanggal tanpa menghapus data yang ada:
alter table public.pendapatan add column if not exists tanggal date;

-- 3) Tabel Utang
create table if not exists public.utang (
  id uuid primary key default gen_random_uuid(),
  kelompok text,
  pihak text not null,
  no_surat text,
  tgl_surat date,
  total_tagihan numeric not null default 0,
  dibayar numeric not null default 0,
  tgl_bayar date,
  keterangan text,
  petugas text,
  created_at timestamptz default now()
);

-- 4) Tabel Piutang (struktur sama seperti Utang)
create table if not exists public.piutang (
  id uuid primary key default gen_random_uuid(),
  kelompok text,
  pihak text not null,
  no_surat text,
  tgl_surat date,
  total_tagihan numeric not null default 0,
  dibayar numeric not null default 0,
  tgl_bayar date,
  keterangan text,
  petugas text,
  created_at timestamptz default now()
);

-- 5) Tabel Realisasi Belanja
create table if not exists public.belanja (
  id uuid primary key default gen_random_uuid(),
  kode text,
  uraian text not null,
  anggaran numeric not null default 0,
  realisasi numeric not null default 0,
  petugas text,
  created_at timestamptz default now()
);

-- =====================================================================
-- FUNGSI BANTUAN: baca role user yang sedang login (dipakai oleh RLS)
-- security definer supaya bisa baca tabel profiles walau RLS aktif
-- =====================================================================
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- =====================================================================
-- AKTIFKAN ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.pendapatan enable row level security;
alter table public.utang enable row level security;
alter table public.piutang enable row level security;
alter table public.belanja enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.current_role() = 'admin');

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.current_role() = 'admin');

-- (insert & delete akun dilakukan lewat Edge Function admin-users
--  memakai service role, jadi tidak perlu policy insert/delete di sini)

-- ---- pendapatan ----
drop policy if exists "pendapatan_select" on public.pendapatan;
create policy "pendapatan_select" on public.pendapatan for select using (auth.role() = 'authenticated');
drop policy if exists "pendapatan_write" on public.pendapatan;
create policy "pendapatan_write" on public.pendapatan for all
  using (public.current_role() in ('admin','pendapatan'))
  with check (public.current_role() in ('admin','pendapatan'));

-- ---- utang ----
drop policy if exists "utang_select" on public.utang;
create policy "utang_select" on public.utang for select using (auth.role() = 'authenticated');
drop policy if exists "utang_write" on public.utang;
create policy "utang_write" on public.utang for all
  using (public.current_role() in ('admin','utang'))
  with check (public.current_role() in ('admin','utang'));

-- ---- piutang ----
drop policy if exists "piutang_select" on public.piutang;
create policy "piutang_select" on public.piutang for select using (auth.role() = 'authenticated');
drop policy if exists "piutang_write" on public.piutang;
create policy "piutang_write" on public.piutang for all
  using (public.current_role() in ('admin','piutang'))
  with check (public.current_role() in ('admin','piutang'));

-- ---- belanja ----
drop policy if exists "belanja_select" on public.belanja;
create policy "belanja_select" on public.belanja for select using (auth.role() = 'authenticated');
drop policy if exists "belanja_write" on public.belanja;
create policy "belanja_write" on public.belanja for all
  using (public.current_role() in ('admin','belanja'))
  with check (public.current_role() in ('admin','belanja'));

-- =====================================================================
-- SELESAI. Langkah berikutnya: buat akun admin pertama (lihat panduan).
-- =====================================================================
