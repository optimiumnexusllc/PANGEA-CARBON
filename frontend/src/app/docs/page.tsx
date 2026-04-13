'use client';
import { useState } from 'react';

const BASE_URL = 'https://pangea-carbon.com/api';

const ENDPOINTS = [
  {
    category: 'Authentification',
    color: '#38BDF8',
    routes: [
      { method: 'POST', path: '/auth/login', desc: 'Connexion et obtention du JWT', body: '{"email":"you@epc.com","password":"..."}', response: '{"accessToken":"eyJ...","refreshToken":"eyJ...","user":{...}}' },
      { method: 'POST', path: '/auth/refresh', desc: 'Renouveler le token', body: '{"refreshToken":"eyJ..."}', response: '{"accessToken":"eyJ...","refreshToken":"eyJ..."}' },
      { method: 'GET',  path: '/auth/me', desc: 'Profil utilisateur connecté', body: null, response: '{"id":"...","email":"...","role":"ANALYST","organization":{...}}' },
    ]
  },
  {
    category: 'Projets',
    color: '#00FF94',
    routes: [
      { method: 'GET',  path: '/projects', desc: 'Liste de vos projets', body: null, response: '{"projects":[{"id":"...","name":"Parc Solaire CI","type":"SOLAR","installedMW":52.5}],"total":3}' },
      { method: 'POST', path: '/projects', desc: 'Créer un projet', body: '{"name":"Mon Parc","type":"SOLAR","installedMW":10,"countryCode":"CI","baselineEF":0.547}', response: '{"id":"cuid...","name":"Mon Parc","status":"ACTIVE"}' },
      { method: 'GET',  path: '/projects/:id', desc: 'Détail d\'un projet', body: null, response: '{"id":"...","name":"...","mrvRecords":[...],"readings":[...]}' },
    ]
  },
  {
    category: 'Lectures MRV',
    color: '#FCD34D',
    routes: [
      { method: 'POST', path: '/projects/:id/readings', desc: 'Importer une lecture mensuelle', body: '{"energyMWh":1245.6,"periodStart":"2024-01-01","periodEnd":"2024-01-31","availabilityPct":97.5}', response: '{"id":"...","energyMWh":1245.6,"mrvTriggered":true}' },
      { method: 'POST', path: '/projects/:id/readings/bulk', desc: 'Import CSV (plusieurs mois)', body: '{"readings":[{"energyMWh":1200,"periodStart":"2024-01-01","periodEnd":"2024-01-31"},...]}', response: '{"created":12,"mrvTriggered":true}' },
      { method: 'GET',  path: '/projects/:id/readings', desc: 'Historique des lectures', body: null, response: '{"readings":[...],"total":24}' },
    ]
  },
  {
    category: 'Calcul MRV ACM0002',
    color: '#A78BFA',
    routes: [
      { method: 'GET',  path: '/projects/:id/mrv', desc: 'Résultat MRV annuel (Verra ACM0002)', body: null, response: '{"netCarbonCredits":7234.5,"revenueUSD":86814,"methodology":"ACM0002","year":2024}' },
      { method: 'POST', path: '/projects/:id/mrv/simulate', desc: 'Simuler avec des paramètres custom', body: '{"year":2024,"carbonPrice":25,"standard":"GOLD_STANDARD"}', response: '{"netCarbonCredits":7234.5,"revenueUSD":180862}' },
    ]
  },
  {
    category: 'Equipment API (Capteurs IoT)',
    color: '#F97316',
    routes: [
      { method: 'POST', path: '/equipment/reading', desc: 'Envoi temps réel depuis onduleur/compteur', body: '{"energy_mwh":42.5,"availability_pct":98.1,"timestamp":"2024-01-15T14:00:00Z"}', response: '{"received":true,"projectId":"..."}', auth: 'X-API-Key' },
      { method: 'GET',  path: '/equipment/projects', desc: 'Projets liés à cette clé API', body: null, response: '{"projects":[...]}', auth: 'X-API-Key' },
    ]
  },
  {
    category: 'Intelligence Analytics',
    color: '#EF9F27',
    routes: [
      { method: 'GET',  path: '/analytics/:projectId', desc: 'Analyse détaillée causale (waterfall pertes)', body: null, response: '{"lossWaterfall":{...},"causalInsights":[...],"kpis":{...}}' },
      { method: 'GET',  path: '/optimization/:projectId', desc: 'Recommandations MRV avec impact $', body: null, response: '{"recommendations":[{"title":"Gold Standard","revenueGainUSD":86000}],"summary":{...}}' },
      { method: 'POST', path: '/projection/:projectId', desc: 'Projection revenus 10 ans Monte Carlo', body: '{"years":10,"carbonPrice":12,"additionalMW":0}', response: '{"scenarios":{"base":{"totalRevenue":...},"optimistic":{...}},"monteCarlo":{...}}' },
      { method: 'GET',  path: '/benchmark/:projectId', desc: 'Benchmark africain IRENA 2024', body: null, response: '{"metrics":[{"percentile":73,"rating":{"label":"Au-dessus médiane"}}],"overallPercentile":68}' },
    ]
  },
];

