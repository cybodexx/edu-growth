import { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard, Calculator, CalendarCheck, Users, LogOut, GraduationCap,
  Sun, Moon, Settings, Edit3, Clock, CheckCircle2, RotateCcw,
  AlertTriangle, Zap, User, BarChart2, ShieldAlert,
  RefreshCw, Wifi, WifiOff, Loader2, Printer,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from 'recharts';

import {
  getStudent, getStudentAnalysis, predictCgpa, getMentorReport,
} from '../api/client';
import { normalizeAnalysis } from '../api/analysis';
import { useAsync } from '../hooks/useAsync';
import {
  LoadingBlock, ErrorBlock, EmptyBlock,
} from '../components/ui';
import { theme, statusColor, fmt } from '../utils/theme';

const hideScrollbar =
  '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

const CHART_COLORS = ['#c4b5fd', '#a7f3d0', '#fca5a5', '#fde047', '#bfdbfe', '#f9a8d4'];

const profileFirstName = (name) => String(name || 'Student').split(' ')[0];

/* ================================================================== */
/* MAIN WRAPPER                                                        */
/* ================================================================== */
export default function Student({ identity, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const t = theme(isDarkMode);
  const rollNo = identity?.roll_no;
  const fullName = identity?.full_name || 'Student';

  const analysisReq = useAsync(() => getStudentAnalysis(rollNo), [rollNo]);
  const studentReq = useAsync(() => getStudent(rollNo), [rollNo]);
  const cgpaReq = useAsync(() => predictCgpa(rollNo), [rollNo]);

  const analysisRaw = analysisReq.data;
  const analysis = useMemo(
    () => normalizeAnalysis(analysisRaw?.data ?? analysisRaw),
    [analysisRaw]
  );
  const student = studentReq.data;
  const cgpa = cgpaReq.data;

  const apiOnline = !analysisReq.error || analysisReq.data != null;

  const navItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: '1. Overview' },
    { id: 'marks', icon: <BarChart2 size={20} />, label: '2. Marks Analytics' },
    { id: 'attendance', icon: <CalendarCheck size={20} />, label: '3. Attendance' },
    { id: 'risks', icon: <ShieldAlert size={20} />, label: '4. Risk Alerts' },
    { id: 'predictor', icon: <Calculator size={20} />, label: '5. CGPA Predictor' },
    { id: 'mentors', icon: <Users size={20} />, label: '6. Allocated Mentors' },
    { id: 'studyStation', icon: <Clock size={20} />, label: '7. Study Station' },
    { id: 'profile', icon: <User size={20} />, label: '8. My Profile' },
  ];

  return (
    <div className={`flex h-screen font-sans ${t.bgMain} ${t.textMain} overflow-hidden transition-colors relative`}>
      <div
        className={`absolute inset-0 z-0 pointer-events-none select-none flex flex-col justify-center font-black text-[12rem] xl:text-[16rem] leading-[0.8] whitespace-nowrap ${isDarkMode ? 'text-white/5' : 'text-black/5'}`}
        style={{ backgroundImage: t.watermark, backgroundSize: '40px 40px' }}
      >
        <span className="ml-[-50px]">EDU GROWTH</span>
        <span className="ml-20">TOP 1% ELITE</span>
        <span className="ml-[-100px]">ANALYTICS</span>
      </div>

      {/* SIDEBAR */}
      <div className={`${t.bgCard} ${t.borderTheme} border-y-0 border-l-0 flex flex-col z-20 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-24 border-b-4 border-black flex items-center justify-center overflow-hidden shrink-0 bg-[#fef08a] cursor-pointer hover:bg-[#fde047] transition-colors"
          title="Toggle Menu"
        >
          <div className="bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 transition-transform hover:-translate-y-1">
            <GraduationCap size={28} strokeWidth={3} className="text-black" />
          </div>
          {isSidebarOpen && (
            <h1 className="font-black text-2xl xl:text-3xl uppercase text-black ml-3 tracking-tighter" style={{ textShadow: '2px 2px 0px #fff' }}>
              Edu Growth
            </h1>
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
                  : `hover:border-black hover:bg-[#fef08a] hover:text-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`
              }`}
              title={item.label}
            >
              <div className="shrink-0">{item.icon}</div>
              {isSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className={`h-24 border-b-4 border-black flex items-center justify-between px-6 xl:px-10 shrink-0 bg-gradient-to-r ${isDarkMode ? 'from-slate-900 via-indigo-950 to-black' : 'from-[#e0e7ff] via-[#fef08a] to-[#dcfce3]'}`}>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-black text-white px-4 py-3 border-4 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ml-2">
              <Zap size={18} className="text-yellow-400" />
              <span className="font-black uppercase tracking-widest text-sm">Student Workspace</span>
            </div>
            <ApiStatusChip online={apiOnline} loading={analysisReq.loading} dark={isDarkMode} />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all ${isDarkMode ? 'bg-[#1e293b] text-yellow-400' : 'bg-white text-black'}`}
            >
              {isDarkMode ? <Sun size={24} strokeWidth={3} /> : <Moon size={24} strokeWidth={3} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-4 bg-white border-4 border-black px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-black"
              >
                <div className="hidden sm:block text-right">
                  <p className="font-black text-sm uppercase">{fullName}</p>
                  <p className="font-bold text-[10px] uppercase tracking-widest text-zinc-500">{rollNo}</p>
                </div>
                <div className="w-10 h-10 font-black flex items-center justify-center border-4 border-black bg-[#a7f3d0] text-xl">
                  {identity?.avatar || 'ST'}
                </div>
              </button>

              {showProfileMenu && (
                <div className={`absolute top-full right-0 mt-4 w-72 border-4 border-black ${t.bgCard} shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-50`}>
                  <div className="px-6 py-6 border-b-4 border-black bg-[#fef08a] text-black">
                    <p className="font-black text-xl uppercase">{fullName}</p>
                    <p className="text-xs font-black uppercase tracking-widest mt-2">
                      {rollNo} | {identity?.class_section || '—'}
                    </p>
                  </div>
                  <button onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }} className={`w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 hover:bg-[#c4b5fd] hover:text-black transition-colors ${t.textMain}`}>
                    <User size={20} strokeWidth={3} /> My Profile
                  </button>
                  <button onClick={() => { setActiveModal('settings'); setShowProfileMenu(false); }} className={`w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 hover:bg-[#bfdbfe] hover:text-black transition-colors ${t.textMain}`}>
                    <Settings size={20} strokeWidth={3} /> Settings
                  </button>
                  <div className="border-t-4 border-black"></div>
                  <button onClick={onLogout} className="w-full text-left px-6 py-5 text-sm font-black uppercase flex items-center gap-4 bg-[#fca5a5] text-black hover:bg-red-500 transition-colors">
                    <LogOut size={20} strokeWidth={3} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-6 xl:p-10 relative ${hideScrollbar}`}>
          <div className="w-full space-y-10 max-w-[1600px] mx-auto">
            {analysisReq.loading && !analysis && <LoadingBlock label="Fetching your analytics…" dark={isDarkMode} />}
            {analysisReq.error && !analysis && (
              <ErrorBlock error={analysisReq.error} onRetry={analysisReq.run} dark={isDarkMode} />
            )}

            {analysis && (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab identity={identity} analysis={analysis} cgpa={cgpa} cgpaLoading={cgpaReq.loading} dark={isDarkMode} />
                )}
                {activeTab === 'marks' && <MarksTab analysis={analysis} dark={isDarkMode} />}
                {activeTab === 'attendance' && <AttendanceTab analysis={analysis} dark={isDarkMode} />}
                {activeTab === 'risks' && <RisksTab analysis={analysis} dark={isDarkMode} />}
                {activeTab === 'predictor' && (
                  <PredictorTab
                    rollNo={rollNo}
                    cgpa={cgpa}
                    cgpaReq={cgpaReq}
                    analysis={analysis}
                    dark={isDarkMode}
                  />
                )}
                {activeTab === 'mentors' && <MentorsTab analysis={analysis} dark={isDarkMode} />}
                {activeTab === 'studyStation' && <StudyStationTab dark={isDarkMode} hideScrollbar={hideScrollbar} />}
                {activeTab === 'profile' && (
                  <ProfileTab identity={identity} student={student} analysis={analysis} cgpa={cgpa} dark={isDarkMode} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {activeModal === 'settings' && (
        <SettingsModal onClose={() => setActiveModal(null)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} bgCard={t.bgCard} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ApiStatusChip({ online, loading, dark }) {
  if (loading) {
    return (
      <span className={`hidden md:flex items-center gap-2 px-3 py-2 border-4 border-black text-xs font-black uppercase tracking-widest ${dark ? 'bg-[#1e293b] text-slate-200' : 'bg-white text-black'}`}>
        <Loader2 className="animate-spin" size={15} /> Syncing
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
/* 1. OVERVIEW                                                         */
/* ================================================================== */
function OverviewTab({ identity, analysis, cgpa, cgpaLoading, dark }) {
  const metrics = analysis.academic_metrics || {};
  const weakCount = metrics.total_weak_areas ?? (analysis.subjects || []).filter((s) => s.mentor_needed).length;

  const subjectScoreData = (analysis.subjects || [])
    .map((s) => ({ subject: (s.subject || '').toUpperCase(), score: Number(s.score_pct) || 0, status: s.status }))
    .filter((s) => s.subject);

  const atRisk = (analysis.subjects || []).filter((s) => s.mentor_needed || s.status === 'weak').length;
  const weakVsHealthyData = [
    { name: 'At Risk', value: atRisk, color: '#fca5a5' },
    { name: 'Healthy', value: Math.max((analysis.subjects || []).length - atRisk, 0), color: '#a7f3d0' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Top Banners — Constrained Widths (live data) */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`flex-1 p-8 border-4 border-black bg-[#bfdbfe] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
          <div className="absolute right-[-10%] top-[-30%] opacity-20 pointer-events-none">
            <GraduationCap size={400} />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Hey {profileFirstName(identity?.full_name)}!</h1>
            <p className="font-bold text-lg text-black/70 mt-2">
              {analysis.recommendation_summary || 'Here is your live academic summary.'}
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <span className={`text-black border-2 border-black px-3 py-1 font-black text-sm uppercase ${weakCount > 0 ? 'bg-[#fca5a5]' : 'bg-[#a7f3d0]'}`}>
                {weakCount > 0 ? 'Need Help' : 'On Track'}
              </span>
              {analysis.priority_rank != null && (
                <span className="bg-black text-white border-2 border-black px-3 py-1 font-black text-sm uppercase">Priority Rank #{analysis.priority_rank}</span>
              )}
            </div>
          </div>
        </div>
        <div className={`w-full lg:w-1/3 p-8 border-4 border-black flex items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black ${weakCount > 0 ? 'bg-[#fca5a5]' : 'bg-[#a7f3d0]'}`}>
          {weakCount > 0 ? <AlertTriangle size={40} className="shrink-0" /> : <CheckCircle2 size={40} className="shrink-0" />}
          <div>
            <h3 className="font-black text-2xl uppercase">{weakCount > 0 ? 'Action Required' : 'All Clear'}</h3>
            <p className="font-bold text-sm mt-1">{weakCount} weak area{weakCount === 1 ? '' : 's'} detected. Check Risk Alerts.</p>
          </div>
        </div>
      </div>

      {/* 4-Grid Squarish Tiles (live metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <div className={`p-8 bg-[#a7f3d0] text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center min-h-[160px]`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 bg-black/10 px-2 py-1 w-fit mb-2">Overall Attendance</p>
          <h3 className="text-5xl font-black">{fmt(metrics.overall_attendance_pct, 1)}%</h3>
        </div>
        <div className={`p-8 bg-[#93c5fd] text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center min-h-[160px]`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 bg-black/10 px-2 py-1 w-fit mb-2">Average Score</p>
          <h3 className="text-5xl font-black">{fmt(metrics.average_percentage, 1)}%</h3>
        </div>
        <div className={`p-8 bg-[#e9d5ff] text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center min-h-[160px]`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 bg-black/10 px-2 py-1 w-fit mb-2">Predicted CGPA</p>
          <h3 className="text-5xl font-black">{cgpaLoading ? '…' : fmt(cgpa?.predicted_grade, 2)}</h3>
          {cgpa?.confidence_display && <p className="text-xs font-bold mt-1">{cgpa.confidence_display} Confidence</p>}
        </div>
        <div className={`p-8 bg-[#fef08a] text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center min-h-[160px]`}>
          <p className="text-xs font-black uppercase tracking-widest text-black/60 bg-black/10 px-2 py-1 w-fit mb-2">Weak Areas</p>
          <h3 className="text-5xl font-black">{weakCount}</h3>
        </div>
      </div>

      {/* Restored Subject Scores Graph */}
      <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
        <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Subject Scores</h3>
        {subjectScoreData.length ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectScoreData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} />
                <XAxis dataKey="subject" stroke={dark ? '#fff' : '#000'} tick={{ fontSize: 14, fontWeight: 'bold' }} axisLine={{ strokeWidth: 4 }} />
                <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900 }} axisLine={{ strokeWidth: 4 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.08)' }} contentStyle={tooltipDark(dark)} />
                <ReferenceLine y={40} stroke="#ef4444" strokeWidth={3} strokeDasharray="6 4" />
                <Bar dataKey="score" stroke="#000" strokeWidth={3} barSize={40}>
                  {subjectScoreData.map((entry, i) => (
                    <Cell key={i} fill={statusColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyBlock dark={dark} message="No subject scores available." />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* WEAK VS STRONG Pie Chart (live risk split) */}
        <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col`}>
          <h3 className="text-xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Weak vs Strong</h3>
          {weakVsHealthyData.length ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
                  <Pie
                    data={weakVsHealthyData}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="#000"
                    strokeWidth={4}
                    fill={dark ? '#fff' : '#000'}
                    labelLine={{ stroke: dark ? '#fff' : '#000', strokeWidth: 2 }}
                    label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}
                  >
                    {weakVsHealthyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipDark(dark)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyBlock dark={dark} message="No risk split available." />
          )}
        </div>

        {/* Recommended Next Steps with LARGER FONTS (live) */}
        <div className={`lg:col-span-2 p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
          <h3 className="text-xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Recommended Next Steps</h3>
          {analysis.recommendations?.length ? (
            <div className="space-y-4">
              {analysis.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="bg-[#fef08a] text-black border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
                    <span className="font-black text-2xl uppercase">{(rec.subject || '').toUpperCase()}</span>
                    <span className="bg-black text-white px-2 py-1 text-xs font-black">P{rec.priority ?? i + 1}</span>
                  </div>
                  <p className="font-bold text-lg mb-2">{rec.action || rec.focus}</p>
                  <div className="flex flex-wrap gap-4 text-sm font-bold text-black/70 uppercase">
                    <p>Mentor: {rec.mentor || '—'}</p>
                    {rec.peer_mentor && <p>Peer: {rec.peer_mentor}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock dark={dark} message="No recommendations available." />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 2. MARKS ANALYTICS                                                  */
/* ================================================================== */
function MarksTab({ analysis, dark }) {
  const subjects = analysis.subjects || [];
  const [selected, setSelected] = useState(subjects[0]?.subject || '');
  const activeSubject = subjects.find((s) => s.subject === selected) || subjects[0];
  const unitData = (activeSubject?.units || []).map((u) => ({
    unit: u.unit,
    score: Number(u.score_pct) || 0,
    status: u.status,
  }));
  const components = activeSubject?.components || {};

  return (
    <div className="w-full space-y-10">
      <h2 className="text-4xl md:text-5xl font-black uppercase border-b-4 border-black pb-4 inline-block">Marks Analytics</h2>

      {/* Unit-Wise Performance with min-height */}
      <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h3 className="text-2xl font-black uppercase">Unit-Wise Performance</h3>
          <select
            value={activeSubject?.subject || ''}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-[#fef08a] text-black border-4 border-black p-3 text-lg font-black outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer w-fit"
          >
            {subjects.map((s) => (
              <option key={s.subject} value={s.subject}>{s.label || s.subject}</option>
            ))}
          </select>
        </div>

        {unitData.length ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} strokeWidth={3} />
                <XAxis dataKey="unit" stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900, fontSize: 14 }} />
                <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={tooltipDark(dark)} />
                <ReferenceLine y={40} stroke="#ef4444" strokeWidth={3} strokeDasharray="6 4" label={{ position: 'top', value: 'WEAK', fill: '#ef4444', fontWeight: 'black', fontSize: 12 }} />
                <Bar dataKey="score" stroke="#000" strokeWidth={4} barSize={44}>
                  {unitData.map((u, i) => <Cell key={i} fill={statusColor(u.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyBlock dark={dark} message="This subject has no unit breakdown in the current response." />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 w-full">
        <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Component Breakdown</h3>
          {activeSubject ? (
            <div className="space-y-5">
              <ComponentRow label="ST1" value={components.st1_pct} />
              <ComponentRow label="ST2" value={components.st2_pct} />
              <ComponentRow label="PUT" value={components.put_pct} />
              <ComponentRow label="Unit Average" value={components.unit_avg_pct} />
              <ComponentRow label="Assignment" value={components.assignment_score} max={10} />
              <ComponentRow label="Quiz" value={components.quiz_score} max={10} />
              <div className="flex justify-between items-center bg-[#fef08a] border-4 border-black p-4 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black uppercase tracking-widest text-sm">Assignment Delay</span>
                <span className="text-2xl font-black">{fmt(components.assignment_delay_hours, 1)} h</span>
              </div>
              <div className="flex justify-between items-center bg-[#bfdbfe] border-4 border-black p-4 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black uppercase tracking-widest text-sm">Current Teacher</span>
                <span className="text-lg font-black">{activeSubject.current_teacher || '—'}</span>
              </div>
            </div>
          ) : (
            <EmptyBlock dark={dark} message="No components available." />
          )}
        </div>

        {/* Lab Assessments (grid tiles) */}
        <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Lab Assessments</h3>
          {analysis.labs?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysis.labs.map((lab, i) => (
                <div key={i} className="flex flex-col justify-between gap-4 bg-[#a7f3d0] border-4 border-black p-6 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                  <span className="text-2xl font-black uppercase">{lab.label || lab.lab}</span>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-3xl font-black bg-white border-4 border-black px-4 py-2">{fmt(lab.score_pct, 1)}%</span>
                    {lab.parts?.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {lab.parts.map((p, j) => (
                          <span key={j} className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-2 py-1" style={{ backgroundColor: statusColor(p.status) }}>
                            {p.part}: {fmt(p.score_pct, 1)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock dark={dark} message="No lab data available." />
          )}
        </div>
      </div>

      {(analysis.labs || []).length > 0 && (
        <div className={`p-8 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Lab Parts Comparison</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.labs.flatMap((lab) =>
                  (lab.parts || []).map((p) => ({ name: `${(lab.lab || '').toUpperCase()} · ${p.part}`, score: Number(p.score_pct) || 0 }))
                )}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} />
                <XAxis dataKey="name" stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900, fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={tooltipDark(dark)} />
                <Bar dataKey="score" fill="#c4b5fd" stroke="#000" strokeWidth={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ComponentRow({ label, value, max = 100 }) {
  const n = Number(value);
  const has = Number.isFinite(n);
  const pct = has ? Math.max(0, Math.min(100, (n / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between font-black uppercase text-sm mb-2">
        <span>{label}</span>
        <span>{has ? `${n.toFixed(1)}${max === 100 ? '%' : `/${max}`}` : '—'}</span>
      </div>
      <div className="h-6 w-full bg-zinc-200 border-4 border-black overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className={`h-full border-r-4 border-black ${pct < 40 ? 'bg-[#fca5a5]' : pct < 60 ? 'bg-[#fde047]' : 'bg-[#86efac]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ================================================================== */
/* 3. ATTENDANCE                                                       */
/* ================================================================== */
function AttendanceTab({ analysis, dark }) {
  const metrics = analysis.academic_metrics || {};
  const subjects = (analysis.subjects || []).filter((s) => s.attendance_pct != null);
  const labs = (analysis.labs || []).filter((l) => l.attendance_pct != null);
  const overall = Number(metrics.overall_attendance_pct);
  const rows = [
    ...subjects.map((s) => ({ name: (s.label || s.subject).toUpperCase(), val: Number(s.attendance_pct) })),
    ...labs.map((l) => ({ name: `${(l.label || l.lab).toUpperCase()} (LAB)`, val: Number(l.attendance_pct) })),
  ];

  return (
    <div className={`p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
      <h2 className="text-5xl font-black uppercase tracking-tight mb-12 border-b-4 border-black pb-4 inline-block">Attendance Panel</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-4">

        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase mb-6">Subjects & Labs</h3>
          {rows.length ? (
            rows.map((sub, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between font-black uppercase text-lg mb-2">
                  <span>{sub.name}</span>
                  <span className={sub.val < 75 ? 'text-red-500' : 'text-emerald-500'}>{sub.val.toFixed(1)}%</span>
                </div>
                <div className="h-8 w-full bg-zinc-200 border-4 border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className={`h-full border-r-4 border-black ${Number.isFinite(sub.val) && sub.val >= 75 ? 'bg-[#a7f3d0]' : 'bg-[#fca5a5]'}`} style={{ width: `${Math.min(sub.val, 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <EmptyBlock dark={dark} message="No attendance breakdown in the response." />
          )}
        </div>

        <div className={`flex flex-col items-center justify-center border-4 border-black p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#312e81]' : 'bg-[#e0e7ff]'} relative`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }} />
          <h3 className="text-3xl font-black uppercase mb-8 relative z-10 bg-white border-4 border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">Overall Distribution</h3>

          <div className="h-80 w-full relative z-10 bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={[
                    { name: 'Present', value: Number.isFinite(overall) ? overall : 0, color: '#a7f3d0' },
                    { name: 'Absent', value: Number.isFinite(overall) ? Math.max(100 - overall, 0) : 100, color: '#fca5a5' },
                  ]}
                  innerRadius={60}
                  outerRadius={92}
                  dataKey="value"
                  fill="#000"
                  stroke="#000"
                  strokeWidth={4}
                  labelLine={{ stroke: '#000', strokeWidth: 2 }}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#a7f3d0" />
                  <Cell fill="#fca5a5" />
                </Pie>
                <Tooltip contentStyle={tooltipDark(false)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mt-2">
              <span className="text-6xl xl:text-7xl font-black text-black">{Number.isFinite(overall) ? `${overall.toFixed(0)}%` : '—'}</span>
            </div>
          </div>
          <p className="relative z-10 mt-6 font-black uppercase tracking-widest text-sm text-black/70">
            {Number.isFinite(overall) && overall < 75 ? 'Below 75% threshold — attend more classes.' : 'Attendance is healthy. Keep it up!'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 4. RISK ALERTS                                                      */
/* ================================================================== */
function RisksTab({ analysis, dark }) {
  const risky = [
    ...(analysis.subjects || []).filter((s) => s.mentor_needed || s.status === 'weak').map((s) => ({ ...s, kind: 'subject' })),
    ...(analysis.labs || []).filter((l) => l.mentor_needed || l.status === 'weak').map((l) => ({ ...l, subject: l.lab, kind: 'lab' })),
  ];
  const chartData = risky.map((r) => ({ subject: (r.label || r.subject || r.lab || '').toUpperCase(), score: Number(r.score_pct) || 0 }));
  const riskCount = analysis.risk_count ?? risky.length;

  return (
    <div className={`p-8 xl:p-12 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
      <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-8 border-b-4 border-black pb-4 inline-block">Risk Alerts</h2>

      <div className={`mb-10 p-6 border-4 border-black text-black flex items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-fit ${risky.length ? 'bg-[#fca5a5]' : 'bg-[#a7f3d0]'}`}>
        {risky.length ? <AlertTriangle size={32} strokeWidth={3} className="shrink-0" /> : <CheckCircle2 size={32} strokeWidth={3} className="shrink-0" />}
        <div>
          <h3 className="text-2xl font-black uppercase">{risky.length ? 'Action Required' : 'All Clear'}</h3>
          <p className="font-bold text-base mt-1 uppercase tracking-widest">{riskCount} subject/lab area(s) flagged by the risk engine.</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mb-12 border-4 border-black p-8 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2 inline-block">Danger Line Analysis</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" stroke="#000" tick={{ fontWeight: 'bold', fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="#000" tick={{ fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={tooltipDark(false)} />
                <ReferenceLine y={40} stroke="red" strokeWidth={4} strokeDasharray="5 5" label={{ position: 'top', value: 'DANGER ZONE', fill: 'red', fontWeight: 'black' }} />
                <Bar dataKey="score" fill="#fca5a5" stroke="#000" strokeWidth={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {risky.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {risky.map((risk, idx) => {
            const weakParts = risk.weak_units?.map((w) => w.unit) || risk.weak_parts || [];
            return (
              <div key={idx} className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform bg-[#fca5a5] flex flex-col gap-6">
                <div className="flex justify-between items-start text-black mb-2 border-b-4 border-black pb-4">
                  <h3 className="text-3xl font-black uppercase leading-none">{(risk.label || risk.subject || risk.lab || '').toUpperCase()}</h3>
                  <span className="bg-black text-white px-3 py-2 font-black uppercase tracking-widest text-xs border-2 border-white shrink-0">
                    {risk.kind === 'lab' ? 'Lab' : 'Subject'} · {fmt(risk.score_pct, 1)}%
                  </span>
                </div>
                <div className="space-y-4 text-black">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-black/70 mb-2">Weak Areas</p>
                    <p className="font-black text-xl bg-white border-4 border-black px-4 py-2 w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {(weakParts.length ? weakParts.join(', ') : risk.lowest_unit || 'Overall')}
                    </p>
                  </div>
                  {risk.reason && (
                    <div className="bg-black text-white border-4 border-black p-4 mt-2">
                      <p className="text-xs font-black uppercase text-white/60 mb-1">Diagnostic Reason</p>
                      <p className="font-bold text-lg">{risk.reason}</p>
                    </div>
                  )}
                  {risk.suggested_action && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">Suggested Action</p>
                      <p className="font-black text-base text-black">{risk.suggested_action}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBlock dark={dark} message="No risk flags for this student." />
      )}
    </div>
  );
}

/* ================================================================== */
/* 5. CGPA PREDICTOR                                                   */
/* ================================================================== */
function PredictorTab({ rollNo, cgpa, cgpaReq, analysis, dark }) {
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const loadReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const data = await getMentorReport(rollNo);
      setReport(data?.report_text || '');
    } catch (err) {
      setReportError(err);
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentor-report-${rollNo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = analysis.academic_metrics || {};
  const weakCount = metrics.total_weak_areas ?? (analysis.subjects || []).filter((s) => s.mentor_needed).length;
  const features = [
    { label: 'Attendance', value: metrics.overall_attendance_pct != null ? `${fmt(metrics.overall_attendance_pct, 1)}%` : '—' },
    { label: 'Average Score', value: metrics.average_percentage != null ? `${fmt(metrics.average_percentage, 1)}%` : '—' },
    { label: 'Weak Areas', value: weakCount },
    { label: 'Previous CGPA', value: metrics.previous_cgpa != null ? fmt(metrics.previous_cgpa, 2) : '—' },
  ];
  const confidenceScore = Number(cgpa?.confidence_score);
  const confidencePct = Number.isFinite(confidenceScore) ? Math.max(0, Math.min(100, confidenceScore)) : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 w-full">
      {/* ENGINE */}
      <div className={`p-8 xl:p-12 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col w-full`}>
        <div className="flex items-center gap-4 border-b-4 border-black pb-6 mb-8">
          <div className="p-3 bg-[#c4b5fd] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <Calculator size={36} strokeWidth={3} className="text-black" />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight">Predictor Engine</h2>
            <p className="text-sm font-black uppercase tracking-widest opacity-60 mt-1">AI Grade Predictor · Σ live student profile</p>
          </div>
        </div>

        <p className="font-bold text-base mb-8 opacity-80">
          The model predicts your final grade by learning from your{' '}
          <span className="font-black">attendance, unit scores, exam components and weak-area load</span>. Press{' '}
          <span className="font-black">Run Prediction</span> to watch it work.
        </p>

        {/* Model inputs (live) */}
        <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2 inline-block">Model Inputs (live)</h3>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {features.map((f, i) => (
            <div key={i} className="p-5 border-4 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">{f.label}</p>
              <p className="text-3xl font-black leading-none">{f.value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => cgpaReq.run()}
          disabled={cgpaReq.loading}
          className="w-full py-6 uppercase font-black text-2xl bg-[#c4b5fd] text-black border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {cgpaReq.loading ? <><Loader2 className="animate-spin w-8 h-8" /> Predicting…</> : <><Zap className="w-8 h-8" /> Run Prediction</>}
        </button>

        {cgpaReq.error && (
          <div className="mt-8 p-4 bg-[#fca5a5] border-4 border-black text-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {cgpaReq.error.message}
          </div>
        )}

        {cgpa && (
          <div className="mt-10 p-8 bg-[#a7f3d0] border-4 border-black text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm font-black uppercase tracking-widest text-black/70 mb-3 flex items-center justify-center gap-2">
              <Zap size={16} /> Model Prediction · Final Grade (0–10)
            </p>
            <h1 className="text-8xl font-black text-black leading-none">{fmt(cgpa.predicted_grade, 2)}</h1>
            {metrics.previous_cgpa != null && (
              <p className="mt-3 text-sm font-black uppercase tracking-widest text-black/60">
                Previous {fmt(metrics.previous_cgpa, 2)} → Predicted {fmt(cgpa.predicted_grade, 2)}
              </p>
            )}
            <div className="mt-6 mx-auto max-w-md">
              <div className="flex justify-between font-black uppercase text-xs mb-2">
                <span>Model Confidence</span>
                <span>{cgpa.confidence_display || `${fmt(cgpa.confidence_score, 1)}%`}</span>
              </div>
              <div className="h-6 w-full bg-white border-4 border-black overflow-hidden">
                <div className="h-full bg-black transition-all duration-700" style={{ width: `${confidencePct}%` }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 border-t-4 border-dashed border-black/30 pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-xl font-black uppercase">Printable Mentor Report</h4>
              <p className="text-xs font-bold opacity-60">Plain-text report generated by the analytics engine.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadReport}
                disabled={reportLoading}
                className="flex items-center gap-2 bg-[#fde047] text-black font-black uppercase text-sm px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform disabled:opacity-60"
              >
                {reportLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Generate
              </button>
              <button
                onClick={downloadReport}
                disabled={!report}
                className="flex items-center gap-2 bg-[#bfdbfe] text-black font-black uppercase text-sm px-4 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform disabled:opacity-40"
              >
                <Printer size={18} /> Download
              </button>
            </div>
          </div>
          {reportError && <p className="mt-4 text-sm font-bold text-red-500">{reportError.message}</p>}
          {report && (
            <pre className={`mt-5 p-5 border-4 border-black text-xs font-mono whitespace-pre-wrap overflow-auto max-h-72 ${dark ? 'bg-[#0b1220] text-slate-200' : 'bg-[#0b1220] text-emerald-200'}`}>
              {report}
            </pre>
          )}
        </div>
      </div>

      {/* WHY THIS SCORE */}
      <div className={`p-8 xl:p-12 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col w-full`}>
        <div className="border-b-4 border-black pb-6 mb-8">
          <h3 className="text-3xl font-black uppercase tracking-tight">Why this score</h3>
          <p className="text-sm font-black uppercase tracking-widest opacity-60 mt-1">weak signals feeding the prediction</p>
        </div>

        {analysis.recommendations?.length ? (
          <div className="space-y-8 flex-1">
            {analysis.recommendations.slice(0, 4).map((rec, i) => (
              <div key={i} className="p-6 border-4 border-black text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-xl uppercase">{(rec.subject || '').toUpperCase()} · {rec.type || 'area'}</h4>
                  <span className="font-black bg-white border-2 border-black px-2 py-1 text-xs">{fmt(rec.score_pct, 1)}%</span>
                </div>
                <p className="font-bold text-base">{rec.action || rec.focus}</p>
                <p className="text-xs font-black uppercase tracking-widest mt-2 opacity-70">
                  Mentor: {rec.mentor || '—'} {rec.peer_mentor ? `· Peer: ${rec.peer_mentor}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock dark={dark} message="No recommendation signals available." />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* 6. ALLOCATED MENTORS                                                */
/* ================================================================== */
function MentorsTab({ analysis, dark }) {
  const mentorItems = [
    ...(analysis.subjects || []).filter((s) => s.mentor_needed && s.mentor).map((s) => ({
      kind: 'Subject',
      name: s.label || s.subject,
      focus: s.lowest_unit || s.weak_units?.map((w) => w.unit).join(', ') || 'Overall',
      mentor: s.mentor,
      peer: s.peer_mentor,
      score: Number(s.score_pct) || 0,
      action: s.suggested_action,
    })),
    ...(analysis.labs || []).filter((l) => l.mentor_needed && l.mentor).map((l) => ({
      kind: 'Lab',
      name: l.label || l.lab,
      focus: (l.weak_parts || []).join(', ') || 'Overall',
      mentor: l.mentor,
      peer: l.peer_mentor,
      score: Number(l.score_pct) || 0,
      action: l.suggested_action,
    })),
  ];

  const ratingData = mentorItems
    .filter((m) => m.mentor?.rating != null)
    .map((m) => ({ subject: (m.name || '').toUpperCase(), rating: Number(m.mentor.rating) }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 w-full">
      <div className={`p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
        <h2 className="text-4xl font-black uppercase tracking-tight mb-2">Allocated Mentors</h2>
        <p className="text-sm font-black uppercase tracking-widest mb-10 border-b-4 border-black pb-4 opacity-60">
          Auto-assigned from weak subject / lab analysis.
        </p>
        <div className={`space-y-8 w-full max-h-[640px] overflow-y-auto pr-2 ${hideScrollbar}`}>
          {mentorItems.length ? (
            mentorItems.map((m, idx) => (
              <div key={idx} className="p-6 border-4 border-black flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform text-black" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                <div className="flex justify-between items-center border-b-4 border-black pb-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase">{(m.name || '').toUpperCase()}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">{m.kind}</span>
                  </div>
                  <span className="font-black text-xl bg-white border-4 border-black px-4 py-2">{fmt(m.score, 1)}%</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Target Weakness</p>
                  <p className="font-black text-lg bg-white border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{m.focus}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border-4 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Faculty Mentor</p>
                    <p className="font-black text-lg">{m.mentor?.name || '—'}</p>
                    {m.mentor?.expertise_unit && <p className="text-xs font-bold opacity-70">Expertise: {m.mentor.expertise_unit}</p>}
                    {m.mentor?.rating != null && <p className="text-xs font-black mt-1">⭐ {fmt(m.mentor.rating, 1)}/10</p>}
                  </div>
                  <div className="bg-white border-4 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Peer Mentor</p>
                    <p className="font-black text-lg">{m.peer?.name || '—'}</p>
                    {m.peer?.roll_no && <p className="text-xs font-bold opacity-70">Roll: {m.peer.roll_no}</p>}
                    {m.peer?.score_pct != null && <p className="text-xs font-black mt-1">Score: {fmt(m.peer.score_pct, 1)}%</p>}
                  </div>
                </div>
                {m.action && (
                  <div className="bg-black text-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Suggested Action</p>
                    <p className="font-bold text-sm">{m.action}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyBlock dark={dark} message="No mentors allocated — no weak areas!" />
          )}
        </div>
      </div>

      <div className={`p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full flex flex-col`}>
        <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Mentor Ratings</h3>
        {ratingData.length ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} />
                <XAxis type="number" domain={[0, 10]} stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 'bold' }} />
                <YAxis dataKey="subject" type="category" stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: '900', fontSize: 12 }} width={90} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={tooltipDark(dark)} />
                <Bar dataKey="rating" fill="#c4b5fd" stroke="#000" strokeWidth={4} label={{ position: 'right', fill: dark ? '#fff' : '#000', fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyBlock dark={dark} message="No mentor ratings available." />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* 7. STUDY STATION (local only)                                       */
/* ================================================================== */
const motivationalQuotes = [
  'TOP 1% EXECUTION', 'OUTWORK YOUR EXCUSES', 'ELEVATE YOUR POTENTIAL',
  'NO EXCUSES. JUST RESULTS.', 'FOCUS ON BEING PRODUCTIVE',
];

function StudyStationTab({ dark, hideScrollbar }) {
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [goals, setGoals] = useState([{ id: 1, text: 'Complete OS Subnetting', deadline: '2026-10-10', done: false }]);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return undefined;
    const interval = setInterval(() => setTimeLeft((time) => time - 1), 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleToggle = () => {
    if (timeLeft <= 0) {
      setTimeLeft(totalTime);
      setIsActive(true);
      return;
    }
    setIsActive((active) => !active);
  };
  const handleReset = () => { setIsActive(false); setTimeLeft(totalTime); };
  const handleAddGoal = (e) => {
    e.preventDefault();
    if (newGoal.trim() !== '') {
      setGoals([{ id: Date.now(), text: newGoal, deadline: newDeadlineDate || 'N/A', done: false }, ...goals]);
      setNewGoal(''); setNewDeadlineDate('');
    }
  };
  const toggleGoal = (id) => setGoals(goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const secondsDegrees = ((60 - (timeLeft % 60)) / 60) * 360;
  const minutesDegrees = ((totalTime - timeLeft) / totalTime) * 360;
  const timerBg = dark ? 'bg-[#1e293b]' : 'bg-[#e0f2fe]';
  const missionBg = dark ? 'bg-[#1e293b]' : 'bg-[#fae8ff]';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 relative w-full">
      <div className="xl:col-span-2 bg-[#fef08a] border-4 border-black p-4 overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full">
        <p className="font-black text-2xl xl:text-3xl text-black uppercase tracking-widest animate-pulse text-center">🔥 {quote}</p>
      </div>

      <div className={`p-10 xl:p-14 ${timerBg} border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center w-full`}>
        <h2 className="text-4xl font-black uppercase mb-10 border-b-4 border-black pb-3 inline-block text-black">Focus Timer</h2>
        <div className="flex gap-6 mb-12">
          {[25, 50, 90].map((mins) => (
            <button key={mins} onClick={() => { setTotalTime(mins * 60); setTimeLeft(mins * 60); setIsActive(false); }} className={`px-8 py-3 border-4 border-black font-black text-2xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all ${totalTime / 60 === mins ? 'bg-[#fde047] text-black' : 'bg-white text-black'}`}>{mins}m</button>
          ))}
        </div>

        <div className="relative mb-12 transform scale-110 xl:scale-125">
          <svg width="240" height="240" viewBox="0 0 240 240" className="drop-shadow-[12px_12px_0px_rgba(0,0,0,1)] bg-white rounded-full border-8 border-black">
            {[...Array(12)].map((_, i) => <line key={i} x1="120" y1="20" x2="120" y2="35" stroke="black" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 30}, 120, 120)`} />)}
            <g transform={`rotate(${minutesDegrees}, 120, 120)`} className="transition-transform duration-1000 ease-linear"><line x1="120" y1="120" x2="120" y2="40" stroke="black" strokeWidth="8" strokeLinecap="round" /></g>
            <g transform={`rotate(${secondsDegrees}, 120, 120)`} className="transition-transform duration-1000 ease-linear"><line x1="120" y1="130" x2="120" y2="30" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" /><circle cx="120" cy="120" r="8" fill="#ef4444" stroke="black" strokeWidth="4" /></g>
          </svg>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-2 font-mono font-black text-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">{formatTime(timeLeft)}</div>
        </div>

        <div className="flex gap-6 w-full max-w-sm mt-8">
          <button onClick={handleToggle} className={`flex-1 py-5 text-2xl font-black uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all ${isActive && timeLeft > 0 ? 'bg-[#fca5a5]' : 'bg-[#e9d5ff]'} text-black`}>{isActive && timeLeft > 0 ? 'Pause' : 'Start'}</button>
          <button onClick={handleReset} className="px-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-white text-black"><RotateCcw size={28} strokeWidth={4} /></button>
        </div>
      </div>

      <div className={`p-10 xl:p-14 ${missionBg} border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col w-full`}>
        <h2 className="text-4xl font-black uppercase mb-10 border-b-4 border-black pb-3 inline-block text-black">Missions</h2>
        <form onSubmit={handleAddGoal} className="flex gap-4 mb-10 flex-col xl:flex-row">
          <input type="text" required value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="New Target..." className="flex-1 bg-white text-black border-4 border-black p-4 text-xl font-black focus:bg-[#fef08a] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
          <input type="date" required value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="bg-white text-black border-4 border-black p-4 text-xl font-black focus:bg-[#fef08a] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase" />
          <button type="submit" className="px-10 py-4 font-black text-2xl uppercase bg-black text-white border-4 border-black hover:bg-zinc-800 transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">Add</button>
        </form>

        <div className={`space-y-6 flex-1 overflow-y-auto ${hideScrollbar}`}>
          {goals.map((goal) => (
            <div key={goal.id} onClick={() => toggleGoal(goal.id)} className={`p-6 border-4 border-black flex items-center gap-6 cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ${goal.done ? 'bg-zinc-300 text-zinc-500 opacity-60 scale-[0.98]' : 'bg-[#fef08a] text-black hover:scale-[1.02]'}`}>
              <div className={`w-10 h-10 border-4 border-black flex items-center justify-center shrink-0 transition-colors duration-300 ${goal.done ? 'bg-black text-white' : 'bg-white'}`}>{goal.done && <CheckCircle2 size={32} strokeWidth={4} />}</div>
              <div className="flex-1">
                <p className={`font-black text-2xl transition-all duration-300 ${goal.done ? 'line-through decoration-black decoration-4' : ''}`}>{goal.text}</p>
                {goal.deadline !== 'N/A' && <p className="text-sm font-black uppercase bg-black text-white px-3 py-1 inline-block mt-2">Deadline: {goal.deadline}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 8. PROFILE                                                          */
/* ================================================================== */
function ProfileTab({ identity, student, analysis, cgpa, dark }) {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');
  const inputClass = `w-full border-4 border-black p-4 text-lg font-black focus:bg-[#fef08a] outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#0f172a] text-white' : 'bg-[#f4f4f5] text-black'}`;

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { setPassMsg('Error: Passwords do not match!'); return; }
    setPassMsg('Success: Password updated locally (auth service pending).');
    setTimeout(() => setPassMsg(''), 3000);
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const fields = [
    { label: 'Full Name', value: student?.full_name || identity?.full_name, bg: '#bfdbfe' },
    { label: 'Roll Number', value: student?.roll_no || identity?.roll_no, bg: '#fef08a' },
    { label: 'Class / Section', value: student?.class_section || identity?.class_section, bg: '#e9d5ff' },
    { label: 'Overall Attendance', value: analysis?.academic_metrics?.overall_attendance_pct != null ? `${fmt(analysis.academic_metrics.overall_attendance_pct, 1)}%` : undefined, bg: '#a7f3d0' },
    { label: 'Previous CGPA', value: analysis?.academic_metrics?.previous_cgpa != null ? fmt(analysis.academic_metrics.previous_cgpa, 2) : student?.previous_cgpa != null ? fmt(student.previous_cgpa, 2) : undefined, bg: '#bfdbfe' },
    { label: 'Predicted CGPA', value: cgpa?.predicted_grade != null ? fmt(cgpa.predicted_grade, 2) : undefined, bg: '#fbcfe8' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-12 w-full">
      <div className={`xl:col-span-2 p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col w-full`}>
        <h2 className="text-4xl font-black uppercase tracking-tight mb-10 border-b-4 border-black pb-4 inline-block">Master Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((f, i) => (
            <div key={i} className="p-6 min-h-[9rem] flex flex-col justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform text-black" style={{ backgroundColor: f.bg }}>
              <p className="text-sm font-black uppercase tracking-widest text-black/60 mb-2">{f.label}</p>
              <h3 className="text-3xl font-black uppercase break-all leading-tight">{f.value ?? '—'}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8 xl:gap-12 w-full">
        <div className={`p-8 xl:p-10 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex-1`}>
          <h3 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Security</h3>
          {passMsg && (
            <div className={`p-4 mb-6 border-4 border-black font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${passMsg.includes('Error') ? 'bg-[#fca5a5] text-black' : 'bg-[#a7f3d0] text-black'}`}>{passMsg}</div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">Current Password</label><input type="password" required value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">New Password</label><input type="password" required value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">Confirm Password</label><input type="password" required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <button type="submit" className="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 hover:-translate-y-1 transition-all">Update Key</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function SettingsModal({ onClose, isDarkMode, setIsDarkMode, bgCard }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className={`w-full max-w-lg p-10 border-4 border-black ${bgCard} shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]`}>
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-3xl font-black uppercase">App Settings</h2>
          <button onClick={onClose} className="border-4 border-black p-2 hover:bg-red-500 hover:text-white transition-colors"><Edit3 size={24} strokeWidth={3} /></button>
        </div>
        <p className="font-black text-base mb-8 uppercase text-zinc-500">Theme (dark/light) is controlled from the Sun/Moon icon in the top bar.</p>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full py-5 mb-4 bg-[#c4b5fd] text-black font-black text-xl uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">
          Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
        </button>
        <button onClick={onClose} className="w-full py-5 bg-[#fef08a] text-black font-black text-xl uppercase border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">Close Panel</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function t_bg(dark) {
  return dark ? 'bg-[#1e293b] text-white' : 'bg-white text-black';
}

function tooltipDark(dark) {
  return {
    backgroundColor: dark ? '#0f172a' : '#fff',
    border: '4px solid black',
    color: dark ? '#fff' : 'black',
    fontWeight: 900,
    boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
  };
}