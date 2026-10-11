# EduGrowth Frontend

React 19 + Vite + Tailwind 4 single-page app for the EduGrowth platform. It
contains the login / register / password-reset screens and the **student** and
**faculty** dashboards.

The app talks to **two** backends:

| Env var | Backend | Default |
|---------|---------|---------|
| `VITE_API_BASE_URL` | FastAPI analytics (`ML/`) — public | `http://127.0.0.1:8000` |
| `VITE_AUTH_BASE_URL` | Express auth (`backend/`) — JWT | `http://localhost:5001` |

## Setup

```bash
npm install
cp .env.example .env      # adjust the two base URLs if needed
npm run dev               # http://localhost:5173
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run auth:mock` | Start a **zero-dependency** in-memory auth server on port 5001 that mirrors the real `backend/` contract |

### Trying it without the real backends

```bash
npm run auth:mock    # auth on :5001 (terminal 1)
npm run dev          # frontend on :5173 (terminal 2)
```

For analytics, start the FastAPI service (see `../ML/README.md`) or the
dashboards will show a "cannot reach the API" notice.

The mock auth server accepts roster logins with the derived password
`"<full name>@123"` (e.g. `210029023375` / `Aarav Rao@123`) and lets you
register new students and faculty accounts.

## Auth flow

- `src/api/auth.js` — auth client: `loginStudent`, `registerStudent`,
  `forgotPassword`, `resetPassword`, plus the faculty equivalents. It stores the
  JWT + identity in `localStorage` so a refresh keeps the session.
- `src/pages/Login.jsx` — student / faculty login, registration and
  "forgot password". If the auth server is **unreachable** it falls back to a
  demo identity (`src/config/identities.js`); a `401` is always shown as an error.
- `src/pages/ResetPassword.jsx` — consumes the emailed
  `/reset-password?token=...` link.
- `src/api/client.js` / `src/api/analysis.js` — analytics client and payload
  normalisation for the CGPA / risk / mentor endpoints.
