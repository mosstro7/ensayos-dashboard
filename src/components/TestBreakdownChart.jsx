import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function barColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white shadow">
      <p className="font-semibold">{d.name}</p>
      <p>{d.done} / {d.total} completados ({d.pct}%)</p>
    </div>
  );
};

export default function TestBreakdownChart({ data }) {
  const sorted = [...data].sort((a, b) => a.pct - b.pct);

  // Usar index para lookupear el dato directamente — más confiable que
  // depender de que Recharts haga spread del entry en el componente label.
  const renderLabel = ({ x, y, width, index }) => {
    const entry = sorted[index];
    if (!entry) return null;
    return (
      <text
        x={x + width + 8}
        y={y + 10}
        fill="#94a3b8"
        fontSize={11}
        dominantBaseline="middle"
      >
        {entry.done}/{entry.total} ({entry.pct}%)
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={sorted.length * 40 + 20}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 130, bottom: 0, left: 0 }}
        barSize={16}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
        <Bar dataKey="pct" radius={4} label={renderLabel}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
