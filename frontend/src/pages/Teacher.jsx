import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, LayoutDashboard, Search, FileSignature, Users, LogOut, Sun, Moon,
  Settings, Edit3, AlertCircle, TrendingUp, CalendarCheck, ShieldAlert,
  UserPlus, BookOpen, CheckCircle2, Loader2, RefreshCw,
  Wifi, WifiOff, Trash2, Download, FileText, Target, Menu,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

import {
  listStudents, updateStudent, createStudent, deleteStudent, getMentorReport,
  normalizeStudentPage,
} from '../api/client';
import { buildDossier, weakAreas } from '../api/analysis';
import { useAsync } from '../hooks/useAsync';
import {
  Panel, MetricCard, RiskBadge, LoadingBlock, ErrorBlock, EmptyBlock, SectionTitle,
} from '../components/ui';
import { theme, statusColor, fmt } from '../utils/theme';

const hideScrollbar =
  '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

const SUBJECTS = [
  { key: 'coa', label: 'COA' },
  { key: 'maths4', label: 'Maths-4' },
  { key: 'dstl', label: 'DSTL' },
  { key: 'ds', label: 'DS' },
  { key: 'python', label: 'Python' },
  { key: 'cyber', label: 'Cyber Security' },
];

/* Class dropdown is restricted to these official sections (strictly
 * capitalized). They map onto the raw class_section values seen in the
 * roster so filtering keeps working. */
const SECTION_OPTIONS = [
  { label: 'CSE-AI/ML', sections: ['CS-AI'] },
  { label: 'CSE-DS', sections: ['CS-DS'] },
  { label: 'IT-A', sections: ['IT-A'] },
  { label: 'IT-B', sections: ['IT-B'] },
];
const matchesSection = (option, value) =>
  !!value && option.sections.some((s) => s.toLowerCase() === String(value).trim().toLowerCase());

/* Vibrant Neo-Brutalist fills */
const BUCKET_LABELS = ['<60% · Critical', '60–75% · Warning', '75–85% · OK', '85%+ · Safe'];
/* Risk-bucket bar colors — matches the label chips below the chart. */
const BUCKET_COLORS = ['#fca5a5', '#fde047', '#bfdbfe', '#a7f3d0'];
const PIE_COLORS = ['#a7f3d0', '#fde047', '#fca5a5', '#93c5fd', '#c4b5fd', '#f9a8d4'];

const parseNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const tooltipStyle = (dark) => ({
  backgroundColor: dark ? '#0f172a' : '#fff',
  border: '2px solid black',
  color: dark ? '#fff' : 'black',
  fontWeight: 900,
  borderRadius: 4,
  boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
});

const tBg = (dark) => (dark ? 'bg-[#1e293b] text-white' : 'bg-white text-black');

/* Light faded watermark used behind charts & scorable blocks. */
const Watermark = ({ children, className = 'text-[5rem]' }) => (
  <span
    className={`absolute inset-0 flex items-center justify-center uppercase font-black tracking-tighter opacity-[0.05] pointer-events-none select-none ${className}`}
  >
    {children}
  </span>
);

/* Compact "label: value" pill used in the student profile card. */
const InfoPill = ({ label, value, mono = false }) => (
  <span className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</span>
    <span className={`text-sm md:text-base font-black ${mono ? 'font-mono' : ''}`}>{value}</span>
  </span>
);

/* Elegant terminal-style report block (macOS dots bar + mono text). */
function ReportTerminal({ id, children }) {
  return (
    <div className="mt-5 border-4 border-black overflow-hidden bg-[#0b1220]">
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1e293b] border-b-4 border-black">
        <span className="w-3 h-3 rounded-full bg-[#fca5a5]" />
        <span className="w-3 h-3 rounded-full bg-[#fde047]" />
        <span className="w-3 h-3 rounded-full bg-[#a7f3d0]" />
        <span className="ml-2 font-mono text-[11px] text-slate-400 truncate">mentor-report-{id}.txt</span>
      </div>
      <pre className={`max-h-96 min-h-[200px] overflow-auto p-5 text-sm font-mono leading-relaxed text-emerald-200 whitespace-pre-wrap ${hideScrollbar}`}>{children}</pre>
    </div>
  );
}

/* Prominent settings toggle switch. */
function Toggle({ on, onChange, label, hint }) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center justify-between gap-4 border-2 border-black px-4 py-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all ${on ? 'bg-[#a7f3d0] text-black' : 'bg-white text-black'}`}
    >
      <span className="text-left">
        <span className="block font-black uppercase text-sm">{label}</span>
        {hint && (
          <span className="block text-[10px] font-bold uppercase tracking-widest opacity-60 mt-0.5">{hint}</span>
        )}
      </span>
      <span className={`relative w-14 h-8 border-2 border-black rounded-full transition-colors shrink-0 ${on ? 'bg-black' : 'bg-zinc-300'}`}>
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full border-2 border-black transition-all ${on ? 'left-6 bg-[#a7f3d0]' : 'left-0.5 bg-white'}`}
        />
      </span>
    </button>
  );
}

