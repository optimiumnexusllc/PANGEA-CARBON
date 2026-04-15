/**
 * fetchAuth — wrapper fetch avec auto-refresh du token
 * À utiliser dans les pages qui ne passent pas par api.ts
 * Sprint 2: fix token refresh sur toutes les pages
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetchAuth(path, options: RequestInit = {}) {
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  let res = await fetch(url, { ...options, headers });

  // Auto-refresh si 401
  if (res.status === 401) {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (refresh) {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r.ok) {
        const { accessToken, refreshToken, user } = await r.json();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        headers['Authorization'] = `Bearer ${accessToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        localStorage.clear();
        window.location.href = '/auth/login';
      }
    } else {
      localStorage.clear();
      window.location.href = '/auth/login';
    }
  }

  return res;
}

export async function fetchAuthJson(path, options: RequestInit = {}) {
  const res = await fetchAuth(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    const msg = err.detail || err.error || ('Erreur '+res.status);
    const error = new Error(msg) as any;
    error.detail   = err.detail || null;
    error.code     = err.code   || null;
    error.step     = err.step   || null;
    error.status   = res.status;
    error.apiError = err;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}
