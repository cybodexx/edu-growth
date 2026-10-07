/**
 * Edu Growth MVP - Mock Dataset
 * Architecture: src/utils/mockData.ts
 * Swiss Industrial Dark Theme Data Model
 */

export interface UnitPerformance {
  unit: string;
  st1: number;
  st2: number;
  put: number;
  benchmark: number;
  velocity: number; // Delta vs previous milestone
}

export interface AttendanceRecord {
  day: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  percentage: number;
}

export interface AssignmentMetric {
  id: string;
  title: string;
  dueDate: string;
  status: 'on_time' | 'delayed' | 'pending';
  delayDays: number;
  gradeScore: number;
}

export interface RetentionMetric {
  concept: string;
  unit: string;
  retentionScore: number; // 0 - 100
  decayRate: string; // e.g. "Low", "Moderate", "Critical"
  status: 'stable' | 'warning' | 'critical';
}

export interface StudentProfile {
  id: string;
  name: string;
  rollNo: string;
  batch: string;
  overallAttendance: number;
  currentCgpa: number;
  learningVelocityIndex: number;
  units: UnitPerformance[];
  attendanceHistory: AttendanceRecord[];
  assignments: AssignmentMetric[];
  retentionIndex: RetentionMetric[];
}

export interface TeacherStudentRow {
  id: string;
  name: string;
  rollNo: string;
  attendance: number;
  stAvg: number;
  putScore: number;
  cgpa: number;
  riskStatus: 'critical' | 'warning' | 'safe';
  riskReason: string;
  weakestUnit: string;
  assignedMentor: string;
  suggestedMentor: string;
  velocityTrend: 'up' | 'down' | 'flat';
}

export interface TeacherBatchOverview {
  batchId: string;
  courseName: string;
  totalStudents: number;
  batchAvgCgpa: number;
  batchAttendanceAvg: number;
  atRiskCount: number;
  stPassRate: number;
  efficacyScore: number; // 0 - 100
  benchmarkCgpa: number;
  students: TeacherStudentRow[];
  mentorPool: {
    name: string;
    specialization: string;
    loadCount: number;
    rating: number;
  }[];
}

export const studentMockData: StudentProfile = {
  id: 'std_4091',
  name: 'Aarav Sharma',
  rollNo: '21CS084',
  batch: 'CS-IV A (Systems & Distributed)',
  overallAttendance: 88.4,
  currentCgpa: 8.42,
  learningVelocityIndex: +4.8,
  units: [
    { unit: 'Unit 1: Memory & Pointers', st1: 64, st2: 70, put: 72, benchmark: 65, velocity: 0 },
    { unit: 'Unit 2: Kernel Concurrency', st1: 72, st2: 78, put: 81, benchmark: 68, velocity: +9 },
    { unit: 'Unit 3: Distributed Consensus', st1: 58, st2: 66, put: 70, benchmark: 70, velocity: -11 },
    { unit: 'Unit 4: LSM-Trees & Storage', st1: 82, st2: 86, put: 91, benchmark: 72, velocity: +21 },
    { unit: 'Unit 5: Fault-Tolerant Raft', st1: 88, st2: 92, put: 94, benchmark: 75, velocity: +3 },
  ],
  attendanceHistory: [
    { day: 'D1', date: 'Oct 01', status: 'present', percentage: 100 },
    { day: 'D2', date: 'Oct 02', status: 'present', percentage: 100 },
    { day: 'D3', date: 'Oct 03', status: 'late', percentage: 75 },
    { day: 'D4', date: 'Oct 04', status: 'present', percentage: 100 },
    { day: 'D5', date: 'Oct 05', status: 'present', percentage: 100 },
    { day: 'D6', date: 'Oct 08', status: 'absent', percentage: 0 },
    { day: 'D7', date: 'Oct 09', status: 'present', percentage: 100 },
    { day: 'D8', date: 'Oct 10', status: 'present', percentage: 100 },
    { day: 'D9', date: 'Oct 11', status: 'present', percentage: 100 },
    { day: 'D10', date: 'Oct 12', status: 'present', percentage: 100 },
    { day: 'D11', date: 'Oct 15', status: 'late', percentage: 75 },
    { day: 'D12', date: 'Oct 16', status: 'present', percentage: 100 },
    { day: 'D13', date: 'Oct 17', status: 'present', percentage: 100 },
    { day: 'D14', date: 'Oct 18', status: 'present', percentage: 100 },
  ],
  assignments: [
    { id: 'asg_01', title: 'Malloc Implementations & Valgrind', dueDate: 'Sep 12', status: 'on_time', delayDays: 0, gradeScore: 92 },
    { id: 'asg_02', title: 'POSIX Threads Mutex Benchmarks', dueDate: 'Sep 24', status: 'on_time', delayDays: 0, gradeScore: 88 },
    { id: 'asg_03', title: 'Paxos Log Replication Protocol', dueDate: 'Oct 04', status: 'delayed', delayDays: 3, gradeScore: 71 },
    { id: 'asg_04', title: 'SSTable Compaction Pipeline', dueDate: 'Oct 14', status: 'on_time', delayDays: 0, gradeScore: 95 },
  ],
  retentionIndex: [
    { concept: 'Vector Clock Serialization', unit: 'Unit 3', retentionScore: 54, decayRate: 'Critical', status: 'critical' },
    { concept: 'Write-Ahead Log Checkpointing', unit: 'Unit 4', retentionScore: 89, decayRate: 'Low', status: 'stable' },
    { concept: 'Deadlock Detection in Kernel', unit: 'Unit 2', retentionScore: 76, decayRate: 'Moderate', status: 'warning' },
    { concept: 'Quorum Read/Write Invariants', unit: 'Unit 5', retentionScore: 94, decayRate: 'Low', status: 'stable' },
  ],
};

