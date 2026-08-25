import { useEffect, useState } from 'react';
import { AlertCircle, Droplet, Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SEC = 30;

export default function AdminLogin() {
  const { login } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(sessionStorage.getItem('login_fails') || '0', 10);
  });
  const [lockoutRemaining, setLockoutRemaining] = useState(() => {
    const lockUntil = parseInt(sessionStorage.getItem('login_lock_until') || '0', 10);
    const diff = Math.ceil((lockUntil - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  });

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sessionStorage.removeItem('login_lock_until');
          sessionStorage.setItem('login_fails', '0');
          setFailedAttempts(0);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (lockoutRemaining > 0) return;

    const cleaned = passcode.trim().slice(0, 50);
    const success = login(cleaned);

    if (!success) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      sessionStorage.setItem('login_fails', String(newFails));

      if (newFails >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_SEC * 1000;
        sessionStorage.setItem('login_lock_until', String(lockUntil));
        setLockoutRemaining(LOCKOUT_DURATION_SEC);
        setError(`Too many failed attempts. Login locked for ${LOCKOUT_DURATION_SEC}s.`);
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - newFails;
        setError(`Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }
      setPasscode('');
    } else {
      sessionStorage.removeItem('login_fails');
      sessionStorage.removeItem('login_lock_until');
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_-10%,rgba(185,28,28,0.38),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_40%_at_50%_120%,rgba(30,41,59,0.9),transparent_60%)]"
      />
      <div className="animate-pop relative w-full max-w-md rounded-2xl bg-white p-8 shadow-overlay ring-1 ring-white/10">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-700 text-white shadow-sm">
            <Droplet className="h-7 w-7 fill-white" />
          </span>
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
            NSS Rudhirasena
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Blood Donor Directory · Secure Admin Portal
          </p>
        </div>

        {isLocked && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Security Lockout Active</p>
              <p className="mt-0.5">
                Too many failed attempts. Please wait{' '}
                <span className="tnum font-bold text-red-900">{lockoutRemaining}s</span> before retrying.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="passcode"
              className="block text-sm font-semibold text-slate-700"
            >
              Admin Passcode
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                disabled={isLocked}
                required
                maxLength={50}
                value={passcode}
                onChange={(event) => {
                  setPasscode(event.target.value);
                  setError('');
                }}
                placeholder={isLocked ? `Locked (${lockoutRemaining}s)` : 'Enter passcode'}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'passcode-error' : undefined}
                className={`w-full rounded-xl border bg-white py-2.5 pr-4 pl-10 text-base text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-75 ${
                  error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-300 focus:border-red-500 focus:ring-red-100'
                }`}
              />
            </div>
            {error && !isLocked && (
              <p
                id="passcode-error"
                role="alert"
                className="mt-2 flex items-center gap-1 text-sm font-medium text-red-600"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLocked}
            className="w-full cursor-pointer rounded-xl bg-red-700 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-red-800 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocked ? `Locked for ${lockoutRemaining}s` : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>OWASP Protected · Authorized Personnel Only</span>
        </div>
      </div>
    </div>
  );
}
