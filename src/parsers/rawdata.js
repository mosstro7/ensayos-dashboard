import { normalize } from '../utils/googleSheets.js';

// Convierte a número tolerando coma decimal (locale español: "58,26" → 58.26).
function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  return null;
}

// Extrae el número de un string de criterio como "≥ 20", "≤ 5.0", "> 10".
// Solo parsea si el string contiene un operador explícito; si la celda tiene
// un valor numérico simple (ej: un caudal como "547"), retorna null para evitar
// comparaciones incorrectas entre unidades distintas.
function parseCriterion(str) {
  if (str == null) return null;
  const s = String(str);
  if (!/[≥≤<>]/.test(s)) return null;            // sin operador → no es criterio
  const cleaned = s.replace(/[≥≤<>=\s]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Integridad: completo si AL MENOS UNA fila del grupo tiene "DENTRO DEL LIMITE" o "FUERA DEL LIMITE"
function calcIntegrityDone(integrityValues) {
  return integrityValues.some(v => {
    if (v == null) return false;
    const s = String(v).trim().toUpperCase();
    return s.includes('DENTRO DEL LIMITE') || s.includes('FUERA DEL LIMITE');
  });
}

function parseRoomGroup(rows) {
  const first = rows[0].map(normalize);

  // Integridad: agregar valores de col 9 de todas las filas del grupo
  const integrityValues = rows.map(r => normalize(r[9])).filter(v => v != null);
  const integrityDone   = calcIntegrityDone(integrityValues);
  const integrityValue  = integrityValues[0] ?? null;

  // Ren. Horarias
  const rhCriterion = parseCriterion(first[10]);
  const rh          = first[15];
  const rhNum       = toNumber(rh);      // garantiza comparación numérica (ej: "58,26" → 58.26)
  const rhDone      = rhNum != null;
  let rhResult      = null;
  if (rhDone && rhCriterion != null) {
    rhResult = rhNum >= rhCriterion ? 'CONFORME' : 'NO CONFORME';
  }

  // Conteo: col 18 (Reposo), col 19 (Operación)
  const reposo   = first[18];
  const operacion = first[19];
  const opStr    = operacion != null ? String(operacion).trim().toUpperCase() : null;
  const opIsNA   = opStr === 'N/A';
  // Completo si col 18 tiene valor Y (col 19 es N/A O col 19 tiene valor)
  const conteoDone = reposo != null && (opIsNA ? true : operacion != null);

  const tests = {
    'Integridad':    {
      done:   integrityDone,
      value:  integrityValue,
      values: integrityValues,
      result: integrityDone
        ? (integrityValues.some(v => String(v).toUpperCase().includes('FUERA'))
            ? 'NO CONFORME' : 'CONFORME')
        : null,
    },
    'Ren. Horarias': {
      done:     rhDone,
      value:    rh,
      values:   [first[11], first[12], first[13]].filter(v => v != null),
      result:   rhResult,
      criterio: rhCriterion,
    },
    'Conteo': {
      done:   conteoDone,
      value:  reposo,
      values: { reposo, operacion },
      result: null,
    },
    'Temperatura': { done: first[21] != null, value: null, values: [first[21], first[22], first[23]].filter(v => v != null), result: null },
    'Humedad':     { done: first[24] != null, value: null, values: [first[24], first[25], first[26]].filter(v => v != null), result: null },
    'Luz':         { done: first[27] != null, value: null, values: [first[27], first[28], first[29]].filter(v => v != null), result: null },
    'Ruido':       { done: first[30] != null, value: null, values: [first[30], first[31], first[32]].filter(v => v != null), result: null },
    'Recuperación':{ done: first[33] != null, value: first[33], values: null, result: null },
  };

  const doneCount  = Object.values(tests).filter(t => t.done).length;
  const totalTests = Object.keys(tests).length;
  const shortId    = String(first[0]).split(' ')[0];

  // ── Filtros HEPA ──────────────────────────────────────────────────────────
  // Cantidad de filtros: col D (índice 3). Fallback: número de filas del grupo.
  const cantFiltros = toNumber(first[3]) ?? rows.length;

  // ── Caudales ──────────────────────────────────────────────────────────────
  // 1 caudal por filtro HEPA. Se considera medido cuando RH (col P=15)
  // está calculado (RH implica que todos los filtros de la sala fueron medidos).
  const caudalTotal   = cantFiltros;
  const caudalMedidos = rhDone ? cantFiltros : 0;

  // ── Puntos de conteo ──────────────────────────────────────────────────────
  // Columna R (índice 17): número de puntos de muestreo explícito en el sheet.
  // Fallback: ceil(√área) según ISO 14644-1 si la celda está vacía.
  const areaNum     = toNumber(first[1]) ?? 0;
  const conteoPoints = toNumber(first[17])
    ?? Math.max(1, Math.ceil(Math.sqrt(areaNum)));

  return {
    id:            shortId,
    fullName:      String(first[0]),
    gmpClass:      first[16] || 'N/A',
    area:          first[1],
    volume:        first[2],
    cantFiltros,
    caudalTotal,
    caudalMedidos,
    conteoPoints,
    tests,
    completionPct: Math.round((doneCount / totalTests) * 100),
    equipos: {
      integridad:  first[35],
      generadores: first[36],
      caudales:    first[37],
      tempHum:     first[38],
      luz:         first[39],
      ruido:       first[40],
    },
  };
}

function shortId(col0Str) {
  return col0Str ? col0Str.split(' ')[0] : null;
}

export function parseRawData(rows) {
  // Filas 0-1: headers; datos desde fila 2
  const dataRows = rows.slice(2);

  // Acumular filas por ID de sala usando un Map (preserva orden de inserción).
  // Esto unifica correctamente salas con múltiples filas HEPA incluso si
  // aparecen no adyacentes en el CSV, y también cuando Google Sheets repite
  // el valor de celdas combinadas en cada fila del grupo.
  const roomMap = new Map(); // shortId → rows[]
  let lastId = null;

  for (const row of dataRows) {
    const col0    = normalize(row[0]);
    const col0Str = col0 != null ? String(col0).trim() : null;

    if (col0Str) {
      const id = shortId(col0Str);
      if (!roomMap.has(id)) {
        roomMap.set(id, [row]);
      } else {
        roomMap.get(id).push(row);
      }
      lastId = id;
    } else if (lastId) {
      // Fila de continuación (col 0 vacía) → pertenece a la sala anterior
      roomMap.get(lastId).push(row);
    }
  }

  return Array.from(roomMap.values())
    .map(parseRoomGroup)
    .filter(Boolean);
}
