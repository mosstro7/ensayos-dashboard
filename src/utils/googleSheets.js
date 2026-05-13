import Papa from 'papaparse';

export function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function extractGid(url) {
  const match = url.match(/[#&]gid=(\d+)/);
  return match ? match[1] : '0';
}

export function buildCsvUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchSheetAsCsv(sheetId, gid) {
  const url = buildCsvUrl(sheetId, gid);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al obtener la hoja (${res.status}): ${url}`);
  return res.text();
}

export function parseCsv(csvText) {
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
    dynamicTyping: true,
  });
  return result.data;
}

// Consulta la Sheets API v4 para listar las pestañas de un spreadsheet.
// Requiere una Google API Key con la API habilitada.
export async function fetchSheetsList(spreadsheetId, apiKey) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${encodeURIComponent(apiKey)}&fields=sheets.properties`;
  const res = await fetch(url);
  if (!res.ok) {
    let raw = '';
    try { const body = await res.json(); raw = body?.error?.message || ''; } catch {}

    let msg;
    if (raw.toLowerCase().includes('office file') || raw.toLowerCase().includes('not supported for this document')) {
      msg = 'El archivo es un Excel (.xlsx) guardado en Drive, no un Google Sheets nativo. Para usar la detección automática: abrilo en Google Drive → Archivo → Guardar como Google Sheets, y usá la URL del archivo nuevo.';
    } else if (raw.toLowerCase().includes('referer') || raw.toLowerCase().includes('blocked')) {
      msg = 'La Google API Key tiene restricciones de referrer. En Google Cloud Console → Credentials → tu API Key, cambiá "Application restrictions" a "None".';
    } else if (raw.toLowerCase().includes('not been used') || raw.toLowerCase().includes('disabled')) {
      msg = `La Google Sheets API no está habilitada en tu proyecto. Habilitala en Google Cloud Console → APIs & Services → Enable APIs. Detalle: ${raw}`;
    } else if (raw.toLowerCase().includes('api key not valid') || raw.toLowerCase().includes('invalid key')) {
      msg = `API Key inválida. Verificá que copiaste la clave completa. Detalle: ${raw}`;
    } else {
      msg = raw ? `${raw} (HTTP ${res.status})` : `Error HTTP ${res.status}`;
    }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.sheets.map(s => ({
    title: s.properties.title,
    gid:   String(s.properties.sheetId),
  }));
}

export const normalize = v => {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string' && v.startsWith('#')) return null; // errores Excel: #DIV/0!, #N/A, etc.
  return v;
};
