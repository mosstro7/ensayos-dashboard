import { getSnapshot, computeDelta, todayStr } from './snapshot.js';
import { calcCompletionPct, DEFAULT_SETTINGS } from './completionPct.js';

const SETTINGS_KEY = 'testSettings_v1';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${months[m - 1]} de ${y}`;
}

export async function generateReport(rooms, equipment, apiKey, options = {}) {
  const reportDate = options.date || todayStr();
  const compareDate = options.compareDate || null;

  const settings = loadSettings();
  const snapshot = getSnapshot(compareDate);
  const delta = computeDelta(rooms, equipment, snapshot, settings);

  const globalPct = rooms.length > 0
    ? Math.round(rooms.reduce((s, r) => s + calcCompletionPct(r, settings), 0) / rooms.length)
    : 0;

  // Contexto de configuración: qué ensayos están desactivados y qué salas
  // tienen recuperación excluida individualmente. Claude lo usa para no
  // tratar como "pendiente" algo que no es requerido por protocolo.
  const ensayosDesactivados = [
    settings.integridad === 'none'           && 'Integridad (todas las salas)',
    settings.integridad === 'exclude-d'      && 'Integridad (excluida en salas Grado D/ISO8)',
    settings.renovaciones === false          && 'Ren. Horarias',
    settings.temperatura  === false          && 'Temperatura',
    settings.humedad      === false          && 'Humedad',
    settings.luz          === false          && 'Luz',
    settings.ruido        === false          && 'Ruido',
    settings.pd           === false          && 'Presión Diferencial',
    settings.recuperacion === false          && 'Recuperación (todas las salas)',
  ].filter(Boolean);

  const salasRecuperacionExcluida = settings.recuperacion !== false
    ? Object.entries(settings.recuperacionSalas || {})
        .filter(([, v]) => v === false)
        .map(([id]) => {
          const room = rooms.find(r => r.id === id);
          return room ? `${id} ${room.fullName.replace(id, '').trim()}` : id;
        })
    : [];

  const reportData = {
    fecha: formatDate(reportDate),
    tieneComparacion: snapshot !== null,
    configuracionEnsayos: {
      ensayosDesactivadosGlobalmente: ensayosDesactivados,
      salasRecuperacionNoRequerida: salasRecuperacionExcluida,
    },
    ensayosEjecutadosHoy: delta.newlyDone,
    nuevosNoConformes: delta.newlyNonConforme,
    pendientes: delta.pendingRooms.slice(0, 10),
    noConformeActual: {
      salas: delta.nonConformeRooms,
      equipos: delta.nonConformeEquipment,
    },
  };

  const sinComparacion = !snapshot
    ? '\nNOTA: No hay snapshot del día anterior disponible, por lo que no es posible determinar qué ensayos se ejecutaron específicamente hoy. El reporte mostrará el estado acumulado actual.'
    : '';

  const prompt = `Sos un especialista en calificación de instalaciones farmacéuticas.
Generá un informe de avance de ensayos en español, compacto y directo.${sinComparacion}

IMPORTANTE — configuración del protocolo:
- Los ensayos listados en "ensayosDesactivadosGlobalmente" NO son requeridos por protocolo y NO deben aparecer como pendientes.
- Las salas listadas en "salasRecuperacionNoRequerida" NO requieren el ensayo de Recuperación de clase. No las menciones como pendientes de ese ensayo.
- Los datos de "pendientes" ya tienen esto aplicado: usalos tal cual, sin agregar ni quitar ensayos.

El informe debe tener exactamente esta estructura:

Informe de Avance de Calificación — [fecha del JSON]

Se realizaron los siguientes ensayos: [listar tipos de ensayo ejecutados hoy, separados por coma]

En las salas: [listar ID y nombre de cada sala donde se ejecutaron ensayos hoy, una por línea]

No Conformidades: [listar como "Ensayo — Sala ID Nombre". Si no hay, escribir "Sin no conformidades registradas en la jornada."]

Pendientes: [listar como "Sala ID Nombre: ensayo1, ensayo2". Solo las salas con pendientes.]

No agregues introducción, párrafos explicativos, ni texto fuera de esta estructura.
Usá los IDs y nombres reales del JSON.

Datos del proyecto:
${JSON.stringify(reportData, null, 2)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return { text: data.content[0].text, date: reportDate, globalPct };
}
