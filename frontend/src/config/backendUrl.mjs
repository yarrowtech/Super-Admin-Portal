// VITE_API_URL is the backend root; callers already include /api or /api/v1.
// Keep reverse-proxy path prefixes. Never infer or rewrite API versions.
export function resolveBackendUrl(value, { production = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (production) throw new Error('VITE_API_URL is required for a production frontend build. Configure the backend root URL and rebuild.');
    return 'http://localhost:5000';
  }
  let url;
  try { url = new URL(raw); } catch { throw new Error('VITE_API_URL must be an absolute HTTP(S) backend root URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_URL must be an HTTP(S) backend root URL without credentials, query parameters or fragments.');
  }
  return raw.replace(/\/+$/, '');
}
