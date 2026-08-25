import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ADMIN_PASSCODE } from '../config';

const STORAGE_KEY = 'nss_rudhirasena_admin_auth';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === 'true'
  );

  const login = useCallback((passcode) => {
    if (passcode !== ADMIN_PASSCODE) {
      return false;
    }
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setIsAuthenticated(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout]
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
