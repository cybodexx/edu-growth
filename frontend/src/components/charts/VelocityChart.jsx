// src/components/charts/VelocityChart.jsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { unitDeltas } from '../../utils/mockData.js';

// 1. COLORS: Trend ke hisaab se line ka color decide karne ke liye
const UP_COLOR = '#34d399'; // Green (Jab marks badh rahe ho)
const DOWN_COLOR = '#fb7185'; // Red (Jab marks gir rahe ho)

// 2. CUSTOM TOOLTIP: Jab user graph par hover karega toh yeh chota dabba dikhega
function ChartTooltip({ active, payload, label }) {
  // Agar hover nahi kiya hai, ya data nahi hai, toh kuch mat dikhao
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200">
      {label}: {payload[0].value}%
    </div>
  );
}

// 3. MAIN CHART COMPONENT
export default function VelocityChart({ unitScores, threshold = 40 }) {
  // Data format change kar rahe hain taaki Recharts usko samajh sake
  // Example: [85, 90] list ban jayegi [{ unit: 'Unit 1', score: 85 }, { unit: 'Unit 2', score: 90 }]
  const chartData = unitScores.map((score, index) => {
    return { unit: `Unit ${index + 1}`, score: score };
  });

  // Trend Logic: Pata lagana ki overall graph upar ja raha hai ya neeche
  const knownScores = unitScores.filter(score => score != null);
  const firstScore = knownScores[0];
  const lastScore = knownScores[knownScores.length - 1];
  
  // Agar aakhri score pehle score se zyada ya barabar hai, toh trend UP hai
  const isTrendUp = lastScore >= firstScore;
  const lineColor = isTrendUp ? UP_COLOR : DOWN_COLOR;

  // Deltas: Do units ke beech ka difference (e.g., Unit 1 se Unit 2 mein kitne marks badhe/ghate)
  const deltas = unitDeltas(unitScores);

  return (
    <div>
      {/* 4. THE LINE CHART */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
            {/* XAxis: Neeche wale labels (Unit 1, Unit 2) */}
            <XAxis dataKey="unit" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            
            {/* YAxis: Hide kar diya hai minimal look ke liye, par range 0-100 set ki hai */}
            <YAxis hide domain={[0, 100]} />
            
            {/* ReferenceLine: Ek dashed line jo passing marks (threshold) dikhati hai */}
            <ReferenceLine y={threshold} stroke="#334155" strokeDasharray="3 3" />
            
            {/* Tooltip component jo humne upar banaya tha */}
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1e293b' }} />
            
            {/* Line: Actual graph ki line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 5. DELTAS GRID: Chart ke neeche marks ka difference dikhane wala section */}
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-800 pt-3">
        {deltas.map((difference, index) => (
          <div key={index}>
            <p className="text-[11px] text-slate-500">U{index + 1} → U{index + 2}</p>
            {/* Agar difference positive hai toh Green color, negative hai toh Red color */}
            <p className={`text-sm font-medium tabular-nums ${difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {difference > 0 ? '+' : ''}{difference} pts
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}