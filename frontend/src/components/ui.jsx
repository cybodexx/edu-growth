import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { riskStyle } from '../utils/theme';

/* ------------------------------------------------------------------ */
/* Risk badge                                                          */
/* ------------------------------------------------------------------ */
export function RiskBadge({ riskLevel, className = '' }) {
  const s = riskStyle(riskLevel);
  return (
    <span
      className={`inline-block border-2 border-black px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${s.bg} ${s.text} ${className}`}
    >
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */
export function Panel({ children, className = '', dark = false, style }) {
  const border = dark ? 'border-4 border-[#cbd5e1]' : 'border-4 border-black';
  const shadow = dark
    ? 'shadow-[6px_6px_0px_0px_#86efac]'
    : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]';
  return (
    <div className={`${border} ${shadow} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, dark = false, className = '' }) {
  return (
    <h3
      className={`text-2xl md:text-3xl font-black uppercase tracking-wider mb-6 border-b-4 pb-3 inline-block ${
        dark ? 'border-[#475569] text-white' : 'border-black text-black'
      } ${className}`}
    >
      {children}
    </h3>
  );
}

export function MetricCard({ title, value, accent = '#bfdbfe', icon, footnote }) {
  return (
    <div
      className="relative overflow-hidden p-6 text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[9rem]"
      style={{ backgroundColor: accent }}
    >
      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/60 bg-black/10 px-2 py-1 inline-block w-max">
        {title}
      </p>
      <h3 className="text-4xl md:text-5xl font-black tracking-tighter relative z-10 mt-3">{value}</h3>
      {footnote && <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-black/60">{footnote}</p>}
      {icon && <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">{icon}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Async state blocks                                                  */
/* ------------------------------------------------------------------ */
export function LoadingBlock({ label = 'Loading…', dark = false }) {
  return (
    <div
      className={`w-full border-4 border-black p-10 flex flex-col items-center justify-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
        dark ? 'bg-[#1e293b] text-white border-[#cbd5e1]' : 'bg-white text-black'
      }`}
    >
      <Loader2 className="animate-spin" size={40} strokeWidth={3} />
      <p className="font-black uppercase tracking-widest text-sm">{label}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-center max-w-md">
        First mentor call can take ~5s while the engine fits, then it is cached.
      </p>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  const message =
    (error && (error.message || error.detail)) || 'Something went wrong while talking to the API.';
  return (
    <div className="w-full bg-[#fca5a5] border-4 border-black p-6 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={28} strokeWidth={3} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-black uppercase tracking-widest text-lg">Connection Error</p>
          <p className="font-bold text-sm mt-1 break-words">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-black text-white font-black uppercase tracking-widest text-sm px-5 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.6)] hover:-translate-y-1 transition-transform shrink-0"
        >
          <RefreshCw size={18} strokeWidth={3} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ message = 'No data available.', dark = false }) {
  return (
    <div
      className={`w-full p-10 border-4 border-dashed flex flex-col items-center justify-center gap-3 text-center ${
        dark ? 'border-[#475569] text-slate-400' : 'border-black/40 text-zinc-500'
      }`}
    >
      <Inbox size={36} strokeWidth={2.5} />
      <p className="font-black uppercase tracking-widest text-sm">{message}</p>
    </div>
  );
}
