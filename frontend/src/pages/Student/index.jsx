// src/pages/Student/index.jsx
import { useState } from 'react';
// Components import kar rahe hain (Dhyan rahe ki yeh files sahi folders me honi chahiye)
import { Card, Grid, Stat, Badge, Bar, scoreTone } from '../../components/Card.jsx';
import VelocityChart from '../../components/charts/VelocityChart.jsx';
import {
  currentStudent,
  studentAttendance,
  studentSubjects,
  conceptRetention,
  assignmentSummary,
  recoveryEvents,
  recoverySummary,
  practicals,
  mentorAllocations,
  dataMeta,
} from '../../utils/mockData.js';

// Status labels set kar rahe hain color ke hisaab se
const STATUS = { safe: 'On track', review: 'Watch', risk: 'At risk', neutral: '—' };

export default function StudentDashboard() {
  // 'activeCode' track karta hai ki abhi kaunsa subject select kiya gaya hai (default pehla subject hai)
  const [activeCode, setActiveCode] = useState(studentSubjects[0].code);
  
  // Selected subject ka poora data nikal rahe hain
  const activeSubject = studentSubjects.find((sub) => sub.code === activeCode);

  // Data ko chote variables me daal rahe hain taaki code clean dikhe
  const student = currentStudent;
  const att = studentAttendance;
  const assignments = assignmentSummary;
  
  // Check kar rahe hain ki kya is student ko koi naya mentor assign hua hai?
  const realloc = mentorAllocations.find((m) => m.studentId === student.id);
  
  // CGPA me kitna badlaav aane wala hai (Predicted - Current)
  const cgpaDelta = student.predictedCgpa - student.cgpa;

  return (
    <div className="space-y-4">
      
      {/* ========================================== */}
      {/* HEADER SECTION */}
      {/* ========================================== */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">{student.name}</h1>
          <p className="text-sm text-slate-400">
            {student.rollNumber} · {student.program} · Sem {student.semester} · Section {student.section}
          </p>
        </div>
        <p className="text-xs text-slate-500">Data synced {dataMeta.lastSynced}</p>
      </div>

      <Grid>
        {/* ========================================== */}
        {/* ROW 1: KEY METRICS (Attendance, CGPA, Assignments, Mentor) */}
        {/* ========================================== */}
        <Card title="Attendance · 14 days">
          <Stat
            value={`${att.rolling14}%`}
            tone={att.rolling14 >= att.threshold ? 'neutral' : 'risk'}
            sub={`Minimum required: ${att.threshold}%`}
          />
          {/* 14 Days ka visual bar dikha rahe hain (Present = Grey, Absent = Red) */}
          <div className="mt-3 flex gap-1">
            {att.last14Days.map((dayStatus, index) => (
              <span
                key={index}
                className={`h-2 flex-1 rounded-sm ${dayStatus === 'P' ? 'bg-slate-600' : 'bg-rose-500'}`}
              />
            ))}
          </div>
        </Card>

        <Card title="Predicted CGPA">
          <Stat value={student.predictedCgpa.toFixed(2)} sub={`Current ${student.cgpa.toFixed(2)}`} />
          <p className={`mt-3 text-xs ${cgpaDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cgpaDelta >= 0 ? '+' : ''}{cgpaDelta.toFixed(2)} expected change
          </p>
        </Card>

        <Card title="Assignments">
          <Stat value={`${assignments.onTime}/${assignments.total}`} sub="submitted on time" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="review">{assignments.late} late</Badge>
            <Badge tone="risk">{assignments.overdue} overdue</Badge>
          </div>
        </Card>

        <Card title="Mentor">
          <p className="text-sm font-medium text-slate-100">{student.facultyMentor}</p>
          <p className="mt-0.5 text-xs text-slate-500">Assigned Mentor</p>
          {/* Agar Mentor change hone wala hai (Risk ki wajah se), toh notification dikhao */}
          {realloc && (
            <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
              New suggestion: <span className="text-slate-200">{realloc.suggested.name}</span>
            </p>
          )}
        </Card>

        {/* ========================================== */}
        {/* ROW 2: CHARTS & CONCEPT RETENTION */}
        {/* ========================================== */}
        <Card
          span={2}
          title="Learning velocity"
          action={
            <select
              value={activeCode}
              onChange={(e) => setActiveCode(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              {studentSubjects.map((sub) => (
                <option key={sub.code} value={sub.code}>{sub.code}</option>
              ))}
            </select>
          }
        >
          <p className="mb-2 text-sm text-slate-300">{activeSubject.name}</p>
          {/* Yeh graph pichli file me banaya tha */}
          <VelocityChart unitScores={activeSubject.unitScores} />
        </Card>

        <Card span={2} title="Concept retention" flush>
          <ul className="divide-y divide-slate-800">
            {conceptRetention.map((concept) => (
              <li key={concept.topic} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-slate-200">{concept.topic}</p>
                  <p className="text-xs text-slate-500">{concept.subjectCode} · {concept.difficulty}</p>
                </div>
                <div className="w-24 text-right">
                  <Bar value={concept.accuracy} tone={scoreTone(concept.accuracy)} />
                  <p className="mt-1 text-xs tabular-nums text-slate-400">{concept.accuracy}% Accuracy</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Grid>
    </div>
  );
}