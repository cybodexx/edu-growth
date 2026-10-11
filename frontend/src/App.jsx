import { useState } from 'react';
import Login from './pages/Login';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import ResetPassword from './pages/ResetPassword';
import {
  getStoredIdentity, getToken, clearSession,
  logoutStudent, logoutFaculty,
} from './api/auth';

export default function App() {
  // Restore a previously stored JWT session (real auth login) on reload.
  // Demo logins (no token) stay in-memory, same as before.
  const [identity, setIdentity] = useState(() => (getToken() ? getStoredIdentity() : null));

  // Password-reset link handling (no router: inspect the URL once).
  const [isResetting, setIsResetting] = useState(() => {
    const { pathname, search } = window.location;
    return pathname === '/reset-password' || new URLSearchParams(search).has('token');
  });

  const backToLogin = () => {
    window.history.replaceState({}, '', '/');
    setIsResetting(false);
  };

  const handleLogin = (role, selectedIdentity) => {
    setIdentity(selectedIdentity || { role });
  };

  const handleLogout = () => {
    // Best-effort server-side revocation, then clear the local session.
    const token = getToken();
    if (token) {
      const role = identity?.role === 'teacher' ? 'teacher' : 'student';
      const revoke = role === 'teacher' ? logoutFaculty : logoutStudent;
      Promise.resolve(revoke(token)).catch(() => {});
    }
    clearSession();
    setIdentity(null);
  };

  if (isResetting) {
    return <ResetPassword onBackToLogin={backToLogin} />;
  }

  if (!identity) {
    return <Login onLogin={handleLogin} />;
  }

  return identity.role === 'teacher' ? (
    <Teacher identity={identity} onLogout={handleLogout} />
  ) : (
    <Student identity={identity} onLogout={handleLogout} />
  );
}