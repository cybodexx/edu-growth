// src/components/Card.jsx
// Yeh file chhote UI components (Bricks) store karti hai jo poore app mein use honge.

// ==========================================
// 1. GRID COMPONENT (Dabbo ka layout)
// ==========================================
// Yeh sabhi cards ko ek grid (rows aur columns) mein arrange karta hai.
export function Grid({ children }) {
  // Mobile par 1 column, tablets (sm) par 2, aur badi screen (lg) par 4 columns.
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

// ==========================================
// 2. CARD COMPONENT (Main container)
// ==========================================
// Yeh dashboard ka main dark box hai jiske andar data dikhega.
const SPAN = {
  1: '', // Normal size card (1 column)
  2: 'sm:col-span-2', // Double size card (2 columns width)
  4: 'sm:col-span-2 lg:col-span-4', // Full width card
};

export function Card({ title, action, span = 1, flush = false, children }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-800 bg-slate-900 ${SPAN[span]}`}>
      {/* Agar Card ka title pass kiya gaya hai, toh yeh header dikhega */}
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h2>
          {action}
        </header>
      )}
      {/* flush ka matlab hai andar ki padding hatana (graphs ke liye use hota hai) */}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

// ==========================================
// 3. STAT COMPONENT (Bade Numbers dikhane ke liye)
// ==========================================
// Yeh dictionary decide karti hai ki number ka color kya hoga.
const TEXT = {
  neutral: 'text-slate-100', // White
  safe: 'text-emerald-400',  // Green (Acha performance)
  review: 'text-amber-400',  // Yellow (Warning)
  risk: 'text-rose-400',     // Red (Danger)
};

export function Stat({ value, sub, tone = 'neutral' }) {
  return (
    <div>
      {/* Main value (e.g., 85%) */}
      <p className={`text-2xl font-semibold tabular-nums tracking-tight ${TEXT[tone]}`}>{value}</p>
      {/* Subtext (e.g., "Attendance") */}
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ==========================================
// 4. BADGE COMPONENT (Chote colored tags)
// ==========================================
// Yeh status dikhane wale chote pill-shaped tags hain (jaise "At Risk", "Safe")
const BADGE = {
  neutral: 'bg-slate-800 text-slate-300',
  safe: 'bg-emerald-500/10 text-emerald-400',
  review: 'bg-amber-500/10 text-amber-400',
  risk: 'bg-rose-500/10 text-rose-400',
};

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

// ==========================================
// 5. BAR COMPONENT (Progress Line)
// ==========================================
const FILL = {
  neutral: 'bg-slate-400',
  safe: 'bg-emerald-500',
  review: 'bg-amber-500',
  risk: 'bg-rose-500',
};

export function Bar({ value, tone = 'neutral' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      {/* Style width use karke progress bar ko bharta hai (0 se 100% ke beech) */}
      <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ==========================================
// 6. HELPER FUNCTION (Logic for Colors)
// ==========================================
// Yeh ek chota sa function hai jo marks ke hisaab se automatic color (tone) decide karta hai.
export const scoreTone = (v) => {
  if (v == null) return 'neutral';
  if (v >= 70) return 'safe';     // 70+ marks = Green
  if (v >= 50) return 'review';   // 50-69 marks = Yellow
  return 'risk';                  // <50 marks = Red
};