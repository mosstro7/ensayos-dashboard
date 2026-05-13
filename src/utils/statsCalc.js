import { DEFAULT_SETTINGS } from './completionPct.js';

// ─── clasificación de clase GMP ───────────────────────────────────────────────

function gmpClass(room) {
  const s = String(room.gmpClass || '').toUpperCase();
  if (s.endsWith('B') || s.includes(' B')) return 'B';
  if (s.endsWith('C') || s.includes(' C')) return 'C';
  return 'D'; // D, ISO 8, Informativo, N/A → tratar como D para conteo
}

function isIntegridadApplicable(room, settings) {
  if (settings.integridad === 'none') return false;
  if (settings.integridad === 'exclude-d') {
    const s = String(room.gmpClass || '').toUpperCase();
    return !(s.endsWith('D') || s.includes(' D') || s.includes('ISO 8')
           || s.includes('INFORMATIVO') || s.includes('INFORMATIVA'));
  }
  return true;
}

// ─── estimación de tiempo por clase ──────────────────────────────────────────
// GMP B: reposo 9min20s (560s) + operación 1min (60s) = 620s/punto
// GMP C: reposo 1min (60s)    + operación 1min (60s) = 120s/punto
// GMP D: solo reposo 1min (60s)                      =  60s/punto
const SEC_PER_POINT = { B: 620, C: 120, D: 60 };

export function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '0hs:00min';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}hs:${String(m).padStart(2, '0')}min`;
}

// ─── función principal ────────────────────────────────────────────────────────

export function calcStats(rooms, settings = DEFAULT_SETTINGS) {
  if (!rooms.length) return null;

  // ── Salas ──────────────────────────────────────────────────────────────────
  const totalSalas   = rooms.length;
  const iniciadas    = rooms.filter(r =>
    Object.values(r.tests).some(t => t.done)
  ).length;

  const integApplicable = rooms.filter(r => isIntegridadApplicable(r, settings));
  const integDone       = integApplicable.filter(r => r.tests['Integridad']?.done).length;
  const integPend       = integApplicable.length - integDone;

  const salasPendConteo  = rooms.filter(r => !r.tests['Conteo']?.done).length;
  const salasPendCaudal  = rooms.filter(r => !r.tests['Ren. Horarias']?.done).length;

  // ── Filtros HEPA ───────────────────────────────────────────────────────────
  const filtrosTotal = integApplicable.reduce((s, r) => s + (r.cantFiltros || 1), 0);
  const filtrosDone  = integApplicable
    .filter(r => r.tests['Integridad']?.done)
    .reduce((s, r) => s + (r.cantFiltros || 1), 0);
  const filtrosPend  = filtrosTotal - filtrosDone;

  // ── Caudales ───────────────────────────────────────────────────────────────
  const caudalTotal   = rooms.reduce((s, r) => s + (r.caudalTotal   || 0), 0);
  const caudalMedidos = rooms.reduce((s, r) => s + (r.caudalMedidos || 0), 0);
  const caudalPend    = caudalTotal - caudalMedidos;

  // ── Conteo ─────────────────────────────────────────────────────────────────
  // Totales globales (sin importar si está hecho o no)
  const conteoPuntosTotales = rooms.reduce((s, r) => s + r.conteoPoints, 0);
  const conteoPuntosHechos  = rooms
    .filter(r => r.tests['Conteo']?.done)
    .reduce((s, r) => s + r.conteoPoints, 0);
  const conteoPuntosPend    = conteoPuntosTotales - conteoPuntosHechos;

  // Breakdown por clase + tiempos globales en un solo recorrido
  const clases = {
    B: { salas: 0, puntos: 0, tiempo: 0, salasTotales: 0 },
    C: { salas: 0, puntos: 0, tiempo: 0, salasTotales: 0 },
    D: { salas: 0, puntos: 0, tiempo: 0, salasTotales: 0 },
  };

  let tiempoTodas  = 0; // tiempo si se hiciera TODO
  let tiempoHechas = 0; // tiempo de salas con conteo ya hecho

  for (const room of rooms) {
    const cls = gmpClass(room);
    const N   = room.conteoPoints;
    const t   = N * SEC_PER_POINT[cls];

    clases[cls].salasTotales++;
    tiempoTodas += t;

    if (room.tests['Conteo']?.done) {
      tiempoHechas += t;
    } else {
      // Pending: acumular en breakdown de clase
      clases[cls].salas++;
      clases[cls].puntos += N;
      clases[cls].tiempo += t;
    }
  }

  const tiempoPend = tiempoTodas - tiempoHechas;

  return {
    salas: {
      total: totalSalas,
      iniciadas,
      integDone,
      integPend,
      integTotal: integApplicable.length,
      salasPendConteo,
      salasPendCaudal,
    },
    filtros: { total: filtrosTotal, done: filtrosDone, pend: filtrosPend },
    caudal:  { total: caudalTotal, medidos: caudalMedidos, pend: caudalPend },
    conteo: {
      puntosTotales:  conteoPuntosTotales,
      puntosHechos:   conteoPuntosHechos,
      puntosPend:     conteoPuntosPend,
      tiempoTodas,
      tiempoHechas,
      tiempoPend,
      clases,
    },
  };
}
