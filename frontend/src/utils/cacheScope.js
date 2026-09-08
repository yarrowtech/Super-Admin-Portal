import { readAuthSession } from '../lib/authSession';

// This identifier partitions client data; it is never used for authorization.
export const getCacheSessionScope = () => {
  const { token, authMode } = readAuthSession();
  if (!token) return null;
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded));
    if (!payload.userId || !payload.jti) return null;
    return JSON.stringify([authMode, payload.userId, payload.jti, payload.role]);
  } catch {
    return null;
  }
};