export const teacherBatchMockData: TeacherBatchOverview = {
  batchId: 'BATCH-2025-CS-IV',
  courseName: 'CS402: Distributed Operating Systems',
  totalStudents: 48,
  batchAvgCgpa: 7.82,
  batchAttendanceAvg: 83.1,
  atRiskCount: 6,
  stPassRate: 91.6,
  efficacyScore: 87.4,
  benchmarkCgpa: 7.50,
  mentorPool: [
    { name: 'Dr. V. Nambiar', specialization: 'Distributed Systems & Consensus', loadCount: 6, rating: 4.9 },
    { name: 'Prof. Sarah Jenkins', specialization: 'OS Kernels & Concurrency', loadCount: 9, rating: 4.7 },
    { name: 'Dr. Kevin Zhao', specialization: 'Storage Architectures & LSM', loadCount: 4, rating: 4.8 },
    { name: 'Prof. Elena Rostova', specialization: 'Algorithms & Discrete Math', loadCount: 8, rating: 4.6 },
  ],
  students: [
    {
      id: 'std_4091',
      name: 'Aarav Sharma',
      rollNo: '21CS084',
      attendance: 88.4,
      stAvg: 77.2,
      putScore: 86.0,
      cgpa: 8.42,
      riskStatus: 'safe',
      riskReason: 'Consistent recovery in Units 4 & 5',
      weakestUnit: 'Unit 3: Consensus',
      assignedMentor: 'Prof. Sarah Jenkins',
      suggestedMentor: 'Dr. V. Nambiar',
      velocityTrend: 'up',
    },
    {
      id: 'std_4022',
      name: 'Rohan Mehra',
      rollNo: '21CS019',
      attendance: 64.2,
      stAvg: 48.0,
      putScore: 52.0,
      cgpa: 5.84,
      riskStatus: 'critical',
      riskReason: 'Attendance < 65% + ST2 drop > 25%',
      weakestUnit: 'Unit 2: Kernel Concurrency',
      assignedMentor: 'Prof. Elena Rostova',
      suggestedMentor: 'Prof. Sarah Jenkins',
      velocityTrend: 'down',
    },
    {
      id: 'std_4035',
      name: 'Meera Iyer',
      rollNo: '21CS041',
      attendance: 71.0,
      stAvg: 58.5,
      putScore: 61.0,
      cgpa: 6.42,
      riskStatus: 'critical',
      riskReason: 'Sudden -18pt delta on Unit 3 exam',
      weakestUnit: 'Unit 3: Consensus',
      assignedMentor: 'Prof. Elena Rostova',
      suggestedMentor: 'Dr. V. Nambiar',
      velocityTrend: 'down',
    },
    {
      id: 'std_4011',
      name: 'Tanvi Deshmukh',
      rollNo: '21CS012',
      attendance: 78.5,
      stAvg: 67.0,
      putScore: 69.0,
      cgpa: 7.15,
      riskStatus: 'warning',
      riskReason: 'Delayed 2 consecutive assignments',
      weakestUnit: 'Unit 4: LSM-Trees',
      assignedMentor: 'Prof. Sarah Jenkins',
      suggestedMentor: 'Dr. Kevin Zhao',
      velocityTrend: 'flat',
    },
    {
      id: 'std_4058',
      name: 'Devansh Kulkarni',
      rollNo: '21CS067',
      attendance: 94.0,
      stAvg: 88.0,
      putScore: 92.5,
      cgpa: 9.18,
      riskStatus: 'safe',
      riskReason: 'High retention and zero delays',
      weakestUnit: 'None (Uniform > 85%)',
      assignedMentor: 'Dr. V. Nambiar',
      suggestedMentor: 'Dr. V. Nambiar',
      velocityTrend: 'up',
    },
    {
      id: 'std_4080',
      name: 'Zoya Siddiqui',
      rollNo: '21CS099',
      attendance: 69.8,
      stAvg: 62.0,
      putScore: 64.0,
      cgpa: 6.80,
      riskStatus: 'warning',
      riskReason: 'Marginal attendance threshold',
      weakestUnit: 'Unit 1: Memory Pointers',
      assignedMentor: 'Dr. Kevin Zhao',
      suggestedMentor: 'Prof. Sarah Jenkins',
      velocityTrend: 'flat',
    },
  ],
};
