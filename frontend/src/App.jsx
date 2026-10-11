import { useState } from 'react';
import Login from './pages/Login';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import { getStoredIdentity, getToken, clearSession } from './api/auth';

export default function App() {
  // Restore a previously stored JWT session (real auth login) on reload.
  // Demo logins (no token) stay in-memory, same as before.
  const [identity, setIdentity] = useState(() => (getToken() ? getStoredIdentity() : null));

  const handleLogin = (role, selectedIdentity) => {
    setIdentity(selectedIdentity || { role });
  };

  const handleLogout = () => {
    clearSession();
    setIdentity(null);
  };

  if (!identity) {
    return <Login onLogin={handleLogin} />;
  }

  return identity.role === 'teacher' ? (
    <Teacher identity={identity} onLogout={handleLogout} />
  ) : (
    <Student identity={identity} onLogout={handleLogout} />
  );
}