// Detecta si una sala no requiere ensayo de integridad por su clase GMP:
// Grado D / ISO 8 o GMP Informativo.
function isGmpD(gmpClass) {
  if (!gmpClass || gmpClass === 'N/A') return false;
  const s = String(gmpClass).toUpperCase();
  // Cubre: "GMP D", "Clase D", "Grado D", "ISO 8", " D", "GMP Informativo", etc.
  return s.endsWith('D') || s.includes(' D') || s.includes('ISO 8') || s === '8'
      || s.includes('INFORMATIVO') || s.includes('INFORMATIVA');
}

export const DEFAULT_SETTINGS = {
  integridad:   'all',  // 'all' | 'exclude-d' | 'none'
  recuperacion: true,   // incluir en denominador
  luz:          true,
  ruido:        true,
};

/**
 * Recalcula el % de completitud de una sala aplicando la configuración de
 * ensayos opcionales.  Se usa en reemplazo de room.completionPct (que siempre
 * cuenta los 8 ensayos) cuando el usuario quiere excluir algunos del total.
 */
export function calcCompletionPct(room, settings = DEFAULT_SETTINGS) {
  const exclude = new Set();

  // Integridad
  if (settings.integridad === 'none') {
    exclude.add('Integridad');
  } else if (settings.integridad === 'exclude-d' && isGmpD(room.gmpClass)) {
    exclude.add('Integridad');
  }

  // Opcionales
  if (!settings.recuperacion) exclude.add('Recuperación');
  if (!settings.luz)          exclude.add('Luz');
  if (!settings.ruido)        exclude.add('Ruido');

  const entries  = Object.entries(room.tests).filter(([name]) => !exclude.has(name));
  const total    = entries.length;
  const done     = entries.filter(([, t]) => t.done).length;

  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * Filtra la lista de tipos de ensayo que deben mostrarse en el breakdown chart
 * según la configuración actual.  Para integridad 'exclude-d' se deja visible
 * (porque aplica a algunas salas), solo se oculta cuando 'none'.
 */
export function visibleBreakdownTypes(allTypes, settings) {
  return allTypes.filter(type => {
    if (type === 'Integridad'   && settings.integridad === 'none')  return false;
    if (type === 'Recuperación' && !settings.recuperacion)          return false;
    if (type === 'Luz'          && !settings.luz)                   return false;
    if (type === 'Ruido'        && !settings.ruido)                 return false;
    return true;
  });
}
