import { getSnapshot, computeDelta, todayStr } from './snapshot.js';

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${months[m - 1]} de ${y}`;
}

export async function generateReport(rooms, equipment, apiKey, options = {}) {
  const reportDate = options.date || todayStr();
  const compareDate = options.compareDate || null;

  const snapshot = getSnapshot(compareDate);
  const delta = computeDelta(rooms, equipment, snapshot);

  const totalTests = rooms.reduce((acc, r) => acc + Object.keys(r.tests || {}).length, 0);
  const doneTests = rooms.reduce((acc, r) =>
    acc + Object.values(r.tests || {}).filter(t => t.done).length, 0);
  const globalPct = totalTests > 0 ? Math.round((doneTests / totalTests) * 100) : 0;

  const reportData = {
    fecha: formatDate(reportDate),
    tieneComparacion: snapshot !== null,
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
