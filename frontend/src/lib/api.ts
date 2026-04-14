const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
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
  login: (email, password) =>
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
  getProject: (id) => request<any>(`/projects/${id}`),
  createProject: (data) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) =>
    request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCountries: () => request<any>('/projects/meta/countries'),

  // Readings
  getReadings: (projectId: string, year?: number) =>
    request<any>(`/projects/${projectId}/readings${year ? `?year=${year}` : ''}`),
  addReading: (projectId, data) =>
    request<any>(`/projects/${projectId}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  bulkReadings: (projectId: string, readings: any[]) =>
    request<any>(`/projects/${projectId}/readings/bulk`, { method: 'POST', body: JSON.stringify({ readings }) }),

  // MRV
  getMRV: (projectId: string, year?: number) =>
    request<any>(`/projects/${projectId}/mrv${year ? `?year=${year}` : ''}`),
  simulateMRV: (projectId, data) =>
    request<any>(`/projects/${projectId}/mrv/simulate`, { method: 'POST', body: JSON.stringify(data) }),
  getProjection: (projectId: string, years = 10) =>
    request<any>(`/projects/${projectId}/mrv/projection?years=${years}`),
};

// Ajout Sprint 2 — endpoints manquants
export const apiExt = {
  // Notifications
  getAlerts: () => request<any>('/notifications/alerts'),
  checkAlerts: (projectId) => request<any>(`/notifications/check/${projectId}`, { method: 'POST' }),
  getNotifPrefs: () => request<any>('/notifications/preferences'),
  updateNotifPrefs: (prefs) => request<any>('/notifications/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  // Marketplace
  getPrices: () => request<any>('/marketplace/prices'),
  getListings: (params?: Record<string, string>) => request<any>(`/marketplace/listings${params ? '?' + new URLSearchParams(params) : ''}`),
  placeBid: (data) => request<any>('/marketplace/bid', { method: 'POST', body: JSON.stringify(data) }),
  getMarketStats: () => request<any>('/marketplace/stats'),

  // Analytics
  getProjectAnalytics: (id) => request<any>(`/analytics/${id}`),
  getPortfolioAnalytics: () => request<any>('/analytics/portfolio/overview'),

  // Optimization
  getOptimization: (id) => request<any>(`/optimization/${id}`),
  getPortfolioGap: () => request<any>('/optimization/portfolio/gap'),

  // Projection
  projectRevenue: (id, params) => request<any>(`/projection/${id}`, { method: 'POST', body: JSON.stringify(params) }),
  projectPortfolio: (params) => request<any>('/projection/portfolio/total', { method: 'POST', body: JSON.stringify(params) }),

  // Benchmark
  getProjectBenchmark: (id) => request<any>(`/benchmark/${id}`),
  getPortfolioRanking: () => request<any>('/benchmark/portfolio/ranking'),

  // Article 6
  getArticle6Projects: () => request<any>('/article6/projects'),
  getBuyerAnalysis: () => request<any>('/article6/buyer-analysis'),

  // User account
  updateProfile: (data) => request<any>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};
