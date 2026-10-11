import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { riskStyle } from '../utils/theme';

/* ------------------------------------------------------------------ */
/* Risk badge                                                          */
/* ------------------------------------------------------------------ */
export function RiskBadge({ riskLevel, className = '' }) {
  const s = riskStyle(riskLevel);
  return (
    <span
      className={`inline-block border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] ${s.bg} ${s.text} ${className}`}
    >
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */
export function Panel({ children, className = '', dark = false, style }) {
  const border = dark ? 'border-4 border-[#94a3b8]' : 'border-4 border-black';
  const shadow = dark
    ? 'shadow-[4px_4px_0px_0px_#86efac]'
    : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]';
  return (
    <div className={`${border} ${shadow} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, dark = false, className = '' }) {
  return (
    <h3
      className={`text-xl md:text-2xl font-black uppercase tracking-wider mb-5 border-b-4 pb-2.5 inline-block ${
        dark ? 'border-[#475569] text-white' : 'border-black text-black'
      } ${className}`}
    >
      {children}
    </h3>
  );
}

export function MetricCard({ title, value, accent = '#bfdbfe', icon, footnote, className = '', titleClassName = '', valueClassName = '' }) {
  return (
    <div
      className={`relative overflow-hidden p-5 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[8rem] ${className}`}
      style={{ backgroundColor: accent }}
    >
      <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black/70 bg-black/10 px-2 py-1 inline-block w-max ${titleClassName}`}>
        {title}
      </p>
      <h3 className={`text-3xl md:text-4xl font-black tracking-tighter relative z-10 mt-2 ${valueClassName}`}>{value}</h3>
      {footnote && <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-black/60">{footnote}</p>}
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
      className={`w-full border-4 border-black p-8 flex flex-col items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        dark ? 'bg-[#1e293b] text-white border-[#94a3b8]' : 'bg-white text-black'
      }`}
    >
      <Loader2 className="animate-spin" size={36} strokeWidth={3} />
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
    <div className="w-full bg-[#fca5a5] border-4 border-black p-5 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={24} strokeWidth={3} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-black uppercase tracking-widest text-base">Connection Error</p>
          <p className="font-bold text-sm mt-1 break-words">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-black text-white font-black uppercase tracking-widest text-xs px-4 py-2.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 transition-transform shrink-0"
        >
          <RefreshCw size={15} strokeWidth={3} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ message = 'No data available.', dark = false }) {
  return (
    <div
      className={`w-full p-8 border-4 border-dashed flex flex-col items-center justify-center gap-3 text-center ${
        dark ? 'border-[#475569] text-slate-400' : 'border-black/30 text-zinc-500'
      }`}
    >
      <Inbox size={30} strokeWidth={2.5} />
      <p className="font-black uppercase tracking-widest text-xs">{message}</p>
    </div>
  );
}