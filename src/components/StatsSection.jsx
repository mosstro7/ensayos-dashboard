import { calcStats, formatTime } from '../utils/statsCalc.js';
import { DEFAULT_SETTINGS }      from '../utils/completionPct.js';
import { useState }              from 'react';

// ── Subcomponentes ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}

function Row({ label, value, accent, time }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-baseline gap-2">
        {time != null && (
          <span className="text-[10px] text-slate-500 tabular-nums">{time}</span>
        )}
        <span className={`text-sm font-semibold tabular-nums ${accent ?? 'text-slate-200'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
      <SectionTitle>{title}</SectionTitle>
      <div className="divide-y divide-slate-700/40">
        {children}
      </div>
    </div>
  );
}

function MiniBar({ done, total, colorDone = 'bg-green-500' }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorDone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 shrink-0">{pct}%</span>
    </div>
  );
}

// ── Conteo por clase ──────────────────────────────────────────────────────────

const CLASE_META = {
  B: { label: 'GMP B',                     color: 'text-blue-300',   bg: 'bg-blue-900/20 border-blue-800/40',     timeNote: '9m20s reposo + 1m op. / punto' },
  C: { label: 'GMP C',                     color: 'text-yellow-300', bg: 'bg-yellow-900/15 border-yellow-800/30', timeNote: '1m reposo + 1m op. / punto' },
  D: { label: 'GMP D / ISO / Informativo', color: 'text-slate-300',  bg: 'bg-slate-700/30 border-slate-600/40',   timeNote: '1m reposo / punto' },
};

function ConteoClaseRow({ clsKey, data }) {
  const { label, color, bg, timeNote } = CLASE_META[clsKey];
  if (!data.salasTotales) return null; // clase sin salas → no mostrar

  const pending = data.salas > 0;

  return (
    <div className={`rounded border px-3 py-2 ${bg}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        {pending
          ? <span className="text-xs text-slate-400">{formatTime(data.tiempo)}</span>
          : <span className="text-xs text-green-500">✓ completo</span>
        }
      </div>
      <div className="mt-0.5 flex gap-3 text-[11px] text-slate-400">
        {pending ? (
          <>
            <span>{data.salas} sala{data.salas !== 1 ? 's' : ''} pend.</span>
            <span>·</span>
            <span>{data.puntos} punto{data.puntos !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <span>{data.salasTotales} sala{data.salasTotales !== 1 ? 's' : ''}</span>
        )}
        <span className="ml-auto text-slate-600">{timeNote}</span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function StatsSection({ rooms, settings = DEFAULT_SETTINGS }) {
  const [open, setOpen] = useState(true);
  const st = calcStats(rooms, settings);
  if (!st) return null;

  const { salas, filtros, caudal, conteo } = st;
  const hayConteo = conteo.puntosTotales > 0;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900">
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-300">Métricas detalladas</span>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-700 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* ── Salas ─────────────────────────────────────────────────── */}
          <Card title="Salas">
            <Row label="Total"                value={salas.total} />
            <Row label="Iniciadas"            value={salas.iniciadas} />
            {salas.integTotal > 0 && (
              <Row label="Con integridad"
                   value={`${salas.integDone} / ${salas.integTotal}`}
                   accent={salas.integDone === salas.integTotal ? 'text-green-400' : 'text-slate-200'} />
            )}
            {salas.integPend > 0 && (
              <Row label="Pend. integridad"   value={salas.integPend} accent="text-yellow-400" />
            )}
            <Row label="Pend. conteo"
                 value={salas.salasPendConteo}
                 accent={salas.salasPendConteo > 0 ? 'text-yellow-400' : 'text-green-400'} />
            <Row label="Pend. caudales"
                 value={salas.salasPendCaudal}
                 accent={salas.salasPendCaudal > 0 ? 'text-yellow-400' : 'text-green-400'} />
          </Card>

          {/* ── Filtros HEPA ──────────────────────────────────────────── */}
          <Card title="Filtros HEPA">
            <Row label="Total filtros"
                 value={filtros.total} />
            <Row label="Con integridad"
                 value={filtros.done}
                 accent={filtros.done === filtros.total ? 'text-green-400' : 'text-slate-200'} />
            <Row label="Pendientes"
                 value={filtros.pend}
                 accent={filtros.pend > 0 ? 'text-yellow-400' : 'text-green-400'} />
            <MiniBar done={filtros.done} total={filtros.total} />
          </Card>

          {/* ── Caudales ──────────────────────────────────────────────── */}
          <Card title="Caudales">
            <Row label="Total"
                 value={caudal.total} />
            <Row label="Medidos"
                 value={caudal.medidos}
                 accent={caudal.medidos === caudal.total ? 'text-green-400' : 'text-slate-200'} />
            <Row label="Pendientes"
                 value={caudal.pend}
                 accent={caudal.pend > 0 ? 'text-yellow-400' : 'text-green-400'} />
            <MiniBar done={caudal.medidos} total={caudal.total} />
          </Card>

          {/* ── Conteo ────────────────────────────────────────────────── */}
          {hayConteo && (
            <Card title="Conteo de partículas">
              <Row label="Puntos totales"
                   value={conteo.puntosTotales}
                   time={formatTime(conteo.tiempoTodas)} />
              <Row label="Hechos"
                   value={conteo.puntosHechos}
                   time={formatTime(conteo.tiempoHechas)}
                   accent={conteo.puntosHechos === conteo.puntosTotales ? 'text-green-400' : 'text-slate-200'} />
              <Row label="Pendientes"
                   value={conteo.puntosPend}
                   time={formatTime(conteo.tiempoPend)}
                   accent={conteo.puntosPend > 0 ? 'text-yellow-400' : 'text-green-400'} />
              <MiniBar done={conteo.puntosHechos} total={conteo.puntosTotales} />

              {/* Breakdown por clase — siempre visible */}
              <div className="mt-3 flex flex-col gap-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Por clase · tiempo estimado pendiente
                </p>
                {['B', 'C', 'D'].map(k => (
                  <ConteoClaseRow key={k} clsKey={k} data={conteo.clases[k]} />
                ))}
                {conteo.puntosPend > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-700/50 mt-1">
                    <span className="text-slate-400">Total pendiente</span>
                    <span className="font-semibold text-slate-200">{formatTime(conteo.tiempoPend)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

        </div>
      )}
    </section>
  );
}
