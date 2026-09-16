// Importer fleksibel: membaca file apa pun sebagai tabel (header + baris),
// menebak pemetaan kolom secara otomatis, dan membiarkan pengguna
// mengoreksi pemetaannya lewat dropdown. Tidak bergantung pada format
// kertas kerja tertentu — cocok untuk laporan/export dari sumber lain.

export function parseNumber(v) {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  let s = String(v).trim();
  if (!s) return 0;
  // format Indonesia: titik = ribuan, koma = desimal
  s = s.replace(/[^\d,.-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else s = s.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

// Ubah array-of-array (dari XLSX.utils.sheet_to_json({header:1})) jadi
// {headers, rows} — baris pertama yang punya cukup banyak sel terisi
// dianggap baris header.
export function sheetToObjects(aoa) {
  let headerIdx = 0;
  for (let r = 0; r < Math.min(aoa.length, 6); r++) {
    const nonEmpty = (aoa[r] || []).filter(c => c !== null && c !== undefined && String(c).trim() !== "").length;
    if (nonEmpty >= 3) { headerIdx = r; break; }
  }
  const headerRow = aoa[headerIdx] || [];
  const headers = headerRow.map((h, i) => {
    const s = h === null || h === undefined ? "" : String(h).trim();
    return s || `Kolom ${String.fromCharCode(65 + i)}`;
  });
  const rows = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const hasData = row.some(c => c !== null && c !== undefined && String(c).trim() !== "");
    if (!hasData) continue;
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    rows.push(obj);
  }
  return { headers, rows };
}

export function guessMapping(headers, fields) {
  const mapping = {};
  const lowerHeaders = headers.map(h => h.toLowerCase());
  for (const f of fields) {
    let found = null;
    for (const hint of f.hints) {
      const idx = lowerHeaders.findIndex(h => h.includes(hint));
      if (idx >= 0) { found = headers[idx]; break; }
    }
    mapping[f.key] = found;
  }
  return mapping;
}

export const BELANJA_FIELDS = [
  { key: "kode", label: "Kode Sub Kegiatan", hints: ["kode_subkeg", "kode sub", "kode"], required: false },
  { key: "uraian", label: "Uraian / Nama Kegiatan", hints: ["nama_sub_kegiatan", "nama sub kegiatan", "uraian", "kegiatan"], required: true },
  { key: "anggaran", label: "Anggaran / Pagu", hints: ["anggaran", "pagu"], required: true },
  { key: "realisasi", label: "Realisasi", hints: ["realisasi"], required: false },
];

export function buildBelanjaRows(rows, mapping, aggregate) {
  const raw = rows.map(r => ({
    kode: mapping.kode ? String(r[mapping.kode] ?? "").trim() : "",
    uraian: mapping.uraian ? String(r[mapping.uraian] ?? "").trim() : "",
    anggaran: mapping.anggaran ? parseNumber(r[mapping.anggaran]) : 0,
    realisasi: mapping.realisasi ? parseNumber(r[mapping.realisasi]) : 0,
  })).filter(x => x.kode || x.uraian);

  if (!aggregate) return raw;

  const combined = {};
  const order = [];
  for (const x of raw) {
    const key = x.kode || x.uraian;
    if (!combined[key]) { combined[key] = { ...x }; order.push(key); }
    else {
      combined[key].realisasi += x.realisasi;
      combined[key].anggaran = Math.max(combined[key].anggaran, x.anggaran);
      if (!combined[key].uraian) combined[key].uraian = x.uraian;
    }
  }
  return order.map(k => combined[k]);
}
