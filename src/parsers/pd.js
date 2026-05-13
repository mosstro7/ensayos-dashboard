import { normalize } from '../utils/googleSheets.js';

// PapaParse con dynamicTyping no convierte números con coma decimal (locale español)
// Ej: "-34,3" queda como string → parseamos explícitamente
function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  return null;
}

export function parsePD(rows) {
  // Fila 0: título, Fila 1: headers, Fila 2+: datos
  return rows.slice(2)
    .filter(r => normalize(r[0]) != null)
    .map(r => {
      const criterio    = normalize(r[2]);
      const valor       = normalize(r[3]);
      const criterioNum = toNumber(criterio);
      const valorNum    = toNumber(valor);

      let result;
      if (valorNum == null) {
        result = 'PENDIENTE';
      } else if (criterioNum != null) {
        result = valorNum >= criterioNum ? 'CONFORME' : 'NO CONFORME';
      } else {
        // Hay valor pero criterio no es numérico → marcar como hecho sin juicio
        result = 'CONFORME';
      }

      return {
        salaOrigen:     normalize(r[0]),
        salaReferencia: normalize(r[1]),
        criterio,
        valor,
        done:   valorNum != null,
        result,
        equipo: normalize(r[5]),
      };
    });
}
