const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Tentative de refresh
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r.ok) {
        const { accessToken, refreshToken } = await r.json();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retry = await fetch(`${BASE}${path}`, { ...options, headers });
        if (!retry.ok) throw new Error(await retry.text());
        return retry.json();
      }
    }
    localStorage.clear();
    window.location.href = '/auth/login';
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(err.error || 'Erreur serveur');
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<any>('/auth/me'),

  // Dashboard
  stats: () => request<any>('/dashboard/stats'),
  leaderboard: () => request<any>('/dashboard/leaderboard'),

  // Projects
  getProjects: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/projects${q}`);
  },
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) =>
    request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCountries: () => request<any>('/projects/meta/countries'),

  // Readings
  getReadings: (projectId: string, year?: number) =>
    request<any>(`/projects/${projectId}/readings${year ? `?year=${year}` : ''}`),
  addReading: (projectId: string, data: any) =>
    request<any>(`/projects/${projectId}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  bulkReadings: (projectId: string, readings: any[]) =>
    request<any>(`/projects/${projectId}/readings/bulk`, { method: 'POST', body: JSON.stringify({ readings }) }),

  // MRV
  getMRV: (projectId: string, year?: number) =>
    request<any>(`/projects/${projectId}/mrv${year ? `?year=${year}` : ''}`),
  simulateMRV: (projectId: string, data: any) =>
    request<any>(`/projects/${projectId}/mrv/simulate`, { method: 'POST', body: JSON.stringify(data) }),
  getProjection: (projectId: string, years = 10) =>
    request<any>(`/projects/${projectId}/mrv/projection?years=${years}`),
};
