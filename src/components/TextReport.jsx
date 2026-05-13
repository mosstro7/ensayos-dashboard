import { useState } from 'react';
import { generateReport } from '../utils/report.js';

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Generando informe…
    </div>
  );
}

export function TextReport({ rooms, equipment, apiKey }) {
  const [report,      setReport]      = useState(null);   // { text, date, globalPct }
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [copied,      setCopied]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cliente,     setCliente]     = useState('');
  const [proyecto,    setProyecto]    = useState('');

  async function handleGenerate() {
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const result = await generateReport(rooms, equipment, apiKey);
      setReport(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(report.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPdf() {
    const html2pdf = (await import('html2pdf.js')).default;

    const fechaDisplay = report.date.split('-').reverse().join('/');
    const generadoEl   = new Date().toLocaleString('es-AR');
    const bodyText     = report.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.7;color:#1a1a1a;background:#fff;">
        <div style="border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:22px;">
          <h1 style="font-size:15pt;font-weight:bold;margin:0 0 6px 0;">Informe de Avance de Calificación</h1>
          <p style="margin:0;font-size:10pt;color:#444;">${fechaDisplay}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:10.5pt;">
          <tr>
            <td style="width:75px;color:#555;padding-bottom:8px;vertical-align:top;">Cliente:</td>
            <td style="border-bottom:1px solid #ccc;padding-bottom:4px;">${cliente || '&nbsp;'}</td>
          </tr>
          <tr>
            <td style="color:#555;padding-top:8px;vertical-align:top;">Proyecto:</td>
            <td style="border-bottom:1px solid #ccc;padding-top:8px;padding-bottom:4px;">${proyecto || '&nbsp;'}</td>
          </tr>
        </table>
        <div style="white-space:pre-wrap;">${bodyText}</div>
        <div style="border-top:1px solid #bbb;margin-top:32px;padding-top:10px;font-size:9pt;color:#777;">
          Generado el ${generadoEl}. Documento de uso interno sujeto a revisión.
        </div>
      </div>`;

    html2pdf().set({
      margin: [20, 20, 20, 20],
      filename: `Informe_Calificacion_${report.date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(html).save();
  }

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-8 text-center">
        <p className="text-slate-400 text-sm">
          Para generar informes ejecutivos con IA, configurá tu{' '}
          <strong className="text-slate-200">Anthropic API Key</strong> en la pantalla de configuración.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Informe ejecutivo</h3>
          <p className="text-xs text-slate-400">Generado por IA a partir del estado actual del proyecto.</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Generando…' : report ? 'Regenerar' : 'Generar informe'}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-8 flex justify-center">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {report && !loading && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          {/* Botones de acción */}
          <div className="flex justify-end gap-4 mb-3">
            <button
              onClick={handleDownloadPdf}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar PDF
            </button>
            <button
              onClick={handleCopy}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              {copied ? '✓ Copiado' : '⎘ Copiar texto'}
            </button>
          </div>

          {/* Vista en UI — tema oscuro */}
          <div className="text-sm text-slate-200 leading-relaxed">
            <div className="flex flex-col gap-1.5 mb-4 pb-3 border-b border-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-16 flex-shrink-0">Cliente:</span>
                <input
                  type="text"
                  value={cliente}
                  onChange={e => setCliente(e.target.value)}
                  placeholder="—"
                  className="bg-transparent border-b border-slate-600 focus:border-slate-400 outline-none flex-1 text-slate-200 placeholder-slate-600 pb-0.5"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-16 flex-shrink-0">Proyecto:</span>
                <input
                  type="text"
                  value={proyecto}
                  onChange={e => setProyecto(e.target.value)}
                  placeholder="—"
                  className="bg-transparent border-b border-slate-600 focus:border-slate-400 outline-none flex-1 text-slate-200 placeholder-slate-600 pb-0.5"
                />
              </div>
            </div>
            <div className="whitespace-pre-wrap">{report.text}</div>
          </div>
        </div>
      )}


      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Generar informe diario</h2>
            <p className="text-sm text-slate-400 mb-6">
              Se consumirá crédito de la API de Anthropic para generar el informe. ¿Querés continuar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleGenerate(); }}
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
