import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_PASSCODE } from '../config';

const STORAGE_KEY = 'nss_rudhirasena_admin_auth';
const TIMESTAMP_KEY = 'nss_rudhirasena_auth_ts';
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours auto-expire

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const isAuth = sessionStorage.getItem(STORAGE_KEY) === 'true';
    const ts = parseInt(sessionStorage.getItem(TIMESTAMP_KEY) || '0', 10);
    const isValid = isAuth && Date.now() - ts < SESSION_MAX_AGE_MS;
    return isValid;
  });

  const [authToken, setAuthToken] = useState(() => {
    return isAuthenticated ? ADMIN_PASSCODE : '';
  });

  const login = useCallback((passcode) => {
    if (!passcode || passcode !== ADMIN_PASSCODE) {
      return false;
    }
    sessionStorage.setItem(STORAGE_KEY, 'true');
    sessionStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
    setIsAuthenticated(true);
    setAuthToken(ADMIN_PASSCODE);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TIMESTAMP_KEY);
    setIsAuthenticated(false);
    setAuthToken('');
  }, []);

  // Periodic session expiration check
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const ts = parseInt(sessionStorage.getItem(TIMESTAMP_KEY) || '0', 10);
      if (Date.now() - ts >= SESSION_MAX_AGE_MS) {
        logout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  const value = useMemo(
    () => ({ isAuthenticated, authToken, login, logout }),
    [isAuthenticated, authToken, login, logout]
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