/* ================================================================== */
/* MAIN WRAPPER                                                        */
/* ================================================================== */
export default function Teacher({ identity, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [inspectQuery, setInspectQuery] = useState('');

  const t = theme(isDarkMode);
  const teacherName = identity?.full_name || 'Faculty';
  const teacherShort = identity?.short_name || teacherName;

  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const studentsReq = useAsync(() => listStudents(page), [page.limit, page.offset]);
  const pageData = useMemo(() => normalizeStudentPage(studentsReq.data), [studentsReq.data]);
  const apiOnline = studentsReq.data != null || studentsReq.loading;

  const inspect = (roll) => {
    setInspectQuery(String(roll));
    setActiveTab('insights');
  };

  const navItems = [
    { id: 'overview', icon: <LayoutDashboard size={19} />, label: '1. Class Overview' },
    { id: 'insights', icon: <Search size={19} />, label: '2. Student Insights' },
    { id: 'internals', icon: <FileSignature size={19} />, label: '3. Assigned & Internals' },
    { id: 'mentorship', icon: <Users size={19} />, label: '4. Mentorship Hub' },
  ];

  return (
    <div className={`flex h-screen font-sans ${t.bgMain} ${t.textMain} overflow-hidden transition-colors relative`}>
      <div
        className={`absolute inset-0 z-0 pointer-events-none select-none flex flex-col justify-center font-black text-[10rem] md:text-[14rem] leading-[0.8] whitespace-nowrap ${isDarkMode ? 'text-white/5' : 'text-black/5'}`}
        style={{ backgroundImage: t.watermark, backgroundSize: '40px 40px' }}
      >
        <span className="ml-[-50px]">FACULTY PORTAL</span>
        <span className="ml-20">DEPT OF CSE</span>
        <span className="ml-[-100px]">ANALYTICS</span>
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR — off-canvas drawer below lg, static rail on desktop.
          The branding area below is the ONLY desktop collapse/expand toggle. */}
      <div
        className={`${t.bgCard} ${t.borderTheme} border-y-0 border-l-0 flex flex-col fixed inset-y-0 left-0 z-40 h-screen w-64 transform transition-all duration-300 lg:static lg:z-20 lg:translate-x-0 ${isSidebarOpen ? 'lg:w-64' : 'lg:w-24'} ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="h-24 border-b-4 border-black flex items-center justify-center overflow-hidden shrink-0 bg-[#fef08a] w-full cursor-pointer hover:bg-[#fde047] transition-colors"
        >
          <div className="bg-white border-[3px] border-black p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center justify-center">
            <BookOpen size={26} strokeWidth={3} className="text-black" />
          </div>
          {isSidebarOpen && (
            <h1 className="font-black text-xl uppercase text-black ml-3 tracking-tighter whitespace-nowrap">Faculty Desk</h1>
          )}
        </button>
        <nav className={`flex-1 py-5 flex flex-col gap-2.5 px-3 overflow-y-auto ${hideScrollbar}`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
              className={`flex items-center gap-3 p-3 font-black uppercase text-sm tracking-wider transition-all whitespace-nowrap overflow-hidden border-2 ${
                activeTab === item.id
                  ? 'bg-[#c4b5fd] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  : `border-transparent hover:border-black hover:bg-[#fef08a] hover:text-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`
              }`}
              title={item.label}
            >
              <div className="shrink-0">{item.icon}</div>
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className={`h-20 border-b-4 border-black flex items-center justify-between px-4 sm:px-6 xl:px-10 shrink-0 bg-gradient-to-r ${isDarkMode ? 'from-slate-900 via-indigo-950 to-black' : 'from-[#93c5fd] via-[#e9d5ff] to-[#fca5a5]'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className={`lg:hidden p-2.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-black'}`}
              aria-label="Open navigation"
            >
              <Menu size={22} strokeWidth={3} />
            </button>
            <ApiStatusChip online={apiOnline} loading={studentsReq.loading} dark={isDarkMode} />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all ${isDarkMode ? 'bg-[#18181b] text-[#86efac]' : 'bg-white text-black'}`}>
              {isDarkMode ? <Moon size={22} strokeWidth={3} /> : <Sun size={22} strokeWidth={3} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 bg-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-black">
                <div className="hidden sm:block text-right">
                  <p className="font-black text-xs uppercase">{teacherShort}</p>
                  <p className="font-bold text-[9px] uppercase tracking-widest text-zinc-500">{identity?.email}</p>
                </div>
                <div className="w-9 h-9 font-black flex items-center justify-center border-2 border-black bg-[#93c5fd] text-lg">{identity?.avatar || 'RV'}</div>
              </button>

              {showProfileMenu && (
                <div className={`absolute top-full right-0 mt-3 w-72 border-4 border-black ${t.bgCard} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50`}>
                  <div className="px-6 py-5 border-b-4 border-black bg-[#93c5fd] text-black">
                    <p className="font-black text-lg uppercase">{teacherName}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1.5">{identity?.designation || 'Faculty'}</p>
                  </div>
                  <button onClick={() => { setActiveModal('profile'); setShowProfileMenu(false); }} className={`w-full text-left px-5 py-4 text-sm font-black uppercase flex items-center gap-3 hover:bg-[#fef08a] hover:text-black transition-colors ${t.textMain}`}><Edit3 size={18} strokeWidth={3} /> Edit Profile</button>
                  <button onClick={() => { setActiveModal('settings'); setShowProfileMenu(false); }} className={`w-full text-left px-5 py-4 text-sm font-black uppercase flex items-center gap-3 hover:bg-[#fef08a] hover:text-black transition-colors ${t.textMain}`}><Settings size={18} strokeWidth={3} /> Settings</button>
                  <div className="border-t-4 border-black"></div>
                  <button onClick={onLogout} className="w-full text-left px-5 py-4 text-sm font-black uppercase flex items-center gap-3 bg-[#fca5a5] text-black hover:bg-[#f87171] transition-colors"><LogOut size={18} strokeWidth={3} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-6 xl:p-8 relative ${hideScrollbar}`}>
          <div className="w-full space-y-8">
            {activeTab === 'overview' && (
              <ClassOverviewTab
                pageData={pageData}
                loading={studentsReq.loading}
                error={studentsReq.error}
                reload={studentsReq.run}
                onInspect={inspect}
                dark={isDarkMode}
                page={page}
                setPage={setPage}
              />
            )}
            {activeTab === 'insights' && <StudentInsightsTab key={inspectQuery || 'blank'} dark={isDarkMode} initialQuery={inspectQuery} />}
            {activeTab === 'internals' && <InternalsTab dark={isDarkMode} />}
            {activeTab === 'mentorship' && <MentorshipHubTab dark={isDarkMode} onInspect={inspect} />}
          </div>
        </main>
      </div>

      {activeModal === 'profile' && <ProfileModal identity={identity} onClose={() => setActiveModal(null)} dark={isDarkMode} bgCard={t.bgCard} />}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onEditProfile={() => setActiveModal('profile')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          bgCard={t.bgCard}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ApiStatusChip({ online, loading, dark }) {
  if (loading) {
    return (
      <span className={`hidden md:flex items-center gap-2 px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.6)] ${dark ? 'bg-[#1e293b] text-slate-200' : 'bg-white text-black'}`}>
        <Loader2 className="animate-spin" size={13} /> Loading roster
      </span>
    );
  }
  return (
    <span className={`hidden md:flex items-center gap-2 px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.6)] ${online ? (dark ? 'bg-[#064e3b] text-emerald-300' : 'bg-[#a7f3d0] text-black') : 'bg-[#fca5a5] text-black'}`}>
      {online ? <Wifi size={13} /> : <WifiOff size={13} />}
      {online ? 'API Live' : 'API Offline'}
    </span>
  );
}

/* ================================================================== */
/* 1. CLASS OVERVIEW                                                   */
/* ================================================================== */
function ClassOverviewTab({ pageData, loading, error, reload, onInspect, dark, page, setPage }) {
  const [section, setSection] = useState('ALL');

  const rows = useMemo(() => pageData.students || [], [pageData]);

  const filtered = useMemo(() => {
    if (section === 'ALL') return rows;
    const opt = SECTION_OPTIONS.find((o) => o.label === section);
    return opt ? rows.filter((r) => matchesSection(opt, r.class_section)) : rows;
  }, [rows, section]);

  const stats = useMemo(() => {
    const att = filtered.map((r) => parseNum(r.overall_attendance_pct)).filter((n) => n != null);
    const cgpa = filtered.map((r) => parseNum(r.previous_cgpa)).filter((n) => n != null);
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const atRisk = filtered.filter((r) => {
      const a = parseNum(r.overall_attendance_pct);
      const c = parseNum(r.previous_cgpa);
      return (a != null && a < 75) || (c != null && c < 6);
    }).length;

    const buckets = [
      { name: '<60%', value: att.filter((n) => n < 60).length },
      { name: '60–75%', value: att.filter((n) => n >= 60 && n < 75).length },
      { name: '75–85%', value: att.filter((n) => n >= 75 && n < 85).length },
      { name: '85%+', value: att.filter((n) => n >= 85).length },
    ];

    const sectionCounts = (() => {
      const counts = SECTION_OPTIONS.map((o) => ({ name: o.label, value: 0 }));
      rows.forEach((r) => {
        const label = SECTION_OPTIONS.find((o) => matchesSection(o, r.class_section))?.label;
        if (!label) return;
        const entry = counts.find((c) => c.name === label);
        if (entry) entry.value += 1;
      });
      return counts.filter((c) => c.value > 0);
    })();

    const sortedCgpa = filtered
      .filter((r) => parseNum(r.previous_cgpa) != null)
      .sort((a, b) => parseNum(b.previous_cgpa) - parseNum(a.previous_cgpa));

    return {
      avgAtt: avg(att),
      avgCgpa: avg(cgpa),
      atRisk,
      buckets,
      sectionCounts,
      top5: sortedCgpa.slice(0, 5),
      bottom10: [...sortedCgpa].reverse().slice(0, 10),
    };
  }, [filtered, rows]);

  if (loading && !rows.length) return <LoadingBlock label="Loading student roster…" dark={dark} />;
  if (error && !rows.length) return <ErrorBlock error={error} onRetry={reload} dark={dark} />;

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < (pageData.total || 0);

  return (
    <>
      <div className={`p-6 border-4 border-black bg-[#fef08a] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-5 w-full`}>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">Class Overview</h1>
          <p className="font-extrabold text-sm uppercase tracking-widest text-black/80">
            Live roster · {pageData.total ?? rows.length} students in DB
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border-4 border-black p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-black uppercase tracking-widest text-[10px] ml-1.5">Section:</span>
          <select value={section} onChange={(e) => setSection(e.target.value)} className="bg-[#93c5fd] border-2 border-black p-2 font-black uppercase text-base outline-none cursor-pointer">
            <option value="ALL">ALL</option>
            {SECTION_OPTIONS.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards — compact 2/4 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <MetricCard className="w-full" title="Avg. Attendance" value={stats.avgAtt != null ? `${fmt(stats.avgAtt, 1)}%` : '—'} accent="#a7f3d0" icon={<CalendarCheck size={96} />} />
        <MetricCard className="w-full" title="Class Avg CGPA" value={stats.avgCgpa != null ? fmt(stats.avgCgpa, 2) : '—'} accent="#93c5fd" icon={<TrendingUp size={96} />} footnote="From previous_cgpa" />
        <MetricCard className="w-full" title="At Risk (proxy)" value={stats.atRisk} accent="#fca5a5" icon={<ShieldAlert size={96} />} footnote="Attendance<75% | CGPA<6" />
        <MetricCard className="w-full" title="Roster Page" value={`${rows.length}`} accent="#e9d5ff" icon={<Users size={96} />} footnote={`offset ${page.offset}`} />
      </div>

      {/* Charts — side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <Panel className={`p-5 ${tBg(dark)} relative`} dark={dark}>
          <SectionTitle dark={dark}>Attendance Distribution</SectionTitle>
          <div className="relative h-80">
            <Watermark className="text-[4rem]">Attendance %</Watermark>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.buckets}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e2e8f0'} />
                <XAxis dataKey="name" stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 3 }} tick={{ fontWeight: 900, fontSize: 13 }} />
                <YAxis label={{ value: 'Students', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontWeight: 900, fill: dark ? '#fff' : '#000', fontSize: 11 } }} domain={[0, 'auto']} stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 3 }} tick={{ fontWeight: 900 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.06)' }} contentStyle={tooltipStyle(dark)} />
                <Bar dataKey="value" fill={BUCKET_COLORS[0]} stroke="#000" strokeWidth={2} radius={[2, 2, 0, 0]} barSize={40}>
                  {stats.buckets.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {BUCKET_LABELS.map((label, i) => (
              <span key={i} className="flex items-center gap-1.5 border-2 border-black bg-white px-2 py-1 text-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="w-2.5 h-2.5 border border-black shrink-0" style={{ backgroundColor: BUCKET_COLORS[i % BUCKET_COLORS.length] }} />
                {label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel className={`p-5 ${tBg(dark)} flex flex-col`} dark={dark}>
          <SectionTitle dark={dark}>Sections</SectionTitle>
          <div className="relative flex-1 min-h-[200px]">
            <Watermark className="text-[3rem]">Sections</Watermark>
            {stats.sectionCounts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={stats.sectionCounts}
                    innerRadius={48}
                    outerRadius={74}
                    dataKey="value"
                    fill={dark ? '#fff' : '#000'}
                    stroke="#000"
                    strokeWidth={2.5}
                    paddingAngle={2}
                    labelLine={dark ? { stroke: '#93c5fd', strokeWidth: 2 } : { stroke: '#000', strokeWidth: 2 }}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.sectionCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle(dark)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBlock dark={dark} message="No section data." />
            )}
            {stats.sectionCounts.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="text-center">
                  <p className={`font-black text-4xl leading-none ${dark ? 'text-white' : 'text-black'}`}>
                    {stats.sectionCounts.reduce((a, b) => a + b.value, 0)}
                  </p>
                  <p className={`font-black uppercase tracking-widest text-[10px] mt-1 ${dark ? 'text-white/60' : 'text-black/60'}`}>Students</p>
                </div>
              </div>
            )}
          </div>
          {stats.sectionCounts.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-1.5">
              {stats.sectionCounts.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 border-2 border-black bg-white px-2 py-1.5 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="w-3 h-3 border-2 border-black shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-black uppercase text-[11px] tracking-wider truncate">{s.name}</span>
                  <span className="ml-auto font-black text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Top 5 / Bottom 10 — constrained width, bigger text */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
        <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
          <h3 className="text-base xl:text-lg font-black uppercase tracking-wider pb-2 border-b-4 border-black text-emerald-600">⭐ Top 5 (Previous CGPA)</h3>
          <div className={`mt-3.5 space-y-2 max-h-80 overflow-y-auto pr-1.5 ${hideScrollbar}`}>
            {stats.top5.length ? stats.top5.map((stu, i) => (
              <button key={i} onClick={() => onInspect(stu.roll_no)} className="w-full text-left flex items-center gap-3 bg-[#a7f3d0] text-black border-2 border-black px-3 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
                <span className="w-7 h-7 shrink-0 bg-black text-white font-black text-sm flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 font-black text-base lg:text-lg truncate">{stu.full_name || stu.roll_no}</span>
                <span className="font-black text-base bg-white border-2 border-black px-3 py-0.5 shrink-0 ml-1">{fmt(stu.previous_cgpa, 2)}</span>
              </button>
            )) : <EmptyBlock dark={dark} message="No CGPA column in roster." />}
          </div>
        </Panel>

        <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
          <h3 className="text-base xl:text-lg font-black uppercase tracking-wider pb-2 border-b-4 border-black text-red-500">⚠️ Bottom 10 (Previous CGPA)</h3>
          <div className={`mt-3.5 space-y-2 max-h-80 overflow-y-auto pr-1.5 ${hideScrollbar}`}>
            {stats.bottom10.length ? stats.bottom10.map((stu, i) => (
              <button key={i} onClick={() => onInspect(stu.roll_no)} className="w-full text-left flex items-center gap-3 bg-[#fca5a5] text-black border-2 border-black px-3 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
                <span className="w-7 h-7 shrink-0 bg-black text-white font-black text-sm flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 font-black text-base lg:text-lg truncate">{stu.full_name || stu.roll_no}</span>
                <span className="font-black text-base bg-white border-2 border-black px-3 py-0.5 shrink-0 ml-1">{fmt(stu.previous_cgpa, 2)}</span>
              </button>
            )) : <EmptyBlock dark={dark} message="No CGPA column in roster." />}
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-4 border-black p-4 bg-[#e9d5ff] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black uppercase tracking-widest text-xs">
          Showing {page.offset + 1}–{page.offset + rows.length} of {pageData.total ?? '?'}
        </p>
        <div className="flex gap-2.5">
          <button disabled={!canPrev} onClick={() => setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))} className="px-4 py-2 font-black uppercase text-sm border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform">
            Prev
          </button>
          <button disabled={!canNext} onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))} className="px-4 py-2 font-black uppercase text-sm border-2 border-black bg-[#fef08a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform">
            Next
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/* 2. STUDENT INSIGHTS                                                 */
/* ================================================================== */
function StudentInsightsTab({ dark, initialQuery }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (value) => {
    const term = String(value || '').trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setDossier(null);
    try {
      const result = await buildDossier(term);
      setDossier(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialQuery) return undefined;
    const id = setTimeout(() => load(initialQuery), 0);
    return () => clearTimeout(id);
  }, [initialQuery, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  return (
    <div className="w-full space-y-6">
      <div className={`p-6 border-4 border-black bg-[#93c5fd] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-1.5">Student Insights Engine</h2>
        <p className="text-xs font-extrabold uppercase tracking-widest text-black/70">
          Search by roll number OR full name (mentor routes accept both).
        </p>
      </div>

      {/* Compact, centered search bar */}
      <form onSubmit={handleSearch} className="w-full max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E.G. 210029023375 OR AARAV RAO"
          className={`flex-1 border-2 border-black p-3 text-base font-black rounded-sm focus:bg-[#fef08a] outline-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`}
        />
        <button type="submit" disabled={loading} className="px-6 py-3 bg-[#a7f3d0] text-black font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all disabled:opacity-60 flex items-center gap-2 justify-center">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Fetch
        </button>
      </form>

      {loading && <LoadingBlock label="Building student dossier…" dark={dark} />}
      {error && <ErrorBlock error={error} onRetry={() => load(query)} dark={dark} />}
      {!loading && !error && dossier && <DossierView dossier={dossier} dark={dark} />}
      {!loading && !error && !dossier && (
        <EmptyBlock dark={dark} message="Search a student to load live analytics." />
      )}
    </div>
  );
}

function DossierView({ dossier, dark }) {
  const { analysis, student, cgpa, id } = dossier;
  const metrics = analysis.academic_metrics || {};
  const weak = weakAreas(analysis);
  const fullName = student?.full_name || analysis.full_name || id;
  const section = student?.class_section || analysis.class_section;

  const subjectCards = (analysis.subjects || [])
    .filter((s) => s && (s.score_pct != null || Array.isArray(s.units)))
    .map((s) => ({
      label: s.label || s.subject || 'Subject',
      score: parseNum(s.score_pct),
      status: s.status || 'ok',
      units: Array.isArray(s.units) ? s.units : [],
      components: s.components || {},
    }));

  const primaryMentor =
    weak[0]?.mentor?.name ||
    (analysis.recommendations || []).find((r) => r.mentor)?.mentor ||
    (analysis.subjects || []).find((s) => s.mentor?.name)?.mentor?.name;

  const [report, setReport] = useState(null);
  const [reportErr, setReportErr] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);

  const loadReport = async () => {
    setReportBusy(true); setReportErr(null);
    try {
      const data = await getMentorReport(id);
      setReport(data?.report_text || '');
    } catch (err) { setReportErr(err); } finally { setReportBusy(false); }
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mentor-report-${id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const unitPill = (label, value, status) => (
    <span
      className="inline-flex items-center gap-1 border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[1px_1px_0px_0px_rgba(0,0,0,0.8)]"
      style={{ backgroundColor: statusColor(status) }}
    >
      {label}: {value != null ? `${fmt(value, 0)}%` : '—'}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Compact profile card */}
      <div className={`p-5 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">{fullName}</h3>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mt-1.5">
              {dossier.source === 'mentor' ? 'Mentor Engine' : 'Risk Engine'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RiskBadge riskLevel={analysis.risk_level} />
            {analysis.priority_rank != null && (
              <span className="inline-block border-2 border-black bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-2 py-0.5">{`P#${analysis.priority_rank}`}</span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <InfoPill label="Roll" value={id} mono />
          <InfoPill label="Branch" value={section || '—'} />
          <InfoPill label="Mentor" value={primaryMentor || 'Auto-assigned'} />
        </div>
      </div>

      {/* Stat cards — compact 2/4 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <MetricCard className="w-full" title="Attendance" value={metrics.overall_attendance_pct != null ? `${fmt(metrics.overall_attendance_pct, 1)}%` : '—'} accent="#a7f3d0" icon={<CalendarCheck size={96} />} />
        <MetricCard className="w-full" title="Average Score" value={metrics.average_percentage != null ? `${fmt(metrics.average_percentage, 1)}%` : '—'} accent="#93c5fd" icon={<BookOpen size={96} />} />
        <MetricCard className="w-full" title="Predicted CGPA" value={cgpa?.predicted_grade != null ? fmt(cgpa.predicted_grade, 2) : '—'} accent="#e9d5ff" footnote={cgpa?.confidence_display} icon={<TrendingUp size={96} />} />
        <MetricCard className="w-full" title="Weak Areas" value={weak.length} accent="#fef08a" icon={<Target size={96} />} />
      </div>

      {/* Subject scoreboard — compact cards + readable unit pills */}
      <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
        <SectionTitle dark={dark}>Subject Scoreboard</SectionTitle>
        {subjectCards.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {subjectCards.map((card, i) => (
              <div key={i} className="relative overflow-hidden border-2 border-black bg-white text-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="absolute -right-1 -top-4 text-[4.5rem] leading-none font-black opacity-[0.07] pointer-events-none select-none">
                  {card.score != null ? `${fmt(card.score, 0)}%` : ''}
                </span>
                <div className="relative flex items-center justify-between gap-2">
                  <p className="text-sm font-black uppercase tracking-wider truncate">{card.label}</p>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black shrink-0" style={{ backgroundColor: statusColor(card.status) }}>{card.status || '—'}</span>
                </div>
                <p className="relative text-2xl md:text-3xl font-black tracking-tighter mt-2">
                  {card.score != null ? `${fmt(card.score, 1)}%` : '—'}
                </p>
                <p className="relative text-[10px] font-black uppercase tracking-widest text-black/50 mt-2 mb-1.5">Unit Breakdown</p>
                <div className="relative flex flex-wrap gap-1.5">
                  {card.units.length
                    ? card.units.map((u) => unitPill(u.unit, u.score_pct, u.status))
                    : (
                      <>
                        {unitPill('ST1', card.components.st1_pct, 'ok')}
                        {unitPill('ST2', card.components.st2_pct, 'ok')}
                        {unitPill('PUT', card.components.put_pct, 'ok')}
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyBlock dark={dark} message="No subject detail available." />}
      </Panel>

      {/* Weak areas & mentors — big, readable detail blocks */}
      <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
        <SectionTitle dark={dark}>Weak Areas & Mentors</SectionTitle>
        <div className="space-y-4">
          {weak.length ? weak.map((w, i) => {
            const focus = w.weak_units?.map((u) => u.unit).join(', ') || (w.weak_parts || []).join(', ') || w.lowest_unit || 'Overall';
            return (
              <div key={i} className="border-4 border-black p-5 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: '#fef08a' }}>
                <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-2">
                  <span className="font-black text-lg md:text-xl uppercase">{w.displayName}</span>
                  <span className="text-base font-black bg-black text-white px-3 py-1">{fmt(w.score_pct, 1)}%</span>
                </div>
                <p className="font-extrabold text-lg md:text-xl uppercase tracking-wide opacity-90">Target Weakness: {focus}</p>
                <div className="mt-2.5 space-y-1.5">
                  <p className="text-xl md:text-2xl font-black">
                    Assigned Mentor: {w.mentor?.name || '—'} {w.mentor?.rating != null ? `(⭐ ${fmt(w.mentor.rating, 1)})` : ''}
                  </p>
                  {w.peer_mentor?.name && (
                    <p className="text-base font-bold">Peer: {w.peer_mentor.name} {w.peer_mentor.score_pct != null ? `· ${fmt(w.peer_mentor.score_pct, 1)}%` : ''}</p>
                  )}
                </div>
                {w.reason && (
                  <div className="mt-3 bg-black text-[#fde047] border-2 border-black p-4">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">AI Reason</p>
                    <p className="text-base font-bold mt-1.5 leading-snug">{w.reason}</p>
                  </div>
                )}
                {w.suggested_action && <p className="text-sm font-bold mt-2 opacity-80">{w.suggested_action}</p>}
              </div>
            );
          }) : <EmptyBlock dark={dark} message="No weak areas — student is healthy." />}
        </div>
      </Panel>

      {analysis.recommendations?.length > 0 && (
        <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Recommendations</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="border-2 border-black p-6 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white">
                <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-3">
                  <span className="font-black uppercase text-2xl tracking-tight">{(rec.subject || rec.type || '').toUpperCase()}</span>
                  <span className="text-xs font-black bg-black text-white px-2.5 py-1">{`P${rec.priority ?? '-'}`}</span>
                </div>
                <p className="font-bold text-base leading-snug">{rec.action || rec.focus}</p>
                <p className="text-sm font-black uppercase tracking-widest mt-3 opacity-70">Mentor: {rec.mentor || '—'}</p>
                {rec.peer_mentor && <p className="text-sm font-black uppercase tracking-widest opacity-70">Peer: {rec.peer_mentor}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Printable report — big prominent CTA + terminal block */}
      <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h4 className="text-xl font-black uppercase flex items-center gap-2.5"><FileText size={24} /> Printable Report</h4>
            <p className="text-[11px] font-bold opacity-60 mt-1">Generated from GET /api/v1/mentor/{id}/report</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={loadReport} disabled={reportBusy} className="flex items-center gap-2.5 bg-[#fef08a] text-black font-black uppercase text-lg px-9 py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-60">
              {reportBusy ? <Loader2 className="animate-spin" size={22} /> : <RefreshCw size={22} />} Generate
            </button>
            <button onClick={download} disabled={!report} className="flex items-center gap-2.5 bg-[#93c5fd] text-black font-black uppercase text-lg px-8 py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all disabled:opacity-40">
              <Download size={22} /> Download
            </button>
          </div>
        </div>
        {reportErr && <p className="mt-4 text-sm font-bold text-red-500">{reportErr.message}</p>}
        {report && <ReportTerminal id={id}>{report}</ReportTerminal>}
      </Panel>
    </div>
  );
}

/* ================================================================== */
/* 3. ASSIGNED & INTERNALS                                             */
/* ================================================================== */
function InternalsTab({ dark }) {
  const [page, setPage] = useState({ limit: 25, offset: 0 });
  const [subject, setSubject] = useState('coa');
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [newStudent, setNewStudent] = useState({ roll_no: '', full_name: '', class_section: '' });

  const studentsReq = useAsync(() => listStudents(page), [page.limit, page.offset]);
  const pageData = useMemo(() => normalizeStudentPage(studentsReq.data), [studentsReq.data]);
  const rows = pageData.students || [];

  const valueFor = (row, field) => {
    const key = `${subject}_${field}_marks`;
    if (edits[row.roll_no]?.[key] != null) return edits[row.roll_no][key];
    const raw = row[key];
    return raw == null ? '' : raw;
  };

  const setCell = (roll, field, value) => {
    const key = `${subject}_${field}_marks`;
    setEdits((prev) => ({ ...prev, [roll]: { ...(prev[roll] || {}), [key]: value } }));
  };

  const dirtyRolls = Object.keys(edits);

  const saveAll = async () => {
    if (!dirtyRolls.length) return;
    setBusy(true);
    setMessage(null);
    try {
      await Promise.all(dirtyRolls.map((roll) => updateStudent(roll, edits[roll])));
      setMessage({ ok: true, text: `Saved ${dirtyRolls.length} student(s) for ${subject.toUpperCase()}.` });
      setEdits({});
      studentsReq.run();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.roll_no) return;
    setBusy(true);
    setMessage(null);
    try {
      await createStudent(newStudent);
      setMessage({ ok: true, text: `Student ${newStudent.roll_no} created/updated. Mentor auto-assigned by the API.` });
      setNewStudent({ roll_no: '', full_name: '', class_section: '' });
      studentsReq.run();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (roll) => {
    if (!window.confirm(`Delete student ${roll}? Mentor assignment rows are removed too.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteStudent(roll);
      setMessage({ ok: true, text: `Deleted ${roll}.` });
      studentsReq.run();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-24 border-2 border-black p-2.5 font-black text-base text-center focus:bg-[#fef08a] outline-none text-black bg-white';

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-b-4 border-black pb-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-1.5">Manage Internals</h2>
          <p className={`text-xs font-extrabold uppercase tracking-widest ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Saves via PUT /api/v1/students/&#123;roll_no&#125;
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border-4 border-black p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-black uppercase tracking-widest text-[10px] ml-1.5 text-black">Subject:</span>
          <select value={subject} onChange={(e) => { setSubject(e.target.value); setEdits({}); }} className="bg-[#93c5fd] border-2 border-black p-2 font-black uppercase text-sm outline-none cursor-pointer text-black">
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 border-4 border-black font-black uppercase text-sm flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${message.ok ? 'bg-[#a7f3d0] text-black' : 'bg-[#fca5a5] text-black'}`}>
          {message.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />} {message.text}
        </div>
      )}

      {/* Compact add-form: inputs side-by-side, action button aligned right */}
      <Panel className={`p-5 ${tBg(dark)}`} dark={dark}>
        <SectionTitle dark={dark}>Add / Upsert Student</SectionTitle>
        <form onSubmit={addStudent}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required value={newStudent.roll_no} onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })} placeholder="ROLL NUMBER *" className={`border-2 border-black p-3 text-sm font-black uppercase rounded-sm outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:bg-[#fef08a] ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
            <input value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} placeholder="FULL NAME" className={`border-2 border-black p-3 text-sm font-black uppercase rounded-sm outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:bg-[#fef08a] ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
            <input value={newStudent.class_section} onChange={(e) => setNewStudent({ ...newStudent, class_section: e.target.value })} placeholder="CLASS SECTION" className={`border-2 border-black p-3 text-sm font-black uppercase rounded-sm outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:bg-[#fef08a] ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={busy} className="flex items-center gap-2 bg-[#93c5fd] text-black font-black uppercase text-sm border-2 border-black px-6 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all disabled:opacity-60">
              <UserPlus size={17} /> Add
            </button>
          </div>
        </form>
      </Panel>

      {studentsReq.loading && !rows.length && <LoadingBlock label="Loading students…" dark={dark} />}
      {studentsReq.error && !rows.length && <ErrorBlock error={studentsReq.error} onRetry={studentsReq.run} dark={dark} />}

      {rows.length > 0 && (
        <>
          <div className={`overflow-x-auto border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white ${hideScrollbar}`}>
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b-4 border-black bg-[#fef08a] text-black">
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Roll No.</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs border-l-2 border-black">Name</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs border-l-2 border-black text-center">ST1 (/30)</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs border-l-2 border-black text-center">ST2 (/30)</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs border-l-2 border-black text-center">PUT (/100)</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs border-l-2 border-black text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black text-sm text-black">
                {rows.map((s) => (
                  <tr key={s.roll_no} className={`font-black hover:bg-zinc-50 transition-colors ${edits[s.roll_no] ? 'bg-[#fef08a]/70' : ''}`}>
                    <td className="p-3 font-mono">{s.roll_no}</td>
                    <td className="p-3 border-l-2 border-black">{s.full_name || '—'}</td>
                    <td className="p-3 border-l-2 border-black text-center"><input inputMode="numeric" className={inputClass} value={valueFor(s, 'st1')} onChange={(e) => setCell(s.roll_no, 'st1', e.target.value)} /></td>
                    <td className="p-3 border-l-2 border-black text-center"><input inputMode="numeric" className={inputClass} value={valueFor(s, 'st2')} onChange={(e) => setCell(s.roll_no, 'st2', e.target.value)} /></td>
                    <td className="p-3 border-l-2 border-black text-center"><input inputMode="numeric" className={inputClass} value={valueFor(s, 'put')} onChange={(e) => setCell(s.roll_no, 'put', e.target.value)} /></td>
                    <td className="p-3 border-l-2 border-black text-center">
                      <button onClick={() => removeStudent(s.roll_no)} className="inline-flex items-center gap-1 bg-[#fca5a5] border-2 border-black px-2.5 py-1.5 text-xs font-black uppercase hover:bg-[#f87171] transition-colors" disabled={busy}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2.5">
              <button disabled={page.offset === 0} onClick={() => { setEdits({}); setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) })); }} className="px-4 py-2 font-black uppercase text-sm border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform text-black">Prev</button>
              <button disabled={page.offset + page.limit >= (pageData.total || 0)} onClick={() => { setEdits({}); setPage((p) => ({ ...p, offset: p.offset + p.limit })); }} className="px-4 py-2 font-black uppercase text-sm border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform text-black">Next</button>
            </div>
            <button onClick={saveAll} disabled={busy || !dirtyRolls.length} className="px-6 py-3.5 bg-[#a7f3d0] text-black font-black uppercase text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-2.5">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Save & Publish ({dirtyRolls.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/* 4. MENTORSHIP HUB                                                   */
/* ================================================================== */
function MentorshipHubTab({ dark, onInspect }) {
  const [page] = useState({ limit: 12, offset: 0 });
  const studentsReq = useAsync(() => listStudents(page), [page.limit, page.offset]);
  const pageData = useMemo(() => normalizeStudentPage(studentsReq.data), [studentsReq.data]);
  const rows = pageData.students || [];

  const [dossiers, setDossiers] = useState({});
  const [busyRoll, setBusyRoll] = useState(null);
  const [scheduled, setScheduled] = useState({});

  const analyze = async (roll) => {
    setBusyRoll(roll);
    try {
      const result = await buildDossier(roll);
      setDossiers((prev) => ({ ...prev, [roll]: result }));
    } catch (err) {
      setDossiers((prev) => ({ ...prev, [roll]: { error: err } }));
    } finally {
      setBusyRoll(null);
    }
  };

  const schedule = (roll) => {
    setScheduled((prev) => ({ ...prev, [roll]: 'loading' }));
    setTimeout(() => setScheduled((prev) => ({ ...prev, [roll]: 'done' })), 900);
  };

  if (studentsReq.loading && !rows.length) return <LoadingBlock label="Loading students for mentorship…" dark={dark} />;
  if (studentsReq.error && !rows.length) return <ErrorBlock error={studentsReq.error} onRetry={studentsReq.run} dark={dark} />;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-b-4 border-black pb-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-1.5">Mentorship Hub</h2>
          <p className={`text-xs font-extrabold uppercase tracking-widest ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Analyze a student to pull AI-assigned mentors & peers from the engine.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 border-2 border-black bg-white text-black px-3 py-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Search size={13} strokeWidth={3} /> Analyzed {Object.keys(dossiers).length}
          </span>
          <span className="flex items-center gap-1.5 border-2 border-black bg-[#a7f3d0] text-black px-3 py-2 font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CalendarCheck size={13} strokeWidth={3} /> Scheduled {Object.values(scheduled).filter((v) => v === 'done').length}
          </span>
        </div>
      </div>

      {!rows.length && <EmptyBlock dark={dark} message="No students returned." />}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
        {rows.map((s) => {
          const dossier = dossiers[s.roll_no];
          const analysis = dossier?.analysis;
          const weak = analysis ? weakAreas(analysis) : [];
          return (
            <Panel key={s.roll_no} className={`p-5 ${tBg(dark)} flex flex-col gap-4`} dark={dark}>
              <div className="flex gap-3 items-center border-b-4 border-black pb-3.5">
                <div className="w-11 h-11 bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black shrink-0">
                  {(s.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl md:text-2xl font-black uppercase leading-none truncate">{s.full_name || 'Unknown'}</h3>
                  <p className="font-black font-mono text-zinc-500 mt-1 text-sm md:text-base">{s.roll_no} {s.class_section ? `| ${s.class_section}` : ''}</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1.5 shrink-0">
                  {analysis && <RiskBadge riskLevel={analysis.risk_level} />}
                  <button onClick={() => onInspect(s.roll_no)} className="text-[10px] font-black uppercase underline">Full view</button>
                </div>
              </div>

              {!dossier && (
                <button onClick={() => analyze(s.roll_no)} disabled={busyRoll === s.roll_no} className="w-full py-2.5 border-2 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 bg-[#c4b5fd] text-black hover:-translate-y-0.5 disabled:opacity-60">
                  {busyRoll === s.roll_no ? <><Loader2 className="animate-spin" size={16} /> Analyzing…</> : <><Search size={16} /> Analyze</>}
                </button>
              )}

              {dossier?.error && <div className="p-3 bg-[#fca5a5] border-2 border-black text-black font-bold text-xs">{dossier.error.message}</div>}

              {analysis && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Attendance" value={analysis.academic_metrics?.overall_attendance_pct != null ? `${fmt(analysis.academic_metrics.overall_attendance_pct, 0)}%` : '—'} />
                    <MiniStat label="Avg" value={analysis.academic_metrics?.average_percentage != null ? `${fmt(analysis.academic_metrics.average_percentage, 0)}%` : '—'} />
                    <MiniStat label="Weak" value={weak.length} />
                  </div>

                  {/* Detail blocks — larger fonts, generous padding */}
                  <div className="grid grid-cols-2 gap-2">
                    {weak.length ? weak.slice(0, 4).map((w, i) => (
                      <div key={i} className="relative overflow-hidden border-2 border-black p-4 text-black bg-white flex flex-col justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="absolute -right-1 -top-3 text-4xl leading-none font-black opacity-10 pointer-events-none select-none">{fmt(w.score_pct, 0)}</span>
                        <p className="relative text-lg font-black uppercase truncate">{w.displayName}</p>
                        <p className="relative text-2xl font-black">{fmt(w.score_pct, 1)}%</p>
                        <p className="relative text-sm font-bold mt-1.5">Mentor: {w.mentor?.name || '—'}</p>
                        {w.peer_mentor?.name && <p className="relative text-sm font-bold">Peer: {w.peer_mentor.name}</p>}
                        {w.reason && <p className="relative text-sm font-bold leading-snug mt-1.5 text-black/70">{w.reason}</p>}
                      </div>
                    )) : <div className="col-span-2"><p className="text-xs font-black uppercase text-emerald-600">No weak areas.</p></div>}
                  </div>

                  <button
                    onClick={() => schedule(s.roll_no)}
                    disabled={scheduled[s.roll_no] === 'done'}
                    className={`w-full py-2.5 border-2 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 ${scheduled[s.roll_no] === 'done' ? 'bg-[#a7f3d0] text-black shadow-none translate-y-1 translate-x-1' : 'bg-[#fef08a] text-black hover:-translate-y-0.5'}`}
                  >
                    {scheduled[s.roll_no] === 'loading' ? 'Scheduling…' : scheduled[s.roll_no] === 'done' ? '✅ Scheduled' : <><CalendarCheck size={16} /> Schedule Meet</>}
                  </button>
                </>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="border-2 border-black bg-white text-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-xs font-black uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-xl md:text-2xl font-black">{value}</p>
    </div>
  );
}

/* ================================================================== */
/* MODALS                                                              */
/* ================================================================== */
function ProfileModal({ identity, onClose, dark, bgCard }) {
  const inputClass = `w-full border-2 border-black p-3.5 text-base font-black rounded-sm focus:bg-[#fef08a] outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-6 ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`;
  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto ${hideScrollbar}`}>
      <div className={`w-full max-w-3xl p-8 border-4 border-black ${bgCard} shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-8`}>
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-2xl md:text-3xl font-black uppercase">Edit Faculty Profile</h2>
          <button onClick={onClose} className="border-2 border-black p-1.5 hover:bg-red-500 hover:text-white transition-colors"><X size={26} strokeWidth={3} /></button>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div><label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Full Name</label><input type="text" defaultValue={identity?.full_name} className={inputClass} /></div>
          <div><label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Faculty Code</label><input type="text" defaultValue={identity?.faculty_code} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
          <div><label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Phone Number</label><input type="tel" defaultValue={identity?.phone} className={inputClass} /></div>
          <div><label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Department</label><input type="text" defaultValue={identity?.department} className={inputClass} /></div>
          <div className="md:col-span-2"><label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-70">Email</label><input type="email" defaultValue={identity?.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
          <button type="submit" className="md:col-span-2 py-4 mt-2 bg-[#a7f3d0] text-black font-black text-lg uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ onClose, onEditProfile, isDarkMode, setIsDarkMode, bgCard }) {
  const [pushAlerts, setPushAlerts] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className={`w-full max-w-lg p-8 border-4 border-black ${bgCard} shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]`}>
        <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
          <h2 className="text-2xl font-black uppercase">App Settings</h2>
          <button onClick={onClose} className="border-2 border-black p-1.5 hover:bg-red-500 hover:text-white transition-colors"><X size={26} strokeWidth={3} /></button>
        </div>

        <div className="space-y-3.5">
          <Toggle
            on={isDarkMode}
            onChange={() => setIsDarkMode(!isDarkMode)}
            label="Dark Mode"
            hint="Switch between light & dark theme"
          />
          <Toggle
            on={pushAlerts}
            onChange={() => setPushAlerts(!pushAlerts)}
            label="Push Alerts"
            hint="Enable notifications for at-risk students"
          />
          <button
            onClick={onEditProfile}
            className="w-full flex items-center gap-3 border-2 border-black px-4 py-3.5 bg-[#93c5fd] text-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
          >
            <Edit3 size={18} strokeWidth={3} /> Edit Profile
            <span className="ml-auto text-[10px] font-black uppercase opacity-70">Account settings →</span>
          </button>
        </div>

        <button onClick={onClose} className="w-full py-3.5 mt-4 bg-[#fef08a] text-black font-black text-base uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all">Close Panel</button>
      </div>
    </div>
  );
}