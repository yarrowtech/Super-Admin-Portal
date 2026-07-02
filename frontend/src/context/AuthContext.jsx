import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/client';
import { createLogger } from '../utils/logger';
import { clearAuthSession, readAuthSession, writeAuthSession } from '../lib/authSession';

const authLogger = createLogger({ module: 'auth' });

const AuthContext = createContext(null);
const CACHE_PREFIX = 'sap_cache_v1:';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const initialSession = readAuthSession();
  const [token, setToken] = useState(() => initialSession.token);
  const [refreshToken, setRefreshToken] = useState(() => initialSession.refreshToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authMode, setAuthMode] = useState(() => initialSession.authMode || 'default');

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await apiClient.get('/api/auth/me', token);
        setUser(profile?.data?.user || null);
      } catch (err) {
        authLogger.warn({ err }, 'Auth bootstrap failed');
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setAuthMode('default');
    clearAuthSession();
    apiClient.clearCache();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      // ignore cache cleanup errors
    }
  };

  const login = async (email, password, mode = 'default') => {
    setError(null);
    try {
      const path = mode === 'outsourcing' ? '/api/auth/outsourcing/login' : '/api/auth/login';
      const res = await apiClient.post(path, { email, password });
      const authToken = res?.data?.token;
      const authRefresh = res?.data?.refreshToken;
      const authedUser = res?.data?.user;

      if (!authToken || !authedUser) {
        throw new Error('Invalid login response');
      }

      setUser(authedUser);
      setToken(authToken);
      setRefreshToken(authRefresh || null);
      setAuthMode(mode);
      writeAuthSession({ token: authToken, refreshToken: authRefresh || null, authMode: mode });
      return authedUser;
    } catch (err) {
      authLogger.error({ err, mode }, 'Login failed');
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    const currentToken = token;
    try {
      if (currentToken) {
        await apiClient.post('/api/auth/logout', {}, currentToken);
      }
    } catch {
      authLogger.warn('Server logout failed; continuing local sign-out');
      // server logout failure should not block local logout
    } finally {
      clearAuth();
      setAuthMode('default');
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      loading,
      error,
      login,
      logout,
      authMode,
    }),
    [user, token, refreshToken, loading, error, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
