import { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Droplet,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config';

export default function AdminLogin() {
  const { requestOtp, verifyOtp, loginWithGoogle } = useAuth();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const googleBtnRef = useRef(null);

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Google Identity Services SDK Initialization
  useEffect(() => {
    if (window.google && GOOGLE_CLIENT_ID && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response.credential) {
              setGoogleLoading(true);
              setError('');
              try {
                await loginWithGoogle(response.credential);
              } catch (err) {
                setError(err.message || 'Google Sign-In failed.');
              } finally {
                setGoogleLoading(false);
              }
            }
          },
          auto_select: false,
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 340,
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
      } catch (err) {
        console.warn('Google Identity initialization note:', err.message);
      }
    }
  }, [loginWithGoogle]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMsg('');

    try {
      const res = await requestOtp(cleanEmail);
      setStep('otp');
      setResendTimer(60);
      setInfoMsg(res.message || `Verification code sent to ${cleanEmail}`);
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOtp(email, cleanOtp);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
      setLoading(false);
    }
  };

  const handleOtpChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
    setError('');
    if (digitsOnly.length === 6) {
      // Auto-submit on 6th digit
      setLoading(true);
      verifyOtp(email, digitsOnly).catch((err) => {
        setError(err.message || 'Invalid verification code.');
        setLoading(false);
      });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_60%_at_50%_-10%,rgba(185,28,28,0.38),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_120%,rgba(15,23,42,0.95),transparent_60%)]"
      />

      <div className="animate-pop relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-overlay ring-1 ring-white/15">
        {/* Portal Header */}
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-700 text-white shadow-md transition-transform hover:scale-105">
            <Droplet className="h-7 w-7 fill-white" />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            NSS Rudhirasena
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            MBCET Blood Donor Registry · Authorized Portal
          </p>
        </div>

        {/* Security Alert Banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-900">Access Issue</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {infoMsg && !error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>{infoMsg}</p>
          </div>
        )}

        {/* Option 1: Official Google Sign-In */}
        {GOOGLE_CLIENT_ID && (
          <div className="mb-5 space-y-3">
            <p className="text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
              Quick Sign-In
            </p>
            <div className="flex justify-center">
              <div ref={googleBtnRef} />
            </div>
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                Verifying Google Authorization...
              </div>
            )}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 font-bold text-slate-400">
                  Or use Email OTP
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Option 2: Passwordless 6-Digit Email OTP */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Authorized Coordinator Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. name@mbcet.ac.in or gmail.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Access is restricted to authorized coordinators. A 6-digit one-time passcode will be sent to this inbox.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-red-800 active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Verification Code...
                </>
              ) : (
                <>
                  Send 6-Digit Code
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Entry Screen */
          <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  className="cursor-pointer text-xs font-semibold text-red-600 hover:underline"
                >
                  Change Email
                </button>
              </div>

              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="• • • • • •"
                  className="tnum w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-10 text-center text-2xl font-black tracking-widest text-slate-900 outline-none transition-colors placeholder:text-slate-300 hover:border-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Code expires in 5 minutes</span>
                {resendTimer > 0 ? (
                  <span className="tnum font-medium text-slate-400">
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="flex cursor-pointer items-center gap-1 font-bold text-red-700 hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-700 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-red-800 active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                <>
                  Verify & Access Portal
                  <ShieldCheck className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Badge Footer */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Zero-Password Security · 256-Bit Encrypted Sessions
          </p>
        </div>
      </div>

      {/* Bottom Page Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500">
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-600" />
            NSS Rudhirasena · Blood Donor Directory
          </span>
          <p className="text-[11px] text-slate-500 font-medium">
            Developed by NSS MBCET Units 230 & 706
          </p>
        </div>
      </footer>
    </div>
  );
}
