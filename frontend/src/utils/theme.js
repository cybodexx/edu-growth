/* Shared, non-component UI helpers (kept out of ui.jsx so React Fast Refresh
 * only sees component exports there). */

export function theme(isDarkMode) {
  return {
    isDarkMode,
    bgMain: isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]',
    textMain: isDarkMode ? 'text-white' : 'text-black',
    bgCard: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
    borderTheme: isDarkMode ? 'border-4 border-[#cbd5e1]' : 'border-4 border-black',
    shadowTheme: isDarkMode
      ? 'shadow-[6px_6px_0px_0px_#86efac]'
      : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
    subtle: isDarkMode ? 'text-slate-400' : 'text-zinc-500',
    divider: isDarkMode ? 'border-[#475569]' : 'border-black',
    watermark: isDarkMode
      ? 'radial-gradient(rgba(255,255,255,0.06) 2px, transparent 2px)'
      : 'radial-gradient(rgba(0,0,0,0.04) 2px, transparent 2px)',
  };
}

const RISK_STYLES = {
  'need help': { bg: 'bg-[#fca5a5]', text: 'text-black', label: 'Need Help' },
  'fell down': { bg: 'bg-[#fdba74]', text: 'text-black', label: 'Fell Down' },
  normal: { bg: 'bg-[#bfdbfe]', text: 'text-black', label: 'Normal' },
  topper: { bg: 'bg-[#a7f3d0]', text: 'text-black', label: 'Topper' },
};

export function riskStyle(riskLevel) {
  const key = String(riskLevel || '').toLowerCase().trim();
  return RISK_STYLES[key] || { bg: 'bg-[#e9d5ff]', text: 'text-black', label: riskLevel || 'Unknown' };
}

export function statusColor(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'weak' || key === 'critical') return '#fca5a5';
  if (key === 'ok' || key === 'warning') return '#fef08a';
  if (key === 'good') return '#a7f3d0';
  return '#bfdbfe';
}

export function fmt(value, digits = 1, fallback = '—') {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(digits);
}
