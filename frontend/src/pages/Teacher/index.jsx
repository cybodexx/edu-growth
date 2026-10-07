// src/pages/Teacher/index.jsx
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, Grid, Stat, Badge, Bar } from '../../components/Card.jsx';
import {
  currentTeacher,
  cohortSummary,
  cohort,
  mentorAllocations,
  teacherEfficacy,
  dataMeta,
} from '../../utils/mockData.js';

// 1. HELPER FUNCTIONS: Status aur colors map karne ke liye simple functions
const getRiskColor = (riskStatus) => {
  if (riskStatus === 'at-risk') return 'risk';   // Red
  if (riskStatus === 'review') return 'review';  // Yellow
  return 'safe';                                 // Green
};

const getRiskLabel = (riskStatus) => {
  if (riskStatus === 'at-risk') return 'At risk';
  if (riskStatus === 'review') return 'Review';
  return 'Safe';
};

const getTesColor = (score) => {
  if (score >= 0.75) return 'safe';
  if (score >= 0.6) return 'review';
  return 'risk';
};

export default function TeacherDashboard() {
  // 2. STATE VARIABLES
  const [filter, setFilter] = useState('flagged'); // Toggle for 'flagged' vs 'all' students
  const [approvedMentors, setApprovedMentors] = useState({}); // Tracks approved mentor reallocations

  // 3. DATA PREPARATION (Short and clean variables)
  const teacher = currentTeacher;
  const summary = cohortSummary;

  // Agar filter 'flagged' hai, toh sirf risk/review wale students dikhao
  let displayStudents = cohort;
  if (filter === 'flagged') {
    displayStudents = cohort.filter((student) => student.risk !== 'safe');
  }

  // Mentor approve/unapprove karne ka function
  const toggleApproval = (studentId) => {
    setApprovedMentors((prev) => {
      // Jo bhi purani state thi (true/false), usko ulta (!prev) kar do
      return { ...prev, [studentId]: !prev[studentId] };
    });
  };

  return (
    <div className="space-y-4">
      {/* ========================================== */}
      {/* HEADER SECTION */}
      {/* ========================================== */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">{teacher.name}</h1>
          <p className="text-sm text-slate-400">
            {teacher.subject} · {teacher.batch}
          </p>
        </div>
        <p className="text-xs text-slate-500">Data synced {dataMeta.lastSynced}</p>
      </div>

      {/* ========================================== */}
      {/* BENTO BOX GRID LAYOUT */}
      {/* ========================================== */}
      <Grid>
        {/* ROW 1: QUICK STATS */}
        <Card title="Enrolled">
          <Stat value={summary.enrolled} sub={`Avg attendance ${summary.avgAttendance}%`} />
        </Card>
        
        <Card title="At risk">
          <Stat value={summary.atRisk} tone="risk" sub={`${summary.review} more under review`} />
        </Card>
        
        <Card title="Anomalies">
          <Stat 
            value={summary.anomalies} 
            tone={summary.anomalies > 0 ? 'review' : 'neutral'} 
            sub="sudden drop or attendance break" 
          />
        </Card>
        
        <Card title="Avg ST1 → ST2">
          <Stat
            value={`${summary.avgVelocityPts > 0 ? '+' : ''}${summary.avgVelocityPts} pts`}
            tone={summary.avgVelocityPts >= 0 ? 'safe' : 'risk'}
            sub="cohort learning velocity"
          />
        </Card>

        {/* ========================================== */}
        {/* ROW 2: RISK TRIAGE TABLE */}
        {/* ========================================== */}
        <Card
          span={4}
          title="Risk triage"
          flush
          action={
            // Filter Toggle Buttons
            <div className="flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-xs">
              <button
                onClick={() => setFilter('flagged')}
                className={`rounded px-2 py-0.5 ${filter === 'flagged' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'}`}
              >
                Flagged
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`rounded px-2 py-0.5 ${filter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'}`}
              >
                All
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Attendance</th>
                  <th className="px-4 py-2 font-medium">ST1 → ST2</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayStudents.map((student) => {
                  const marksChange = student.st2Pct - student.st1Pct;
                  return (
                    <tr key={student.id}>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-200">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.roll}</p>
                      </td>
                      {/* Attendance < 75% red alert */}
                      <td className={`px-4 py-2.5 ${student.attendance < 75 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {student.attendance}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <span className="text-slate-300">{student.st1Pct} → {student.st2Pct} </span>
                        <span className={marksChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ({marksChange > 0 ? '+' : ''}{marksChange})
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-2.5 text-xs text-slate-400">
                        {student.anomaly && <Badge tone="review">Anomaly</Badge>} {student.flagReason ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={getRiskColor(student.risk)}>{getRiskLabel(student.risk)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ========================================== */}
        {/* ROW 3: MENTOR REALLOCATION */}
        {/* ========================================== */}
        <Card span={2} title="Mentor reallocation" flush>
          <ul className="divide-y divide-slate-800">
            {mentorAllocations.map((mentor) => {
              // Check karte hain ki kya is student ka mentor change approve hua hai
              const isApproved = approvedMentors[mentor.studentId];
              return (
                <li key={mentor.studentId} className="flex items-start justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-slate-200">{mentor.student}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {mentor.current.name} → <span className="text-slate-200">{mentor.suggested.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => toggleApproval(mentor.studentId)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                      isApproved ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {isApproved && <Check size={12} />}
                    {isApproved ? 'Approved' : 'Approve'}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ========================================== */}
        {/* ROW 4: TEACHER EFFICACY */}
        {/* ========================================== */}
        <Card span={2} title="Teacher efficacy by unit">
          <ul className="space-y-3">
            {teacherEfficacy.map((eff) => (
              <li key={eff.faculty} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-3">
                <div>
                  <p className="text-sm text-slate-200">{eff.faculty}</p>
                  <p className="text-xs text-slate-500">{eff.subjectCode} · Unit {eff.unit}</p>
                </div>
                <Bar value={eff.tes * 100} tone={getTesColor(eff.tes)} />
                <span className="text-right text-xs text-slate-300">{eff.tes.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </Card>

      </Grid>
    </div>
  );
}