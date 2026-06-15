const TOKEN_KEY = 'sap_token';
const REFRESH_KEY = 'sap_refresh_token';
const MODE_KEY = 'sap_auth_mode';
const AUTH_EVENT = 'sap:auth-session-changed';

const canUseStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const notify = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
};

export const readAuthSession = () => {
  if (!canUseStorage()) {
    return {
      token: null,
      refreshToken: null,
      authMode: 'default',
    };
  }

  return {
    token: localStorage.getItem(TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
    authMode: localStorage.getItem(MODE_KEY) || 'default',
  };
};

export const writeAuthSession = ({ token, refreshToken, authMode = 'default' }) => {
  if (!canUseStorage()) return;

  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);

  localStorage.setItem(MODE_KEY, authMode);
  notify();
};

export const clearAuthSession = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(MODE_KEY);
  notify();
};

export const subscribeAuthSession = (handler) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
};
