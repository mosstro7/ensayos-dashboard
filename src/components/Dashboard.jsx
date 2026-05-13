import { useEffect, useState } from 'react';
import { saveSnapshot } from '../utils/snapshot.js';
import { useRoomsData }     from '../hooks/useRoomsData.js';
import { useEquipmentData } from '../hooks/useEquipmentData.js';
import { useTestSettings }  from '../hooks/useTestSettings.js';
import { clearConfig, clearCache } from '../config/storage.js';
import { calcCompletionPct, visibleBreakdownTypes } from '../utils/completionPct.js';
import ProgressRing         from './ProgressRing.jsx';
import TestBreakdownChart   from './TestBreakdownChart.jsx';
import RoomTable            from './RoomTable.jsx';
import EquipmentTable       from './EquipmentTable.jsx';
import DetailPanel          from './DetailPanel.jsx';
import TestSettingsPanel    from './TestSettingsPanel.jsx';
import FilterBar, { DEFAULT_FILTERS, applyRoomFilters, applyEquipmentFilters } from './FilterBar.jsx';
import StatsSection         from './StatsSection.jsx';
import { TextReport }       from './TextReport.jsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const ALL_ROOM_TYPES = ['Integridad', 'Ren. Horarias', 'Conteo', 'Temperatura', 'Humedad', 'Luz', 'Ruido', 'Recuperación'];

function calcRoomBreakdown(rooms, pressures, settings, pdRoomIds) {
  const types = visibleBreakdownTypes(ALL_ROOM_TYPES, settings);
  const breakdown = types.map(type => {
    // Para integridad 'exclude-d': solo cuentan las salas que SÍ deben tener el ensayo
    let applicable = rooms.filter(r => r.tests[type] !== undefined);
    if (type === 'Integridad' && settings.integridad === 'exclude-d') {
      applicable = applicable.filter(r => {
        const s = String(r.gmpClass || '').toUpperCase();
        return !(s.endsWith('D') || s.includes(' D') || s.includes('ISO 8')
               || s.includes('INFORMATIVO') || s.includes('INFORMATIVA'));
      });
    }
    const done = applicable.filter(r => r.tests[type]?.done).length;
    return { name: type, total: applicable.length, done, pct: applicable.length > 0 ? Math.round((done / applicable.length) * 100) : 0 };
  });

  // PD: agrupar por shortId de salaOrigen para contar salas únicas.
  // pdRoomIds garantiza que solo contemos las salas del sheet PD.
  const pdMap = {};
  for (const p of pressures) {
    const shortId = String(p.salaOrigen || '').split(' ')[0];
    if (shortId && pdRoomIds.has(shortId)) {
      (pdMap[shortId] = pdMap[shortId] || []).push(p);
    }
  }
  const pdTotal = Object.keys(pdMap).length;
  const pdDone  = Object.values(pdMap).filter(pds => pds.every(p => p.done)).length;
  breakdown.push({ name: 'Presión Diferencial', total: pdTotal, done: pdDone, pct: pdTotal > 0 ? Math.round((pdDone / pdTotal) * 100) : 0 });

  return breakdown;
}

function calcEquipBreakdown(equipment) {
  const types = ['Integridad', 'Velocidad Downflow', 'Conteo Reposo', 'Conteo Operación', 'Temperatura', 'Humedad', 'Luz', 'Ruido'];
  return types.map(type => {
    const applicable = equipment.filter(e => e.tests[type] !== undefined);
    const done = applicable.filter(e => e.tests[type]?.done).length;
    return { name: type, total: applicable.length, done, pct: applicable.length > 0 ? Math.round((done / applicable.length) * 100) : 0 };
  });
}

// Para salas: recalcula con settings (excluye ensayos opcionales del denominador).
function avgRoomPct(rooms, settings) {
  if (!rooms.length) return 0;
  return Math.round(rooms.reduce((s, r) => s + calcCompletionPct(r, settings), 0) / rooms.length);
}

// Para equipos: usa el completionPct calculado en el parser (estructura distinta).
function avgEquipPct(equipment) {
  if (!equipment.length) return 0;
  return Math.round(equipment.reduce((s, e) => s + e.completionPct, 0) / equipment.length);
}

function countNoConforme(rooms, equipment) {
  const roomNc  = rooms.filter(r =>
    Object.values(r.tests).some(t => t.result === 'NO CONFORME')
  ).length;
  const equipNc = equipment.filter(e =>
    Object.values(e.tests).some(t => t.done && String(t.result || '').trim().toUpperCase() === 'NO CONFORME')
  ).length;
  return roomNc + equipNc;
}

