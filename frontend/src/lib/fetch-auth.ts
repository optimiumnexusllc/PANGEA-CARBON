/**
 * fetchAuth — wrapper fetch avec auto-refresh du token
 * À utiliser dans les pages qui ne passent pas par api.ts
 * Sprint 2: fix token refresh sur toutes les pages
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetchAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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

export async function fetchAuthJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchAuth(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}
