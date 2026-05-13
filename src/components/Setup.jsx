import { useState, useEffect } from 'react';
import { extractSheetId, extractGid, fetchSheetAsCsv, fetchSheetsList, parseCsv } from '../utils/googleSheets.js';
import { parseRawData } from '../parsers/rawdata.js';
import { parsePD }      from '../parsers/pd.js';
import { parseFlujos }  from '../parsers/flujos.js';
import { saveConfig, saveGoogleApiKey, loadGoogleApiKey } from '../config/storage.js';

// ─── Componentes base ────────────────────────────────────────────────────────

const Field = ({ label, hint, value, onChange, type = 'text', placeholder, optional }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-slate-300">
      {label}
      {optional && <span className="ml-2 text-xs text-slate-500">(opcional)</span>}
    </label>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none"
      autoComplete="off"
    />
  </div>
);

function SectionHeader({ label, complete }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      {complete && <span className="text-xs font-medium text-green-400">✓ Completo</span>}
    </div>
  );
}

// ─── Sección Salas — modo auto ────────────────────────────────────────────────
// Muestra todas las hojas detectadas. El usuario elige cuáles son Datos (checkbox)
// y cuál es PD (radio, opcional).

function AutoRoomsSection({
  spreadUrl, onSpreadUrlChange,
  detecting, detectError, onDetect,
  allSheets, dataGids, onToggleData,
  pdGid, onSetPd, onReset, complete,
  googleKey,
}) {
  const [pdSheets,      setPdSheets]      = useState(null);
  const [pdDetecting,   setPdDetecting]   = useState(false);
  const [pdDetectError, setPdDetectError] = useState(null);

  // Auto-detecta hojas via fetchSheetsList y preselecciona "PD"
  useEffect(() => {
    const sheetId = extractSheetId(spreadUrl);
    if (!sheetId || !googleKey) {
      setPdSheets(null);
      setPdDetectError(null);
      return;
    }

    let cancelled = false;
    setPdDetecting(true);
    setPdDetectError(null);
    setPdSheets(null);

    (async () => {
      try {
        const sheets = await fetchSheetsList(sheetId, googleKey);
        if (cancelled) return;
        setPdSheets(sheets);
        const pdSheet = sheets.find(s => s.title.trim() === 'PD');
        onSetPd(pdSheet ? pdSheet.gid : null);
      } catch {
        if (cancelled) return;
        setPdDetectError('No se pudieron cargar las hojas para PD.');
      } finally {
        if (!cancelled) setPdDetecting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [spreadUrl, googleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const canDetect = !!extractSheetId(spreadUrl) && !detecting;
  const borderCls = complete
    ? 'border-green-700 bg-green-900/10'
    : allSheets ? 'border-slate-600'
    : 'border-slate-700';

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${borderCls}`}>
      <SectionHeader label="Salas / Áreas" complete={complete} />

      <Field
        label="URL del Spreadsheet"
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={spreadUrl}
        onChange={v => { onSpreadUrlChange(v); if (allSheets) onReset(); }}
        hint={!allSheets ? 'Pegá cualquier URL de este spreadsheet (no importa la pestaña activa)' : null}
      />

      {!allSheets && (
        <>
          <button
            onClick={onDetect}
            disabled={!canDetect}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {detecting ? 'Detectando…' : '⟳ Detectar hojas'}
          </button>
          {detectError && (
            <p className="text-xs text-red-400 leading-relaxed">{detectError}</p>
          )}
        </>
      )}

      {allSheets && (
        <div className="rounded-lg bg-slate-900/50 p-3 space-y-4">

          {/* Hoja de datos */}
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Hoja de datos{' '}
              <span className="font-normal text-slate-500">(seleccioná una)</span>
            </p>
            <div className="space-y-1">
              {allSheets.filter(s => s.title.trim().toUpperCase() === 'RAWDATA').map(sheet => (
                <label key={sheet.gid} className="flex items-center gap-2 cursor-pointer py-0.5 group">
                  <input
                    type="radio"
                    name="data-sheet"
                    checked={dataGids.has(sheet.gid)}
                    onChange={() => onToggleData(sheet.gid)}
                    className="accent-green-500 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                    {sheet.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Hoja PD */}
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Hoja PD{' '}
              <span className="font-normal text-slate-500">(opcional, máximo una)</span>
            </p>
            {pdDetecting && (
              <p className="text-xs text-slate-400 animate-pulse">Detectando hojas…</p>
            )}
            {pdDetectError && (
              <p className="text-xs text-red-400 leading-relaxed">{pdDetectError}</p>
            )}
            {!pdDetecting && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer py-0.5 group">
                  <input
                    type="radio"
                    name="pd-sheet"
                    checked={pdGid === null}
                    onChange={() => onSetPd(null)}
                    className="accent-blue-400 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-500 italic group-hover:text-slate-300 transition-colors">
                    Ninguna
                  </span>
                </label>
                {(pdSheets || []).map(sheet => (
                  <label key={sheet.gid} className="flex items-center gap-2 cursor-pointer py-0.5 group">
                    <input
                      type="radio"
                      name="pd-sheet"
                      checked={pdGid === sheet.gid}
                      onChange={() => onSetPd(sheet.gid)}
                      className="accent-blue-400 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                      {sheet.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onReset}
            className="text-xs text-slate-400 transition hover:text-white"
          >
            ↺ Cambiar spreadsheet
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sección Equipos — modo auto ─────────────────────────────────────────────

function AutoEquipSection({ spreadUrl, onSpreadUrlChange, detecting, detected, detectError, onDetect, onReset, complete }) {
  const canDetect = !!extractSheetId(spreadUrl) && !detecting;
  const borderCls = complete
    ? 'border-green-700 bg-green-900/10'
    : detected ? 'border-amber-700/60 bg-amber-900/5'
    : 'border-slate-700';

  const EXPECTED = [
    { key: 'resultados', tabLabel: 'Resultados' },
    { key: 'data',       tabLabel: 'Data' },
  ];

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${borderCls}`}>
      <SectionHeader label="Equipos" complete={complete} />

      {!detected ? (
        <>
          <Field
            label="URL del Spreadsheet"
            placeholder="https://docs.google.com/spreadsheets/d/…"
            value={spreadUrl}
            onChange={onSpreadUrlChange}
            hint="Pegá cualquier URL de este spreadsheet"
          />
          <button
            onClick={onDetect}
            disabled={!canDetect}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {detecting ? 'Detectando…' : '⟳ Detectar hojas'}
          </button>
          {detectError && <p className="text-xs text-red-400 leading-relaxed">{detectError}</p>}
        </>
      ) : (
        <div className="space-y-1.5">
          {EXPECTED.map(({ key, tabLabel }) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              {detected[key]
                ? <span className="text-green-400">✓ {tabLabel} — pestaña "{detected[key].title}"</span>
                : <span className="text-amber-400">⚠ {tabLabel} — no encontrada</span>
              }
            </div>
          ))}
          <button onClick={onReset} className="mt-1 text-xs text-slate-400 transition hover:text-white">
            ↺ Cambiar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Secciones modo manual ────────────────────────────────────────────────────

function ManualRoomsSection({ rawDataUrl, setRawDataUrl, pdUrl, setPdUrl, complete }) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${complete ? 'border-green-700 bg-green-900/10' : 'border-slate-700'}`}>
      <SectionHeader label="Salas / Áreas" complete={complete} />
      <Field
        label="URL de la hoja RawData"
        placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
        value={rawDataUrl}
        onChange={setRawDataUrl}
        hint="Abrí la pestaña 'RawData' y copiá la URL completa"
      />
      <Field
        label="URL de la hoja PD"
        placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
        value={pdUrl}
        onChange={setPdUrl}
        optional
        hint="Abrí la pestaña 'PD' y copiá la URL completa"
      />
    </div>
  );
}

function ManualEquipSection({ resultadosUrl, setResultadosUrl, dataUrl, setDataUrl, complete }) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${complete ? 'border-green-700 bg-green-900/10' : 'border-slate-700'}`}>
      <SectionHeader label="Equipos" complete={complete} />
      <Field
        label="URL de la hoja Resultados"
        placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
        value={resultadosUrl}
        onChange={setResultadosUrl}
        hint="Abrí la pestaña 'Resultados' y copiá la URL completa"
      />
      <Field
        label="URL de la hoja Data"
        placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
        value={dataUrl}
        onChange={setDataUrl}
        hint="Abrí la pestaña 'Data' y copiá la URL completa"
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Setup({ onConnect }) {
  const [googleKey, setGoogleKey] = useState(() => loadGoogleApiKey() || '');

  // ── Estado modo manual
  const [rawDataUrl,    setRawDataUrl]    = useState('');
  const [pdUrl,         setPdUrl]         = useState('');
  const [resultadosUrl, setResultadosUrl] = useState('');
  const [dataUrl,       setDataUrl]       = useState('');

  // ── Estado modo auto — Salas (multi-hoja)
  const [roomsSpreadUrl,   setRoomsSpreadUrl]   = useState('');
  const [roomsDetecting,   setRoomsDetecting]   = useState(false);
  const [roomsAllSheets,   setRoomsAllSheets]   = useState(null); // [{title,gid}] | null
  const [roomsDetectError, setRoomsDetectError] = useState(null);
  const [roomsDataGids,    setRoomsDataGids]    = useState(new Set());
  const [roomsPdGid,       setRoomsPdGid]       = useState(null);

  // ── Estado modo auto — Equipos
  const [equipSpreadUrl,   setEquipSpreadUrl]   = useState('');
  const [equipDetecting,   setEquipDetecting]   = useState(false);
  const [equipDetected,    setEquipDetected]    = useState(null);
  const [equipDetectError, setEquipDetectError] = useState(null);

  // ── Anthropic
  const [apiKey,  setApiKey]  = useState('');
  const [modelId, setModelId] = useState('claude-sonnet-4-6');

  // ── UI
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasGoogleKey = !!googleKey.trim();

  // ── Derivar IDs según modo ────────────────────────────────────────────────
  let rawDataSheetId, rawDataGid, pdSheetId, pdGid;
  let equipResultsSheetId, equipResultsGid, equipDataSheetId, equipDataGid;

  if (hasGoogleKey) {
    const roomsSpreadId = extractSheetId(roomsSpreadUrl);
    rawDataSheetId = roomsDataGids.size > 0 ? roomsSpreadId : null;
    rawDataGid     = null; // multi-hoja: no hay un único gid
    pdSheetId      = roomsPdGid ? roomsSpreadId : null;
    pdGid          = roomsPdGid; // null = sin PD

    const equipSpreadId = extractSheetId(equipSpreadUrl);
    equipResultsSheetId = equipDetected?.resultados ? equipSpreadId : null;
    equipResultsGid     = equipDetected?.resultados?.gid ?? null;
    equipDataSheetId    = equipDetected?.data ? equipSpreadId : null;
    equipDataGid        = equipDetected?.data?.gid ?? null;
  } else {
    rawDataSheetId      = extractSheetId(rawDataUrl);
    rawDataGid          = extractGid(rawDataUrl);
    pdSheetId           = extractSheetId(pdUrl);       // null si pdUrl vacío
    pdGid               = pdSheetId ? extractGid(pdUrl) : null;
    equipResultsSheetId = extractSheetId(resultadosUrl);
    equipResultsGid     = extractGid(resultadosUrl);
    equipDataSheetId    = extractSheetId(dataUrl);
    equipDataGid        = extractGid(dataUrl);
  }

  // En modo auto: completitud de salas = al menos una hoja de datos seleccionada.
  // En modo manual: completitud = URL de RawData válida (PD es opcional).
  const isRoomsComplete = hasGoogleKey
    ? roomsDataGids.size > 0 && !!rawDataSheetId
    : !!rawDataSheetId;
  const isEquipComplete = !!equipResultsSheetId && !!equipDataSheetId;
  const canConnect      = isRoomsComplete || isEquipComplete;

  // ── Handlers de detección ─────────────────────────────────────────────────

  function toggleDataGid(gid) {
    setRoomsDataGids(new Set([gid]));
  }

  async function detectRooms() {
    setRoomsDetectError(null);
    setRoomsAllSheets(null);
    setRoomsDataGids(new Set());
    setRoomsPdGid(null);
    setRoomsDetecting(true);
    try {
      const sheetId = extractSheetId(roomsSpreadUrl);
      if (!sheetId) throw new Error('URL inválida. Pegá la URL completa del spreadsheet.');
      const sheets = await fetchSheetsList(sheetId, googleKey.trim());
      if (sheets.length === 0) throw new Error('El spreadsheet no tiene hojas visibles.');
      setRoomsAllSheets(sheets);
      // Por defecto: pre-seleccionar solo las hojas RAWDATA
      const rawdataSheets = sheets.filter(s => s.title.trim().toUpperCase() === 'RAWDATA');
      setRoomsDataGids(new Set(rawdataSheets.map(s => s.gid)));
    } catch (err) {
      setRoomsDetectError(err.message);
    } finally {
      setRoomsDetecting(false);
    }
  }

  async function detectEquip() {
    setEquipDetectError(null);
    setEquipDetected(null);
    setEquipDetecting(true);
    try {
      const sheetId = extractSheetId(equipSpreadUrl);
      if (!sheetId) throw new Error('URL inválida. Pegá la URL completa del spreadsheet.');
      const sheets = await fetchSheetsList(sheetId, googleKey.trim());
      const find   = name => sheets.find(s => s.title.trim().toUpperCase() === name.toUpperCase()) ?? null;
      const resultados = find('Resultados');
      const data       = find('Data');
      if (!resultados && !data) {
        const names = sheets.map(s => `"${s.title}"`).join(', ');
        throw new Error(`No se encontraron hojas "Resultados" ni "Data". Disponibles: ${names}`);
      }
      setEquipDetected({ resultados, data });
    } catch (err) {
      setEquipDetectError(err.message);
    } finally {
      setEquipDetecting(false);
    }
  }

  // ── Conectar ──────────────────────────────────────────────────────────────

  async function handleConnect() {
    setError(null);
    if (!canConnect) return setError('Completá al menos una sección para continuar.');

    setLoading(true);
    try {
      // ── Validar Salas ────────────────────────────────────────────────────
      if (isRoomsComplete) {
        if (hasGoogleKey && roomsAllSheets) {
          // Auto mode: validar cada hoja de datos seleccionada
          const roomsSpreadId = extractSheetId(roomsSpreadUrl);
          const dataSheetArr  = [...roomsDataGids]
            .map(gid => roomsAllSheets.find(s => s.gid === gid))
            .filter(Boolean);
          const csvs     = await Promise.all(dataSheetArr.map(s => fetchSheetAsCsv(roomsSpreadId, s.gid)));
          const allRooms = csvs.flatMap(csv => parseRawData(parseCsv(csv)));
          if (allRooms.length === 0)
            throw new Error('Las hojas de datos seleccionadas no contienen salas reconocibles. Verificá las hojas marcadas.');
          if (roomsPdGid) {
            const pdCsv     = await fetchSheetAsCsv(roomsSpreadId, roomsPdGid);
            const pressures = parsePD(parseCsv(pdCsv));
            if (pressures.length === 0)
              throw new Error('La hoja PD seleccionada no contiene datos de presión diferencial.');
          }
        } else {
          // Manual mode: validar RawData obligatorio, PD opcional
          const rawCsv = await fetchSheetAsCsv(rawDataSheetId, rawDataGid);
          const rooms  = parseRawData(parseCsv(rawCsv));
          if (rooms.length === 0) {
            const swapped = parsePD(parseCsv(rawCsv));
            throw new Error(swapped.length > 0
              ? 'La URL de "RawData" parece apuntar a la hoja PD. Verificá la URL.'
              : 'La URL de "RawData" no reconoce salas. Verificá que apunte a la pestaña correcta.');
          }
          if (pdSheetId) {
            const pdCsv     = await fetchSheetAsCsv(pdSheetId, pdGid);
            const pressures = parsePD(parseCsv(pdCsv));
            if (pressures.length === 0) {
              const swapped = parseRawData(parseCsv(pdCsv));
              throw new Error(swapped.length > 0
                ? 'La URL de "PD" parece apuntar a una hoja de datos. Verificá la URL.'
                : 'La URL de "PD" no reconoce datos de presión. Verificá que apunte a la pestaña PD.');
            }
          }
        }
      }

      // ── Validar Equipos ──────────────────────────────────────────────────
      if (isEquipComplete) {
        const [dataCsv, resultadosCsv] = await Promise.all([
          fetchSheetAsCsv(equipDataSheetId,    equipDataGid),
          fetchSheetAsCsv(equipResultsSheetId, equipResultsGid),
        ]);
        const { equipment } = parseFlujos(parseCsv(dataCsv), parseCsv(resultadosCsv));
        if (equipment.length === 0) {
          const { equipment: swapped } = parseFlujos(parseCsv(resultadosCsv), parseCsv(dataCsv));
          throw new Error(swapped.length > 0
            ? 'Las URLs de Equipos parecen invertidas: "Data" y "Resultados" están intercambiadas.'
            : 'Las URLs de Equipos no reconocen datos. Verificá las hojas "Data" y "Resultados".');
        }
      }

      // ── Construir config ─────────────────────────────────────────────────
      const config = {
        // Salas
        rawDataSheetId:      isRoomsComplete ? rawDataSheetId : null,
        rawDataGid:          (isRoomsComplete && !hasGoogleKey) ? rawDataGid : null,
        rawDataSheets:       (isRoomsComplete && hasGoogleKey && roomsAllSheets)
          ? [...roomsDataGids].map(gid => roomsAllSheets.find(s => s.gid === gid)).filter(Boolean)
          : null,
        pdSheetId:           (isRoomsComplete && pdGid) ? (hasGoogleKey ? extractSheetId(roomsSpreadUrl) : pdSheetId) : null,
        pdGid:               isRoomsComplete ? pdGid : null,
        // Equipos
        equipResultsSheetId: isEquipComplete ? equipResultsSheetId : null,
        equipResultsGid:     isEquipComplete ? equipResultsGid     : null,
        equipDataSheetId:    isEquipComplete ? equipDataSheetId    : null,
        equipDataGid:        isEquipComplete ? equipDataGid        : null,
        // IA
        anthropicApiKey:     apiKey.trim()  || null,
        anthropicModel:      modelId.trim() || 'claude-sonnet-4-6',
      };

      console.log('[Setup] Config guardada:', config);
      saveGoogleApiKey(googleKey.trim());
      saveConfig(config);
      onConnect(config);
    } catch (err) {
      const isValidation = /URL|hoja|invertida|reconoce|seleccionada/i.test(err.message);
      setError(isValidation
        ? err.message
        : `No se pudo descargar la hoja: ${err.message}. Verificá que el Sheet sea público ("Cualquiera con el enlace puede ver").`
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">

        <h1 className="mb-1 text-2xl font-bold text-white">Ensayos Dashboard</h1>
        <p className="mb-6 text-sm text-slate-400">
          Conectá tus Google Sheets. Podés configurar solo una sección si aún no tenés el otro archivo.
        </p>

        {!hasGoogleKey && (
          <div className="mb-6 rounded-lg border border-slate-600 bg-slate-900 p-4 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Cómo obtener cada URL:</p>
            <p>1. Abrí el Google Sheet y hacé click en la pestaña correcta (ej: "RawData").</p>
            <p>2. Copiá la URL completa de la barra del navegador y pegala acá.</p>
            <p className="text-slate-500">Tip: con una Google API Key podés detectar las hojas automáticamente y seleccionar múltiples hojas de datos.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* ── Google API Key ──────────────────────────────────────────── */}
          <Field
            label="Google API Key"
            placeholder="AIzaSy..."
            type="password"
            value={googleKey}
            onChange={v => {
              setGoogleKey(v);
              setRoomsAllSheets(null); setRoomsDetectError(null);
              setRoomsDataGids(new Set()); setRoomsPdGid(null);
              setEquipDetected(null);   setEquipDetectError(null);
            }}
            optional
            hint={hasGoogleKey
              ? 'Modo automático activo: detectá todas las hojas del spreadsheet y elegí cuáles usar.'
              : 'Permite detectar hojas automáticamente y combinar múltiples hojas de datos en un solo dashboard.'}
          />

          {/* ── Salas ──────────────────────────────────────────────────── */}
          {hasGoogleKey ? (
            <AutoRoomsSection
              spreadUrl={roomsSpreadUrl}
              onSpreadUrlChange={setRoomsSpreadUrl}
              detecting={roomsDetecting}
              detectError={roomsDetectError}
              onDetect={detectRooms}
              allSheets={roomsAllSheets}
              dataGids={roomsDataGids}
              onToggleData={toggleDataGid}
              pdGid={roomsPdGid}
              onSetPd={setRoomsPdGid}
              googleKey={googleKey}
              onReset={() => {
                setRoomsAllSheets(null);
                setRoomsDetectError(null);
                setRoomsDataGids(new Set());
                setRoomsPdGid(null);
              }}
              complete={isRoomsComplete}
            />
          ) : (
            <ManualRoomsSection
              rawDataUrl={rawDataUrl} setRawDataUrl={setRawDataUrl}
              pdUrl={pdUrl}           setPdUrl={setPdUrl}
              complete={isRoomsComplete}
            />
          )}

          {/* ── Equipos ────────────────────────────────────────────────── */}
          {hasGoogleKey ? (
            <AutoEquipSection
              spreadUrl={equipSpreadUrl}
              onSpreadUrlChange={v => { setEquipSpreadUrl(v); setEquipDetected(null); setEquipDetectError(null); }}
              detecting={equipDetecting}
              detected={equipDetected}
              detectError={equipDetectError}
              onDetect={detectEquip}
              onReset={() => { setEquipDetected(null); setEquipDetectError(null); }}
              complete={isEquipComplete}
            />
          ) : (
            <ManualEquipSection
              resultadosUrl={resultadosUrl} setResultadosUrl={setResultadosUrl}
              dataUrl={dataUrl}             setDataUrl={setDataUrl}
              complete={isEquipComplete}
            />
          )}

          {/* ── Anthropic API Key ───────────────────────────────────────── */}
          <Field
            label="Anthropic API Key"
            placeholder="sk-ant-..."
            type="password"
            value={apiKey}
            onChange={setApiKey}
            optional
            hint="Para generar informes ejecutivos con IA. Podés agregarlo después."
          />
          {apiKey.trim() && (
            <Field
              label="Model ID"
              placeholder="claude-sonnet-4-6"
              value={modelId}
              onChange={setModelId}
              hint="ID exacto del modelo disponible en tu cuenta (console.anthropic.com → Models)."
            />
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !canConnect}
          className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Conectando...' : 'Conectar'}
        </button>

        {!canConnect && (
          <p className="mt-2 text-center text-xs text-slate-500">
            {hasGoogleKey
              ? 'Seleccioná al menos una hoja de datos para habilitar el botón.'
              : 'Completá al menos la URL de RawData para habilitar el botón.'}
          </p>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Confirmar conexión</h2>
            <p className="text-sm text-slate-400 mb-6">
              ¿Confirmar carga?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleConnect(); }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
