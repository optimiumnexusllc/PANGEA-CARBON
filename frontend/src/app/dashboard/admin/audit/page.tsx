'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const ACTION_COLOR = { CREATE: '#00FF94', UPDATE: '#38BDF8', DELETE: '#F87171', DEACTIVATE: '#FCD34D', SUBSCRIPTION: '#A78BFA' };
const getColor = (action: string) => ACTION_COLOR[Object.keys(ACTION_COLOR).find(k => action.includes(k)) || ''] || '#4A6278';

export default function AdminAuditPage() {
  const { t } = useLang();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ ...(search && { action: search }), page: String(page), limit: '50' });
    fetchAuth(`/admin/audit?${q}`)
      .then(r => r.json()).then(d => { setLogs(d.logs || []); setTotal(d.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, page]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · {total} ÉVÉNEMENTS</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Audit Trail</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Immutable history of all actions on the platform</p>
      </div>

      <input style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '9px 14px', fontSize: 13, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
        placeholder="Filter par action (CREATE_USER, UPDATE_SETTING...)"
        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>

      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#121920' }}>
              {['Timestamp', 'Action', 'Entity', 'ID', 'User', 'IP'].map(label => (
                <th key={label} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#4A6278' }}>Loading...</td></tr>
            : logs.map((log: any) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.3)' }}>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString('en-US')}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                    background: `${getColor(log.action)}15`, color: getColor(log.action), border: `1px solid ${getColor(log.action)}30` }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#8FA3B8' }}>{log.entity}</td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{log.entityId?.slice(-12)}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#E8EFF6' }}>{log.user?.name || <span style={{ color: '#4A6278' }}>System</span>}</td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 50 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E2D3D' }}>
            <span style={{ fontSize: 12, color: '#4A6278' }}>Page {page} · {total} entrées</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: '#4A6278', padding: '5px 10px', cursor: 'pointer' }}>←</button>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 5, color: '#4A6278', padding: '5px 10px', cursor: 'pointer' }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
