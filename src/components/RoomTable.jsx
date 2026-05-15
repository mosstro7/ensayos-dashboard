import { calcCompletionPct, DEFAULT_SETTINGS } from '../utils/completionPct.js';

const ROOM_TESTS = ['Integridad', 'Ren. Horarias', 'Conteo', 'Temperatura', 'Humedad', 'Luz', 'Ruido', 'Recuperación'];
const COL_LABELS = ['Integ.', 'Ren.Hor.', 'Conteo', 'Temp.', 'Hum.', 'Luz', 'Ruido', 'Recup.'];

// Devuelve true si el ensayo está excluido del cálculo para esta sala según settings.
function isTestNA(testName, room, settings) {
  if (testName === 'Integridad') {
    if (settings.integridad === 'none') return true;
    if (settings.integridad === 'exclude-d') {
      const s = String(room.gmpClass || '').toUpperCase();
      return s.endsWith('D') || s.includes(' D') || s.includes('ISO 8')
          || s.includes('INFORMATIVO') || s.includes('INFORMATIVA');
    }
  }
  if (testName === 'Ren. Horarias' && !settings.renovaciones) return true;
  if (testName === 'Temperatura'   && !settings.temperatura)  return true;
  if (testName === 'Humedad'       && !settings.humedad)      return true;
  if (testName === 'Luz'           && !settings.luz)          return true;
  if (testName === 'Ruido'         && !settings.ruido)        return true;
  if (testName === 'Recuperación') {
    if (!settings.recuperacion) return true;
    if (settings.recuperacionSalas?.[room.id] === false) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

function StatusCell({ done, result, na }) {
  // Excluido por configuración → no aplica
  if (na)
    return <td className="px-2 py-2 text-center text-slate-600 text-xs">—</td>;

  // Sin datos de test (test no existe en el objeto de la sala)
  if (done === null || done === undefined)
    return <td className="px-2 py-2 text-center text-slate-600 text-xs">—</td>;

  // Pendiente (aplica, pero no realizado)
  if (!done)
    return (
      <td className="px-2 py-2 text-center text-slate-400 text-xs font-medium">
        pend.
      </td>
    );

  if (result === 'NO CONFORME')
    return <td className="px-2 py-2 text-center text-red-400 font-bold bg-red-900/20 text-sm">✗</td>;

  return <td className="px-2 py-2 text-center text-green-400 font-bold bg-green-900/20 text-sm">✓</td>;
}

// Matching preciso: evita falsos positivos de startsWith con IDs cortos.
// Ejemplo: roomId "15" NO debe coincidir con salaOrigen "156-05 Pasaje".
function matchesSala(salaOrigen, roomId) {
  const s = String(salaOrigen || '');
  if (s === roomId) return true;
  // Acepta "156-05 Nombre sala" pero rechaza "156-050 Otra"
  return s.startsWith(roomId + ' ');
}

function PdCell({ pressures, pdRoomIds, roomId }) {
  // Si el room no está en el conjunto de salas del sheet PD → no aplica
  if (!pdRoomIds.has(roomId))
    return <td className="px-2 py-2 text-center text-slate-600 text-xs">—</td>;

  const roomPd = pressures.filter(p => matchesSala(p.salaOrigen, roomId));

  if (roomPd.length === 0)
    return <td className="px-2 py-2 text-center text-slate-400 text-xs font-medium">pend.</td>;

  const anyNoConf = roomPd.some(p => p.done && p.result === 'NO CONFORME');
  const allDone   = roomPd.every(p => p.done);

  if (anyNoConf)
    return <td className="px-2 py-2 text-center text-red-400 font-bold bg-red-900/20 text-sm">✗</td>;
  if (allDone)
    return <td className="px-2 py-2 text-center text-green-400 font-bold bg-green-900/20 text-sm">✓</td>;
  return (
    <td className="px-2 py-2 text-center text-slate-400 text-xs font-medium">pend.</td>
  );
}

function PctCell({ pct }) {
  const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <td className={`px-3 py-2 text-center font-semibold text-sm ${color}`}>{pct}%</td>
  );
}

// Badge flexible: coincide por substring en el valor de gmpClass
function GmpBadge({ cls }) {
  if (!cls || cls === 'N/A') {
    return <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-400">N/A</span>;
  }

  const upper = String(cls).toUpperCase();
  let style;
  if (upper.includes(' A') || upper.endsWith('A')) {
    style = 'bg-purple-900/50 text-purple-300';
  } else if (upper.includes(' B') || upper.endsWith('B')) {
    style = 'bg-blue-900/50 text-blue-300';
  } else if (upper.includes(' C') || upper.endsWith('C')) {
    style = 'bg-yellow-900/50 text-yellow-300';
  } else if (upper.includes(' D') || upper.endsWith('D')) {
    style = 'bg-slate-700 text-slate-300';
  } else {
    style = 'bg-slate-600 text-slate-300'; // ISO u otros
  }

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${style}`}>{cls}</span>
  );
}

export default function RoomTable({ rooms, pressures, pdRoomIds, settings = DEFAULT_SETTINGS, onRowClick, showPd = true }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="sticky top-14 z-10 bg-slate-800 px-3 py-3 whitespace-nowrap">ID</th>
            <th className="sticky top-14 z-10 bg-slate-800 px-3 py-3">Nombre</th>
            <th className="sticky top-14 z-10 bg-slate-800 px-3 py-3 whitespace-nowrap">Clase</th>
            {COL_LABELS.map(l => (
              <th key={l} className="sticky top-14 z-10 bg-slate-800 px-2 py-3 text-center whitespace-nowrap">{l}</th>
            ))}
            {showPd && <th className="sticky top-14 z-10 bg-slate-800 px-2 py-3 text-center whitespace-nowrap">PD</th>}
            <th className="sticky top-14 z-10 bg-slate-800 px-3 py-3 text-center whitespace-nowrap">% Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {rooms.map(room => (
            <tr
              key={room.id}
              onClick={() => onRowClick(room)}
              className="cursor-pointer bg-slate-900 transition hover:bg-slate-800"
            >
              <td className="px-3 py-2 font-mono text-xs text-slate-300 whitespace-nowrap">{room.id}</td>
              <td className="px-3 py-2 text-slate-200 max-w-xs truncate">{room.fullName.replace(room.id, '').trim()}</td>
              <td className="px-3 py-2 whitespace-nowrap"><GmpBadge cls={room.gmpClass} /></td>
              {ROOM_TESTS.map(test => (
                <StatusCell
                  key={test}
                  done={room.tests[test]?.done ?? null}
                  result={room.tests[test]?.result ?? null}
                  na={isTestNA(test, room, settings)}
                />
              ))}
              {showPd && (
                <PdCell
                  pressures={pressures}
                  pdRoomIds={pdRoomIds}
                  roomId={room.id}
                />
              )}
              <PctCell pct={calcCompletionPct(room, settings)} />
            </tr>
          ))}
        </tbody>
      </table>
      {rooms.length === 0 && (
        <p className="py-12 text-center text-slate-500">No hay salas para mostrar.</p>
      )}
    </div>
  );
}
