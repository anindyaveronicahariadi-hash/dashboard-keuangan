import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase, usernameToEmail, emailToUsername } from "./supabaseClient";
import {
  LayoutDashboard, Landmark, HandCoins, Receipt, ClipboardList, Users,
  LogOut, Plus, Trash2, Pencil, X, Eye, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Wallet, CheckCircle2, UploadCloud
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import ImportPage from "./ImportPage.jsx";

/* ============================================================
   DATA REFERENSI
   ============================================================ */
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const KATEGORI_PENDAPATAN = [
  { nama: "IGD", kelompok: "Pasien Umum" },
  { nama: "Rajal", kelompok: "Pasien Umum" },
  { nama: "Ranap", kelompok: "Pasien Umum" },
  { nama: "Ambulance", kelompok: "Pasien Umum" },
  { nama: "MCU", kelompok: "Pasien Umum" },
  { nama: "Jasaraharja", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "MCU", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "BPJS", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Rajal", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Ranap", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Ambulance", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Obat", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Ketenagakerjaan", kelompok: "Piutang Pelayanan Kesehatan" },
  { nama: "Ambulance - PSC", kelompok: "Dana Penunjang Dinkes" },
  { nama: "Ranap", kelompok: "Dana Penunjang Dinkes" },
  { nama: "TCM-TB", kelompok: "Dana Penunjang Dinkes" },
  { nama: "MoU / Administrasi", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "DIKLAT", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "SEWA", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "KSO PT. Samator", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "Limbah Medis", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "Lab", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "Parkir", kelompok: "Pendapatan Hasil Kerjasama" },
  { nama: "Jasa Giro", kelompok: "Pendapatan Lain-lain yang Sah" },
  { nama: "Bunga Deposito", kelompok: "Pendapatan Lain-lain yang Sah" },
  { nama: "Lain-lain", kelompok: "Pendapatan Lain-lain yang Sah" },
];
const KELOMPOK_UTANG = ["Utang Bank/Lembaga Keuangan","Utang Supplier/Vendor","Utang Pajak","Utang Lain-lain"];
const KELOMPOK_PIUTANG = ["Piutang Pelanggan/Pembeli","Piutang Karyawan","Piutang Pihak Lain","Piutang Lain-lain"];

const ROLES = [
  { value: "admin", label: "Admin", desc: "Kelola akun & seluruh data" },
  { value: "direktur", label: "Direktur", desc: "Lihat dashboard saja" },
  { value: "pendapatan", label: "Petugas Pendapatan", desc: "Input data pendapatan" },
  { value: "utang", label: "Petugas Utang", desc: "Input data utang" },
  { value: "piutang", label: "Petugas Piutang", desc: "Input data piutang" },
  { value: "belanja", label: "Petugas Realisasi Belanja", desc: "Input realisasi belanja" },
];
const roleLabel = (v) => ROLES.find(r => r.value === v)?.label || v;

const rupiah = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const thisYear = new Date().getFullYear();

/* ============================================================
   STYLE
   ============================================================ */
const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
    .rsl-app { --ink:#182420; --paper:#F5F2EA; --surface:#FFFFFF; --teal:#0F3D39; --teal-2:#154F49; --gold:#B9862F; --muted:#6C7671; --line:#DEDACD; --good:#2E7D53; --bad:#B23B2E;
      font-family:'IBM Plex Sans',system-ui,sans-serif; color:var(--ink); background:var(--paper); min-height:100vh; }
    .rsl-app h1, .rsl-app h2, .rsl-app h3, .rsl-app .rsl-serif { font-family:'Fraunces',Georgia,serif; }
    .rsl-app * { box-sizing:border-box; }
    .rsl-btn { font-family:'IBM Plex Sans',sans-serif; font-weight:600; border-radius:3px; border:1px solid transparent; cursor:pointer; padding:9px 16px; font-size:14px; display:inline-flex; align-items:center; gap:7px; transition:background .15s ease, border-color .15s ease; }
    .rsl-btn-primary { background:var(--teal); color:#F5F2EA; }
    .rsl-btn-primary:hover { background:var(--teal-2); }
    .rsl-btn-ghost { background:transparent; color:var(--teal); border-color:var(--line); }
    .rsl-btn-ghost:hover { border-color:var(--teal); }
    .rsl-btn-danger { background:transparent; color:var(--bad); border-color:var(--line); }
    .rsl-btn-danger:hover { border-color:var(--bad); background:#FBEEEC; }
    .rsl-btn:disabled { opacity:.45; cursor:not-allowed; }
    .rsl-input, .rsl-select { width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:3px; font-size:14px; font-family:inherit; background:var(--surface); color:var(--ink); }
    .rsl-input:focus, .rsl-select:focus { outline:2px solid var(--gold); outline-offset:1px; border-color:var(--gold); }
    .rsl-label { font-size:12.5px; font-weight:600; color:var(--muted); margin-bottom:5px; display:block; }
    .rsl-card { background:var(--surface); border:1px solid var(--line); border-radius:5px; }
    .rsl-table { width:100%; border-collapse:collapse; font-size:13.5px; }
    .rsl-table th { text-align:left; font-size:11.5px; letter-spacing:.02em; color:var(--muted); font-weight:600; padding:10px 12px; border-bottom:1.5px solid var(--line); white-space:nowrap; }
    .rsl-table td { padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
    .rsl-table tr:last-child td { border-bottom:none; }
    .rsl-table tr:hover td { background:#FAF8F2; }
    .rsl-badge { display:inline-block; padding:3px 9px; border-radius:20px; font-size:11.5px; font-weight:600; }
    .rsl-nav-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:4px; color:#CFE0DA; font-size:14px; font-weight:500; cursor:pointer; margin-bottom:2px; }
    .rsl-nav-item:hover { background:rgba(255,255,255,.06); }
    .rsl-nav-item.active { background:rgba(255,255,255,.13); color:#fff; }
    .rsl-scroll::-webkit-scrollbar { height:8px; width:8px; }
    .rsl-scroll::-webkit-scrollbar-thumb { background:var(--line); border-radius:4px; }
    @keyframes rsl-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ============================================================
   KOMPONEN KECIL
   ============================================================ */
function StatCard({ label, value, icon: Icon, tone = "teal", sub }) {
  const tones = { teal:{bg:"#0F3D39",fg:"#fff"}, gold:{bg:"#B9862F",fg:"#fff"}, good:{bg:"#2E7D53",fg:"#fff"}, bad:{bg:"#B23B2E",fg:"#fff"} };
  const t = tones[tone];
  return (
    <div className="rsl-card" style={{ padding: "18px 20px", flex: "1 1 220px", minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ background: t.bg, color: t.fg, width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
      </div>
      <div className="rsl-serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,18,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div className="rsl-card" style={{ width: "100%", maxWidth: width, maxHeight: "88vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="rsl-btn rsl-btn-ghost" style={{ padding: 6, border: "none" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div><label className="rsl-label">{label}</label>{children}</div>; }
function EmptyState({ text }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
      <ClipboardList size={26} style={{ opacity: .5, marginBottom: 8 }} />
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}
function PageHeader({ title, desc, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>{title}</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>{desc}</p>
      </div>
      {action}
    </div>
  );
}
function RowActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="rsl-btn rsl-btn-ghost" style={{ padding: 7 }} onClick={onEdit} title="Ubah"><Pencil size={14} /></button>
      <button className="rsl-btn rsl-btn-danger" style={{ padding: 7 }} onClick={onDelete} title="Hapus"><Trash2 size={14} /></button>
    </div>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */
function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (error) { setErr("Username atau kata sandi salah."); return; }
    onLoggedIn();
  };

  return (
    <div className="rsl-app" style={{ minHeight: "100vh", display: "flex" }}>
      <Style />
      <div style={{ flex: "1 1 42%", background: "linear-gradient(160deg,#0F3D39,#0A2B28)", color: "#EFE9DA", padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 280 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 46 }}>
            <div style={{ width: 34, height: 34, borderRadius: 7, background: "#B9862F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={18} color="#0F3D39" />
            </div>
            <span style={{ fontWeight: 600, letterSpacing: ".01em" }}>RSUD Sungai Lilin</span>
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 1.15, fontWeight: 600, margin: "0 0 16px", maxWidth: 380 }}>Dashboard Keuangan BLUD</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#B9C8C2", maxWidth: 360 }}>
            Satu tempat untuk mencatat pendapatan, utang, piutang, dan realisasi belanja rumah sakit — dan memantaunya secara langsung.
          </p>
        </div>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          {[["Pendapatan", HandCoins], ["Utang", Landmark], ["Piutang", Wallet], ["Belanja", Receipt]].map(([label, Icon]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, color: "#B9C8C2", fontSize: 13.5 }}><Icon size={16} /> {label}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: "1 1 58%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 340 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 6px" }}>Masuk</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 26px" }}>Gunakan akun yang diberikan oleh admin.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Username"><input className="rsl-input" value={username} onChange={e => setUsername(e.target.value)} autoFocus /></Field>
            <Field label="Kata sandi"><input className="rsl-input" type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
            {err && <div style={{ display: "flex", gap: 7, alignItems: "center", color: "var(--bad)", fontSize: 13 }}><AlertCircle size={15} />{err}</div>}
            <button type="submit" disabled={busy} className="rsl-btn rsl-btn-primary" style={{ justifyContent: "center", marginTop: 6 }}>
              {busy ? <Loader2 size={15} style={{ animation: "rsl-spin 1s linear infinite" }} /> : "Masuk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function DashboardPage({ pendapatan, utang, piutang, belanja }) {
  const [tahun, setTahun] = useState(String(thisYear));
  const tahunList = useMemo(() => {
    const s = new Set([String(thisYear)]);
    pendapatan.forEach(p => s.add(String(p.tahun)));
    return Array.from(s).sort().reverse();
  }, [pendapatan]);

  const totalPendapatan = pendapatan.filter(p => String(p.tahun) === tahun).reduce((a, p) => a + Number(p.jumlah || 0), 0);
  const sisaUtang = utang.reduce((a, u) => a + Math.max(0, Number(u.total_tagihan || 0) - Number(u.dibayar || 0)), 0);
  const sisaPiutang = piutang.reduce((a, p) => a + Math.max(0, Number(p.total_tagihan || 0) - Number(p.dibayar || 0)), 0);
  const totalAnggaran = belanja.reduce((a, b) => a + Number(b.anggaran || 0), 0);
  const totalRealisasi = belanja.reduce((a, b) => a + Number(b.realisasi || 0), 0);
  const persenSerapan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran * 100) : 0;

  const chartPendapatan = BULAN.map((nama, i) => {
    const jumlah = pendapatan.filter(p => String(p.tahun) === tahun && Number(p.bulan) === i + 1).reduce((a, p) => a + Number(p.jumlah || 0), 0);
    return { bulan: nama.slice(0, 3), jumlah };
  });
  const topBelanja = [...belanja].sort((a, b) => Number(b.anggaran || 0) - Number(a.anggaran || 0)).slice(0, 6)
    .map(b => ({ nama: (b.uraian || "").length > 22 ? b.uraian.slice(0, 20) + "…" : b.uraian, Anggaran: Number(b.anggaran || 0), Realisasi: Number(b.realisasi || 0) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Ringkasan Keuangan</h1>
        <select className="rsl-select" style={{ width: 130 }} value={tahun} onChange={e => setTahun(e.target.value)}>
          {tahunList.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label={`Pendapatan ${tahun}`} value={rupiah(totalPendapatan)} icon={HandCoins} tone="teal" />
        <StatCard label="Sisa Utang Belum Lunas" value={rupiah(sisaUtang)} icon={TrendingDown} tone="bad" />
        <StatCard label="Sisa Piutang Belum Tertagih" value={rupiah(sisaPiutang)} icon={TrendingUp} tone="gold" />
        <StatCard label="Serapan Anggaran Belanja" value={`${persenSerapan.toFixed(1)}%`} icon={Receipt} tone="good" sub={`${rupiah(totalRealisasi)} dari ${rupiah(totalAnggaran)}`} />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="rsl-card" style={{ padding: 20, flex: "2 1 480px", minWidth: 320 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Pendapatan per Bulan — {tahun}</h3>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>Total pendapatan yang dicatat setiap bulan</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartPendapatan}>
              <CartesianGrid stroke="#EAE6D8" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11.5, fill: "#6C7671" }} axisLine={{ stroke: "#DEDACD" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6C7671" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e9 ? (v/1e9).toFixed(1)+"M" : v >= 1e6 ? (v/1e6).toFixed(0)+"jt" : v} width={50} />
              <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ fontSize: 12.5, borderRadius: 5, borderColor: "#DEDACD" }} />
              <Line type="monotone" dataKey="jumlah" stroke="#0F3D39" strokeWidth={2.4} dot={{ r: 3, fill: "#0F3D39" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rsl-card" style={{ padding: 20, flex: "1 1 320px", minWidth: 280 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Anggaran vs Realisasi</h3>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>6 kegiatan dengan pagu terbesar</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topBelanja} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid stroke="#EAE6D8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10.5, fill: "#6C7671" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(0)+"jt" : v} />
              <YAxis type="category" dataKey="nama" width={90} tick={{ fontSize: 10.5, fill: "#6C7671" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ fontSize: 12, borderRadius: 5, borderColor: "#DEDACD" }} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} />
              <Bar dataKey="Anggaran" fill="#DDD3B8" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Realisasi" fill="#0F3D39" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PENDAPATAN
   ============================================================ */
function PendapatanPage({ table, user }) {
  const { rows, insert, update, remove } = table;
  const [modal, setModal] = useState(null);
  const [filterTahun, setFilterTahun] = useState("semua");
  const blank = { tahun: thisYear, bulan: 1, tanggal: "", kategori: KATEGORI_PENDAPATAN[0].nama + "||" + KATEGORI_PENDAPATAN[0].kelompok, jumlah: "", keterangan: "" };
  const [form, setForm] = useState(blank);

  const tahunList = useMemo(() => Array.from(new Set(rows.map(d => String(d.tahun)))).sort().reverse(), [rows]);
  const filtered = rows.filter(d => filterTahun === "semua" || String(d.tahun) === filterTahun).sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);

  const openAdd = () => { setForm(blank); setModal("new"); };
  const openEdit = (row) => { setForm({ ...row, kategori: row.kategori + "||" + row.kelompok }); setModal(row.id); };
  const submit = async (e) => {
    e.preventDefault();
    const [kategori, kelompok] = form.kategori.split("||");
    const entry = { tahun: Number(form.tahun), bulan: Number(form.bulan), tanggal: form.tanggal || null, kategori, kelompok, jumlah: Number(form.jumlah), keterangan: form.keterangan || "", petugas: user.nama };
    if (modal === "new") await insert(entry); else await update(modal, entry);
    setModal(null);
  };
  const remove_ = async (id) => { if (confirm("Hapus data pendapatan ini?")) await remove(id); };

  return (
    <div>
      <PageHeader title="Pendapatan" desc="Catat pendapatan rumah sakit per kategori dan bulan." action={<button className="rsl-btn rsl-btn-primary" onClick={openAdd}><Plus size={15} /> Tambah Data</button>} />
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Tahun:</span>
        <select className="rsl-select" style={{ width: 130 }} value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
          <option value="semua">Semua</option>
          {tahunList.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} data · Total {rupiah(filtered.reduce((a, d) => a + Number(d.jumlah || 0), 0))}</span>
      </div>
      <div className="rsl-card rsl-scroll" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <EmptyState text="Belum ada data pendapatan." /> : (
          <table className="rsl-table">
            <thead><tr><th>Tanggal</th><th>Bulan</th><th>Tahun</th><th>Kelompok</th><th>Kategori</th><th>Jumlah</th><th>Petugas</th><th>Keterangan</th><th></th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>{d.tanggal || "-"}</td>
                  <td>{BULAN[d.bulan - 1]}</td><td>{d.tahun}</td>
                  <td style={{ color: "var(--muted)" }}>{d.kelompok}</td>
                  <td style={{ fontWeight: 600 }}>{d.kategori}</td>
                  <td style={{ fontWeight: 600 }}>{rupiah(d.jumlah)}</td>
                  <td>{d.petugas}</td>
                  <td style={{ color: "var(--muted)" }}>{d.keterangan}</td>
                  <td><RowActions onEdit={() => openEdit(d)} onDelete={() => remove_(d.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Tambah Pendapatan" : "Ubah Pendapatan"} onClose={() => setModal(null)}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="Bulan">
                <select className="rsl-select" value={form.bulan} onChange={e => setForm({ ...form, bulan: e.target.value })}>
                  {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                </select>
              </Field></div>
              <div style={{ flex: 1 }}><Field label="Tahun"><input className="rsl-input" type="number" value={form.tahun} onChange={e => setForm({ ...form, tahun: e.target.value })} required /></Field></div>
            </div>
            <Field label="Tanggal (opsional)"><input className="rsl-input" type="date" value={form.tanggal || ""} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></Field>
            <Field label="Kategori">
              <select className="rsl-select" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                {Object.entries(KATEGORI_PENDAPATAN.reduce((acc, k) => { (acc[k.kelompok] ||= []).push(k); return acc; }, {})).map(([kel, items]) => (
                  <optgroup label={kel} key={kel}>{items.map(it => <option key={it.nama + it.kelompok} value={it.nama + "||" + it.kelompok}>{it.nama}</option>)}</optgroup>
                ))}
              </select>
            </Field>
            <Field label="Jumlah (Rp)"><input className="rsl-input" type="number" min="0" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} required /></Field>
            <Field label="Keterangan (opsional)"><input className="rsl-input" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></Field>
            <button type="submit" className="rsl-btn rsl-btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Simpan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   UTANG & PIUTANG
   ============================================================ */
function HutangPiutangPage({ jenis, table, user }) {
  const { rows, insert, update, remove } = table;
  const isUtang = jenis === "utang";
  const kelompokList = isUtang ? KELOMPOK_UTANG : KELOMPOK_PIUTANG;
  const label = isUtang ? { judul: "Utang", pihak: "Kreditur / Pemberi Utang", nilai: "Total Utang", sisa: "Sisa Utang" }
                        : { judul: "Piutang", pihak: "Jenis Piutang / Pihak Terkait", nilai: "Total Tagihan", sisa: "Sisa Piutang" };
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const blank = { kelompok: kelompokList[0], pihak: "", no_surat: "", tgl_surat: "", total_tagihan: "", dibayar: "0", tgl_bayar: "", keterangan: "" };
  const [form, setForm] = useState(blank);

  const withSisa = rows.map(d => ({ ...d, sisa: Math.max(0, Number(d.total_tagihan || 0) - Number(d.dibayar || 0)) }));
  const filtered = withSisa.filter(d => filterStatus === "semua" || (filterStatus === "lunas" ? d.sisa <= 0 : d.sisa > 0));

  const openAdd = () => { setForm(blank); setModal("new"); };
  const openEdit = (row) => { setForm(row); setModal(row.id); };
  const submit = async (e) => {
    e.preventDefault();
    const entry = { ...form, total_tagihan: Number(form.total_tagihan), dibayar: Number(form.dibayar || 0), tgl_surat: form.tgl_surat || null, tgl_bayar: form.tgl_bayar || null, petugas: user.nama };
    if (modal === "new") await insert(entry); else await update(modal, entry);
    setModal(null);
  };
  const remove_ = async (id) => { if (confirm(`Hapus data ${label.judul.toLowerCase()} ini?`)) await remove(id); };
  const totalSisa = withSisa.reduce((a, d) => a + d.sisa, 0);

  return (
    <div>
      <PageHeader title={label.judul} desc={`Catat dan pantau status ${label.judul.toLowerCase()} rumah sakit.`} action={<button className="rsl-btn rsl-btn-primary" onClick={openAdd}><Plus size={15} /> Tambah Data</button>} />
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <select className="rsl-select" style={{ width: 170 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="semua">Semua status</option><option value="belum">Belum lunas</option><option value="lunas">Lunas</option>
        </select>
        <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto" }}>{label.sisa} total: <b>{rupiah(totalSisa)}</b></span>
      </div>
      <div className="rsl-card rsl-scroll" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <EmptyState text={`Belum ada data ${label.judul.toLowerCase()}.`} /> : (
          <table className="rsl-table">
            <thead><tr><th>Kelompok</th><th>{label.pihak}</th><th>No. BA/Surat</th><th>{label.nilai}</th><th>Dibayar</th><th>{label.sisa}</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td style={{ color: "var(--muted)" }}>{d.kelompok}</td>
                  <td style={{ fontWeight: 600 }}>{d.pihak}</td>
                  <td>{d.no_surat}</td>
                  <td>{rupiah(d.total_tagihan)}</td>
                  <td>{rupiah(d.dibayar)}</td>
                  <td style={{ fontWeight: 600 }}>{rupiah(d.sisa)}</td>
                  <td>{d.sisa <= 0 ? <span className="rsl-badge" style={{ background: "#E4F2E9", color: "var(--good)" }}>Lunas</span> : <span className="rsl-badge" style={{ background: "#FBEEEC", color: "var(--bad)" }}>Belum Lunas</span>}</td>
                  <td><RowActions onEdit={() => openEdit(d)} onDelete={() => remove_(d.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={(modal === "new" ? "Tambah " : "Ubah ") + label.judul} onClose={() => setModal(null)}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Kelompok"><select className="rsl-select" value={form.kelompok} onChange={e => setForm({ ...form, kelompok: e.target.value })}>{kelompokList.map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
            <Field label={label.pihak}><input className="rsl-input" value={form.pihak} onChange={e => setForm({ ...form, pihak: e.target.value })} required /></Field>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="No. BA/Surat"><input className="rsl-input" value={form.no_surat} onChange={e => setForm({ ...form, no_surat: e.target.value })} /></Field></div>
              <div style={{ flex: 1 }}><Field label="Tanggal Surat"><input className="rsl-input" type="date" value={form.tgl_surat || ""} onChange={e => setForm({ ...form, tgl_surat: e.target.value })} /></Field></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label={label.nilai}><input className="rsl-input" type="number" min="0" value={form.total_tagihan} onChange={e => setForm({ ...form, total_tagihan: e.target.value })} required /></Field></div>
              <div style={{ flex: 1 }}><Field label="Jumlah Dibayar"><input className="rsl-input" type="number" min="0" value={form.dibayar} onChange={e => setForm({ ...form, dibayar: e.target.value })} /></Field></div>
            </div>
            <Field label="Tanggal Bayar (jika ada)"><input className="rsl-input" type="date" value={form.tgl_bayar || ""} onChange={e => setForm({ ...form, tgl_bayar: e.target.value })} /></Field>
            <Field label="Keterangan"><input className="rsl-input" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></Field>
            <button type="submit" className="rsl-btn rsl-btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Simpan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   REALISASI BELANJA
   ============================================================ */
function BelanjaPage({ table, user }) {
  const { rows, insert, update, remove } = table;
  const [modal, setModal] = useState(null);
  const blank = { kode: "", uraian: "", anggaran: "", realisasi: "0" };
  const [form, setForm] = useState(blank);

  const withCalc = rows.map(d => {
    const anggaran = Number(d.anggaran || 0), realisasi = Number(d.realisasi || 0);
    return { ...d, sisa: anggaran - realisasi, persen: anggaran > 0 ? (realisasi / anggaran * 100) : 0 };
  });
  const openAdd = () => { setForm(blank); setModal("new"); };
  const openEdit = (row) => { setForm(row); setModal(row.id); };
  const submit = async (e) => {
    e.preventDefault();
    const entry = { kode: form.kode, uraian: form.uraian, anggaran: Number(form.anggaran), realisasi: Number(form.realisasi || 0), petugas: user.nama };
    if (modal === "new") await insert(entry); else await update(modal, entry);
    setModal(null);
  };
  const remove_ = async (id) => { if (confirm("Hapus data realisasi belanja ini?")) await remove(id); };
  const totalAnggaran = withCalc.reduce((a, d) => a + Number(d.anggaran || 0), 0);
  const totalRealisasi = withCalc.reduce((a, d) => a + Number(d.realisasi || 0), 0);

  return (
    <div>
      <PageHeader title="Realisasi Belanja" desc="Pantau serapan anggaran per sub-kegiatan." action={<button className="rsl-btn rsl-btn-primary" onClick={openAdd}><Plus size={15} /> Tambah Data</button>} />
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard label="Total Anggaran/Pagu" value={rupiah(totalAnggaran)} icon={Receipt} tone="teal" />
        <StatCard label="Total Realisasi" value={rupiah(totalRealisasi)} icon={CheckCircle2} tone="good" />
        <StatCard label="% Serapan" value={`${totalAnggaran > 0 ? (totalRealisasi / totalAnggaran * 100).toFixed(1) : 0}%`} icon={TrendingUp} tone="gold" />
      </div>
      <div className="rsl-card rsl-scroll" style={{ overflowX: "auto" }}>
        {withCalc.length === 0 ? <EmptyState text="Belum ada data realisasi belanja." /> : (
          <table className="rsl-table">
            <thead><tr><th>Kode Sub-Kegiatan</th><th>Uraian</th><th>Anggaran</th><th>Realisasi</th><th>Sisa</th><th style={{ minWidth: 130 }}>% Serapan</th><th></th></tr></thead>
            <tbody>
              {withCalc.map(d => (
                <tr key={d.id}>
                  <td style={{ color: "var(--muted)" }}>{d.kode}</td>
                  <td style={{ fontWeight: 600, maxWidth: 260 }}>{d.uraian}</td>
                  <td>{rupiah(d.anggaran)}</td><td>{rupiah(d.realisasi)}</td><td>{rupiah(d.sisa)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#EFEBDD", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, d.persen)}%`, height: "100%", background: d.persen >= 90 ? "var(--good)" : d.persen >= 50 ? "var(--gold)" : "var(--bad)" }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, width: 40 }}>{d.persen.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td><RowActions onEdit={() => openEdit(d)} onDelete={() => remove_(d.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Tambah Realisasi Belanja" : "Ubah Realisasi Belanja"} onClose={() => setModal(null)}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Kode Sub-Kegiatan"><input className="rsl-input" value={form.kode} onChange={e => setForm({ ...form, kode: e.target.value })} placeholder="00.01.01.01.08" /></Field>
            <Field label="Uraian Kegiatan"><input className="rsl-input" value={form.uraian} onChange={e => setForm({ ...form, uraian: e.target.value })} required /></Field>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Field label="Anggaran / Pagu (Rp)"><input className="rsl-input" type="number" min="0" value={form.anggaran} onChange={e => setForm({ ...form, anggaran: e.target.value })} required /></Field></div>
              <div style={{ flex: 1 }}><Field label="Realisasi (Rp)"><input className="rsl-input" type="number" min="0" value={form.realisasi} onChange={e => setForm({ ...form, realisasi: e.target.value })} /></Field></div>
            </div>
            <button type="submit" className="rsl-btn rsl-btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Simpan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   KELOLA AKUN (admin) — lewat Edge Function admin-users
   ============================================================ */
function AkunPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const blank = { username: "", password: "", nama: "", role: "pendapatan" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  const callFn = async (payload) => {
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await callFn({ action: "list" });
    setUsers(res.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(blank); setErr(""); setModal("new"); };
  const openEdit = (u) => { setForm({ ...u, password: "" }); setErr(""); setModal(u.id); };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (modal === "new") {
      if (!form.username || !form.password || !form.nama) { setErr("Semua kolom wajib diisi."); return; }
      const res = await callFn({ action: "create", username: form.username, password: form.password, nama: form.nama, role: form.role });
      if (res.error) { setErr(res.error); return; }
    } else {
      const res = await callFn({ action: "update", id: modal, nama: form.nama, role: form.role, password: form.password || undefined });
      if (res.error) { setErr(res.error); return; }
    }
    setModal(null);
    load();
  };

  const remove = async (u) => {
    if (u.id === currentUser.id) { alert("Anda tidak bisa menghapus akun yang sedang digunakan."); return; }
    if (!confirm(`Hapus akun "${u.username}"?`)) return;
    const res = await callFn({ action: "delete", id: u.id });
    if (res.error) { alert(res.error); return; }
    load();
  };

  return (
    <div>
      <PageHeader title="Kelola Akun" desc="Tambahkan akun untuk staf dan atur peran (role) masing-masing." action={<button className="rsl-btn rsl-btn-primary" onClick={openAdd}><Plus size={15} /> Tambah Akun</button>} />
      <div className="rsl-card rsl-scroll" style={{ overflowX: "auto" }}>
        {loading ? <EmptyState text="Memuat…" /> : (
          <table className="rsl-table">
            <thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}{u.id === currentUser.id && <span style={{ color: "var(--muted)", fontWeight: 400 }}> (Anda)</span>}</td>
                  <td>{u.nama}</td>
                  <td><span className="rsl-badge" style={{ background: "#EAF1EE", color: "var(--teal)" }}>{roleLabel(u.role)}</span></td>
                  <td><RowActions onEdit={() => openEdit(u)} onDelete={() => remove(u)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Tambah Akun" : "Ubah Akun"} onClose={() => setModal(null)}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Username"><input className="rsl-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={modal !== "new"} /></Field>
            <Field label="Nama Lengkap"><input className="rsl-input" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></Field>
            <Field label="Kata Sandi"><input className="rsl-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={modal === "new" ? "" : "Isi untuk mengganti kata sandi"} /></Field>
            <Field label="Peran (Role)">
              <select className="rsl-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
              <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, display: "block" }}>{ROLES.find(r => r.value === form.role)?.desc}</span>
            </Field>
            {err && <div style={{ display: "flex", gap: 7, alignItems: "center", color: "var(--bad)", fontSize: 13 }}><AlertCircle size={15} />{err}</div>}
            <button type="submit" className="rsl-btn rsl-btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Simpan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   HOOK: tabel Supabase generik (select all + insert/update/delete)
   ============================================================ */
function useSupabaseTable(name) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from(name).select("*").order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  }, [name]);

  useEffect(() => { reload(); }, [reload]);

  const insert = async (row) => { const { error } = await supabase.from(name).insert(row); if (error) alert(error.message); await reload(); };
  const update = async (id, row) => { const { error } = await supabase.from(name).update(row).eq("id", id); if (error) alert(error.message); await reload(); };
  const remove = async (id) => { const { error } = await supabase.from(name).delete().eq("id", id); if (error) alert(error.message); await reload(); };

  return { rows, loading, insert, update, remove, reload };
}

/* ============================================================
   APP UTAMA
   ============================================================ */
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","direktur","pendapatan","utang","piutang","belanja"] },
  { key: "pendapatan", label: "Pendapatan", icon: HandCoins, roles: ["admin","pendapatan"] },
  { key: "utang", label: "Utang", icon: Landmark, roles: ["admin","utang"] },
  { key: "piutang", label: "Piutang", icon: Wallet, roles: ["admin","piutang"] },
  { key: "belanja", label: "Realisasi Belanja", icon: Receipt, roles: ["admin","belanja"] },
  { key: "import", label: "Import Excel", icon: UploadCloud, roles: ["admin","pendapatan","utang","piutang","belanja"] },
  { key: "akun", label: "Kelola Akun", icon: Users, roles: ["admin"] },
];
const JENIS_PER_ROLE = { admin: ["pendapatan","utang","piutang","belanja"], pendapatan: ["pendapatan"], utang: ["utang"], piutang: ["piutang"], belanja: ["belanja"] };

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const pendapatanTable = useSupabaseTable("pendapatan");
  const utangTable = useSupabaseTable("utang");
  const piutangTable = useSupabaseTable("piutang");
  const belanjaTable = useSupabaseTable("belanja");

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="rsl-app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Style />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--muted)" }}>
          <Loader2 size={22} style={{ animation: "rsl-spin 1s linear infinite" }} /> Memuat data…
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen onLoggedIn={() => {}} />;
  }

  const currentUser = { id: profile.id, username: profile.username, nama: profile.nama, role: profile.role };
  const visibleNav = NAV.filter(n => n.roles.includes(currentUser.role));
  const isReadOnly = currentUser.role === "direktur";

  const renderPage = () => {
    if (page === "dashboard") return <DashboardPage pendapatan={pendapatanTable.rows} utang={utangTable.rows} piutang={piutangTable.rows} belanja={belanjaTable.rows} />;
    if (page === "pendapatan" && (currentUser.role === "admin" || currentUser.role === "pendapatan")) return <PendapatanPage table={pendapatanTable} user={currentUser} />;
    if (page === "utang" && (currentUser.role === "admin" || currentUser.role === "utang")) return <HutangPiutangPage jenis="utang" table={utangTable} user={currentUser} />;
    if (page === "piutang" && (currentUser.role === "admin" || currentUser.role === "piutang")) return <HutangPiutangPage jenis="piutang" table={piutangTable} user={currentUser} />;
    if (page === "belanja" && (currentUser.role === "admin" || currentUser.role === "belanja")) return <BelanjaPage table={belanjaTable} user={currentUser} />;
    if (page === "import" && JENIS_PER_ROLE[currentUser.role]) {
      const reloadAll = () => { pendapatanTable.reload(); utangTable.reload(); piutangTable.reload(); belanjaTable.reload(); };
      return <ImportPage allowedJenis={JENIS_PER_ROLE[currentUser.role]} reloadAll={reloadAll} user={currentUser} />;
    }
    if (page === "akun" && currentUser.role === "admin") return <AkunPage currentUser={currentUser} />;
    return <DashboardPage pendapatan={pendapatanTable.rows} utang={utangTable.rows} piutang={piutangTable.rows} belanja={belanjaTable.rows} />;
  };

  return (
    <div className="rsl-app" style={{ minHeight: "100vh", display: "flex" }}>
      <Style />
      <div style={{ width: 236, background: "linear-gradient(180deg,#0F3D39,#0A2B28)", color: "#fff", padding: "22px 14px", display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: navOpen ? 0 : -260, transition: "left .2s ease", zIndex: 40 }} className="rsl-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 22px", borderBottom: "1px solid rgba(255,255,255,.12)", marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: "#B9862F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Landmark size={16} color="#0F3D39" /></div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>RSUD Sungai Lilin</div>
            <div style={{ fontSize: 11, color: "#9FC0B7" }}>Dashboard Keuangan</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {visibleNav.map(n => (
            <div key={n.key} className={"rsl-nav-item" + (page === n.key ? " active" : "")} onClick={() => { setPage(n.key); setNavOpen(false); }}><n.icon size={16} /> {n.label}</div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 10px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{currentUser.nama.charAt(0).toUpperCase()}</div>
            <div style={{ lineHeight: 1.25, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.nama}</div>
              <div style={{ fontSize: 10.5, color: "#9FC0B7" }}>{roleLabel(currentUser.role)}</div>
            </div>
          </div>
          <div className="rsl-nav-item" onClick={() => supabase.auth.signOut()} style={{ color: "#F2C9C0" }}><LogOut size={16} /> Keluar</div>
        </div>
      </div>
      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 39 }} className="rsl-overlay" />}
      <div style={{ flex: 1, marginLeft: 236 }} className="rsl-main">
        <div style={{ display: "none", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }} className="rsl-topbar">
          <button className="rsl-btn rsl-btn-ghost" style={{ padding: 8 }} onClick={() => setNavOpen(true)}><LayoutDashboard size={16} /></button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>RSUD Sungai Lilin</span>
        </div>
        <div style={{ padding: "30px 34px", maxWidth: 1180 }}>
          {isReadOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FDF6E8", border: "1px solid #EDD9A6", color: "#8A6414", padding: "9px 14px", borderRadius: 5, fontSize: 12.5, marginBottom: 18 }}>
              <Eye size={14} /> Anda masuk sebagai Direktur — akses hanya untuk melihat dashboard.
            </div>
          )}
          {renderPage()}
        </div>
      </div>
      <style>{`
        @media (max-width: 880px) {
          .rsl-sidebar { left: ${navOpen ? "0" : "-260px"} !important; box-shadow: 4px 0 24px rgba(0,0,0,.25); }
          .rsl-main { margin-left: 0 !important; }
          .rsl-topbar { display: flex !important; }
        }
        @media (min-width: 881px) {
          .rsl-overlay { display: none !important; }
          .rsl-sidebar { left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
