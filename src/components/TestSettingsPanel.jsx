// Panel deslizante (mismo patrón que DetailPanel) para configurar
// qué ensayos se incluyen en el cálculo del % de completitud.

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-slate-600'
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function TestSettingsPanel({ settings, onUpdate, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-slate-900 shadow-2xl border-l border-slate-700">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Configuración</p>
            <p className="text-base font-bold text-white">Ensayos opcionales</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          <p className="text-xs text-slate-400 leading-relaxed">
            Elegí qué ensayos se incluyen en el denominador del <strong className="text-slate-300">% Total</strong>.
            Los ensayos desactivados no cuentan ni en el numerador ni en el denominador.
          </p>

          {/* ── Integridad ─────────────────────────────────────────── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Integridad de filtros
            </p>
            <div className="space-y-2.5 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
              {[
                { value: 'all',       label: 'Todas las salas llevan integridad' },
                { value: 'exclude-d', label: 'Salas Grado D, ISO 8 e Informativo no llevan' },
                { value: 'none',      label: 'Ninguna sala lleva integridad' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="integridad"
                    value={opt.value}
                    checked={settings.integridad === opt.value}
                    onChange={() => onUpdate('integridad', opt.value)}
                    className="accent-blue-500 w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-slate-200 group-hover:text-white transition">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Ensayos con toggle ──────────────────────────────────── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ensayos opcionales
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/50">
              {[
                { key: 'recuperacion', label: 'Recuperación de clase',
                  hint: 'Arbitrario según el protocolo' },
                { key: 'luz',          label: 'Luz',
                  hint: 'Incluir en el cálculo de avance' },
                { key: 'ruido',        label: 'Ruido',
                  hint: 'Incluir en el cálculo de avance' },
              ].map(({ key, label, hint }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div>
                    <p className="text-sm text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{hint}</p>
                  </div>
                  <Toggle
                    enabled={settings[key]}
                    onToggle={() => onUpdate(key, !settings[key])}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Nota al pie */}
          <p className="text-xs text-slate-500 leading-relaxed">
            La configuración se guarda automáticamente en el navegador.
          </p>
        </div>
      </div>
    </>
  );
}
