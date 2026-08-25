import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../config';

const STORAGE_TOKEN_KEY = 'nss_rudhirasena_session_token';
const STORAGE_USER_KEY = 'nss_rudhirasena_session_user';
const STORAGE_EXP_KEY = 'nss_rudhirasena_session_exp';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessionToken, setSessionToken] = useState(() => {
    try {
      const token = sessionStorage.getItem(STORAGE_TOKEN_KEY);
      const exp = parseInt(sessionStorage.getItem(STORAGE_EXP_KEY) || '0', 10);
      if (token && exp && Date.now() < exp) {
        return token;
      }
    } catch {}
    return '';
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_USER_KEY);
      const exp = parseInt(sessionStorage.getItem(STORAGE_EXP_KEY) || '0', 10);
      if (raw && exp && Date.now() < exp) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  });

  const isAuthenticated = Boolean(sessionToken && user);

  const saveSession = useCallback((token, userData) => {
    const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
    setSessionToken(token);
    setUser(userData);
    try {
      sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
      sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      sessionStorage.setItem(STORAGE_EXP_KEY, String(exp));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setSessionToken('');
    setUser(null);
    try {
      sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_USER_KEY);
      sessionStorage.removeItem(STORAGE_EXP_KEY);
    } catch {}
  }, []);

  /**
   * Request a 6-digit email OTP from the secure backend
   */
  const requestOtp = useCallback(async (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'request_otp',
        email: cleanEmail,
      }),
    });

    if (response.status === 429) {
      throw new Error('Rate limit reached: Too many requests. Please wait a minute.');
    }

    const data = await response.json();
    if (data.status === 'error') {
      throw new Error(data.error || 'Failed to send verification code.');
    }
    return data;
  }, []);

  /**
   * Verify the 6-digit OTP and establish an authenticated session
   */
  const verifyOtp = useCallback(async (email, otp) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !cleanOtp) {
      throw new Error('Email and 6-digit code are required.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'verify_otp',
        email: cleanEmail,
        otp: cleanOtp,
      }),
    });

    if (response.status === 429) {
      throw new Error('Rate limit reached: Too many failed attempts. Please wait.');
    }

    const data = await response.json();
    if (data.status === 'error' || !data.sessionToken) {
      throw new Error(data.error || 'Invalid verification code.');
    }

    saveSession(data.sessionToken, data.user || { email: cleanEmail });
    return data;
  }, [saveSession]);

  /**
   * Verify Google OAuth ID Token and establish an authenticated session
   */
  const loginWithGoogle = useCallback(async (credential) => {
    if (!credential) {
      throw new Error('Google credential token missing.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'verify_google_token',
        idToken: credential,
      }),
    });

    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a minute.');
    }

    const data = await response.json();
    if (data.status === 'error' || !data.sessionToken) {
      throw new Error(data.error || 'Google Sign-In verification failed.');
    }

    saveSession(data.sessionToken, data.user);
    return data;
  }, [saveSession]);

  // Expiration watcher
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const exp = parseInt(sessionStorage.getItem(STORAGE_EXP_KEY) || '0', 10);
      if (exp && Date.now() >= exp) {
        logout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      authToken: sessionToken,
      sessionToken,
      user,
      requestOtp,
      verifyOtp,
      loginWithGoogle,
      logout,
    }),
    [isAuthenticated, sessionToken, user, requestOtp, verifyOtp, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
