// Parser untuk membaca struktur "kertas kerja" Excel yang sudah biasa
// dipakai tim RSUD (sheet Input_Pendapatan, Input_Utang, Input_Piutang,
// Realisasi_Belanja) dan mengubahnya jadi baris siap-import ke database.

const BULAN_NAMA = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);
const toDateStr = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

/**
 * Sheet Pendapatan: format matriks (baris = kategori, kolom = bulan).
 * Baris "leaf" dikenali dari kolom A (No) berisi angka urut.
 * Baris tanpa No tapi kolom B terisi (dan bukan baris TOTAL) dianggap
 * nama kelompok untuk baris-baris di bawahnya.
 */
export function parsePendapatan(aoa) {
  let tahun = new Date().getFullYear();
  for (const row of aoa) {
    if (row[0] === "Tahun Laporan" && isNum(row[1])) { tahun = row[1]; break; }
  }

  // cari baris header (mengandung nama-nama bulan)
  let headerIdx = -1, monthCols = {};
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const found = {};
    row.forEach((cell, c) => {
      const s = String(cell || "").trim().toLowerCase();
      const mi = BULAN_NAMA.indexOf(s);
      if (mi >= 0) found[c] = mi + 1;
    });
    if (Object.keys(found).length >= 6) { headerIdx = r; monthCols = found; break; }
  }
  if (headerIdx === -1) return { rows: [], error: "Tidak ditemukan baris header bulan (Januari..Desember) di sheet ini." };

  const out = [];
  let currentGroup = "";
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const colA = row[0], colB = row[1];
    if (isNum(colA) && colB) {
      for (const [colIdx, bulan] of Object.entries(monthCols)) {
        const val = row[Number(colIdx)];
        if (isNum(val) && val > 0) {
          out.push({ tahun, bulan, kategori: String(colB).trim(), kelompok: currentGroup, jumlah: val, keterangan: "", petugas: "" });
        }
      }
    } else if (colB && !String(colB).toUpperCase().includes("TOTAL")) {
      currentGroup = String(colB).trim();
    }
  }
  return { rows: out, error: null };
}

/**
 * Sheet Utang / Piutang: baris kelompok dikenali dari kolom A (No
 * Kelompok) berisi angka DAN kolom E (Total) kosong. Baris data
 * dikenali dari kolom K (No Kel. referensi) DAN kolom E terisi angka.
 * Kolom tetap: A No Kelompok, B Pihak, C No Surat, D Tgl Surat,
 * E Total, F Dibayar, G Tgl Bayar, H Keterangan, J Petugas, K No Kel.
 */
export function parseUtangPiutang(aoa) {
  const out = [];
  const groupMap = {};
  for (const row of aoa) {
    if (isNum(row[0]) && row[1] && !isNum(row[4])) groupMap[row[0]] = String(row[1]).trim();
  }
  for (const row of aoa) {
    const noKel = row[10];
    const total = row[4];
    if (isNum(noKel) && isNum(total)) {
      out.push({
        kelompok: groupMap[noKel] || "",
        pihak: row[1] ? String(row[1]).trim() : "",
        no_surat: row[2] ? String(row[2]).trim() : "",
        tgl_surat: toDateStr(row[3]),
        total_tagihan: total,
        dibayar: isNum(row[5]) ? row[5] : 0,
        tgl_bayar: toDateStr(row[6]),
        keterangan: row[7] ? String(row[7]).trim() : "",
        petugas: row[9] ? String(row[9]).trim() : "",
      });
    }
  }
  return { rows: out, error: out.length === 0 ? "Tidak ada baris data yang cocok dengan format kertas kerja." : null };
}

/**
 * Sheet Realisasi Belanja: baris data dikenali dari kolom A (No)
 * berisi angka. Kolom tetap: A No, B Kode, C Uraian, D Anggaran,
 * E Realisasi.
 */
export function parseBelanja(aoa) {
  const out = [];
  for (const row of aoa) {
    if (isNum(row[0]) && row[2]) {
      out.push({
        kode: row[1] ? String(row[1]).trim() : "",
        uraian: String(row[2]).trim(),
        anggaran: isNum(row[3]) ? row[3] : 0,
        realisasi: isNum(row[4]) ? row[4] : 0,
        petugas: "",
      });
    }
  }
  return { rows: out, error: out.length === 0 ? "Tidak ada baris data yang cocok dengan format kertas kerja." : null };
}

export const PARSERS = {
  pendapatan: { fn: parsePendapatan, sheetHints: ["pendapatan"], columns: ["tahun","bulan","kategori","kelompok","jumlah"] },
  utang: { fn: parseUtangPiutang, sheetHints: ["utang"], columns: ["kelompok","pihak","no_surat","total_tagihan","dibayar"] },
  piutang: { fn: parseUtangPiutang, sheetHints: ["piutang"], columns: ["kelompok","pihak","no_surat","total_tagihan","dibayar"] },
  belanja: { fn: parseBelanja, sheetHints: ["belanja","realisasi"], columns: ["kode","uraian","anggaran","realisasi"] },
};
