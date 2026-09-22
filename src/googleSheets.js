// Mengubah berbagai bentuk link Google Sheets jadi URL export CSV.
// Mendukung:
//  - link edit biasa: https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
//  - link publish-to-web: https://docs.google.com/spreadsheets/d/e/<PUBID>/pub?...
//  - link yang sudah berupa CSV (dibiarkan apa adanya)
export function toCsvExportUrl(rawUrl) {
  const url = rawUrl.trim();
  if (!url) return null;

  if (url.includes("output=csv") || url.includes("format=csv")) return url;

  // link publish-to-web (docs.google.com/spreadsheets/d/e/....../pub)
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/([^/]+)\/pub/);
  if (pubMatch) {
    const gidMatch = url.match(/[?&]gid=(\d+)/);
    return `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv${gidMatch ? "&gid=" + gidMatch[1] : ""}`;
  }

  // link edit biasa (docs.google.com/spreadsheets/d/<ID>/edit#gid=... atau /edit?...)
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${gidMatch ? "&gid=" + gidMatch[1] : ""}`;
  }

  return url; // fallback: pakai apa adanya
}

export async function fetchSheetAsCsvText(rawUrl) {
  const csvUrl = toCsvExportUrl(rawUrl);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(
      "Gagal mengambil data (" + res.status + "). Pastikan sheet sudah di-Publish to web / dibagikan 'Anyone with the link — Viewer'."
    );
  }
  return res.text();
}
