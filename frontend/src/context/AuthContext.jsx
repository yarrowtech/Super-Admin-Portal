import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/client';
import { createLogger, emitFrontendEvent } from '../utils/logger';
import { clearAuthSession, readAuthSession, subscribeAuthSession, writeAuthSession } from '../lib/authSession';

const authLogger = createLogger({ module: 'auth' });

const AuthContext = createContext(null);
const CACHE_PREFIX = 'sap_cache_v1:';
const SESSION_CLEAR_PREFIXES = [CACHE_PREFIX, 'salesQueryDraft:', 'salesQueryStage:'];

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

  useEffect(() => {
    return subscribeAuthSession(() => {
      const session = readAuthSession();
      setToken(session.token);
      setRefreshToken(session.refreshToken);
      setAuthMode(session.authMode || 'default');
      if (!session.token) {
        setUser(null);
      }
    });
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
        if (key && SESSION_CLEAR_PREFIXES.some((prefix) => key.startsWith(prefix))) {
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
      emitFrontendEvent('info', {
        eventType: 'auth',
        module: 'authentication',
        action: 'login',
        status: 'success',
        userId: authedUser?._id || authedUser?.id || null,
        role: authedUser?.role || null,
      }, 'Frontend login succeeded');
      return authedUser;
    } catch (err) {
      authLogger.error({ err, mode }, 'Login failed');
      emitFrontendEvent('warn', {
        eventType: 'auth',
        module: 'authentication',
        action: 'login',
        status: 'failed',
        error: err?.message || 'Login failed',
      }, 'Frontend login failed');
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    const currentToken = token;
    const currentRefreshToken = refreshToken;
    try {
      if (currentToken) {
        await apiClient.post('/api/auth/logout', { refreshToken: currentRefreshToken }, currentToken);
      }
    } catch {
      authLogger.warn('Server logout failed; continuing local sign-out');
      // server logout failure should not block local logout
    } finally {
      clearAuth();
      setAuthMode('default');
      emitFrontendEvent('info', {
        eventType: 'auth',
        module: 'authentication',
        action: 'logout',
        status: 'success',
      }, 'Frontend logout completed');
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
