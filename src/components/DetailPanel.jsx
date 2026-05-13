// type: 'room' | 'equipment'
// pressures: solo se usa cuando type === 'room'

function TestRow({ name, done, value, values, result, criterio }) {
  const isNoConf = result === 'NO CONFORME';
  const isConf   = done && !isNoConf;

  const iconColor   = !done ? 'text-slate-500' : isNoConf ? 'text-red-400'   : 'text-green-400';
  const icon        = !done ? '·'              : isNoConf ? '✗'               : '✓';
  const statusColor = !done ? 'text-slate-600' : isNoConf ? 'text-red-400'   : 'text-green-500';
  const statusText  = !done ? 'Pendiente'      : isNoConf ? 'No conforme'    : 'Completo';

  // Valores de medición a mostrar debajo del nombre
  const hasArrayValues  = Array.isArray(values) && values.length > 0;
  const hasObjectValues = values && !Array.isArray(values) && typeof values === 'object';
  // Mostrar value escalar cuando: no hay array de valores O además del array (para RH junto a caudales)
  const showScalar = done && value != null && !hasObjectValues;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0">
      <span className={`mt-0.5 text-sm font-bold shrink-0 ${iconColor}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{name}</p>

        {/* Array de valores: caudales, temperaturas, etc. */}
        {done && hasArrayValues && (
          <p className="text-xs text-slate-400 mt-0.5">{values.join(' / ')}</p>
        )}

        {/* Objeto: conteo reposo/operación */}
        {done && hasObjectValues && (
          <p className="text-xs text-slate-400 mt-0.5">
            Reposo: {values.reposo ?? '—'} · Operación: {values.operacion ?? '—'}
          </p>
        )}

        {/* Valor escalar (RH, recuperación, integridad) */}
        {showScalar && (
          <p className="text-xs text-slate-400 mt-0.5">
            {hasArrayValues ? `RH: ${value}` : String(value)}
            {criterio != null && (
              <span className="ml-2 text-slate-500">(criterio: ≥ {criterio})</span>
            )}
          </p>
        )}
      </div>
      <span className={`text-xs shrink-0 ${statusColor}`}>{statusText}</span>
    </div>
  );
}

function EquipRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function RoomDetail({ room, pressures }) {
  const roomPd = pressures.filter(p =>
    p.salaOrigen === room.id || String(p.salaOrigen).startsWith(room.id)
  );

  return (
    <>
      <div className="mb-4 rounded-lg bg-slate-700/50 px-4 py-3">
        <p className="text-xs text-slate-400">Sala</p>
        <p className="text-base font-semibold text-white">{room.fullName}</p>
        <div className="mt-1 flex gap-4 text-xs text-slate-400">
          <span>Clase: <strong className="text-slate-200">{room.gmpClass}</strong></span>
          {room.area   && <span>Sup.: <strong className="text-slate-200">{room.area} m²</strong></span>}
          {room.volume && <span>Vol.: <strong className="text-slate-200">{room.volume} m³</strong></span>}
        </div>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ensayos</p>
      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/50 px-3">
        {Object.entries(room.tests).map(([name, t]) => (
          <TestRow key={name} name={name} done={t.done} value={t.value} values={t.values} result={t.result} criterio={t.criterio} />
        ))}
      </div>

      {roomPd.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Presión Diferencial</p>
          <div className="mb-4 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Respecto a</th>
                  <th className="px-3 py-2 text-left">Criterio</th>
                  <th className="px-3 py-2 text-center">Valor</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {roomPd.map((pd, i) => (
                  <tr key={i} className="bg-slate-900">
                    <td className="px-3 py-2 text-slate-300 max-w-[8rem] truncate">{pd.salaReferencia || '—'}</td>
                    <td className="px-3 py-2 text-slate-400">{pd.criterio || '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-200">{pd.valor ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {pd.result === 'CONFORME'    && <span className="text-green-400 font-bold">✓</span>}
                      {pd.result === 'NO CONFORME' && <span className="text-red-400 font-bold">✗</span>}
                      {pd.result === 'PENDIENTE'   && <span className="text-slate-500">·</span>}
                      {!pd.result && (pd.done
                        ? <span className="text-green-400 font-bold">✓</span>
                        : <span className="text-slate-500">·</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Equipos utilizados</p>
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1">
        <EquipRow label="Integridad"    value={room.equipos?.integridad} />
        <EquipRow label="Generadores"   value={room.equipos?.generadores} />
        <EquipRow label="Caudales"      value={room.equipos?.caudales} />
        <EquipRow label="Temp. y Hum."  value={room.equipos?.tempHum} />
        <EquipRow label="Luz"           value={room.equipos?.luz} />
        <EquipRow label="Ruido"         value={room.equipos?.ruido} />
        {Object.values(room.equipos || {}).every(v => !v) && (
          <p className="py-2 text-xs text-slate-500">Sin equipos registrados.</p>
        )}
      </div>
    </>
  );
}

function ResultBadge({ result }) {
  if (!result) return <span className="text-slate-500 text-xs">Pendiente</span>;
  const r = String(result).trim().toUpperCase();
  if (r === 'CONFORME')    return <span className="text-green-400 font-semibold text-xs">✓ CONFORME</span>;
  if (r === 'NO CONFORME') return <span className="text-red-400 font-semibold text-xs">✗ NO CONFORME</span>;
  if (r === 'INFORMATIVO') return <span className="text-blue-400 font-semibold text-xs">ℹ INFORMATIVO</span>;
  return <span className="text-slate-300 text-xs">{result}</span>;
}

function EquipmentDetail({ equipment }) {
  return (
    <>
      <div className="mb-4 rounded-lg bg-slate-700/50 px-4 py-3">
        <p className="text-xs text-slate-400">Equipo</p>
        <p className="text-base font-semibold text-white">{equipment.type}</p>
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-400">
          <span>Ubicación: <strong className="text-slate-200">{equipment.location || '—'}</strong></span>
          {equipment.brand && <span>Marca: <strong className="text-slate-200">{equipment.brand}</strong></span>}
          {equipment.model && <span>Modelo: <strong className="text-slate-200">{equipment.model}</strong></span>}
        </div>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ensayos</p>
      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/50 px-3">
        {Object.entries(equipment.tests).map(([name, t]) => (
          <div key={name} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${t.done ? 'text-green-400' : 'text-slate-500'}`}>
                {t.done ? '✓' : '·'}
              </span>
              <span className="text-sm text-slate-200">{name}</span>
              {t.value != null && (
                <span className="text-xs text-slate-400">({t.value})</span>
              )}
            </div>
            <ResultBadge result={t.result} />
          </div>
        ))}
      </div>

      {equipment.summary && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Resumen</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'CONF',    value: equipment.summary.conforme,    color: 'text-green-400' },
              { label: 'NO CONF', value: equipment.summary.noConforme,  color: 'text-red-400' },
              { label: 'INFO',    value: equipment.summary.informativo, color: 'text-blue-400' },
              { label: 'N/A',     value: equipment.summary.na,          color: 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-700 bg-slate-800 py-2 text-center">
                <p className={`text-lg font-bold ${color}`}>{value ?? '—'}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function DetailPanel({ item, type, pressures = [], onClose }) {
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-slate-900 shadow-2xl border-l border-slate-700">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {type === 'room' ? 'Sala' : 'Equipo'}
            </p>
            <p className="text-lg font-bold text-white">{item.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {type === 'room'
            ? <RoomDetail room={item} pressures={pressures} />
            : <EquipmentDetail equipment={item} />
          }
        </div>
      </div>
    </>
  );
}
