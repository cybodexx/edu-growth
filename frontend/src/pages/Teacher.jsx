import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Menu, X, LayoutDashboard, Search, FileSignature, Users, LogOut, Sun, Moon,
  Settings, Edit3, AlertCircle, TrendingUp, CalendarCheck, ShieldAlert,
  UserPlus, BookOpen, CheckCircle2, ChevronLeft, Loader2, RefreshCw,
  Wifi, WifiOff, Trash2, Download, FileText, Target,
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

const parseNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const tooltipStyle = (dark) => ({
  backgroundColor: dark ? '#0f172a' : '#fff',
  border: '4px solid black',
  color: dark ? '#fff' : 'black',
  fontWeight: 900,
  boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
});

const tBg = (dark) => (dark ? 'bg-[#1e293b] text-white' : 'bg-white text-black');

/* ================================================================== */
/* MAIN WRAPPER                                                        */
/* ================================================================== */
export default function Teacher({ identity, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: '1. Class Overview' },
    { id: 'insights', icon: <Search size={20} />, label: '2. Student Insights' },
    { id: 'internals', icon: <FileSignature size={20} />, label: '3. Assigned & Internals' },
    { id: 'mentorship', icon: <Users size={20} />, label: '4. Mentorship Hub' },
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

      {/* SIDEBAR */}
      <div className={`${t.bgCard} ${t.borderTheme} border-y-0 border-l-0 flex flex-col z-20 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="h-24 border-b-4 border-black flex items-center justify-center overflow-hidden shrink-0 bg-[#fde047]">
          <div className="bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center justify-center">
            <BookOpen size={28} strokeWidth={3} className="text-black" />
          </div>
          {isSidebarOpen && (
            <h1 className="font-black text-2xl uppercase text-black ml-3 tracking-tighter" style={{ textShadow: '2px 2px 0px #fff' }}>Faculty Desk</h1>
          )}
        </div>
        <nav className={`flex-1 py-6 flex flex-col gap-3 px-4 overflow-y-auto ${hideScrollbar}`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 p-4 font-black uppercase tracking-wider transition-all whitespace-nowrap overflow-hidden border-4 border-transparent ${
                activeTab === item.id
                  ? 'bg-[#c4b5fd] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : `hover:border-black hover:bg-[#fef08a] hover:text-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`
              }`}
              title={item.label}
            >
              <div className="shrink-0">{item.icon}</div>
              {isSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className={`h-24 border-b-4 border-black flex items-center justify-between px-6 xl:px-10 shrink-0 bg-gradient-to-r ${isDarkMode ? 'from-slate-900 via-indigo-950 to-black' : 'from-[#93c5fd] via-[#e9d5ff] to-[#fca5a5]'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              <Menu size={24} strokeWidth={3} />
            </button>
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="hidden sm:flex p-3 border-4 border-black bg-[#fca5a5] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all items-center justify-center" title="Close Sidebar">
                <ChevronLeft size={24} strokeWidth={3} />
              </button>
            )}
            <ApiStatusChip online={apiOnline} loading={studentsReq.loading} dark={isDarkMode} />
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all ${isDarkMode ? 'bg-[#18181b] text-[#86efac]' : 'bg-white text-black'}`}>
              {isDarkMode ? <Moon size={24} strokeWidth={3} /> : <Sun size={24} strokeWidth={3} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-4 bg-white border-4 border-black px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-black">
                <div className="hidden sm:block text-right">
                  <p className="font-black text-sm uppercase">{teacherShort}</p>
                  <p className="font-bold text-[10px] uppercase tracking-widest text-zinc-500">{identity?.email}</p>
                </div>
                <div className="w-10 h-10 font-black flex items-center justify-center border-4 border-black bg-[#bfdbfe] text-xl">{identity?.avatar || 'RV'}</div>
              </button>

              {showProfileMenu && (
                <div className={`absolute top-full right-0 mt-4 w-72 border-4 border-black ${t.bgCard} shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-50`}>
                  <div className="px-6 py-6 border-b-4 border-black bg-[#93c5fd] text-black">
                    <p className="font-black text-xl uppercase">{teacherName}</p>
                    <p className="text-xs font-black uppercase tracking-widest mt-2">{identity?.designation || 'Faculty'}</p>
                  </div>
                  <button onClick={() => { setActiveModal('profile'); setShowProfileMenu(false); }} className={`w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 hover:bg-[#fde047] hover:text-black transition-colors ${t.textMain}`}><Edit3 size={20} strokeWidth={3} /> Edit Profile</button>
                  <button onClick={() => { setActiveModal('settings'); setShowProfileMenu(false); }} className={`w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 hover:bg-[#fde047] hover:text-black transition-colors ${t.textMain}`}><Settings size={20} strokeWidth={3} /> Settings</button>
                  <div className="border-t-4 border-black"></div>
                  <button onClick={onLogout} className="w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 bg-[#fca5a5] text-black hover:bg-red-500 transition-colors"><LogOut size={20} strokeWidth={3} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-6 xl:p-10 relative ${hideScrollbar}`}>
          <div className="w-full space-y-10">
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
      {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} bgCard={t.bgCard} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ApiStatusChip({ online, loading, dark }) {
  if (loading) {
    return (
      <span className={`hidden md:flex items-center gap-2 px-3 py-2 border-4 border-black text-xs font-black uppercase tracking-widest ${dark ? 'bg-[#1e293b] text-slate-200' : 'bg-white text-black'}`}>
        <Loader2 className="animate-spin" size={15} /> Loading roster
      </span>
    );
  }
  return (
    <span className={`hidden md:flex items-center gap-2 px-3 py-2 border-4 border-black text-xs font-black uppercase tracking-widest ${online ? (dark ? 'bg-[#064e3b] text-emerald-300' : 'bg-[#a7f3d0] text-black') : 'bg-[#fca5a5] text-black'}`}>
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
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
  const sections = useMemo(
    () => Array.from(new Set(rows.map((r) => r.class_section).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(
    () => (section === 'ALL' ? rows : rows.filter((r) => r.class_section === section)),
    [rows, section]
  );

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

    const sectionCounts = Object.entries(
      filtered.reduce((acc, r) => {
        const key = r.class_section || 'N/A';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

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
  }, [filtered]);

  if (loading && !rows.length) return <LoadingBlock label="Loading student roster…" dark={dark} />;
  if (error && !rows.length) return <ErrorBlock error={error} onRetry={reload} dark={dark} />;

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < (pageData.total || 0);

  return (
    <>
      <div className={`p-8 border-4 border-black bg-[#fde047] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full`}>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">Class Overview</h1>
          <p className="font-black text-sm uppercase tracking-widest text-gray-800">
            Live roster · {pageData.total ?? rows.length} students in DB
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-black uppercase tracking-widest text-xs ml-2">Section:</span>
          <select value={section} onChange={(e) => setSection(e.target.value)} className="bg-[#bfdbfe] border-2 border-black p-2 font-black text-lg outline-none cursor-pointer">
            <option value="ALL">ALL</option>
            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
        <MetricCard title="Avg. Attendance" value={stats.avgAtt != null ? `${fmt(stats.avgAtt, 1)}%` : '—'} accent="#a7f3d0" icon={<CalendarCheck size={110} />} />
        <MetricCard title="Class Avg CGPA" value={stats.avgCgpa != null ? fmt(stats.avgCgpa, 2) : '—'} accent="#93c5fd" icon={<TrendingUp size={110} />} footnote="From previous_cgpa" />
        <MetricCard title="At Risk (proxy)" value={stats.atRisk} accent="#fca5a5" icon={<ShieldAlert size={110} />} footnote="Attendance<75% or CGPA<6" />
        <MetricCard title="Roster Page" value={`${rows.length}`} accent="#e9d5ff" icon={<Users size={110} />} footnote={`offset ${page.offset}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
        <Panel className={`xl:col-span-2 p-8 ${tBg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Attendance Distribution</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.buckets}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900 }} />
                <YAxis domain={[0, 'auto']} stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.08)' }} contentStyle={tooltipStyle(dark)} />
                <Bar dataKey="value" fill="#93c5fd" stroke="#000" strokeWidth={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className={`p-8 ${tBg(dark)} flex flex-col`} dark={dark}>
          <SectionTitle dark={dark}>Sections</SectionTitle>
          <div className="flex-1 min-h-[200px]">
            {stats.sectionCounts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.sectionCounts} innerRadius={55} outerRadius={90} dataKey="value" stroke="#000" strokeWidth={4} paddingAngle={2}>
                    {stats.sectionCounts.map((_, i) => <Cell key={i} fill={['#a7f3d0', '#fef08a', '#fca5a5', '#bfdbfe', '#e9d5ff', '#c4b5fd'][i % 6]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle(dark)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBlock dark={dark} message="No section data." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
        <Panel className={`p-6 ${tBg(dark)} max-h-96 overflow-y-auto ${hideScrollbar}`} dark={dark}>
          <h3 className="text-lg font-black uppercase tracking-wider mb-4 border-b-4 border-black pb-2 text-emerald-500 sticky top-0 bg-inherit z-10">⭐ Top 5 (previous CGPA)</h3>
          <div className="space-y-2">
            {stats.top5.length ? stats.top5.map((stu, i) => (
              <button key={i} onClick={() => onInspect(stu.roll_no)} className="w-full text-left flex justify-between items-center bg-[#a7f3d0] text-black border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
                <span className="font-black text-sm truncate">{i + 1}. {stu.full_name || stu.roll_no}</span>
                <span className="font-black text-xs bg-white border-2 border-black px-2 py-1 shrink-0 ml-2">{fmt(stu.previous_cgpa, 2)}</span>
              </button>
            )) : <EmptyBlock dark={dark} message="No CGPA column in roster." />}
          </div>
        </Panel>

        <Panel className={`p-6 ${tBg(dark)} max-h-96 overflow-y-auto ${hideScrollbar}`} dark={dark}>
          <h3 className="text-lg font-black uppercase tracking-wider mb-4 border-b-4 border-black pb-2 text-red-500 sticky top-0 bg-inherit z-10">⚠️ Bottom 10 (previous CGPA)</h3>
          <div className="space-y-2">
            {stats.bottom10.length ? stats.bottom10.map((stu, i) => (
              <button key={i} onClick={() => onInspect(stu.roll_no)} className="w-full text-left flex justify-between items-center bg-[#fca5a5] text-black border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
                <span className="font-black text-sm truncate">{i + 1}. {stu.full_name || stu.roll_no}</span>
                <span className="font-black text-xs bg-white border-2 border-black px-2 py-1 shrink-0 ml-2">{fmt(stu.previous_cgpa, 2)}</span>
              </button>
            )) : <EmptyBlock dark={dark} message="No CGPA column in roster." />}
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-4 border-black p-4 bg-[#e9d5ff] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black uppercase tracking-widest text-sm">
          Showing {page.offset + 1}–{page.offset + rows.length} of {pageData.total ?? '?'}
        </p>
        <div className="flex gap-3">
          <button disabled={!canPrev} onClick={() => setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))} className="px-5 py-2 font-black uppercase border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform">
            Prev
          </button>
          <button disabled={!canNext} onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))} className="px-5 py-2 font-black uppercase border-4 border-black bg-[#fef08a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform">
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

  const inputClass = `flex-1 border-4 border-black p-4 text-xl font-black focus:bg-[#fef08a] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f4f4f5] text-black'}`;

  return (
    <div className="w-full space-y-10">
      <div className={`p-8 border-4 border-black bg-[#93c5fd] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
        <h2 className="text-4xl font-black uppercase tracking-tight mb-2">Student Insights Engine</h2>
        <p className="text-sm font-black uppercase tracking-widest text-black/60">
          Search by roll number OR full name (mentor routes accept both).
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-6">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. 210029023375 or Aarav Rao" className={inputClass} />
        <button type="submit" disabled={loading} className="px-10 py-4 bg-[#a7f3d0] text-black font-black uppercase text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-60 flex items-center gap-3 justify-center">
          {loading ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />} Fetch
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
  const subjectScores = (analysis.subjects || []).map((s) => ({ subject: (s.subject || '').toUpperCase(), score: parseNum(s.score_pct) ?? 0, status: s.status }));
  const fullName = student?.full_name || analysis.full_name || id;
  const section = student?.class_section || analysis.class_section;

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

  return (
    <div className="space-y-10">
      <div className={`p-8 border-4 border-black text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6`} style={{ backgroundColor: weak.length ? '#fca5a5' : '#a7f3d0' }}>
        <div>
          <h3 className="text-4xl font-black uppercase">{fullName}</h3>
          <p className="font-black text-sm mt-3 bg-white border-4 border-black inline-block px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {id} {section ? `| ${section}` : ''} | {dossier.source === 'mentor' ? 'mentor engine' : 'risk engine'}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-start md:items-end">
          <RiskBadge riskLevel={analysis.risk_level} />
          {analysis.priority_rank != null && (
            <span className="bg-black text-white px-3 py-1 font-black uppercase tracking-widest text-[10px]">Priority #{analysis.priority_rank}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard title="Attendance" value={metrics.overall_attendance_pct != null ? `${fmt(metrics.overall_attendance_pct, 1)}%` : '—'} accent="#a7f3d0" icon={<CalendarCheck size={110} />} />
        <MetricCard title="Average Score" value={metrics.average_percentage != null ? `${fmt(metrics.average_percentage, 1)}%` : '—'} accent="#bfdbfe" icon={<BookOpen size={110} />} />
        <MetricCard title="Predicted CGPA" value={cgpa?.predicted_grade != null ? fmt(cgpa.predicted_grade, 2) : '—'} accent="#e9d5ff" footnote={cgpa?.confidence_display} icon={<TrendingUp size={110} />} />
        <MetricCard title="Weak Areas" value={weak.length} accent="#fef08a" icon={<Target size={110} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Panel className={`p-8 ${tBg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Subject Scores</SectionTitle>
          {subjectScores.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectScores}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} />
                  <XAxis dataKey="subject" stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900, fontSize: 10 }} axisLine={{ strokeWidth: 4 }} />
                  <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900 }} axisLine={{ strokeWidth: 4 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.08)' }} contentStyle={tooltipStyle(dark)} />
                  <Bar dataKey="score" stroke="#000" strokeWidth={4}>
                    {subjectScores.map((s, i) => <Cell key={i} fill={statusColor(s.status)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyBlock dark={dark} message="No subject detail available." />}
        </Panel>

        <Panel className={`p-8 ${tBg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Weak Areas & Mentors</SectionTitle>
          <div className={`space-y-4 max-h-72 overflow-y-auto pr-2 ${hideScrollbar}`}>
            {weak.length ? weak.map((w, i) => {
              const focus = w.weak_units?.map((u) => u.unit).join(', ') || (w.weak_parts || []).join(', ') || w.lowest_unit || 'Overall';
              return (
                <div key={i} className="border-4 border-black p-4 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: '#fef08a' }}>
                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                    <span className="font-black uppercase">{w.displayName}</span>
                    <span className="text-xs font-black bg-black text-white px-2 py-1">{fmt(w.score_pct, 1)}%</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-60">Weak: {focus}</p>
                  <p className="text-sm font-bold mt-1">Mentor: {w.mentor?.name || '—'} {w.mentor?.rating != null ? `(⭐ ${fmt(w.mentor.rating, 1)})` : ''}</p>
                  {w.peer_mentor?.name && <p className="text-sm font-bold">Peer: {w.peer_mentor.name} {w.peer_mentor.score_pct != null ? `· ${fmt(w.peer_mentor.score_pct, 1)}%` : ''}</p>}
                  {w.suggested_action && <p className="text-xs font-bold mt-1 opacity-80">{w.suggested_action}</p>}
                </div>
              );
            }) : <EmptyBlock dark={dark} message="No weak areas — student is healthy." />}
          </div>
        </Panel>
      </div>

      {analysis.recommendations?.length > 0 && (
        <Panel className={`p-8 ${tBg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Recommendations</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="border-4 border-black p-5 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
                  <span className="font-black uppercase">{(rec.subject || rec.type || '').toUpperCase()}</span>
                  <span className="text-[10px] font-black bg-black text-white px-2 py-1">P{rec.priority ?? '-'}</span>
                </div>
                <p className="font-bold text-sm">{rec.action || rec.focus}</p>
                <p className="text-xs font-black uppercase tracking-widest mt-2 opacity-60">Mentor: {rec.mentor || '—'}</p>
                {rec.peer_mentor && <p className="text-xs font-black uppercase tracking-widest opacity-60">Peer: {rec.peer_mentor}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel className={`p-8 ${tBg(dark)}`} dark={dark}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-black uppercase flex items-center gap-2"><FileText size={20} /> Printable Report</h4>
            <p className="text-xs font-bold opacity-60">Generated from GET /api/v1/mentor/{id}/report</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadReport} disabled={reportBusy} className="flex items-center gap-2 bg-[#fde047] text-black font-black uppercase text-sm px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform disabled:opacity-60">
              {reportBusy ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Generate
            </button>
            <button onClick={download} disabled={!report} className="flex items-center gap-2 bg-[#bfdbfe] text-black font-black uppercase text-sm px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform disabled:opacity-40">
              <Download size={18} /> Download
            </button>
          </div>
        </div>
        {reportErr && <p className="mt-4 text-sm font-bold text-red-500">{reportErr.message}</p>}
        {report && (
          <pre className={`mt-5 p-5 border-4 border-black text-xs font-mono whitespace-pre-wrap overflow-auto max-h-72 ${dark ? 'bg-[#0b1220] text-slate-200' : 'bg-[#0b1220] text-emerald-200'}`}>{report}</pre>
        )}
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

  const inputClass = 'w-20 border-2 border-black p-2 font-black text-center focus:bg-[#fef08a] outline-none text-black bg-white';

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">Manage Internals</h2>
          <p className={`text-sm font-black uppercase tracking-widest ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Saves via PUT /api/v1/students/&#123;roll_no&#125;
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-black uppercase tracking-widest text-xs ml-2 text-black">Subject:</span>
          <select value={subject} onChange={(e) => { setSubject(e.target.value); setEdits({}); }} className="bg-[#bfdbfe] border-2 border-black p-2 font-black text-lg outline-none cursor-pointer text-black">
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {message && (
        <div className={`p-4 border-4 border-black font-black uppercase flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${message.ok ? 'bg-[#a7f3d0] text-black' : 'bg-[#fca5a5] text-black'}`}>
          {message.ok ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />} {message.text}
        </div>
      )}

      <Panel className={`p-6 ${tBg(dark)}`} dark={dark}>
        <SectionTitle dark={dark}>Add / Upsert Student</SectionTitle>
        <form onSubmit={addStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input required value={newStudent.roll_no} onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })} placeholder="Roll number *" className={`border-4 border-black p-3 font-black outline-none ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
          <input value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} placeholder="Full name" className={`border-4 border-black p-3 font-black outline-none ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
          <input value={newStudent.class_section} onChange={(e) => setNewStudent({ ...newStudent, class_section: e.target.value })} placeholder="Class section" className={`border-4 border-black p-3 font-black outline-none ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'}`} />
          <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 bg-[#93c5fd] text-black font-black uppercase border-4 border-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-60">
            <UserPlus size={18} /> Add
          </button>
        </form>
      </Panel>

      {studentsReq.loading && !rows.length && <LoadingBlock label="Loading students…" dark={dark} />}
      {studentsReq.error && !rows.length && <ErrorBlock error={studentsReq.error} onRetry={studentsReq.run} dark={dark} />}

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b-4 border-black bg-[#fef08a] text-black">
                  <th className="p-4 font-black uppercase tracking-widest text-xs">Roll No.</th>
                  <th className="p-4 font-black uppercase tracking-widest text-xs border-l-4 border-black">Name</th>
                  <th className="p-4 font-black uppercase tracking-widest text-xs border-l-4 border-black text-center">ST1 (/30)</th>
                  <th className="p-4 font-black uppercase tracking-widest text-xs border-l-4 border-black text-center">ST2 (/30)</th>
                  <th className="p-4 font-black uppercase tracking-widest text-xs border-l-4 border-black text-center">PUT (/100)</th>
                  <th className="p-4 font-black uppercase tracking-widest text-xs border-l-4 border-black text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-black text-sm text-black">
                {rows.map((s) => (
                  <tr key={s.roll_no} className="font-black hover:bg-zinc-100 transition-colors">
                    <td className="p-4 font-mono">{s.roll_no}</td>
                    <td className="p-4 border-l-4 border-black">{s.full_name || '—'}</td>
                    <td className="p-4 border-l-4 border-black text-center"><input className={inputClass} value={valueFor(s, 'st1')} onChange={(e) => setCell(s.roll_no, 'st1', e.target.value)} /></td>
                    <td className="p-4 border-l-4 border-black text-center"><input className={inputClass} value={valueFor(s, 'st2')} onChange={(e) => setCell(s.roll_no, 'st2', e.target.value)} /></td>
                    <td className="p-4 border-l-4 border-black text-center"><input className={inputClass} value={valueFor(s, 'put')} onChange={(e) => setCell(s.roll_no, 'put', e.target.value)} /></td>
                    <td className="p-4 border-l-4 border-black text-center">
                      <button onClick={() => removeStudent(s.roll_no)} className="inline-flex items-center gap-1 bg-[#fca5a5] border-2 border-black px-3 py-2 text-xs font-black uppercase hover:bg-red-400 transition-colors" disabled={busy}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3">
              <button disabled={page.offset === 0} onClick={() => { setEdits({}); setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) })); }} className="px-5 py-2 font-black uppercase border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform text-black">Prev</button>
              <button disabled={page.offset + page.limit >= (pageData.total || 0)} onClick={() => { setEdits({}); setPage((p) => ({ ...p, offset: p.offset + p.limit })); }} className="px-5 py-2 font-black uppercase border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 hover:-translate-y-0.5 transition-transform text-black">Next</button>
            </div>
            <button onClick={saveAll} disabled={busy || !dirtyRolls.length} className="px-8 py-4 bg-[#a7f3d0] text-black font-black uppercase text-lg border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-3">
              {busy ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
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
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">Mentorship Hub</h2>
          <p className={`text-sm font-black uppercase tracking-widest ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Analyze a student to pull AI-assigned mentors & peers from the engine.
          </p>
        </div>
      </div>

      {!rows.length && <EmptyBlock dark={dark} message="No students returned." />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
        {rows.map((s) => {
          const dossier = dossiers[s.roll_no];
          const analysis = dossier?.analysis;
          const weak = analysis ? weakAreas(analysis) : [];
          return (
            <Panel key={s.roll_no} className={`p-6 ${tBg(dark)} flex flex-col gap-4`} dark={dark}>
              <div className="flex gap-4 items-center border-b-4 border-black pb-4">
                <div className="w-14 h-14 bg-black text-white flex items-center justify-center font-black text-2xl border-4 border-black shrink-0">
                  {(s.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black uppercase leading-none truncate">{s.full_name || 'Unknown'}</h3>
                  <p className="font-black font-mono text-zinc-500 mt-1 text-xs">{s.roll_no} {s.class_section ? `| ${s.class_section}` : ''}</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-2">
                  {analysis && <RiskBadge riskLevel={analysis.risk_level} />}
                  <button onClick={() => onInspect(s.roll_no)} className="text-[10px] font-black uppercase underline">Full view</button>
                </div>
              </div>

              {!dossier && (
                <button onClick={() => analyze(s.roll_no)} disabled={busyRoll === s.roll_no} className="w-full py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 bg-[#c4b5fd] text-black hover:-translate-y-0.5 disabled:opacity-60">
                  {busyRoll === s.roll_no ? <><Loader2 className="animate-spin" size={18} /> Analyzing…</> : <><Search size={18} /> Analyze</>}
                </button>
              )}

              {dossier?.error && <div className="p-3 bg-[#fca5a5] border-4 border-black text-black font-bold text-sm">{dossier.error.message}</div>}

              {analysis && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Attendance" value={analysis.academic_metrics?.overall_attendance_pct != null ? `${fmt(analysis.academic_metrics.overall_attendance_pct, 0)}%` : '—'} />
                    <MiniStat label="Avg" value={analysis.academic_metrics?.average_percentage != null ? `${fmt(analysis.academic_metrics.average_percentage, 0)}%` : '—'} />
                    <MiniStat label="Weak" value={weak.length} />
                  </div>
                  <div className={`space-y-2 max-h-56 overflow-y-auto pr-1 ${hideScrollbar}`}>
                    {weak.length ? weak.slice(0, 4).map((w, i) => (
                      <div key={i} className="border-2 border-black p-2 text-black bg-white text-xs">
                        <span className="font-black uppercase">{w.displayName}</span> · {fmt(w.score_pct, 1)}%
                        <span className="block font-bold opacity-70 mt-0.5">
                          Mentor: {w.mentor?.name || '—'} {w.peer_mentor?.name ? `· Peer: ${w.peer_mentor.name}` : ''}
                        </span>
                      </div>
                    )) : <p className="text-xs font-black uppercase text-emerald-600">No weak areas.</p>}
                  </div>
                  <button
                    onClick={() => schedule(s.roll_no)}
                    disabled={scheduled[s.roll_no] === 'done'}
                    className={`w-full py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 ${scheduled[s.roll_no] === 'done' ? 'bg-[#a7f3d0] text-black shadow-none translate-y-1 translate-x-1' : 'bg-[#fde047] text-black hover:-translate-y-0.5'}`}
                  >
                    {scheduled[s.roll_no] === 'loading' ? 'Scheduling…' : scheduled[s.roll_no] === 'done' ? '✅ Scheduled' : <><CalendarCheck size={18} /> Schedule Meet</>}
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
    <div className="border-2 border-black bg-white text-black p-2">
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

/* ================================================================== */
/* MODALS                                                              */
/* ================================================================== */
function ProfileModal({ identity, onClose, dark, bgCard }) {
  const inputClass = `w-full border-4 border-black p-4 text-lg font-black focus:bg-[#fef08a] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6 ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f4f4f5] text-black'}`;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className={`w-full max-w-3xl p-10 border-4 border-black ${bgCard} shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] my-8`}>
        <div className="flex justify-between items-center mb-10 border-b-4 border-black pb-4">
          <h2 className="text-4xl font-black uppercase">Edit Faculty Profile</h2>
          <button onClick={onClose} className="border-4 border-black p-2 hover:bg-red-500 hover:text-white transition-colors"><X size={32} strokeWidth={3} /></button>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div><label className="block text-sm font-black uppercase tracking-widest mb-3 opacity-70">Full Name</label><input type="text" defaultValue={identity?.full_name} className={inputClass} /></div>
          <div><label className="block text-sm font-black uppercase tracking-widest mb-3 opacity-70">Faculty Code</label><input type="text" defaultValue={identity?.faculty_code} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
          <div><label className="block text-sm font-black uppercase tracking-widest mb-3 opacity-70">Phone Number</label><input type="tel" defaultValue={identity?.phone} className={inputClass} /></div>
          <div><label className="block text-sm font-black uppercase tracking-widest mb-3 opacity-70">Department</label><input type="text" defaultValue={identity?.department} className={inputClass} /></div>
          <div className="md:col-span-2"><label className="block text-sm font-black uppercase tracking-widest mb-3 opacity-70">Email</label><input type="email" defaultValue={identity?.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} /></div>
          <button type="submit" className="md:col-span-2 py-6 mt-2 bg-[#a7f3d0] text-black font-black text-2xl uppercase border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ onClose, isDarkMode, setIsDarkMode, bgCard }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className={`w-full max-w-lg p-10 border-4 border-black ${bgCard} shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]`}>
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-3xl font-black uppercase">App Settings</h2>
          <button onClick={onClose} className="border-4 border-black p-2 hover:bg-red-500 hover:text-white transition-colors"><X size={32} strokeWidth={3} /></button>
        </div>
        <p className="font-black text-base mb-8 uppercase text-zinc-500">Toggle the theme engine below, or use the Sun/Moon icon in the top bar.</p>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full py-5 mb-4 bg-[#c4b5fd] text-black font-black text-xl uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">
          Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
        </button>
        <button onClick={onClose} className="w-full py-5 bg-[#fef08a] text-black font-black text-xl uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">Close Panel</button>
      </div>
    </div>
  );
}
