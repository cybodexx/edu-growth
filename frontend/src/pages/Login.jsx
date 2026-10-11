import { useState } from 'react';
import { 
  AlertCircle, ArrowRight, ShieldCheck, 
  CheckCircle2, Key, Sparkles, Eye, EyeOff, Loader2,
  GraduationCap, Zap, WifiOff
} from 'lucide-react';
import { DEMO_CREDENTIALS, DEMO_STUDENT, DEMO_TEACHER } from '../config/identities';
import {
  loginStudent, registerStudent, forgotPassword,
  normalizeLoginIdentity, saveSession, AUTH_BASE_URL,
} from '../api/auth';

const colors = {
  navy: '#0F0C1D',
  purple: '#7958F5',
  lavender: '#D7C9FF',
  yellow: '#FFE65C',
  blue: '#A5D4FF',
  mint: '#8BF0B2',
  offWhite: '#FFFEFA',
  dark: '#171522',
  muted: '#9B8EC4'
};

export default function Login({ onLogin }) {
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login');
  
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [passkey, setPasskey] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [recoveredPass, setRecoveredPass] = useState('');
  const [authDown, setAuthDown] = useState(false);

  const resetTransient = () => {
    setError('');
    setSuccessMsg('');
    setRecoveredPass('');
    setAuthDown(false);
    setFullName('');
    setPasskey('');
  };

  const changeRole = (nextRole) => {
    setRole(nextRole);
    resetTransient();
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    resetTransient();
  };

  const getPasswordStrength = (pass) => {
    if (pass.length === 0) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 5) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Za-z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    
    if (score <= 1) return { score, label: 'Too short', color: 'bg-red-400' };
    if (score === 2) return { score, label: 'Weak', color: 'bg-orange-400' };
    if (score === 3) return { score, label: 'Moderate', color: 'bg-[#FFE65C]' };
    return { score, label: 'Strong', color: 'bg-[#8BF0B2]' };
  };

  const passStrength = getPasswordStrength(passkey);

  // ──────────────────────────────────────────────────────────────────
  // AUTH FLOW
  //
  // Students are authenticated by the real backend:
  //   POST {AUTH_BASE_URL}/api/students/login  ->  { token, student }
  // The JWT + identity are cached in localStorage so a page refresh
  // keeps the session.
  //
  // Fallbacks (so the dashboards stay reachable while developing):
  //  * Auth server unreachable  -> demo credentials with an info banner
  //  * Faculty role             -> demo identity (auth API is student-only)
  // ──────────────────────────────────────────────────────────────────

  const isNetworkFailure = (err) => !!err && !err.status;

  const demoAccount = () =>
    DEMO_CREDENTIALS[role].find((c) => c.identifier.toLowerCase() === identifier.trim().toLowerCase());

  /** Validate against the hardcoded demo table; returns true on success. */
  const demoSignIn = () => {
    const account = demoAccount();
    if (!account) {
      setError(
        `Unknown ${role} demo account. Try ${role === 'student' ? DEMO_STUDENT.roll_no : DEMO_TEACHER.email}.`
      );
      return false;
    }
    // Password is still optional in demo mode; if provided it must match.
    if (passkey && passkey !== account.password) {
      setError(`Incorrect password. Demo password is "${account.password}".`);
      return false;
    }
    onLogin(role, account.identity);
    return true;
  };

  /** Real student login via the auth backend (teacher stays on demo). */
  const realLogin = async () => {
    try {
      if (role !== 'student') {
        // Faculty endpoints don't exist in the auth service yet.
        demoSignIn();
        setIsLoading(false);
        return;
      }
      const res = await loginStudent(identifier, passkey);
      if (!res?.token || !res?.student) {
        throw new Error('Login response missing token/student.');
      }
      const identity = normalizeLoginIdentity(res.student);
      saveSession(res.token, identity);
      onLogin('student', identity, res.token);
    } catch (err) {
      setIsLoading(false);
      if (isNetworkFailure(err)) {
        setAuthDown(true);
        demoSignIn();
      } else {
        setError(err.message || 'Login failed.');
      }
    }
  };

  const realRegister = async () => {
    try {
      if (role !== 'student') {
        setError('Faculty registration opens with the auth service (student API only for now).');
        return;
      }
      const res = await registerStudent({
        roll_no: identifier.trim(),
        name: fullName.trim() || undefined,
        password: passkey,
        class_section: '',
      });
      changeMode('login');
      setSuccessMsg(res?.message || 'Registration successful — you can now log in.');
    } catch (err) {
      if (isNetworkFailure(err)) {
        setError('Auth server unreachable — registration unavailable in demo mode.');
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const realForgot = async () => {
    try {
      if (role !== 'student') {
        setRecoveredPass(`Demo password: ${DEMO_CREDENTIALS.teacher[0].password}`);
        return;
      }
      const res = await forgotPassword(identifier);
      setRecoveredPass(res?.message || 'Password reset link sent to your registered contact.');
    } catch (err) {
      if (isNetworkFailure(err)) {
        setAuthDown(true);
        setRecoveredPass(`Demo password: ${DEMO_CREDENTIALS.student[0].password}`);
      } else {
        setError(err.message || 'Recovery failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setRecoveredPass('');
    setAuthDown(false);
    setIsLoading(true);

    const id = identifier.trim();

    if (role === 'student' && !/^\d{12}$/.test(id)) {
      setError('Student Roll Number must be exactly 12 digits.');
      setIsLoading(false);
      return;
    }

    if (role === 'teacher' && !id.includes('@')) {
      setError('Please enter a valid faculty Email ID.');
      setIsLoading(false);
      return;
    }

    if (mode === 'register') realRegister();
    else if (mode === 'forgot') realForgot();
    else realLogin();
  };

  const fillDemo = () => {
    const account = DEMO_CREDENTIALS[role][0];
    setIdentifier(account.identifier);
    setPasskey(account.password);
    setError('');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans" style={{ backgroundColor: colors.navy }}>
      
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(15,12,29,0.78), rgba(15,12,29,0.85)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')`,
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{ 
          backgroundImage: `radial-gradient(${colors.lavender} 1.2px, transparent 1.2px)`, 
          backgroundSize: '24px 24px' 
        }}
      />

      {/* Main Container - No Scroll */}
      <div className="relative z-20 h-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 px-5 sm:px-8 py-6">
        
        {/* ===================== LEFT: BRANDING ===================== */}
        <div className="w-full lg:w-[52%] flex flex-col justify-center">
          
          {/* Small Badge */}
          <div 
            className="inline-flex items-center gap-2 border-[2.5px] px-3 py-1.5 mb-5 self-start"
            style={{ 
              backgroundColor: colors.mint, 
              borderColor: colors.dark,
              boxShadow: `4px 4px 0px 0px ${colors.dark}`
            }}
          >
            <Sparkles size={13} strokeWidth={2.8} style={{ color: colors.dark }} />
            <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: colors.dark }}>
              The #1 Analytics Platform
            </span>
          </div>

          {/* Compact Yellow Card */}
          <div 
            className="border-[3px] p-6 sm:p-7 relative"
            style={{ 
              backgroundColor: colors.yellow, 
              borderColor: colors.dark,
              boxShadow: `8px 8px 0px 0px ${colors.dark}`
            }}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div 
                className="w-11 h-11 border-[3px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: colors.offWhite, borderColor: colors.dark }}
              >
                <GraduationCap size={22} strokeWidth={2.5} style={{ color: colors.dark }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none" style={{ color: colors.dark }}>
                  Welcome to
                </h1>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none" style={{ color: colors.purple }}>
                  Edu Growth.
                </h1>
              </div>
            </div>
            
            <div className="h-[2px] w-full mb-3.5" style={{ backgroundColor: colors.dark }} />
            
            <p className="text-[12px] sm:text-[13px] font-black uppercase tracking-wide mb-2" style={{ color: colors.dark }}>
              Your Ultimate Academic Gateway
            </p>
            <p className="text-[13px] sm:text-sm font-medium leading-relaxed" style={{ color: '#3d3a4a' }}>
              Predict CGPA, track attendance, manage assignments & get mentors — all in one secure ecosystem.
            </p>
          </div>

          {/* Small floating chips - only on large screens */}
          <div className="hidden lg:flex gap-3 mt-6">
            <div 
              className="border-[2.5px] px-3.5 py-2 text-[11px] font-black uppercase tracking-wider"
              style={{ backgroundColor: colors.blue, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
            >
              Live Analytics
            </div>
            <div 
              className="border-[2.5px] px-3.5 py-2 text-[11px] font-black uppercase tracking-wider"
              style={{ backgroundColor: colors.lavender, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
            >
              Smart Mentors
            </div>
            <div 
              className="border-[2.5px] px-3.5 py-2 text-[11px] font-black uppercase tracking-wider"
              style={{ backgroundColor: colors.mint, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
            >
              CGPA Predictor
            </div>
          </div>
        </div>

        {/* ===================== RIGHT: AUTH CARD ===================== */}
        <div className="w-full lg:w-[42%] flex justify-center lg:justify-end">
          <div 
            className="w-full max-w-[440px] border-[3px] p-7 sm:p-8 relative"
            style={{ 
              backgroundColor: colors.offWhite, 
              borderColor: colors.dark, 
              boxShadow: `10px 10px 0px 0px ${colors.dark}` 
            }}
          >
            {/* Top accent */}
            <div 
              className="absolute top-0 left-0 w-full h-2.5 border-b-[3px]" 
              style={{ backgroundColor: colors.lavender, borderColor: colors.dark }}
            />

            {/* Header */}
            <div className="mb-5 mt-1">
              <div 
                className="inline-flex items-center gap-2 border-[2.5px] px-3 py-1 mb-3.5"
                style={{ 
                  backgroundColor: colors.yellow, 
                  borderColor: colors.dark,
                  boxShadow: `3px 3px 0px 0px ${colors.dark}`
                }}
              >
                <ShieldCheck size={14} strokeWidth={2.8} style={{ color: colors.dark }} />
                <p className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: colors.dark }}>
                  System Access
                </p>
              </div>
              
              <h2 className="text-[1.85rem] font-black tracking-tighter uppercase leading-none" style={{ color: colors.dark }}>
                {mode === 'register' ? 'Join Portal' : mode === 'forgot' ? 'Recovery' : 'Welcome Back'}
              </h2>
            </div>

            {/* Role Selector */}
            <div 
              className="flex border-[3px] p-1 mb-5"
              style={{ 
                backgroundColor: colors.offWhite, 
                borderColor: colors.dark, 
                boxShadow: `4px 4px 0px 0px ${colors.dark}` 
              }}
            >
              <button 
                type="button" 
                onClick={() => changeRole('student')} 
                className="flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-200"
                style={{ 
                  backgroundColor: role === 'student' ? colors.yellow : 'transparent', 
                  border: role === 'student' ? `2px solid ${colors.dark}` : '2px solid transparent',
                  boxShadow: role === 'student' ? `2px 2px 0px 0px ${colors.dark}` : 'none',
                  color: colors.dark,
                  opacity: role === 'student' ? 1 : 0.5
                }}
              >
                Student
              </button>
              <button 
                type="button" 
                onClick={() => changeRole('teacher')} 
                className="flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-200"
                style={{ 
                  backgroundColor: role === 'teacher' ? colors.blue : 'transparent', 
                  border: role === 'teacher' ? `2px solid ${colors.dark}` : '2px solid transparent',
                  boxShadow: role === 'teacher' ? `2px 2px 0px 0px ${colors.dark}` : 'none',
                  color: colors.dark,
                  opacity: role === 'teacher' ? 1 : 0.5
                }}
              >
                Faculty
              </button>
            </div>

            {/* Tabs */}
            {mode !== 'forgot' && (
              <div className="flex gap-6 mb-6 border-b-[3px] pb-2.5" style={{ borderColor: colors.dark }}>
                <button 
                  type="button" 
                  onClick={() => changeMode('login')} 
                  className="text-[13px] font-black uppercase tracking-widest relative transition-colors"
                  style={{ color: mode === 'login' ? colors.dark : '#9ca3af' }}
                >
                  Login
                  {mode === 'login' && (
                    <span className="absolute -bottom-[13px] left-0 w-full h-[3px]" style={{ backgroundColor: colors.dark }} />
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => changeMode('register')} 
                  className="text-[13px] font-black uppercase tracking-widest relative transition-colors"
                  style={{ color: mode === 'register' ? colors.dark : '#9ca3af' }}
                >
                  Register
                  {mode === 'register' && (
                    <span className="absolute -bottom-[13px] left-0 w-full h-[3px]" style={{ backgroundColor: colors.dark }} />
                  )}
                </button>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div 
                className="mb-4 p-3 border-[3px] text-[11px] font-black uppercase tracking-wide flex items-start gap-2"
                style={{ backgroundColor: '#fecaca', borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
              >
                <AlertCircle size={16} strokeWidth={2.8} className="shrink-0 mt-0.5" /> 
                <span>{error}</span>
              </div>
            )}
            {authDown && (
              <div 
                className="mb-4 p-3 border-[3px] text-[11px] font-black uppercase tracking-wide flex items-start gap-2"
                style={{ backgroundColor: colors.blue, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
              >
                <WifiOff size={16} strokeWidth={2.8} className="shrink-0 mt-0.5" /> 
                <span>Auth server unreachable (tried {AUTH_BASE_URL}/api/students/login) — used demo identity instead.</span>
              </div>
            )}
            {successMsg && (
              <div 
                className="mb-4 p-3 border-[3px] text-[11px] font-black uppercase tracking-wide flex items-start gap-2"
                style={{ backgroundColor: colors.mint, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
              >
                <CheckCircle2 size={16} strokeWidth={2.8} className="shrink-0 mt-0.5" /> 
                <span>{successMsg}</span>
              </div>
            )}
            {recoveredPass && (
              <div 
                className="mb-4 p-3 border-[3px] text-sm font-black flex items-start gap-2"
                style={{ backgroundColor: colors.yellow, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}
              >
                <Key size={16} strokeWidth={2.8} className="shrink-0 mt-0.5" /> 
                <span>{recoveredPass}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              
              {/* Full Name */}
              <div 
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{ 
                  maxHeight: mode === 'register' && role === 'student' ? 85 : 0,
                  opacity: mode === 'register' && role === 'student' ? 1 : 0,
                  marginBottom: mode === 'register' && role === 'student' ? 0 : -6
                }}
              >
                <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: colors.dark }}>
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required={mode === 'register' && role === 'student'}
                  className="w-full border-[3px] px-3.5 py-2.5 text-sm font-bold outline-none transition-all duration-200"
                  style={{ backgroundColor: colors.offWhite, borderColor: colors.dark, color: colors.dark, boxShadow: `4px 4px 0px 0px ${colors.dark}` }}
                  onFocus={(e) => { e.target.style.transform = 'translate(-2px, -2px)'; e.target.style.boxShadow = `6px 6px 0px 0px ${colors.dark}`; }}
                  onBlur={(e) => { e.target.style.transform = 'translate(0, 0)'; e.target.style.boxShadow = `4px 4px 0px 0px ${colors.dark}`; }}
                  placeholder="e.g. Raunak Agrahari" 
                />
              </div>

              {/* Identifier */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: colors.dark }}>
                  {role === 'student' ? 'Roll Number (12 Digits)' : 'Faculty Email'}
                </label>
                <input 
                  type={role === 'student' ? 'text' : 'email'} 
                  required 
                  maxLength={role === 'student' ? 12 : undefined}
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full border-[3px] px-3.5 py-2.5 text-sm font-bold outline-none transition-all duration-200"
                  style={{ backgroundColor: colors.offWhite, borderColor: colors.dark, color: colors.dark, boxShadow: `4px 4px 0px 0px ${colors.dark}` }}
                  onFocus={(e) => { e.target.style.transform = 'translate(-2px, -2px)'; e.target.style.boxShadow = `6px 6px 0px 0px ${colors.dark}`; }}
                  onBlur={(e) => { e.target.style.transform = 'translate(0, 0)'; e.target.style.boxShadow = `4px 4px 0px 0px ${colors.dark}`; }}
                  placeholder={role === 'student' ? "e.g. 210029023375" : "e.g. faculty@college.edu"} 
                />
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: colors.dark }}>
                    Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={passkey} 
                      onChange={(e) => setPasskey(e.target.value)}
                      className="w-full border-[3px] px-3.5 py-2.5 text-sm font-bold outline-none transition-all duration-200 pr-11"
                      style={{ backgroundColor: colors.offWhite, borderColor: colors.dark, color: colors.dark, boxShadow: `4px 4px 0px 0px ${colors.dark}` }}
                      onFocus={(e) => { e.target.style.transform = 'translate(-2px, -2px)'; e.target.style.boxShadow = `6px 6px 0px 0px ${colors.dark}`; }}
                      onBlur={(e) => { e.target.style.transform = 'translate(0, 0)'; e.target.style.boxShadow = `4px 4px 0px 0px ${colors.dark}`; }}
                      placeholder="Alphanumeric allowed" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: colors.dark }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={17} strokeWidth={2.5}/> : <Eye size={17} strokeWidth={2.5}/>}
                    </button>
                  </div>
                  
                  {mode === 'register' && passkey.length > 0 && (
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="flex-1 flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map(level => (
                          <div 
                            key={level} 
                            className={`h-full flex-1 border ${level <= passStrength.score ? passStrength.color : 'bg-gray-200'}`} 
                            style={{ borderColor: colors.dark }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.dark }}>
                        {passStrength.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full font-black py-3 text-sm uppercase tracking-widest transition-all duration-200 mt-1 border-[3px] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: mode === 'register' ? colors.blue : mode === 'forgot' ? colors.yellow : colors.mint, 
                  borderColor: colors.dark, 
                  color: colors.dark,
                  boxShadow: `6px 6px 0px 0px ${colors.dark}`
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translate(3px, 3px)';
                    e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${colors.dark}`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = `6px 6px 0px 0px ${colors.dark}`;
                }}
              >
                {isLoading ? (
                  <Loader2 size={17} strokeWidth={2.8} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Recover Password' : 'Secure Login'}
                    <ArrowRight size={17} strokeWidth={2.8} />
                  </>
                )}
              </button>
            </form>

            {/* Demo access helper (auth service comes later) */}
            <button
              type="button"
              onClick={fillDemo}
              className="mt-4 w-full flex items-center justify-center gap-2 border-[3px] py-2.5 text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                backgroundColor: colors.lavender,
                borderColor: colors.dark,
                color: colors.dark,
                boxShadow: `4px 4px 0px 0px ${colors.dark}`,
              }}
            >
              <Zap size={15} strokeWidth={3} />
              {role === 'student'
                ? `Fill demo student (${DEMO_STUDENT.roll_no})`
                : `Fill demo faculty (${DEMO_TEACHER.email})`}
            </button>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t-[2.5px] text-center" style={{ borderColor: '#e5e7eb' }}>
              {mode === 'login' && (
                <button 
                  type="button" 
                  onClick={() => changeMode('forgot')} 
                  className="text-[11px] font-black uppercase tracking-widest transition-colors"
                  style={{ color: '#6b7280' }}
                  onMouseOver={(e) => e.currentTarget.style.color = colors.dark}
                  onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
                >
                  Forgot Password?
                </button>
              )}
              {mode === 'forgot' && (
                <button 
                  type="button" 
                  onClick={() => changeMode('login')} 
                  className="text-[11px] font-black uppercase tracking-widest transition-colors"
                  style={{ color: colors.purple }}
                  onMouseOver={(e) => e.currentTarget.style.color = colors.dark}
                  onMouseOut={(e) => e.currentTarget.style.color = colors.purple}
                >
                  ← Back to Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}