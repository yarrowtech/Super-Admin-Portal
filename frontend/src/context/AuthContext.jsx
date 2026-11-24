/* eslint-disable react-refresh/only-export-components -- Auth context intentionally exports its provider and hook. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/client';
import { createLogger, emitFrontendEvent } from '../utils/logger';
import { clearAuthSession, readAuthSession, subscribeAuthSession, writeAuthSession } from '../lib/authSession';

const authLogger = createLogger({ module: 'auth' });

const AuthContext = createContext(null);
const CACHE_PREFIX = 'sap_cache_v1:';
const SESSION_CLEAR_PREFIXES = [CACHE_PREFIX, 'salesQueryDraft:', 'salesQueryStage:'];

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const profileToken = useRef(null);
  const [user, setUser] = useState(null);
  const initialSession = readAuthSession();
  const [token, setToken] = useState(() => initialSession.token);
  const [refreshToken, setRefreshToken] = useState(() => initialSession.refreshToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authMode, setAuthMode] = useState(() => initialSession.authMode || 'default');

  const clearAuth = useCallback(() => {
    profileToken.current = null;
    queryClient.clear();
    setLoading(false);
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
  }, [queryClient]);

  // Refresh the navigation snapshot when returning to the app. API middleware
  // always checks current database rules independently of this UI snapshot.
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const refreshAccess = async () => {
      try {
        const access = await apiClient.get('/api/auth/portal-access', token, { cache: false });
        if (active && readAuthSession().token === token) {
          setUser(current => current ? { ...current, portalAccess: access.data.portalAccess } : current);
        }
      } catch {
        // A transient refresh failure preserves the last snapshot; APIs still deny revoked access.
      }
    };
    window.addEventListener('focus', refreshAccess);
    return () => { active = false; window.removeEventListener('focus', refreshAccess); };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (profileToken.current === token) return;
      setUser(null);
      setLoading(true);
      try {
        const [profile, access] = await Promise.all([
          apiClient.get('/api/auth/me', token, { cache: false }),
          apiClient.get('/api/auth/portal-access', token, { cache: false }),
        ]);
        if (cancelled || readAuthSession().token !== token) return;
        profileToken.current = token;
        setUser(profile?.data?.user ? { ...profile.data.user, portalAccess: access.data.portalAccess } : null);
      } catch (err) {
        if (cancelled || readAuthSession().token !== token) return;
        authLogger.warn({ err }, 'Auth bootstrap failed');
        clearAuth();
      } finally {
        if (!cancelled && readAuthSession().token === token) setLoading(false);
      }
    };
    bootstrap();
    return () => { cancelled = true; };
  }, [token, clearAuth]);

  useEffect(() => {
    return subscribeAuthSession(() => {
      const session = readAuthSession();
      if (profileToken.current !== session.token) {
        profileToken.current = null;
        setUser(null);
        setLoading(Boolean(session.token));
        queryClient.clear();
      }
      setToken(session.token);
      setRefreshToken(session.refreshToken);
      setAuthMode(session.authMode || 'default');
      if (!session.token) {
        setUser(null);
      }
    });
  }, [queryClient]);

  const login = useCallback(async (email, password, mode = 'default') => {
    setError(null);
    try {
      const path = mode === 'outsourcing' ? '/api/auth/outsourcing/login' : '/api/auth/login';
      const res = await apiClient.post(path, { email, password });
      const authToken = res?.data?.token;
      const authRefresh = res?.data?.refreshToken;
      let authedUser = res?.data?.user;

      if (!authToken || !authedUser) {
        throw new Error('Invalid login response');
      }

      const access = await apiClient.get('/api/auth/portal-access', authToken, { cache: false });
      authedUser = { ...authedUser, portalAccess: access.data.portalAccess };

      queryClient.clear();
      profileToken.current = authToken;
      setLoading(false);
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
  }, [queryClient]);

  const logout = useCallback(async () => {
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
  }, [token, refreshToken, clearAuth]);

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
    [user, token, refreshToken, loading, error, authMode, login, logout]
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
