const EQUIP_TESTS = ['Integridad', 'Velocidad Downflow', 'Velocidad Inflow', 'Conteo Reposo', 'Conteo Operación', 'Temperatura', 'Humedad', 'Luz', 'Ruido'];
const COL_LABELS  = ['Integ.', 'Vel.Down', 'Vel.Inflow', 'Cont.Rep.', 'Cont.Op.', 'Temp.', 'Hum.', 'Luz', 'Ruido'];

function ResultCell({ test }) {
  if (!test) return <td className="px-2 py-2 text-center text-slate-600 text-xs">—</td>;
  if (!test.done) return <td className="px-2 py-2 text-center text-slate-500 text-lg leading-none">·</td>;

  const r = typeof test.result === 'string' ? test.result.trim().toUpperCase() : '';

  if (r === 'CONFORME')
    return <td className="px-2 py-2 text-center text-green-400 font-bold bg-green-900/20 text-sm">✓</td>;
  if (r === 'NO CONFORME')
    return <td className="px-2 py-2 text-center text-red-400 font-bold bg-red-900/20 text-sm">✗</td>;
  if (r === 'INFORMATIVO')
    return <td className="px-2 py-2 text-center text-blue-400 bg-blue-900/20 text-sm font-bold">ℹ</td>;

  // Resultado presente pero distinto (ej: texto libre)
  return <td className="px-2 py-2 text-center text-green-400 font-bold bg-green-900/20 text-sm">✓</td>;
}

function SummaryCell({ value, color }) {
  if (value == null || value === 0)
    return <td className="px-2 py-2 text-center text-slate-600 text-xs">—</td>;
  return <td className={`px-2 py-2 text-center font-semibold text-sm ${color}`}>{value}</td>;
}

function PctCell({ pct }) {
  const color = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
  return <td className={`px-3 py-2 text-center font-semibold text-sm ${color}`}>{pct}%</td>;
}

export default function EquipmentTable({ equipment, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-800 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-3 py-3 whitespace-nowrap">TAG</th>
            <th className="px-3 py-3">Ubicación</th>
            <th className="px-3 py-3 whitespace-nowrap">Tipo</th>
            {COL_LABELS.map(l => (
              <th key={l} className="px-2 py-3 text-center whitespace-nowrap">{l}</th>
            ))}
            <th className="px-2 py-3 text-center whitespace-nowrap text-green-500">CONF</th>
            <th className="px-2 py-3 text-center whitespace-nowrap text-red-500">NO CONF</th>
            <th className="px-3 py-3 text-center whitespace-nowrap">% Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {equipment.map(eq => (
            <tr
              key={eq.id}
              onClick={() => onRowClick(eq)}
              className="cursor-pointer bg-slate-900 transition hover:bg-slate-800"
            >
              <td className="px-3 py-2 font-mono text-xs text-slate-300 whitespace-nowrap">{eq.id}</td>
              <td className="px-3 py-2 text-slate-200 max-w-xs truncate">{eq.location || '—'}</td>
              <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-xs">{eq.type}</td>
              {EQUIP_TESTS.map(test => (
                <ResultCell key={test} test={eq.tests[test]} />
              ))}
              <SummaryCell value={eq.summary?.conforme}   color="text-green-400" />
              <SummaryCell value={eq.summary?.noConforme} color="text-red-400" />
              <PctCell pct={eq.completionPct} />
            </tr>
          ))}
        </tbody>
      </table>
      {equipment.length === 0 && (
        <p className="py-12 text-center text-slate-500">No hay equipos para mostrar.</p>
      )}
    </div>
  );
}
