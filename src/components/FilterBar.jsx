const GMP_CLASSES = ['Todos', 'GMP A', 'GMP B', 'GMP C', 'GMP D'];

const STATUS_OPTIONS = [
  { value: 'todos',         label: 'Todos' },
  { value: 'completos',     label: 'Completos' },
  { value: 'pendientes',    label: 'Con pendientes' },
  { value: 'no-conforme',   label: 'Con NO CONFORME' },
];

export const DEFAULT_FILTERS = {
  search:            '',
  gmpClass:          'Todos',
  status:            'todos',
  onlyNonConforming: false,
};

// Filtra un array de salas según los filtros activos
export function applyRoomFilters(rooms, filters) {
  const q = filters.search.toLowerCase().trim();
  return rooms.filter(r => {
    if (q && !r.id.toLowerCase().includes(q) && !r.fullName.toLowerCase().includes(q)) return false;
    if (filters.gmpClass !== 'Todos' && r.gmpClass !== filters.gmpClass) return false;
    if (filters.status === 'completos'  && r.completionPct < 100) return false;
    if (filters.status === 'pendientes' && r.completionPct === 100) return false;
    if (filters.status === 'no-conforme') {
      const hasNc = Object.values(r.tests).some(t => t.result === 'NO CONFORME');
      const pdNc  = false; // pressures no disponible en este scope; se filtra vía result
      if (!hasNc && !pdNc) return false;
    }
    return true;
  });
}

// Filtra un array de equipos según los filtros activos
export function applyEquipmentFilters(equipment, filters) {
  const q = filters.search.toLowerCase().trim();
  return equipment.filter(eq => {
    if (q && !eq.id.toLowerCase().includes(q) && !(eq.location || '').toLowerCase().includes(q)) return false;
    if (filters.status === 'completos'  && eq.completionPct < 100) return false;
    if (filters.status === 'pendientes' && eq.completionPct === 100) return false;
    if (filters.status === 'no-conforme' || filters.onlyNonConforming) {
      const hasNc = Object.values(eq.tests).some(
        t => t.done && typeof t.result === 'string' && t.result.trim().toUpperCase() === 'NO CONFORME'
      );
      if (!hasNc) return false;
    }
    return true;
  });
}

export default function FilterBar({ type, filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Búsqueda */}
      <input
        type="text"
        value={filters.search}
        onChange={e => set('search', e.target.value)}
        placeholder={type === 'room' ? 'Buscar sala…' : 'Buscar equipo…'}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none w-48"
      />

      {/* Clase GMP (solo salas) */}
      {type === 'room' && (
        <select
          value={filters.gmpClass}
          onChange={e => set('gmpClass', e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
        >
          {GMP_CLASSES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {/* Estado */}
      <select
        value={filters.status}
        onChange={e => set('status', e.target.value)}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
      >
        {STATUS_OPTIONS
          .filter(() => true)
          .map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
      </select>

      {/* Solo NO CONFORME (solo equipos) */}
      {type === 'equipment' && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.onlyNonConforming}
            onChange={e => set('onlyNonConforming', e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-red-500"
          />
          <span className="text-sm text-slate-300">Solo NO CONFORME</span>
        </label>
      )}

      {/* Reset */}
      {(filters.search || filters.gmpClass !== 'Todos' || filters.status !== 'todos' || filters.onlyNonConforming) && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs text-slate-400 hover:text-white transition underline underline-offset-2"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
