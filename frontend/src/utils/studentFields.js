/**
 * Canonical field metadata for a student record.
 *
 * The column names below mirror the ML dataset / Neon `students` table exactly
 * (see ML/data/processed/edu_growth_cleaned.csv). The FastAPI `/api/v1/students`
 * endpoints accept *any* of these columns, so the "complete record" editor and
 * the quick internals editor both build their payloads from this list.
 */

export const SUBJECTS = [
  { key: 'coa', label: 'COA' },
  { key: 'maths4', label: 'Maths-4' },
  { key: 'dstl', label: 'DSTL' },
  { key: 'ds', label: 'DS' },
  { key: 'python', label: 'Python' },
  { key: 'cyber', label: 'Cyber Security' },
];

export const LABS = [
  { key: 'ds', label: 'DS' },
  { key: 'python', label: 'Python' },
  { key: 'coa', label: 'COA' },
  { key: 'cyber', label: 'Cyber' },
];

/** Identity fields — shown first, always open. */
export const IDENTITY_FIELDS = [
  { key: 'roll_no', label: 'Roll No.', required: true },
  { key: 'full_name', label: 'Full Name' },
  { key: 'class_section', label: 'Class Section' },
];

/** Headline numbers (CGPA + participation). */
export const PROFILE_FIELDS = [
  { key: 'previous_cgpa', label: 'Previous CGPA' },
  { key: 'final_semester_grade', label: 'Final Semester Grade' },
  { key: 'medical_leave_days', label: 'Medical Leave (days)' },
  { key: 'society_participation_pc', label: 'Society Participation %' },
  { key: 'sports_activity_level', label: 'Sports Activity Level' },
];

/** Attendance columns (overall, theory/practical, per subject, per lab). */
export const ATTENDANCE_FIELDS = [
  { key: 'overall_attendance_pct', label: 'Overall %' },
  { key: 'theory_attendance_pct', label: 'Theory %' },
  { key: 'practical_attendance_pct', label: 'Practical %' },
  ...SUBJECTS.map((s) => ({ key: `${s.key}_attendance_pct`, label: `${s.label} %` })),
  ...LABS.map((l) => ({ key: `lab_${l.key}_attendance_pct`, label: `Lab ${l.label} %` })),
];

/** Per-subject theory marks (ST1/ST2/PUT, 5 units, assignment + quiz). */
export const subjectMarkFields = (key) => [
  { key: `${key}_st1_marks`, label: 'ST1' },
  { key: `${key}_st2_marks`, label: 'ST2' },
  { key: `${key}_put_marks`, label: 'PUT' },
  { key: `${key}_unit_1_marks`, label: 'Unit 1' },
  { key: `${key}_unit_2_marks`, label: 'Unit 2' },
  { key: `${key}_unit_3_marks`, label: 'Unit 3' },
  { key: `${key}_unit_4_marks`, label: 'Unit 4' },
  { key: `${key}_unit_5_marks`, label: 'Unit 5' },
  { key: `${key}_assignment_score`, label: 'Assignment' },
  { key: `${key}_assignment_delay_hours`, label: 'Asgn Delay (h)' },
  { key: `${key}_quiz_score`, label: 'Quiz' },
];

/** Per-lab practical marks. */
export const labFields = (key) => [
  { key: `lab_${key}_execution_score`, label: 'Execution' },
  { key: `lab_${key}_viva_score`, label: 'Viva' },
  { key: `lab_${key}_submission_delay_hours`, label: 'Subm Delay (h)' },
];

/** Derived / advanced flags — kept last. */
export const ADVANCED_FIELDS = [
  { key: 'outlier_count', label: 'Outlier Count' },
  { key: 'is_outlier_student', label: 'Is Outlier Student' },
  { key: 'grade_was_missing', label: 'Grade Was Missing' },
];

const NON_NUMERIC = new Set(['roll_no', 'full_name', 'class_section']);

export const isNumericField = (key) => !NON_NUMERIC.has(key);

/** Flat list of every editable column (used to seed/reset a form + JSON paste). */
export const ALL_EDITABLE_COLUMNS = [
  ...IDENTITY_FIELDS.map((f) => f.key),
  ...PROFILE_FIELDS.map((f) => f.key),
  ...ATTENDANCE_FIELDS.map((f) => f.key),
  ...SUBJECTS.flatMap((s) => subjectMarkFields(s.key).map((f) => f.key)),
  ...LABS.flatMap((l) => labFields(l.key).map((f) => f.key)),
  ...ADVANCED_FIELDS.map((f) => f.key),
];
