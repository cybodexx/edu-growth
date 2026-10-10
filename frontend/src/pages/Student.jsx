import { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard, Calculator, CalendarCheck, Users, LogOut, GraduationCap,
  Sun, Moon, Settings, Edit3, Clock, CheckCircle2, RotateCcw, BookOpen,
  TrendingUp, AlertTriangle, Zap, User, BarChart2, ShieldAlert, Target,
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
  Panel, MetricCard, RiskBadge, LoadingBlock, ErrorBlock, EmptyBlock, SectionTitle,
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

          <div className="flex items-center gap-4">
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
          <div className="w-full space-y-10">
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
  const subjectScoreData = (analysis.subjects || [])
    .map((s) => ({ subject: (s.subject || '').toUpperCase(), score: Number(s.score_pct) || 0, status: s.status }))
    .filter((s) => s.subject);

  const weakCount = metrics.total_weak_areas ?? analysis.subjects.filter((s) => s.mentor_needed).length;

  return (
    <>
      <div className={`p-10 xl:p-14 border-4 border-black bg-[#bfdbfe] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden w-full`}>
        <div className="absolute right-[-10%] top-[-30%] opacity-20 pointer-events-none">
          <GraduationCap size={400} />
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl xl:text-7xl font-black tracking-tighter mb-4 uppercase leading-none">
            Hey {profileFirstName(identity?.full_name)}!
          </h1>
          <p className="font-black text-xl xl:text-2xl text-black/70">
            {analysis.recommendation_summary || 'Here is your live academic summary.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 relative z-10">
          <RiskBadge riskLevel={analysis.risk_level} />
          {analysis.priority_rank != null && (
            <span className="bg-black text-white px-4 py-2 font-black uppercase tracking-widest text-xs text-center">
              Priority Rank #{analysis.priority_rank}
            </span>
          )}
        </div>
      </div>

      {analysis.needs_intervention && (
        <div className="p-6 bg-[#fca5a5] border-4 border-black text-black flex items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse">
          <AlertTriangle size={36} strokeWidth={3} className="shrink-0" />
          <div>
            <h3 className="text-2xl font-black uppercase">Action Required</h3>
            <p className="font-bold text-sm uppercase tracking-widest mt-1">
              {weakCount} weak area{weakCount === 1 ? '' : 's'} detected. Check Risk Alerts & Mentors.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 w-full">
        <MetricCard title="Overall Attendance" value={`${fmt(metrics.overall_attendance_pct, 1)}%`} accent="#a7f3d0" icon={<CalendarCheck size={120} />} />
        <MetricCard title="Average Score" value={`${fmt(metrics.average_percentage, 1)}%`} accent="#bfdbfe" icon={<BookOpen size={120} />} />
        <MetricCard title="Predicted CGPA" value={cgpaLoading ? '…' : fmt(cgpa?.predicted_grade, 2)} accent="#e9d5ff" footnote={cgpa?.confidence_display ? `${cgpa.confidence_display} confidence` : undefined} icon={<TrendingUp size={120} />} />
        <MetricCard title="Weak Areas" value={weakCount} accent="#fef08a" icon={<Target size={120} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 w-full">
        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Subject Scores</SectionTitle>
          {subjectScoreData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectScoreData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} />
                  <XAxis dataKey="subject" stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900, fontSize: 11 }} axisLine={{ strokeWidth: 4 }} />
                  <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} tick={{ fontWeight: 900 }} axisLine={{ strokeWidth: 4 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.08)' }} contentStyle={tooltipDark(dark)} />
                  <ReferenceLine y={40} stroke="#ef4444" strokeWidth={3} strokeDasharray="6 4" />
                  <Bar dataKey="score" stroke="#000" strokeWidth={3} barSize={38}>
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
        </Panel>

        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Weak vs Healthy</SectionTitle>
          {subjectScoreData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'At risk', value: analysis.subjects.filter((s) => s.mentor_needed || s.status === 'weak').length, fill: '#fca5a5' },
                      { name: 'Healthy', value: Math.max(analysis.subjects.length - analysis.subjects.filter((s) => s.mentor_needed || s.status === 'weak').length, 0), fill: '#a7f3d0' },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={110}
                    stroke="#000"
                    strokeWidth={4}
                    paddingAngle={3}
                  >
                    {[0, 1].map((i) => (
                      <Cell key={i} fill={i === 0 ? '#fca5a5' : '#a7f3d0'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipDark(dark)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyBlock dark={dark} message="No risk split available." />
          )}
        </Panel>
      </div>

      {analysis.recommendations?.length > 0 && (
        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Recommended Next Steps</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analysis.recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="p-6 border-4 border-black bg-[#fef08a] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-3">
                  <p className="font-black uppercase text-lg">{(rec.subject || '').toUpperCase()}</p>
                  <span className="bg-black text-white text-[10px] px-2 py-1 font-black uppercase">P{rec.priority}</span>
                </div>
                <p className="font-bold text-sm mb-3">{rec.action || rec.focus}</p>
                <p className="text-xs font-black uppercase tracking-widest text-black/60">
                  Mentor: {rec.mentor || '—'}{rec.mentor_rating ? ` (${rec.mentor_rating})` : ''}
                </p>
                {rec.peer_mentor && (
                  <p className="text-xs font-black uppercase tracking-widest text-black/60 mt-1">Peer: {rec.peer_mentor}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
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
    <div className="w-full space-y-12">
      <h2 className="text-5xl font-black uppercase border-b-4 border-black pb-4 inline-block">Marks Analytics</h2>

      <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <h3 className="text-3xl font-black uppercase">Unit-Wise Performance</h3>
          <select
            value={activeSubject?.subject || ''}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-[#fef08a] text-black border-4 border-black p-4 text-xl font-black outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s.subject} value={s.subject}>{s.label || s.subject}</option>
            ))}
          </select>
        </div>

        {unitData.length ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke={dark ? '#3f3f46' : '#e4e4e7'} strokeWidth={3} />
                <XAxis dataKey="unit" stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900, fontSize: 14 }} />
                <YAxis domain={[0, 100]} stroke={dark ? '#fff' : '#000'} axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 900 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} contentStyle={tooltipDark(dark)} />
                <ReferenceLine y={40} stroke="#ef4444" strokeWidth={3} strokeDasharray="6 4" label={{ position: 'top', value: 'WEAK', fill: '#ef4444', fontWeight: 'black', fontSize: 12 }} />
                <Bar dataKey="score" stroke="#000" strokeWidth={4}>
                  {unitData.map((u, i) => <Cell key={i} fill={statusColor(u.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyBlock dark={dark} message="This subject has no unit breakdown in the current response." />
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 w-full">
        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Component Breakdown</SectionTitle>
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
        </Panel>

        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Lab Assessments</SectionTitle>
          <div className="space-y-6">
            {(analysis.labs || []).length ? (
              analysis.labs.map((lab, i) => (
                <div key={i} className="bg-[#a7f3d0] border-4 border-black p-4 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-black uppercase">{lab.label || lab.lab}</span>
                    <span className="text-2xl font-black bg-white border-4 border-black px-4 py-2">{fmt(lab.score_pct, 1)}%</span>
                  </div>
                  {lab.parts?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {lab.parts.map((p, j) => (
                        <span key={j} className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-2 py-1" style={{ backgroundColor: statusColor(p.status) }}>
                          {p.part}: {fmt(p.score_pct, 1)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <EmptyBlock dark={dark} message="No lab data available." />
            )}
          </div>
        </Panel>
      </div>

      {(analysis.labs || []).length > 0 && (
        <Panel className={`p-10 ${t_bg(dark)}`} dark={dark}>
          <SectionTitle dark={dark}>Lab Parts Comparison</SectionTitle>
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
        </Panel>
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
    ...subjects.map((s) => ({ name: (s.label || s.subject).toUpperCase(), val: Number(s.attendance_pct), kind: 'Subject' })),
    ...labs.map((l) => ({ name: `${(l.label || l.lab).toUpperCase()} (Lab)`, val: Number(l.attendance_pct), kind: 'Lab' })),
  ];

  return (
    <div className={`p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`} style={{ borderColor: '#000' }}>
      <h2 className="text-5xl font-black uppercase tracking-tight mb-12 border-b-4 border-black pb-4 inline-block">Attendance Panel</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-4">
        <div className="space-y-6">
          <h3 className="text-3xl font-black uppercase mb-4">Subjects & Labs</h3>
          {rows.length ? (
            rows.map((sub, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between font-black uppercase text-sm mb-2">
                  <span>{sub.name}</span>
                  <span className={sub.val < 75 ? 'text-red-500' : 'text-emerald-500'}>{sub.val.toFixed(1)}%</span>
                </div>
                <div className="h-8 w-full bg-zinc-200 border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className={`h-full border-r-4 border-black ${sub.val < 75 ? 'bg-[#fca5a5]' : 'bg-[#86efac]'}`} style={{ width: `${Math.min(sub.val, 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <EmptyBlock dark={dark} message="No attendance breakdown in the response." />
          )}
        </div>

        <div className={`flex flex-col items-center justify-center border-4 border-black p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#312e81]' : 'bg-[#e0e7ff]'} relative`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }} />
          <h3 className="text-3xl font-black uppercase mb-8 relative z-10 text-black">Overall Attendance</h3>
          <div className="h-72 w-full relative z-10 bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Present', value: Number.isFinite(overall) ? overall : 0, color: '#86efac' },
                    { name: 'Missed', value: Number.isFinite(overall) ? Math.max(100 - overall, 0) : 100, color: '#fca5a5' },
                  ]}
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={4}
                >
                  <Cell fill="#86efac" />
                  <Cell fill="#fca5a5" />
                </Pie>
                <Tooltip contentStyle={tooltipDark(false)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none mt-2">
              <span className="text-5xl font-black text-black">{Number.isFinite(overall) ? `${overall.toFixed(0)}%` : '—'}</span>
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
    <div className={`p-10 xl:p-14 border-4 border-black ${t_bg(dark)} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full`}>
      <h2 className="text-5xl font-black uppercase tracking-tight mb-4 flex items-center gap-4 border-b-4 border-black pb-4">
        <ShieldAlert size={48} strokeWidth={3} /> Risk Alerts
      </h2>

      <div className={`mt-6 mb-12 p-6 border-4 border-black text-black flex items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${risky.length ? 'bg-[#fca5a5]' : 'bg-[#a7f3d0]'}`}>
        {risky.length ? <AlertTriangle size={36} strokeWidth={3} className="shrink-0" /> : <CheckCircle2 size={36} strokeWidth={3} className="shrink-0" />}
        <div>
          <h3 className="text-2xl font-black uppercase">{risky.length ? 'Action Required' : 'All Clear'}</h3>
          <p className="font-bold text-sm uppercase tracking-widest mt-1">
            {risky.length ? `${riskCount} subject/lab area(s) flagged by the risk engine.` : 'No weak areas detected for you.'}
          </p>
        </div>
        <div className="ml-auto"><RiskBadge riskLevel={analysis.risk_level} /></div>
      </div>

      {chartData.length > 0 && (
        <div className="mb-12 border-4 border-black p-8 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-black uppercase mb-6 text-black border-b-4 border-black pb-2 inline-block">Danger Line Analysis</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" stroke="#000" tick={{ fontWeight: 'bold', fontSize: 11 }} />
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
          {risky.map((risk, idx) => {
            const weakParts = risk.weak_units?.map((w) => w.unit) || risk.weak_parts || [];
            return (
              <div key={idx} className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-transform bg-[#fca5a5]">
                <div className="flex justify-between items-start text-black mb-6 border-b-4 border-black pb-4">
                  <h3 className="text-3xl font-black uppercase">{(risk.label || risk.subject || risk.lab || '').toUpperCase()}</h3>
                  <span className="bg-black text-white px-3 py-2 font-black uppercase tracking-widest text-[10px] border-2 border-white">
                    {risk.kind === 'lab' ? 'Lab' : 'Subject'} · {fmt(risk.score_pct, 1)}%
                  </span>
                </div>
                <div className="space-y-4 text-black">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">Weak Areas</p>
                    <p className="font-black text-xl bg-white border-4 border-black px-4 py-2 inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {weakParts.length ? weakParts.join(', ') : risk.lowest_unit || 'Overall'}
                    </p>
                  </div>
                  {risk.reason && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">Diagnostic Reason</p>
                      <p className="font-bold text-sm border-l-4 border-black pl-3">{risk.reason}</p>
                    </div>
                  )}
                  {risk.suggested_action && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-black/70 mb-1">Suggested Action</p>
                      <p className="font-bold text-sm">{risk.suggested_action}</p>
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 w-full">
      <Panel className={`p-10 xl:p-14 ${t_bg(dark)}`} dark={dark}>
        <SectionTitle dark={dark}>CGPA Predictor Engine</SectionTitle>
        <p className="font-bold text-sm mb-8 opacity-70">
          The model reads this student's stored row directly — no manual entry needed. Roll:
          <span className="ml-2 font-black">{rollNo}</span>
        </p>

        <button
          onClick={() => cgpaReq.run()}
          disabled={cgpaReq.loading}
          className="w-full py-6 uppercase font-black text-2xl bg-[#c4b5fd] text-black border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {cgpaReq.loading ? <><Loader2 className="animate-spin w-8 h-8" /> Predicting…</> : <><Calculator className="w-8 h-8" /> Run Prediction</>}
        </button>

        {cgpaReq.error && (
          <div className="mt-8 p-4 bg-[#fca5a5] border-4 border-black text-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {cgpaReq.error.message}
          </div>
        )}

        {cgpa && (
          <div className="mt-10 p-8 bg-[#a7f3d0] border-4 border-black text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm font-black uppercase tracking-widest text-black/70 mb-3 flex items-center justify-center gap-2">
              <Zap size={16} /> Predicted Final Grade (0–10)
            </p>
            <h1 className="text-7xl font-black text-black">{fmt(cgpa.predicted_grade, 2)}</h1>
            <p className="mt-4 inline-block bg-black text-white px-4 py-2 font-black uppercase tracking-widest text-xs">
              Confidence {cgpa.confidence_display || `${fmt(cgpa.confidence_score, 1)}%`}
            </p>
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
      </Panel>

      <Panel className={`p-10 xl:p-14 ${t_bg(dark)} flex flex-col`} dark={dark}>
        <SectionTitle dark={dark}>Why this score</SectionTitle>
        <div className="space-y-6 flex-1">
          {(analysis.recommendations || []).slice(0, 4).map((rec, i) => (
            <div key={i} className="p-6 border-4 border-black text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-black text-lg uppercase">{(rec.subject || '').toUpperCase()} · {rec.type || 'area'}</h4>
                <span className="font-black bg-white border-2 border-black px-2 py-1 text-xs">{fmt(rec.score_pct, 1)}%</span>
              </div>
              <p className="font-bold text-sm">{rec.action || rec.focus}</p>
              <p className="text-xs font-black uppercase tracking-widest mt-2 opacity-70">
                Mentor: {rec.mentor || '—'} {rec.peer_mentor ? `· Peer: ${rec.peer_mentor}` : ''}
              </p>
            </div>
          ))}
          {!analysis.recommendations?.length && <EmptyBlock dark={dark} message="No recommendation signals available." />}
        </div>
      </Panel>
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
      <Panel className={`p-10 xl:p-14 ${t_bg(dark)} w-full`} dark={dark}>
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
      </Panel>

      <Panel className={`p-10 xl:p-14 ${t_bg(dark)} w-full flex flex-col`} dark={dark}>
        <SectionTitle dark={dark}>Mentor Ratings</SectionTitle>
        {ratingData.length ? (
          <div className="flex-1 min-h-[400px]">
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
      </Panel>
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
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
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
      <Panel className={`xl:col-span-2 p-10 xl:p-14 ${t_bg(dark)} flex flex-col w-full`} dark={dark}>
        <h2 className="text-5xl font-black uppercase tracking-tight mb-10 border-b-4 border-black pb-4 inline-block">Master Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fields.map((f, i) => (
            <div key={i} className="p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform text-black" style={{ backgroundColor: f.bg }}>
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-2">{f.label}</p>
              <h3 className="text-2xl font-black uppercase break-all">{f.value ?? '—'}</h3>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-col gap-8 xl:gap-12 w-full">
        <Panel className={`p-8 xl:p-10 ${t_bg(dark)} flex-1`} dark={dark}>
          <SectionTitle dark={dark}>Security</SectionTitle>
          {passMsg && (
            <div className={`p-4 mb-6 border-4 border-black font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${passMsg.includes('Error') ? 'bg-[#fca5a5] text-black' : 'bg-[#a7f3d0] text-black'}`}>{passMsg}</div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">Current Password</label><input type="password" required value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">New Password</label><input type="password" required value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <div><label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-70">Confirm Password</label><input type="password" required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className={inputClass} placeholder="••••••••" /></div>
            <button type="submit" className="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 hover:-translate-y-1 transition-all">Update Key</button>
          </form>
        </Panel>
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
