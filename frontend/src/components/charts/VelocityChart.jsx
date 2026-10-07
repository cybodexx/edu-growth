import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { UnitPerformance, studentMockData } from '../../utils/mockData';

interface VelocityChartProps {
  data?: UnitPerformance[];
  className?: string;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({
  data = studentMockData.units,
  className = '',
}) => {
  const chartData = data.map((item, idx) => ({
    ...item,
    shortUnit: `U${idx + 1}`,
    fullName: item.unit,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const isPositive = point.velocity >= 0;
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-none shadow-2xl text-xs font-mono">
          <div className="text-slate-400 font-sans font-semibold tracking-wider uppercase mb-1.5 text-[11px]">
            {point.fullName}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
            <div>ST1 Score: <span className="text-slate-100 font-semibold">{point.st1}%</span></div>
            <div>ST2 Score: <span className="text-slate-100 font-semibold">{point.st2}%</span></div>
            <div>PUT Score: <span className="text-slate-100 font-semibold">{point.put}%</span></div>
            <div>Cohort Benchmark: <span className="text-slate-400 font-semibold">{point.benchmark}%</span></div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Unit Velocity Δ:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded-none text-[11px] ${
                isPositive
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/60 border border-rose-800/40'
              }`}
            >
              {isPositive ? `+${point.velocity}%` : `${point.velocity}%`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* Top micro metric bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500 inline-block" />
            <span className="text-slate-300">PUT Score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
            <span className="text-slate-400">Cohort Benchmark (70%)</span>
          </div>
        </div>
        <div className="text-slate-400">
          Peak Delta: <span className="text-emerald-400 font-semibold">+21% (Unit 4)</span>
        </div>
      </div>

      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="putGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="shortUnit"
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              domain={[40, 100]}
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              ticks={[40, 60, 80, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
            <ReferenceLine y={70} stroke="#475569" strokeDasharray="3 3" />
            
            <Area
              type="monotone"
              dataKey="put"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#putGradient)"
              activeDot={{ r: 4, fill: '#10b981', stroke: '#020617', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Industrial Unit Stepper footer */}
      <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono">
        {chartData.map((u, i) => (
          <div key={i} className="bg-slate-950 p-2 border border-slate-800/80">
            <div className="text-slate-500 font-sans text-[10px] uppercase truncate">{u.shortUnit}</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-slate-200 font-bold">{u.put}%</span>
              <span
                className={`text-[10px] ${
                  u.velocity > 0
                    ? 'text-emerald-400'
                    : u.velocity < 0
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {u.velocity > 0 ? `+${u.velocity}` : u.velocity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