const METHOD_COLOR: Record<string, string> = { GET: '#00FF94', POST: '#38BDF8', PUT: '#FCD34D', DELETE: '#F87171', PATCH: '#A78BFA' };

export default function DocsPage() {
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const curlExample = (method: string, path: string, body: string | null, auth = 'Bearer') => {
    const authHeader = auth === 'X-API-Key'
      ? `-H "X-API-Key: pgc_YOUR_API_KEY"`
      : `-H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;
    const bodyFlag = body ? `\\\n  -d '${body}'` : '';
    return `curl -X ${method} ${BASE_URL}${path} \\\n  -H "Content-Type: application/json" \\\n  ${authHeader}${bodyFlag ? ' \\' + '\n  ' + bodyFlag.slice(4) : ''}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', color: '#E8EFF6', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(0,255,148,0.04)', borderBottom: '1px solid rgba(0,255,148,0.15)', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>PANGEA CARBON · DOCUMENTATION API v1.0</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>API Reference</h1>
            <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>REST API · JWT Auth · JSON · Base URL: <code style={{ color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{BASE_URL}</code></p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/dashboard" style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#8FA3B8', padding: '8px 14px', textDecoration: 'none', fontSize: 13 }}>← Dashboard</a>
            <a href="/dashboard/api-keys" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 14px', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Obtenir une clé API →</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        {/* Authentification rapide */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>DÉMARRAGE RAPIDE — 3 ÉTAPES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { step: '1', title: 'Obtenir un token', code: `curl -X POST ${BASE_URL}/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"you@epc.com","password":"..."}'` },
              { step: '2', title: 'Appeler l\'API', code: `curl ${BASE_URL}/projects \\\n  -H "Authorization: Bearer YOUR_TOKEN"` },
              { step: '3', title: 'Importer des données', code: `curl -X POST ${BASE_URL}/projects/ID/readings \\\n  -H "Authorization: Bearer TOKEN" \\\n  -d '{"energyMWh":1245.6,...}'` },
            ].map(s => (
              <div key={s.step} style={{ background: '#121920', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,255,148,0.2)', color: '#00FF94', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.step}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#E8EFF6' }}>{s.title}</span>
                </div>
                <pre style={{ fontSize: 10, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{s.code}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints */}
        {ENDPOINTS.map(cat => (
          <div key={cat.category} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: cat.color }}/>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: cat.color, margin: 0 }}>{cat.category}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.routes.map((route, i) => {
                const id = `${cat.category}-${i}`;
                const isOpen = active === id;
                return (
                  <div key={id} style={{ background: '#0D1117', border: `1px solid ${isOpen ? cat.color + '30' : '#1E2D3D'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}
                      onClick={() => setActive(isOpen ? null : id)}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: METHOD_COLOR[route.method], fontFamily: 'JetBrains Mono, monospace', background: `${METHOD_COLOR[route.method]}12`, border: `1px solid ${METHOD_COLOR[route.method]}25`, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>
                        {route.method}
                      </span>
                      <code style={{ fontSize: 13, color: '#E8EFF6', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>{route.path}</code>
                      {route.auth === 'X-API-Key' && (
                        <span style={{ fontSize: 10, color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 4, padding: '2px 6px', fontFamily: 'JetBrains Mono, monospace' }}>X-API-Key</span>
                      )}
                      <span style={{ fontSize: 12, color: '#4A6278', flex: 2, minWidth: 180 }}>{route.desc}</span>
                      <span style={{ color: '#4A6278', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #1E2D3D', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {route.body && (
                          <div>
                            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>REQUEST BODY</div>
                            <pre style={{ background: '#121920', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(JSON.parse(route.body), null, 2)}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>RESPONSE EXAMPLE</div>
                          <pre style={{ background: '#121920', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(JSON.parse(route.response), null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>CURL EXAMPLE</div>
                            <button onClick={() => copy(curlExample(route.method, route.path, route.body, route.auth), id)}
                              style={{ background: copied === id ? 'rgba(0,255,148,0.15)' : 'transparent', border: `1px solid ${copied === id ? '#00FF94' : '#1E2D3D'}`, borderRadius: 5, color: copied === id ? '#00FF94' : '#4A6278', padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                              {copied === id ? '✓ Copié' : '📋 Copier'}
                            </button>
                          </div>
                          <pre style={{ background: '#121920', borderRadius: 7, padding: '10px 14px', fontSize: 11, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace', margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {curlExample(route.method, route.path, route.body, route.auth)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#2A3F55' }}>
          PANGEA CARBON Africa · API v1.0 · contact@pangea-carbon.com
        </div>
      </div>
    </div>
  );
}
