import { useState } from 'react';
import Login from './pages/Login';
import Student from './pages/Student';
import Teacher from './pages/Teacher';

export default function App() {
  // `identity` holds the hardcoded student/teacher profile coming from Login.
  // The real auth service will replace this later.
  const [identity, setIdentity] = useState(null);

  const handleLogin = (role, selectedIdentity) => {
    setIdentity(selectedIdentity || { role });
  };

  const handleLogout = () => setIdentity(null);

  if (!identity) {
    return <Login onLogin={handleLogin} />;
  }

  return identity.role === 'teacher' ? (
    <Teacher identity={identity} onLogout={handleLogout} />
  ) : (
    <Student identity={identity} onLogout={handleLogout} />
  );
}
