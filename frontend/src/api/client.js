/**
 * EduGrowth Student Analytics API client.
 *
 * Backend: FastAPI (see FRONTEND_API_DETAILS.txt / API Integration Guide.pdf)
 *   LOCAL  -> http://127.0.0.1:8000
 *   RENDER -> https://<your-service>.onrender.com
 *
 * The base URL is configurable at build time with the Vite env var
 * VITE_API_BASE_URL (see frontend/.env.example). No auth token is needed:
 * this API is public, login/auth lives in a separate service.
 */

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

function humanizeDetail(detail, status) {
  if (!detail) return `Request failed (HTTP ${status}).`;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // FastAPI / Pydantic validation error shape.
    return detail
      .map((item) => {
        const loc = Array.isArray(item?.loc) ? item.loc.filter((p) => p !== 'body').join('.') : '';
        return [loc, item?.msg].filter(Boolean).join(': ');
      })
      .filter(Boolean)
      .join(' | ');
  }
  if (typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message;
  }
  return `Request failed (HTTP ${status}).`;
}

async function request(path, { method = 'GET', body, signal, timeout = 20000 } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const detail = data && typeof data === 'object' ? data.detail ?? data : data;
      throw new ApiError(humanizeDetail(detail, res.status), res.status, detail);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError(
        'The API request timed out. Make sure the FastAPI server is running.',
        0
      );
    }
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Start the server and try again.`,
      0
    );
  } finally {
    clearTimeout(timer);
  }
}

const enc = (value) => encodeURIComponent(String(value).trim());

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */
export const health = () => request('/health', { timeout: 8000 });

/* ------------------------------------------------------------------ */
/* CGPA prediction                                                     */
/*   POST /api/v1/cgpa/predict   body { roll_no }                      */
/*   -> { predicted_grade, confidence_score, confidence_display }      */
/* ------------------------------------------------------------------ */
export const predictCgpa = (rollNo, opts = {}) =>
  request('/api/v1/cgpa/predict', { method: 'POST', body: { roll_no: String(rollNo) }, ...opts });

/* ------------------------------------------------------------------ */
/* Mentor analysis (rich analysis: subjects, labs, recommendations)    */
/*   GET  /api/v1/mentor/{student_id}                                  */
/*   POST /api/v1/mentor/analyze  body { student_id }                  */
/*   GET  /api/v1/mentor/{student_id}/report                          */
/* ------------------------------------------------------------------ */
export const getMentorAnalysis = (studentId, opts = {}) =>
  request(`/api/v1/mentor/${enc(studentId)}`, opts);

export const analyzeMentor = (studentId, opts = {}) =>
  request('/api/v1/mentor/analyze', {
    method: 'POST',
    body: { student_id: String(studentId) },
    ...opts,
  });

export const getMentorReport = (studentId, opts = {}) =>
  request(`/api/v1/mentor/${enc(studentId)}/report`, opts);

/* ------------------------------------------------------------------ */
/* Risk prediction                                                     */
/*   GET  /api/v1/risk/{roll_no}                                       */
/*   POST /api/v1/risk/predict  body { roll_no }                       */
/* ------------------------------------------------------------------ */
export const getRisk = (rollNo, opts = {}) =>
  request(`/api/v1/risk/${enc(rollNo)}`, opts);

export const predictRisk = (rollNo, opts = {}) =>
  request('/api/v1/risk/predict', { method: 'POST', body: { roll_no: String(rollNo) }, ...opts });

/**
 * Unified analysis loader.
 * Prefers the rich mentor endpoint; if that route is unavailable (e.g. an API
 * build that only exposes /risk), transparently falls back to /risk.
 * Returns { source: 'mentor' | 'risk', data }.
 */
export async function getStudentAnalysis(studentId, opts = {}) {
  try {
    const data = await getMentorAnalysis(studentId, opts);
    return { source: 'mentor', data };
  } catch (err) {
    if (err instanceof ApiError && (err.isNotFound || err.isNetworkError)) {
      // A 404 here could be "student not found" OR "route not found".
      // Try the risk route as a fallback before giving up.
      try {
        const data = await getRisk(studentId, opts);
        return { source: 'risk', data };
      } catch {
        throw err; // surface the original mentor error
      }
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Students CRUD                                                       */
/* ------------------------------------------------------------------ */
export const listStudents = ({ limit = 50, offset = 0 } = {}, opts = {}) =>
  request(`/api/v1/students?limit=${limit}&offset=${offset}`, opts);

export const getStudent = (rollNo, opts = {}) =>
  request(`/api/v1/students/${enc(rollNo)}`, opts);

export const createStudent = (payload, opts = {}) =>
  request('/api/v1/students', { method: 'POST', body: payload, ...opts });

export const updateStudent = (rollNo, payload, opts = {}) =>
  request(`/api/v1/students/${enc(rollNo)}`, { method: 'PUT', body: payload, ...opts });

export const deleteStudent = (rollNo, opts = {}) =>
  request(`/api/v1/students/${enc(rollNo)}`, { method: 'DELETE', ...opts });

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */

/** roll_no may come back as a number — always coerce to string. */
export function normalizeStudent(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    roll_no: row.roll_no != null ? String(row.roll_no) : row.roll_no,
  };
}

/** GET /api/v1/students -> { count, total, limit, offset, students } */
export function normalizeStudentPage(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.students ?? payload?.items ?? payload?.data ?? [];
  return {
    count: payload?.count ?? rows.length,
    total: payload?.total ?? rows.length,
    limit: payload?.limit ?? rows.length,
    offset: payload?.offset ?? 0,
    students: (rows || []).map(normalizeStudent),
  };
}

export const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const pctText = (value) => `${num(value, 0).toFixed(1)}%`;
