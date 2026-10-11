import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../api/auth';

const colors = {
  navy: '#0F0C1D',
  purple: '#7958F5',
  lavender: '#D7C9FF',
  yellow: '#FFE65C',
  mint: '#8BF0B2',
  offWhite: '#FFFEFA',
  dark: '#171522',
};

/**
 * Landing page for the emailed password-reset link
 * (FRONTEND_URL/reset-password?token=...).
 */
export default function ResetPassword({ onBackToLogin }) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is missing its token. Request a new one from the login page.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.offWhite,
    borderColor: colors.dark,
    color: colors.dark,
    boxShadow: `4px 4px 0px 0px ${colors.dark}`,
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center px-5 py-10 font-sans"
      style={{ backgroundColor: colors.navy }}
    >
      <div
        className="w-full max-w-[460px] border-[3px] p-8 relative"
        style={{ backgroundColor: colors.offWhite, borderColor: colors.dark, boxShadow: `10px 10px 0px 0px ${colors.dark}` }}
      >
        <div className="absolute top-0 left-0 w-full h-2.5 border-b-[3px]" style={{ backgroundColor: colors.lavender, borderColor: colors.dark }} />

        <div className="flex items-center gap-3 mb-5 mt-1">
          <div className="w-11 h-11 border-[3px] flex items-center justify-center shrink-0" style={{ backgroundColor: colors.yellow, borderColor: colors.dark }}>
            <KeyRound size={22} strokeWidth={2.6} style={{ color: colors.dark }} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none" style={{ color: colors.dark }}>
            New Password
          </h1>
        </div>

        {done ? (
          <div className="space-y-5">
            <div className="p-4 border-[3px] flex items-start gap-2 text-sm font-black" style={{ backgroundColor: colors.mint, borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}>
              <CheckCircle2 size={18} strokeWidth={2.8} className="shrink-0 mt-0.5" />
              <span>Password updated. You can now log in with your new password.</span>
            </div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full border-[3px] py-3 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.yellow, borderColor: colors.dark, color: colors.dark, boxShadow: `6px 6px 0px 0px ${colors.dark}` }}
            >
              <ArrowLeft size={17} strokeWidth={2.8} /> Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="p-3 border-[3px] text-[11px] font-black uppercase tracking-wide flex items-start gap-2" style={{ backgroundColor: '#fecaca', borderColor: colors.dark, color: colors.dark, boxShadow: `3px 3px 0px 0px ${colors.dark}` }}>
                <AlertCircle size={16} strokeWidth={2.8} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: colors.dark }}>
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-[3px] px-3.5 py-2.5 text-sm font-bold outline-none"
                style={inputStyle}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: colors.dark }}>
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border-[3px] px-3.5 py-2.5 text-sm font-bold outline-none"
                style={inputStyle}
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border-[3px] py-3 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ backgroundColor: colors.mint, borderColor: colors.dark, color: colors.dark, boxShadow: `6px 6px 0px 0px ${colors.dark}` }}
            >
              {isLoading ? <Loader2 size={17} strokeWidth={2.8} className="animate-spin" /> : 'Reset Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: colors.purple }}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
