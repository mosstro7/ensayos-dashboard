import { normalize } from '../utils/googleSheets.js';

const PENDING_VALUES = ['-----', null, undefined, 'N/A', 'N/A  ', ' N/A '];

const isPending = v => {
  const val = typeof v === 'string' ? v.trim() : v;
  return PENDING_VALUES.includes(val) || val === null || val === undefined || val === '';
};

function parseEquipmentMaster(rows) {
  const dataStart = rows.findIndex(r => r[0] && /^\d{5}$/.test(String(r[0])));
  if (dataStart === -1) return [];

  return rows.slice(dataStart)
    .filter(r => r[0] != null && /^\d/.test(String(r[0])))
    .map(r => ({
      sheetName:        String(r[0]),
      reference:        normalize(r[1]),
      location:         normalize(r[2]),
      tag:              normalize(r[3]),
      brand:            normalize(r[4]),
      model:            normalize(r[5]),
      serial:           normalize(r[6]),
      filtersDownflow:  normalize(r[7]),
      filtersInflow:    normalize(r[11]),
      filtersIntegrity: normalize(r[13]),
      criterioConteo:   normalize(r[14]),
    }));
}

function parseEquipmentRow(row, master) {
  const raw0 = normalize(row[0]);
  if (!raw0 || isPending(raw0)) return null;

  const tag = String(raw0).trim();
  const info = master.find(m => m.tag === tag) || {};

  const tests = {
    'Integridad':         { result: normalize(row[3]),  done: !isPending(row[3]) },
    'Velocidad Downflow': { result: normalize(row[6]),  done: !isPending(row[6]),  value: normalize(row[5]) },
    'Conteo Reposo':      { result: normalize(row[20]), done: !isPending(row[20]) },
    'Conteo Operación':   { result: normalize(row[21]), done: !isPending(row[21]) },
    'Temperatura':        { result: normalize(row[24]), done: !isPending(row[24]), value: normalize(row[23]) },
    'Humedad':            { result: normalize(row[27]), done: !isPending(row[27]), value: normalize(row[26]) },
    'Luz':                { result: normalize(row[30]), done: !isPending(row[30]), value: normalize(row[29]) },
    'Ruido':              { result: normalize(row[33]), done: !isPending(row[33]), value: normalize(row[32]) },
  };

  if (!isPending(row[15])) {
    tests['Velocidad Inflow'] = { result: normalize(row[15]), done: true, value: normalize(row[14]) };
  }

  const doneCount = Object.values(tests).filter(t => t.done).length;

  return {
    id: tag,
    sheetName:     info.sheetName,
    location:      info.location,
    type:          info.reference || 'Flujo Laminar',
    brand:         info.brand,
    model:         info.model,
    tests,
    completionPct: Math.round((doneCount / Object.keys(tests).length) * 100),
    summary: {
      conforme:    normalize(row[34]),
      noConforme:  normalize(row[35]),
      informativo: normalize(row[36]),
      na:          normalize(row[37]),
    },
  };
}

export function parseFlujos(dataRows, resultadosRows) {
  const master = parseEquipmentMaster(dataRows);

  // Fila 0-3: headers multi-nivel; buscar filas con TAG válido
  const equipment = resultadosRows
    .slice(4)
    .filter(r => normalize(r[0]) != null && normalize(r[0]) !== 'TAG')
    .map(r => parseEquipmentRow(r, master))
    .filter(Boolean);

  return { master, equipment };
}
