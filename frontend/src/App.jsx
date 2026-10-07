// src/App.jsx
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import Login from './pages/Login.jsx';
import StudentDashboard from './pages/Student/index.jsx';
import TeacherDashboard from './pages/Teacher/index.jsx';

// ==========================================
// 1. TOPBAR COMPONENT (Navigation Header)
// ==========================================
// This component displays the top navigation bar when a user is logged in.
function Topbar({ currentScreen, onLogout }) {
  // Check if the current screen is 'student' to conditionally render text
  const isStudent = currentScreen === 'student';
  
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        
        {/* Left Side: App Title and Role */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-100">Edu Growth</span>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400">
            {/* Show 'Student' or 'Faculty' based on the active screen */}
            {isStudent ? 'Student' : 'Faculty'}
          </span>
        </div>

        {/* Right Side: Logout Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-md border border-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}

// ==========================================
// 2. MAIN APP COMPONENT (The Router)
// ==========================================
export default function App() {
  // 'currentScreen' state tracks which page to show. It defaults to 'login'.
  const [currentScreen, setCurrentScreen] = useState('login');

  // If the user is on the login page, render ONLY the Login component (No Topbar)
  if (currentScreen === 'login') {
    return <Login onLogin={setCurrentScreen} />;
  }

  // If the user is logged in, show the Topbar and the appropriate Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      
      {/* Show the Topbar and pass down the current screen and logout function */}
      <Topbar currentScreen={currentScreen} onLogout={() => setCurrentScreen('login')} />
      
      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Render the Student Dashboard if 'student' is active, otherwise render Teacher Dashboard */}
        {currentScreen === 'student' ? <StudentDashboard /> : <TeacherDashboard />}
      </main>

    </div>
  );
}