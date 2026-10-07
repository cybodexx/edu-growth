// src/utils/mockData.js
// VIVA TIP: Yeh file ek "Dummy Database" hai. Jab FastAPI backend live hoga, 
// toh humein UI components change nahi karne padenge, bas in variables ki jagah fetch() lagana hoga.

export const dataMeta = {
  source: 'mock',
  lastSynced: '06 Oct 2026',
};

/* ========================================================= */
/* 1. STUDENT VIEW DATA                                      */
/* ========================================================= */

// Basic student profile (ML Model yahan predictedCgpa update karta hai)
export const currentStudent = {
  id: 'STU-2241',
  rollNumber: '2201640100182',
  name: 'Aarav Sharma',
  program: 'B.Tech CSE',
  semester: 5,
  section: 'C',
  cgpa: 7.42,
  predictedCgpa: 7.68, // ML output (Expected CGPA)
  facultyMentor: 'Dr. Neha Gupta',
};

// Pillar 1 — Attendance Tracking
export const studentAttendance = {
  rolling14: 79, // Last 14 days mein 79% attendance
  rolling30: 86,
  threshold: 75, // Minimum required
  last14Days: ['P', 'P', 'A', 'P', 'P', 'P', 'A', 'P', 'P', 'P', 'P', 'A', 'P', 'P'],
};

// Pillar 2 — Subject Marks & Learning Velocity (Graphs ke liye)
export const studentSubjects = [
  {
    code: 'KCS501',
    name: 'Database Management Systems',
    st1: { obtained: 22, max: 30 },
    st2: { obtained: 25, max: 30 },
    put: { obtained: 71, max: 100 },
    classAvgPct: 68,
    unitScores: [68, 74, 80, 61, null], // null ka matlab abhi test nahi hua
  },
  {
    code: 'KCS502',
    name: 'Compiler Design',
    st1: { obtained: 14, max: 30 },
    st2: { obtained: 11, max: 30 },
    put: null, 
    classAvgPct: 58,
    unitScores: [52, 44, 38, null, null],
  },
];

// Pillar 3 — Concept Retention (Konse topics mein student struggle kar raha hai)
export const conceptRetention = [
  { subjectCode: 'KCS502', topic: 'LR(1) parsing', unit: 3, difficulty: 'hard', accuracy: 31, repeatedMistakes: 3 },
  { subjectCode: 'KCS501', topic: 'Normalization (BCNF)', unit: 3, difficulty: 'medium', accuracy: 82, repeatedMistakes: 0 },
];

// Pillar 4 — Assignments (Kaunse pending hain, kaunse late hain)
export const assignmentSummary = {
  total: 6,
  onTime: 2,
  late: 2,
  overdue: 1,
  pending: 1,
};


/* ========================================================= */
/* 2. TEACHER / FACULTY VIEW DATA                            */
/* ========================================================= */

// Teacher ki profile details
export const currentTeacher = {
  id: 'FAC-118',
  name: 'Prof. Rajesh K. Verma',
  department: 'Computer Science & Engineering',
  subject: 'KCS502 · Compiler Design',
  batch: 'B.Tech CSE · Sem 5 · Section C',
};

// Class ki overall performance summary
export const cohortSummary = {
  enrolled: 62,
  atRisk: 5,        // Kitne bachhe fail hone ke risk par hain
  review: 9,
  anomalies: 2,     // ML detected anomaly (sudden drop in marks)
  avgAttendance: 81,
  avgVelocityPts: 3.1, 
};

// Pillar 5 — Risk Triage (Class ke saare students aur unka ML risk level)
// Risk status: 'safe' | 'review' | 'at-risk'
export const cohort = [
  { id: 'STU-2244', name: 'Rohan Mehta', roll: '2201640100195', attendance: 61, st1Pct: 72, st2Pct: 41, delayedSubmissions: 2, risk: 'at-risk', anomaly: true, flagReason: 'Score drop of 31 pts with attendance falling to 61%' },
  { id: 'STU-2257', name: 'Meera Joshi', roll: '2201640100229', attendance: 83, st1Pct: 49, st2Pct: 63, delayedSubmissions: 0, risk: 'safe', anomaly: false, flagReason: 'Recovered +14 pts after ST1' },
];

// Pillar 6 — Mentor Reallocation (ML suggest kar raha hai ki kis student ko kaunsa naya mentor dena chahiye)
export const mentorAllocations = [
  {
    studentId: 'STU-2241', student: 'Aarav Sharma',
    subjectCode: 'KCS502', unit: 3, unitTitle: 'Syntax-directed translation', unitScorePct: 38,
    current: { name: 'Dr. Neha Gupta', tes: 0.52 },
    suggested: { name: 'Prof. Rajesh K. Verma', type: 'FACULTY', tes: 0.81 }, // Better Teacher Efficacy Score (TES)
  },
];

export const teacherEfficacy = [
  { faculty: 'Prof. Rajesh K. Verma', subjectCode: 'KCS502', unit: 3, tes: 0.81 },
];


/* ========================================================= */
/* 3. HELPER FUNCTIONS                                       */
/* ========================================================= */

// Percentage calculate karne ke liye chota sa function
export const pct = (score) => (score ? Math.round((score.obtained / score.max) * 100) : null);

// Do units ke marks ka difference nikalta hai (e.g., Unit 1 se Unit 2 me kitne marks badhe/ghate)
export const unitDeltas = (units) =>
  units.slice(1).map((v, i) => (v == null || units[i] == null ? null : v - units[i]));