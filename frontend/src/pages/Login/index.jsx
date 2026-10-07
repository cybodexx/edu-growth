// src/pages/Login.jsx
import { useState } from 'react';

export default function Login({ onLogin }) {
  // 1. STATE VARIABLES: Yeh variables yaad rakhte hain ki user ne kya type ya select kiya hai
  const [role, setRole] = useState('student'); // Default role 'student' rahega
  const [userId, setUserId] = useState('');    // Roll number ya Email store karne ke liye
  const [password, setPassword] = useState(''); // Password store karne ke liye

  // 2. FORM SUBMIT FUNCTION: Jab user "Sign in" button dabayega, tab yeh chalega
  const handleSubmit = (e) => {
    e.preventDefault(); // Yeh page ko refresh hone se rokta hai
    onLogin(role);      // Parent (App.jsx) ko batata hai ki user login ho gaya aur uska role kya hai
  };

  // Input fields ki styling ek variable me daal di taaki baar-baar lamba code na likhna pade
  const inputClass = "mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        
        {/* App Logo / Name */}
        <p className="mb-6 text-sm font-semibold tracking-tight text-slate-100">Edu Growth</p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-base font-semibold text-slate-100">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Use your institute credentials.</p>

          {/* 3. ROLE TOGGLE BUTTONS (Student vs Faculty) */}
          <div className="mt-5 grid grid-cols-2 rounded-md border border-slate-800 bg-slate-950 p-0.5">
            {/* Student Button */}
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                role === 'student' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Student
            </button>
            {/* Faculty Button */}
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                role === 'teacher' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Faculty
            </button>
          </div>

          {/* 4. USERNAME INPUT (Dynamic label based on role) */}
          <label className="mt-5 block">
            <span className="text-xs font-medium text-slate-400">
              {role === 'student' ? 'Roll number' : 'Faculty email'}
            </span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)} // User jo type karega wo state me save hoga
              placeholder={role === 'student' ? '2201640100182' : 'name@institute.edu'}
              className={inputClass}
            />
          </label>

          {/* 5. PASSWORD INPUT */}
          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </label>

          {/* Sign In Button */}
          <button
            type="submit"
            className="mt-6 w-full rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-white"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Demo build — any credentials work. Data is mocked until the API is connected.
        </p>
      </div>
    </div>
  );
}