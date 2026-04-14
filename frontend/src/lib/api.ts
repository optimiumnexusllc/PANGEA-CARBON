const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Dashboard
  stats: () => request('/dashboard/stats'),
  leaderboard: () => request('/dashboard/leaderboard'),

  // Projects
  getProjects: (params) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/projects${q}`);
  },
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) =>
    request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCountries: () => request('/projects/meta/countries'),

  // Readings
  getReadings: (projectId, year) =>
    request(`/projects/${projectId}/readings${year ? `?year=${year}` : ''}`),
  addReading: (projectId, data) =>
    request(`/projects/${projectId}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  bulkReadings: (projectId, readings) =>
    request(`/projects/${projectId}/readings/bulk`, { method: 'POST', body: JSON.stringify({ readings }) }),

  // MRV
  getMRV: (projectId, year) =>
    request(`/projects/${projectId}/mrv${year ? `?year=${year}` : ''}`),
  simulateMRV: (projectId, data) =>
    request(`/projects/${projectId}/mrv/simulate`, { method: 'POST', body: JSON.stringify(data) }),
  getProjection: (projectId, years = 10) =>
    request(`/projects/${projectId}/mrv/projection?years=${years}`),
};

// Ajout Sprint 2 — endpoints manquants
export const apiExt = {
  // Notifications
  getAlerts: () => request('/notifications/alerts'),
  checkAlerts: (projectId) => request(`/notifications/check/${projectId}`, { method: 'POST' }),
  getNotifPrefs: () => request('/notifications/preferences'),
  updateNotifPrefs: (prefs) => request('/notifications/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  // Marketplace
  getPrices: () => request('/marketplace/prices'),
  getListings: (params) => request(`/marketplace/listings${params ? '?' + new URLSearchParams(params) : ''}`),
  placeBid: (data) => request('/marketplace/bid', { method: 'POST', body: JSON.stringify(data) }),
  getMarketStats: () => request('/marketplace/stats'),

  // Analytics
  getProjectAnalytics: (id) => request(`/analytics/${id}`),
  getPortfolioAnalytics: () => request('/analytics/portfolio/overview'),

  // Optimization
  getOptimization: (id) => request(`/optimization/${id}`),
  getPortfolioGap: () => request('/optimization/portfolio/gap'),

  // Projection
  projectRevenue: (id, params) => request(`/projection/${id}`, { method: 'POST', body: JSON.stringify(params) }),
  projectPortfolio: (params) => request('/projection/portfolio/total', { method: 'POST', body: JSON.stringify(params) }),

  // Benchmark
  getProjectBenchmark: (id) => request(`/benchmark/${id}`),
  getPortfolioRanking: () => request('/benchmark/portfolio/ranking'),

  // Article 6
  getArticle6Projects: () => request('/article6/projects'),
  getBuyerAnalysis: () => request('/article6/buyer-analysis'),

  // User account
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};
