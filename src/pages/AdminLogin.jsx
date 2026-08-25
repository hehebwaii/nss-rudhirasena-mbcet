import { useState } from 'react';
import { Droplet, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!login(passcode.trim())) {
      setError('Incorrect passcode. Please try again.');
      setPasscode('');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Deliberate atmosphere: one warm glow anchored behind the card, not a diagonal tri-stop gradient. */}
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
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-700 text-white">
            <Droplet className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
            NSS Rudhirasena
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Blood Donor Directory · Admin Access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="passcode"
              className="block text-sm font-semibold text-slate-700"
            >
              Admin Passcode
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="passcode"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={passcode}
                onChange={(event) => {
                  setPasscode(event.target.value);
                  setError('');
                }}
                placeholder="Enter passcode"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'passcode-error' : undefined}
                className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-base text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:ring-2 ${
                  error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-300 focus:border-red-500 focus:ring-red-100'
                }`}
              />
            </div>
            {error && (
              <p
                id="passcode-error"
                role="alert"
                className="mt-2 text-sm font-medium text-red-600"
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-red-700 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-red-800 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:scale-[0.99]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorized volunteers only
        </p>
      </div>
    </div>
  );
}
