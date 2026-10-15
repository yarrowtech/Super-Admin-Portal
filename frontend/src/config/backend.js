import { resolveBackendUrl } from './backendUrl.mjs';

export const API_BASE_URL = resolveBackendUrl(import.meta.env.VITE_API_URL, { production: import.meta.env.PROD });
