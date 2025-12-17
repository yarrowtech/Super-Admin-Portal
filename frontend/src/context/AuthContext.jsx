import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'sap_token';
const REFRESH_KEY = 'sap_refresh_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await apiClient.post('/api/auth/login', { email, password });
      const authToken = res?.data?.token;
      const authRefresh = res?.data?.refreshToken;
      const authedUser = res?.data?.user;

      if (!authToken || !authedUser) {
        throw new Error('Invalid login response');
      }

      setUser(authedUser);
      setToken(authToken);
      setRefreshToken(authRefresh || null);
      localStorage.setItem(TOKEN_KEY, authToken);
      if (authRefresh) {
        localStorage.setItem(REFRESH_KEY, authRefresh);
      } else {
        localStorage.removeItem(REFRESH_KEY);
      }
      return authedUser;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    clearAuth();
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
    }),
    [user, token, refreshToken, loading, error]
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
