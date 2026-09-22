import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { PARSERS } from "./importParsers";
import { sheetToObjects, guessMapping, buildBelanjaRows, BELANJA_FIELDS } from "./flexibleImport";
import { fetchSheetAsCsvText } from "./googleSheets";
import { UploadCloud, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet, Settings2, Link2, RefreshCw } from "lucide-react";

const JENIS_LABEL = { pendapatan: "Pendapatan", utang: "Utang", piutang: "Piutang", belanja: "Realisasi Belanja" };
const rupiah = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const FLEXIBLE_JENIS = { belanja: BELANJA_FIELDS };

function pickSheet(workbook, jenis) {
  const names = workbook.SheetNames;
  if (names.length === 1) return names[0];
  const hints = PARSERS[jenis]?.sheetHints || [];
  const match = names.find(n => hints.some(h => n.toLowerCase().includes(h)));
  return match || null;
}

export default function ImportPage({ allowedJenis, reloadAll, user }) {
  const [jenis, setJenis] = useState(allowedJenis[0]);
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState([]);
  const [chosenSheet, setChosenSheet] = useState("");
  const [workbook, setWorkbook] = useState(null);
  const [preview, setPreview] = useState([]);
  const [parseError, setParseError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);

  const [rawSheet, setRawSheet] = useState(null);
  const [mapping, setMapping] = useState({});
  const [aggregate, setAggregate] = useState(true);

  const [sheetUrl, setSheetUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlMsg, setUrlMsg] = useState("");

  const isFlexible = !!FLEXIBLE_JENIS[jenis];
  const fields = FLEXIBLE_JENIS[jenis];

  const reset = () => {
    setFileName(""); setSheetNames([]); setChosenSheet(""); setWorkbook(null);
    setPreview([]); setParseError(""); setResult(null); setRawSheet(null); setMapping({});
  };

  const loadSavedUrl = useCallback(async (j) => {
    const { data } = await supabase.from("import_sources").select("sheet_url").eq("jenis", j).maybeSingle();
    setSavedUrl(data?.sheet_url || "");
    setSheetUrl(data?.sheet_url || "");
  }, []);
  useEffect(() => { loadSavedUrl(jenis); }, [jenis, loadSavedUrl]);

  const processAoa = (aoa) => {
    if (isFlexible) {
      const sheet = sheetToObjects(aoa);
      setRawSheet(sheet);
      if (sheet.rows.length === 0) { setParseError("Tidak ada baris data yang terbaca dari sheet ini."); setPreview([]); return; }
      const guessed = guessMapping(sheet.headers, fields);
      setMapping(guessed);
      setParseError("");
      setPreview(buildBelanjaRows(sheet.rows, guessed, aggregate));
      return;
    }
    const { rows, error } = PARSERS[jenis].fn(aoa);
    if (error) { setParseError(error); setPreview([]); }
    else { setParseError(""); setPreview(rows); }
  };

  const runParse = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    processAoa(aoa);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    const auto = pickSheet(wb, jenis);
    if (auto) { setChosenSheet(auto); runParse(wb, auto); }
    else { setParseError("Ada beberapa sheet di file ini — pilih salah satu di bawah yang berisi data " + JENIS_LABEL[jenis].toLowerCase() + "."); }
  };

  const onChooseSheet = (name) => { setChosenSheet(name); if (workbook) runParse(workbook, name); };
  const onChooseJenis = (j) => { setJenis(j); reset(); setUrlMsg(""); if (fileInput.current) fileInput.current.value = ""; };

  const updateMapping = (key, header) => {
    const next = { ...mapping, [key]: header || null };
    setMapping(next);
    if (rawSheet) setPreview(buildBelanjaRows(rawSheet.rows, next, aggregate));
  };
  const toggleAggregate = (checked) => {
    setAggregate(checked);
    if (rawSheet) setPreview(buildBelanjaRows(rawSheet.rows, mapping, checked));
  };

  const saveUrl = async () => {
    setUrlBusy(true); setUrlMsg("");
    const { error } = await supabase.from("import_sources").upsert({ jenis, sheet_url: sheetUrl.trim(), updated_at: new Date().toISOString() });
    setUrlBusy(false);
    if (error) { setUrlMsg("Gagal menyimpan: " + error.message); return; }
    setSavedUrl(sheetUrl.trim());
    setUrlMsg("Link tersimpan.");
  };

  const pullFromSheet = async () => {
    reset(); setUrlMsg(""); setUrlBusy(true);
    try {
      const csvText = await fetchSheetAsCsvText(savedUrl || sheetUrl);
      const wb = XLSX.read(csvText, { type: "string" });
      setFileName("(dari Google Sheets)");
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
      processAoa(aoa);
    } catch (err) {
      setParseError(String(err.message || err));
    }
    setUrlBusy(false);
  };

  const doImport = async () => {
    setBusy(true); setResult(null);
    const rows = preview.map(r => ({ ...r, petugas: r.petugas || user.nama }));
    const CHUNK = 300;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from(jenis).insert(chunk);
      if (error) { setBusy(false); setResult({ ok: false, message: error.message }); return; }
      inserted += chunk.length;
    }
    setBusy(false);
    setResult({ ok: true, message: `${inserted} baris berhasil dimasukkan ke ${JENIS_LABEL[jenis]}.` });
    setPreview([]); setRawSheet(null);
    reloadAll();
  };

  const cols = isFlexible ? fields.map(f => f.key) : PARSERS[jenis].columns;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>Import Data</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>Tarik otomatis dari Google Sheets, atau unggah file Excel — datanya langsung terekap ke database.</p>
      </div>

      {allowedJenis.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {allowedJenis.map(j => (
            <button key={j} onClick={() => onChooseJenis(j)} className="rsl-btn" style={{
              background: jenis === j ? "var(--teal)" : "transparent", color: jenis === j ? "#fff" : "var(--teal)", border: "1px solid " + (jenis === j ? "var(--teal)" : "var(--line)")
            }}>{JENIS_LABEL[j]}</button>
          ))}
        </div>
      )}

      {/* --- Sumber Google Sheets --- */}
      <div className="rsl-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Link2 size={16} color="var(--teal)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Tarik dari Google Sheets</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
          Sheet harus di-<i>Publish to web</i> (File → Share → Publish to web) atau dibagikan "Anyone with the link — Viewer" agar bisa diakses website.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="rsl-input" style={{ flex: "1 1 320px" }} placeholder="Tempel link Google Sheets di sini…" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
          <button className="rsl-btn rsl-btn-ghost" onClick={saveUrl} disabled={urlBusy || !sheetUrl.trim()}>Simpan Link</button>
          <button className="rsl-btn rsl-btn-primary" onClick={pullFromSheet} disabled={urlBusy || !(savedUrl || sheetUrl).trim()}>
            {urlBusy ? <Loader2 size={15} style={{ animation: "rsl-spin 1s linear infinite" }} /> : <RefreshCw size={15} />} Tarik Data Sekarang
          </button>
        </div>
        {urlMsg && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>{urlMsg}</div>}
      </div>

      {/* --- Upload file manual --- */}
      <div className="rsl-card" style={{ padding: 24, marginBottom: 20 }}>
        <label htmlFor="rsl-file" style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "2px dashed var(--line)",
          borderRadius: 6, padding: "34px 20px", cursor: "pointer", textAlign: "center"
        }}>
          <UploadCloud size={26} color="var(--teal)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{fileName || `Atau klik untuk unggah file Excel (${JENIS_LABEL[jenis]})`}</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {isFlexible ? "Boleh file laporan format apa pun — Anda akan diminta mencocokkan kolomnya sebentar (.xlsx)" : "Bisa unggah keseluruhan file kertas kerja, atau sheet yang sudah dipisah sendiri (.xlsx)"}
          </span>
        </label>
        <input id="rsl-file" ref={fileInput} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />

        {sheetNames.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <label className="rsl-label">File ini punya beberapa sheet — pilih yang berisi data {JENIS_LABEL[jenis].toLowerCase()}:</label>
            <select className="rsl-select" value={chosenSheet} onChange={e => onChooseSheet(e.target.value)}>
              <option value="">— pilih sheet —</option>
              {sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {parseError && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--bad)", fontSize: 13, marginTop: 14, background: "#FBEEEC", padding: 12, borderRadius: 5 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {parseError}
          </div>
        )}

        {result && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: result.ok ? "var(--good)" : "var(--bad)", fontSize: 13, marginTop: 14, background: result.ok ? "#E4F2E9" : "#FBEEEC", padding: 12, borderRadius: 5 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {result.message}
          </div>
        )}
      </div>

      {isFlexible && rawSheet && (
        <div className="rsl-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Settings2 size={16} color="var(--teal)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Cocokkan Kolom</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>Sistem sudah menebak sebagian — cek dan perbaiki kalau ada yang meleset.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 16 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label className="rsl-label">{f.label}{f.required && " *"}</label>
                <select className="rsl-select" value={mapping[f.key] || ""} onChange={e => updateMapping(f.key, e.target.value)}>
                  <option value="">— tidak dipakai —</option>
                  {rawSheet.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={aggregate} onChange={e => toggleAggregate(e.target.checked)} />
            Gabungkan baris dengan Kode Sub Kegiatan yang sama (realisasi dijumlahkan, anggaran diambil sekali)
          </label>
        </div>
      )}

      {preview.length > 0 && (
        <div className="rsl-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileSpreadsheet size={16} color="var(--teal)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{preview.length} baris siap diimpor</span>
            </div>
            <button className="rsl-btn rsl-btn-primary" onClick={doImport} disabled={busy}>
              {busy ? <Loader2 size={15} style={{ animation: "rsl-spin 1s linear infinite" }} /> : `Import ${preview.length} Data ke Database`}
            </button>
          </div>
          <div className="rsl-scroll" style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
            <table className="rsl-table">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    {cols.map(c => (
                      <td key={c}>{typeof r[c] === "number" && (c.includes("jumlah") || c.includes("tagihan") || c.includes("anggaran") || c.includes("realisasi") || c.includes("dibayar")) ? rupiah(r[c]) : String(r[c] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 50 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>…dan {preview.length - 50} baris lainnya</div>}
        </div>
      )}
    </div>
  );
}
