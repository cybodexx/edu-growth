/**
 * EduGrowth Auth Service client (Express + MongoDB + JWT).
 *
 * Base URL: VITE_AUTH_BASE_URL (default http://localhost:5001 when the auth
 * service runs locally, e.g. via node server.js / nodemon).
 *
 * Endpoints (see routes/studentRoutes.js, routes/facultyRoutes.js + server.js):
 *   POST /api/students/login          -> { token, student }
 *   GET  /api/students/profile        (Bearer token)
 *   POST /api/students/register
 *   POST /api/students/forgot-password
 *   POST /api/students/reset-password
 *   POST /api/students/logout
 *   POST /api/faculty/login           -> { token, faculty }
 *   POST /api/faculty/register
 *   GET  /api/faculty/profile         (Bearer token)
 *   POST /api/faculty/logout
 *   GET  /api/protected               (Bearer token)
 *
 * This is the *separate* auth backend (port 5001). The analytics dashboards
 * still talk to the FastAPI service (VITE_API_BASE_URL, port 8000) which is
 * public and needs no token.
 */

const RAW_AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5001';

export const AUTH_BASE_URL = String(RAW_AUTH_BASE).replace(/\/+$/, '');

const TOKEN_KEY = 'eg.auth.token';
const IDENTITY_KEY = 'eg.auth.identity';

/* ------------------------- session helpers ------------------------- */

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredIdentity = () => {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY));
  } catch {
    return null;
  }
};

export function saveSession(token, identity) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
}

/* --------------------------- request core --------------------------- */

async function request(path, { method = 'GET', body, token, timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${AUTH_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(' | ') : data?.detail) ||
        `Request failed (HTTP ${res.status}).`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------- endpoints ----------------------------- */

/** POST /api/students/login — verify roll_no + password, returns JWT. */
export function loginStudent(rollNo, password) {
  return request('/api/students/login', {
    method: 'POST',
    body: { roll_no: String(rollNo).trim(), password },
  });
}

/** POST /api/students/register — create a student account. */
export function registerStudent(payload) {
  return request('/api/students/register', { method: 'POST', body: payload });
}

/**
 * POST /api/students/forgot-password — request a reset link.
 * Accepts a roll number OR an email; the backend looks up either.
 */
export function forgotPassword(identifier) {
  const value = String(identifier).trim();
  return request('/api/students/forgot-password', {
    method: 'POST',
    body: value.includes('@') ? { email: value } : { roll_no: value },
  });
}

/** POST /api/students/reset-password — complete a reset with the emailed token. */
export function resetPassword(token, newPassword) {
  return request('/api/students/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
}

/** GET /api/students/profile — current student profile (needs token). */
export function getProfile(token) {
  return request('/api/students/profile', { token });
}

/* ----------------------------- faculty ----------------------------- */

/** POST /api/faculty/login — verify email + password, returns JWT. */
export function loginFaculty(email, password) {
  return request('/api/faculty/login', {
    method: 'POST',
    body: { email: String(email).trim(), password },
  });
}

/** POST /api/faculty/register — create a faculty account. */
export function registerFaculty(payload) {
  return request('/api/faculty/register', { method: 'POST', body: payload });
}

/** GET /api/faculty/profile — current faculty profile (needs token). */
export function getFacultyProfile(token) {
  return request('/api/faculty/profile', { token });
}

/** POST /api/faculty/logout — invalidate the token server-side. */
export function logoutFaculty(token) {
  return request('/api/faculty/logout', { method: 'POST', body: {}, token });
}

/** GET /api/protected — sanity check that the JWT verifies. */
export function checkProtected(token) {
  return request('/api/protected', { token });
}

/** POST /api/students/logout — invalidate the token server-side. */
export function logoutStudent(token) {
  return request('/api/students/logout', { method: 'POST', body: {}, token });
}

/* --------------------------- normalization --------------------------- */

/**
 * Map the auth service's student payload onto the identity shape the
 * dashboards expect (Student.jsx uses roll_no / full_name / avatar /
 * class_section).
 */
export function normalizeLoginIdentity(rawStudent) {
  if (!rawStudent) return null;
  return {
    role: 'student',
    roll_no: rawStudent.roll_no != null ? String(rawStudent.roll_no) : rawStudent.roll_no,
    full_name: rawStudent.name || rawStudent.full_name || rawStudent.roll_no,
    class_section: rawStudent.class_section || rawStudent.section || '',
    branch: rawStudent.branch || rawStudent.department || '',
    email: rawStudent.email || '',
    avatar: (rawStudent.name || rawStudent.roll_no || 'S').slice(0, 2).toUpperCase(),
  };
}

/**
 * Map the auth service's faculty payload onto the identity shape Teacher.jsx
 * expects (full_name / short_name / email / department / avatar).
 */
export function normalizeFacultyIdentity(rawFaculty) {
  if (!rawFaculty) return null;
  const name = rawFaculty.name || rawFaculty.full_name || 'Faculty';
  const parts = String(name).trim().split(/\s+/);
  return {
    role: 'teacher',
    id: rawFaculty.id || rawFaculty._id || null,
    full_name: name,
    short_name: rawFaculty.short_name || `Prof. ${parts[parts.length - 1] || name}`,
    email: rawFaculty.email || '',
    department: rawFaculty.department || rawFaculty.branch || '',
    designation: rawFaculty.designation || 'Faculty',
    faculty_code: rawFaculty.faculty_code || '',
    phone: rawFaculty.phone || '',
    avatar: name.slice(0, 2).toUpperCase(),
  };
}