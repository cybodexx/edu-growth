/**
 * EduGrowth — Dev auth-service MOCK (zero dependencies).
 *
 * Mimics the real Express + MongoDB + JWT auth backend so the frontend's
 * real login flow can be tested end to end without the backend developer's
 * server. Uses only Node built-ins (http + crypto), so no npm install.
 *
 *   npm run auth:mock            -> http://localhost:5001
 *   PORT=5002 npm run auth:mock  -> custom port
 *
 * Endpoints (same contract as the real service):
 *   POST /api/students/login            { roll_no, password } -> { token, student }
 *   POST /api/students/register         { roll_no, name, password, class_section }
 *   POST /api/students/forgot-password  { roll_no }
 *   GET  /api/students/profile          (Authorization: Bearer <token>)
 *   POST /api/students/logout           (Authorization: Bearer <token>)
 *   GET  /api/protected                 (Authorization: Bearer <token>)
 *
 * Storage is an in-memory roster; restarting resets registered students.
 * CORS is open (Access-Control-Allow-Origin: *) for local dev.
 */

import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 5001);
const SECRET = process.env.AUTH_MOCK_SECRET || 'edu-growth-dev-secret';
const DAY = 24 * 60 * 60;

/* -------------------------- in-memory roster ------------------------- */
const STUDENTS = new Map([
  ['210029010188', { roll_no: '210029010188', name: 'Bhavya Reddy', password: 'Bhavya Reddy@123', class_section: 'CS-DS', email: 'bhavya.reddy@edugrowth.demo' }],
  ['210029023375', { roll_no: '210029023375', name: 'Aarav Rao', password: 'student123', class_section: 'CS-DS', email: 'aarav.rao@edugrowth.demo' }],
  ['210029023376', { roll_no: '210029023376', name: 'Ishita Sharma', password: 'student123', class_section: 'CS-AI', email: 'ishita.sharma@edugrowth.demo' }],
]);

/* -------------------------------- JWT -------------------------------- */
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const makeToken = (payload) => {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
};

const verifyToken = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

/* ------------------------------ helpers ------------------------------ */
const publicStudent = (student) => {
  const { password, ...rest } = student;
  void password;
  return rest;
};

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

const bearerToken = (req) => {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};

/* ------------------------------- router ------------------------------ */
async function handle(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    /* POST /api/students/login */
    if (path === '/api/students/login' && req.method === 'POST') {
      const { roll_no, password } = await readBody(req);
      const student = STUDENTS.get(String(roll_no || '').trim());
      if (!student || student.password !== String(password || '')) {
        return send(res, 401, { success: false, message: 'Invalid roll number or password.' });
      }
      const payload = {
        sub: student.roll_no,
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * DAY,
      };
      return send(res, 200, {
        success: true,
        message: 'Student login successful',
        token: makeToken(payload),
        student: publicStudent(student),
      });
    }

    /* POST /api/students/register */
    if (path === '/api/students/register' && req.method === 'POST') {
      const { roll_no, name, password, class_section = '', email = '' } = await readBody(req);
      const roll = String(roll_no || '').trim();
      if (!roll || !name || !password) {
        return send(res, 400, { success: false, message: 'roll_no, name and password are required.' });
      }
      if (STUDENTS.has(roll)) {
        return send(res, 409, { success: false, message: 'A student with this roll number already exists.' });
      }
      STUDENTS.set(roll, {
        roll_no: roll,
        name: String(name),
        password: String(password),
        class_section: String(class_section),
        email: String(email),
      });
      return send(res, 201, { success: true, message: 'Student registered successfully. You can now log in.' });
    }

    /* POST /api/students/forgot-password */
    if (path === '/api/students/forgot-password' && req.method === 'POST') {
      const { roll_no } = await readBody(req);
      const student = STUDENTS.get(String(roll_no || '').trim());
      if (!student) {
        return send(res, 200, { success: false, message: 'No account found for that roll number.' });
      }
      return send(res, 200, { success: true, message: 'Password reset instructions sent (mock).' });
    }

    /* POST /api/students/logout */
    if (path === '/api/students/logout' && req.method === 'POST') {
      const payload = verifyToken(bearerToken(req));
      if (!payload) return send(res, 401, { success: false, message: 'Not authorized' });
      return send(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    /* GET /api/students/profile */
    if (path === '/api/students/profile' && req.method === 'GET') {
      const payload = verifyToken(bearerToken(req));
      if (!payload) return send(res, 401, { success: false, message: 'Not authorized' });
      const student = STUDENTS.get(payload.sub);
      if (!student) return send(res, 404, { success: false, message: 'Student not found.' });
      return send(res, 200, { success: true, student: publicStudent(student) });
    }

    /* GET /api/protected */
    if (path === '/api/protected' && req.method === 'GET') {
      const payload = verifyToken(bearerToken(req));
      if (!payload) return send(res, 401, { success: false, message: 'Not authorized' });
      return send(res, 200, {
        success: true,
        message: 'JWT verified',
        user: { roll_no: payload.sub, role: payload.role },
      });
    }

    send(res, 404, { success: false, message: `Route not found: ${req.method} ${path}` });
  } catch (err) {
    send(res, 400, { success: false, message: err.message });
  }
}

/* ------------------------------- server ------------------------------ */
const server = http.createServer(handle);
server.listen(PORT, () => {
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│  EduGrowth · Auth service MOCK (dev only, zero deps)       │');
  console.log('└────────────────────────────────────────────────────────────┘');
  console.log(`  → http://localhost:${PORT}/api/students/login`);
  console.log(`  → http://localhost:${PORT}/api/students/profile  (Bearer token)`);
  console.log('  Demo logins:');
  console.log('    210029010188 / Bhavya Reddy@123');
  console.log('    210029023375 / student123');
});