function countPending(rooms, equipment) {
  const roomPending  = rooms.reduce((s, r)  => s + Object.values(r.tests).filter(t => !t.done).length, 0);
  const equipPending = equipment.reduce((s, e) => s + Object.values(e.tests).filter(t => !t.done).length, 0);
  return roomPending + equipPending;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-green-500" />
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function Dashboard({ config, onReconfigure }) {
  const rooms    = useRoomsData();
  const equip    = useEquipmentData();
  const { settings, update: updateSetting } = useTestSettings();

  const [tab,               setTab]               = useState('salas');
  const [selected,          setSelected]          = useState(null);
  const [selectedType,      setSelectedType]      = useState(null);
  const [roomFilters,       setRoomFilters]       = useState(DEFAULT_FILTERS);
  const [equipFilters,      setEquipFilters]      = useState(DEFAULT_FILTERS);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showReconfigModal, setShowReconfigModal] = useState(false);

  useEffect(() => {
    console.log('[Dashboard] useEffect config:', config);
    rooms.loadData(config);
    equip.loadData(config);
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rooms.rooms?.length && !rooms.loading) {
      saveSnapshot(rooms.rooms, equip.equipment || []);
    }
  }, [rooms.rooms, equip.equipment, rooms.loading]);

  function handleRefresh() {
    rooms.loadData(config, true);
    equip.loadData(config, true);
  }

  function handleReconfigure() {
    setShowReconfigModal(true);
  }

  function confirmReconfigure() {
    rooms.clearData();
    equip.clearData();
    clearConfig();
    clearCache();
    onReconfigure();
  }

  function openRoom(room)      { setSelected(room); setSelectedType('room'); }
  function openEquipment(eq)   { setSelected(eq);   setSelectedType('equipment'); }
  function closePanel()        { setSelected(null);  setSelectedType(null); }

  const loading = rooms.loading || equip.loading;
  const errors  = [rooms.error, equip.error].filter(Boolean);

  const filteredRooms  = applyRoomFilters(rooms.rooms, roomFilters);
  const filteredEquip  = applyEquipmentFilters(equip.equipment, equipFilters);

  // Conjunto de IDs de sala que aparecen en col 0 de la hoja PD.
  // Solo estas salas muestran estado PD; las demás muestran "—".
  // Usamos el shortId: primer token del valor de salaOrigen.
  const pdRoomIds = new Set(
    rooms.pressures.map(p => String(p.salaOrigen || '').split(' ')[0]).filter(Boolean)
  );

  const globalRoomsPct = avgRoomPct(rooms.rooms, settings);
  const globalEquipPct = avgEquipPct(equip.equipment);
  const pending        = countPending(rooms.rooms, equip.equipment);
  const noConf         = countNoConforme(rooms.rooms, equip.equipment);

  const roomBreakdown  = calcRoomBreakdown(rooms.rooms, rooms.pressures, settings, pdRoomIds);
  const equipBreakdown = calcEquipBreakdown(equip.equipment);

  const lastUpdated = rooms.lastUpdated
    ? rooms.lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">Ensayos Dashboard</h1>
            {lastUpdated && <p className="text-xs text-slate-400">Actualizado {lastUpdated}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600 disabled:opacity-50"
            >
              {loading ? 'Cargando…' : '↻ Actualizar'}
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              title="Configuración de ensayos"
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-400 transition hover:text-white"
            >
              ⚙ Ensayos
            </button>
            <button
              onClick={handleReconfigure}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-400 transition hover:text-white"
            >
              Reconfigurar
            </button>
          </div>
        </div>
        {loading && <LoadingBar />}
      </header>

      <main className="mx-auto max-w-screen-xl px-4 py-6 flex flex-col gap-6">

        {errors.map((e, i) => <ErrorBanner key={i} message={e} />)}

        {/* Resumen */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-1 flex justify-center rounded-xl border border-slate-700 bg-slate-800 p-4">
            <ProgressRing pct={globalRoomsPct} label="Salas" />
          </div>
          {config?.equipResultsSheetId && (
            <div className="col-span-1 flex justify-center rounded-xl border border-slate-700 bg-slate-800 p-4">
              <ProgressRing pct={globalEquipPct} label="Equipos" />
            </div>
          )}
          <StatCard label="Ensayos pendientes" value={pending} sub="en todo el proyecto" />
          <StatCard label="NO CONFORME" value={noConf} highlight={noConf > 0} />
        </section>

        {/* Métricas detalladas (solo cuando hay salas cargadas) */}
        {rooms.rooms.length > 0 && (
          <StatsSection rooms={rooms.rooms} settings={settings} />
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700">
          {[{ id: 'salas', label: `Salas (${rooms.rooms.length})` }, { id: 'equipos', label: `Equipos (${equip.equipment.length})` }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Salas */}
        {tab === 'salas' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Avance por tipo de ensayo</p>
              <TestBreakdownChart data={roomBreakdown} />
            </div>
            <FilterBar type="room" filters={roomFilters} onChange={setRoomFilters} />
            <RoomTable
              rooms={filteredRooms}
              pressures={rooms.pressures}
              pdRoomIds={pdRoomIds}
              settings={settings}
              onRowClick={openRoom}
              showPd={rooms.pressures.length > 0}
            />
          </div>
        )}

        {/* Tab: Equipos */}
        {tab === 'equipos' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Avance por tipo de ensayo</p>
              <TestBreakdownChart data={equipBreakdown} />
            </div>
            <FilterBar type="equipment" filters={equipFilters} onChange={setEquipFilters} />
            <EquipmentTable equipment={filteredEquip} onRowClick={openEquipment} />
          </div>
        )}

        {/* Reporte IA */}
        <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <TextReport
            rooms={rooms.rooms}
            pressures={rooms.pressures}
            equipment={equip.equipment}
            apiKey={config.anthropicApiKey}
            model={config.anthropicModel}
          />
        </section>
      </main>

      {/* Detail panel */}
      <DetailPanel
        item={selected}
        type={selectedType}
        pressures={rooms.pressures}
        onClose={closePanel}
      />

      {/* Settings panel */}
      {showSettings && (
        <TestSettingsPanel
          settings={settings}
          onUpdate={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Reconfig modal */}
      {showReconfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Reconfigurar conexión</h2>
            <p className="text-sm text-slate-400 mb-6">
              ¿Querés reconfigurar la conexión?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReconfigModal(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReconfigure}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
