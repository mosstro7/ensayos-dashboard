import { useState } from 'react';
import { extractSheetId, extractGid } from '../utils/googleSheets.js';
import {
  getProjectsByClient,
  getActiveProject,
  createProject,
  activateProject,
  deleteProject,
} from '../utils/projects.js';

function Field({ label, hint, value, onChange, type = 'text', placeholder, optional, list }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 block">
        {label}
        {optional && <span className="ml-1 text-slate-500">(opcional)</span>}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list={list}
        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2
                   text-sm text-white placeholder-slate-500 focus:outline-none
                   focus:border-blue-500"
        autoComplete="off"
      />
    </div>
  );
}

function parseSheetUrl(url) {
  if (!url) return { sheetId: null, gid: '0' };
  return {
    sheetId: extractSheetId(url),
    gid: extractGid(url) || '0',
  };
}

export default function Setup({ onConnect }) {
  const [view, setView] = useState(() =>
    getActiveProject() ? 'list' : 'form'
  );

  const [projectsByClient, setProjectsByClient] = useState(getProjectsByClient);
  const [form, setForm] = useState({
    client: '', execution: '',
    rawDataUrl: '', pdUrl: '',
    flujosDataUrl: '', flujosResultsUrl: '',
    anthropicKey: localStorage.getItem('ensayos_anthropic_key') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedClients, setExpandedClients] = useState(() => {
    const active = getActiveProject();
    return active ? new Set([active.client]) : new Set();
  });

  function refreshList() {
    setProjectsByClient(getProjectsByClient());
  }

  function toggleClient(client) {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(client)) next.delete(client);
      else next.add(client);
      return next;
    });
  }

  function set(field) {
    return value => {
      setForm(f => ({ ...f, [field]: value }));
      setError(null);
    };
  }

  function handleCreate() {
    if (!form.client.trim() || !form.execution.trim()) {
      setError('Cliente y Ejecución son obligatorios.');
      return;
    }
    if (!form.rawDataUrl && !form.flujosDataUrl) {
      setError('Ingresá al menos una fuente de datos.');
      return;
    }

    // Detectar duplicados por sheetId
    const enteredIds = new Set([
      parseSheetUrl(form.rawDataUrl).sheetId,
      parseSheetUrl(form.flujosDataUrl).sheetId,
      parseSheetUrl(form.flujosResultsUrl).sheetId,
    ].filter(Boolean));

    if (enteredIds.size > 0) {
      const allProjects = Object.values(getProjectsByClient()).flat();
      for (const project of allProjects) {
        const c = project.config || {};
        const storedIds = [
          c.rawDataSheetId,
          c.equipDataSheetId,
          c.equipResultsSheetId,
        ].filter(Boolean);
        if (storedIds.some(id => enteredIds.has(id))) {
          setError(
            `Las URLs ingresadas ya están siendo usadas por el proyecto '${project.execution}' del cliente '${project.client}'. ` +
            `Si querés trabajar con ese proyecto, seleccionalo desde el listado.`
          );
          return;
        }
      }
    }

    setError(null);
    setShowConfirmModal(true);
  }

  async function confirmCreate() {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      const rawData      = parseSheetUrl(form.rawDataUrl);
      const pd           = parseSheetUrl(form.pdUrl);
      const flujosData   = parseSheetUrl(form.flujosDataUrl);
      const flujosResult = parseSheetUrl(form.flujosResultsUrl);

      const config = {
        rawDataSheetId:      rawData.sheetId,
        rawDataGid:          rawData.gid,
        pdSheetId:           pd.sheetId,
        pdGid:               pd.sheetId ? pd.gid : null,
        equipResultsSheetId: flujosResult.sheetId,
        equipResultsGid:     flujosResult.gid,
        equipDataSheetId:    flujosData.sheetId,
        equipDataGid:        flujosData.gid,
        anthropicApiKey:     form.anthropicKey.trim() || null,
        anthropicModel:      'claude-sonnet-4-6',
      };

      if (form.anthropicKey.trim()) {
        localStorage.setItem('ensayos_anthropic_key', form.anthropicKey.trim());
      }

      const project = createProject({
        client: form.client,
        execution: form.execution,
        config,
      });

      onConnect(project.config);
    } catch (e) {
      setError(`Error al guardar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleActivate(id) {
    const project = activateProject(id);
    if (project) onConnect(project.config);
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este proyecto del historial?')) return;
    deleteProject(id);
    refreshList();
    if (Object.keys(getProjectsByClient()).length === 0) setView('form');
  }

  // ── VISTA LISTA ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center px-4 py-12">
        <div className="w-full max-w-[560px] h-fit space-y-8">

          {/* Encabezado */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg">
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard de Ensayos</h1>
              <p className="text-sm text-slate-400 mt-1">Seleccioná un proyecto para continuar</p>
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="space-y-3">
            {Object.entries(projectsByClient).sort(([a], [b]) => a.localeCompare(b, 'es')).map(([client, projects]) => (
              <div key={client} className="rounded-xl border border-slate-700/60 overflow-hidden">

                {/* Encabezado de cliente */}
                <button
                  onClick={() => toggleClient(client)}
                  className="w-full flex items-center justify-between px-4 py-2.5
                             bg-slate-800/70 hover:bg-slate-800 transition-colors group/header"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                      {client}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-700/60
                                     px-1.5 py-0.5 rounded-full">
                      {projects.length}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-500 group-hover/header:text-slate-300
                                transition-all duration-200
                                ${expandedClients.has(client) ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Tarjetas de ejecución */}
                {expandedClients.has(client) && (
                  <div className="divide-y divide-slate-700/40">
                    {projects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleActivate(p.id)}
                        className="flex items-center justify-between bg-slate-900
                                   hover:bg-slate-800/80 px-4 py-3.5
                                   cursor-pointer transition-all duration-150
                                   shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]
                                   hover:shadow-[inset_0_1px_0_0_rgba(59,130,246,0.08)]
                                   group"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-100
                                        group-hover:text-white transition-colors">
                            {p.execution}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Último acceso:{' '}
                            {new Date(p.lastUsedAt).toLocaleString('es-AR', {
                              day: 'numeric', month: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={e => handleDelete(p.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600
                                       hover:text-red-400 transition-all text-xs px-2 py-1 rounded"
                          >
                            Eliminar
                          </button>
                          <svg
                            className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botón nuevo proyecto — outlined para no competir con las tarjetas */}
          <button
            onClick={() => setView('form')}
            className="w-full py-2.5 rounded-xl border border-slate-600 text-slate-400
                       hover:border-blue-500/60 hover:text-blue-400
                       text-sm font-medium transition-colors"
          >
            + Nuevo proyecto
          </button>
        </div>
      </div>
    );
  }

  // ── VISTA FORMULARIO ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">

        <div className="flex items-center gap-3">
          {Object.keys(projectsByClient).length > 0 && (
            <button
              onClick={() => setView('list')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-semibold text-white">Nuevo proyecto</h1>
        </div>

        {/* Identificación */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Identificación
          </p>
          <datalist id="client-suggestions">
            {Object.keys(projectsByClient).sort().map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Cliente *"
              placeholder="Ej: Laboratorio Bagó"
              value={form.client}
              onChange={set('client')}
              list="client-suggestions"
            />
            <Field
              label="Ejecución *"
              placeholder="Ej: Calificación HVAC Q1"
              value={form.execution}
              onChange={set('execution')}
            />
          </div>
        </div>

        {/* Salas / Áreas */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Salas / Áreas
          </p>
          <Field
            label="URL hoja RawData *"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
            value={form.rawDataUrl}
            onChange={set('rawDataUrl')}
            hint="Abrí la pestaña 'RawData' y copiá la URL completa"
          />
          <Field
            label="URL hoja PD"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
            value={form.pdUrl}
            onChange={set('pdUrl')}
            optional
            hint="Abrí la pestaña 'PD' y copiá la URL completa"
          />
        </div>

        {/* Equipos LAF */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Equipos LAF
          </p>
          <Field
            label="URL hoja Data"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
            value={form.flujosDataUrl}
            onChange={set('flujosDataUrl')}
            hint="Abrí la pestaña 'Data' y copiá la URL completa"
          />
          <Field
            label="URL hoja Resultados"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=…"
            value={form.flujosResultsUrl}
            onChange={set('flujosResultsUrl')}
            hint="Abrí la pestaña 'Resultados' y copiá la URL completa"
          />
        </div>

        {/* Opcional */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Opcional
          </p>
          <Field
            label="API Key Anthropic"
            type="password"
            placeholder="sk-ant-..."
            value={form.anthropicKey}
            onChange={set('anthropicKey')}
            hint="Para generar informes ejecutivos con IA."
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-700
                        rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600
                     disabled:cursor-not-allowed text-white rounded font-medium
                     transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar y conectar'}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Confirmar conexión</h2>
            <p className="text-sm text-slate-400 mb-6">
              ¿Confirmar conexión con los datos ingresados? Se cargarán los sheets configurados.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCreate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
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
