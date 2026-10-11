/**
 * Hardcoded identities for the demo.
 *
 * Real student login now goes through the auth service (Express + MongoDB +
 * JWT, see src/api/auth.js). If that server is unreachable the Login page
 * falls back to these demo identities so the FastAPI analytics can still be
 * exercised end to end. Faculty auth endpoints don't exist in the auth
 * service yet, so the teacher panel always uses the demo identity below.
 *
 * Change these values to point the demo at a different student / teacher.
 */

export const DEMO_STUDENT = {
  role: 'student',
  roll_no: '210029023375',
  full_name: 'Aarav Rao',
  class_section: 'CS-DS',
  branch: 'CSE - Data Science',
  email: 'aarav.rao@edugrowth.demo',
  avatar: 'AR',
};

export const DEMO_TEACHER = {
  role: 'teacher',
  email: 'faculty@college.edu',
  full_name: 'Rajesh Verma',
  short_name: 'Prof. Rajesh',
  department: 'Computer Science & Engineering',
  designation: 'Lead Faculty | CSE',
  faculty_code: 'FAC-8092',
  phone: '+91 98765 43210',
  avatar: 'RV',
};

/**
 * Demo sign-in table. Any of these identifiers + the listed password works.
 * (Password check is skipped if password is left blank in the UI, so the
 * teacher/student can get in quickly while auth is not wired up.)
 */
export const DEMO_CREDENTIALS = {
  student: [
    {
      identifier: DEMO_STUDENT.roll_no,
      password: 'student123',
      identity: DEMO_STUDENT,
    },
  ],
  teacher: [
    {
      identifier: DEMO_TEACHER.email,
      password: 'teacher123',
      identity: DEMO_TEACHER,
    },
  ],
};

/** Resolve a hardcoded identity for a role (used when login is bypassed). */
export function getIdentity(role) {
  return role === 'teacher' ? DEMO_TEACHER : DEMO_STUDENT;
}
