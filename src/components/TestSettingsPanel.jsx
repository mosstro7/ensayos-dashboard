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

function ToggleRow({ label, hint, enabled, onToggle, children }) {
  return (
    <div className="divide-y divide-slate-700/50">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div>
          <p className="text-sm text-slate-200">{label}</p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <Toggle enabled={enabled} onToggle={onToggle} />
      </div>
      {children}
    </div>
  );
}

export default function TestSettingsPanel({ settings, onUpdate, onClose, rooms = [] }) {

  function updateRoomRecuperacion(roomId, enabled) {
    const next = { ...settings.recuperacionSalas };
    if (enabled) {
      delete next[roomId];
    } else {
      next[roomId] = false;
    }
    onUpdate('recuperacionSalas', next);
  }

  const excludedCount = Object.values(settings.recuperacionSalas || {})
    .filter(v => v === false).length;

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
            Los desactivados no cuentan ni en el numerador ni en el denominador.
          </p>

          {/* ── Integridad ──────────────────────────────────────────── */}
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

              {/* Renovaciones horarias */}
              <ToggleRow
                label="Ren. Horarias"
                hint="Incluir en el cálculo de avance"
                enabled={settings.renovaciones !== false}
                onToggle={() => onUpdate('renovaciones', !settings.renovaciones)}
              />

              {/* Temperatura */}
              <ToggleRow
                label="Temperatura"
                hint="Incluir en el cálculo de avance"
                enabled={settings.temperatura !== false}
                onToggle={() => onUpdate('temperatura', !settings.temperatura)}
              />

              {/* Humedad */}
              <ToggleRow
                label="Humedad"
                hint="Incluir en el cálculo de avance"
                enabled={settings.humedad !== false}
                onToggle={() => onUpdate('humedad', !settings.humedad)}
              />

              {/* Luz */}
              <ToggleRow
                label="Luz"
                hint="Incluir en el cálculo de avance"
                enabled={settings.luz !== false}
                onToggle={() => onUpdate('luz', !settings.luz)}
              />

              {/* Ruido */}
              <ToggleRow
                label="Ruido"
                hint="Incluir en el cálculo de avance"
                enabled={settings.ruido !== false}
                onToggle={() => onUpdate('ruido', !settings.ruido)}
              />

              {/* PD */}
              <ToggleRow
                label="Presión Diferencial"
                hint="Mostrar columna y contar en el avance"
                enabled={settings.pd !== false}
                onToggle={() => onUpdate('pd', !settings.pd)}
              />

              {/* Recuperación — con sub-nivel por sala */}
              <div>
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div>
                    <p className="text-sm text-slate-200">Recuperación de clase</p>
                    <p className="text-xs text-slate-500">
                      {settings.recuperacion !== false && excludedCount > 0
                        ? `${excludedCount} sala${excludedCount > 1 ? 's' : ''} excluida${excludedCount > 1 ? 's' : ''}`
                        : 'Arbitrario según el protocolo'}
                    </p>
                  </div>
                  <Toggle
                    enabled={settings.recuperacion !== false}
                    onToggle={() => onUpdate('recuperacion', !settings.recuperacion)}
                  />
                </div>

                {/* Sub-nivel por sala */}
                {settings.recuperacion !== false && rooms.length > 0 && (
                  <div className="border-t border-slate-700/50 bg-slate-900/40 px-3 py-2 max-h-64 overflow-y-auto">
                    <p className="text-xs text-slate-500 mb-2 px-1">
                      Desactivar por sala:
                    </p>
                    {rooms.map(r => {
                      const enabled = settings.recuperacionSalas?.[r.id] !== false;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between py-1.5 px-1 gap-2"
                        >
                          <span className="text-xs text-slate-300 truncate">
                            <span className="font-mono text-slate-500 mr-1">{r.id}</span>
                            {r.fullName.replace(r.id, '').trim()}
                          </span>
                          <Toggle
                            enabled={enabled}
                            onToggle={() => updateRoomRecuperacion(r.id, !enabled)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </section>

          <p className="text-xs text-slate-500 leading-relaxed">
            La configuración se guarda automáticamente en el navegador.
          </p>
        </div>
      </div>
    </>
  );
}
