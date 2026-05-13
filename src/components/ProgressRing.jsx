import { PieChart, Pie, Cell } from 'recharts';

function ringColor(pct) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

export default function ProgressRing({ pct, label }) {
  const color = ringColor(pct);
  const data = [{ value: pct }, { value: 100 - pct }];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            cx={55}
            cy={55}
            innerRadius={38}
            outerRadius={52}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="#1e293b" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
