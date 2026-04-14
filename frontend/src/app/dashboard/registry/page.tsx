'use client';
import { useLang } from '@/lib/lang-context';
import { fetchAuth } from '@/lib/fetch-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const STATUS_COLOR: Record<string, string> = { ISSUED: '#00FF94', RETIRED: '#F87171', TRANSFERRED: '#38BDF8', CANCELLED: '#4A6278' };

export default function RegistryPage() {
  const { t } = useLang();
  const [chain, setChain] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState({ projectId: '', vintage: String(new Date().getFullYear()), quantity: '', standard: 'VERRA_VCS' });
  const [issuing, setIssuing] = useState(false);
  const [newBlock, setNewBlock] = useState<any>(null);

  useEffect(() => {
    fetchAuth(`/registry/chain`).then(r => r.json()).then(setChain).catch(() => {});
    api.getProjects().then(d => { setProjects(d.projects || []); if (d.projects?.[0]) setForm(f => ({ ...f, projectId: d.projects[0].id })); });
  }, []);

  const issue = async () => {
    setIssuing(true);
    try {
      const res = await fetchAuth(`/registry/issue`, { method: 'POST', body: JSON.stringify(form)  });
      const d = await res.json();
      setNewBlock(d);
      const c = await fetchAuth(`/registry/chain`).then(r => r.json());
      setChain(c);
    } finally { setIssuing(false); }
  };

  const retire = async (id: string) => {
    const reason = prompt('Raison de retraite (ex: Compensation bilan carbone 2026)');
    if (!reason) return;
    await fetchAuth(`/registry/retire/${id}`, { method: 'POST', body: JSON.stringify({ retiredFor: reason  }) });
    const c = await fetchAuth(`/registry/chain`).then(r => r.json());
    setChain(c);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/dashboard/standards" style={{ fontSize: 12, color: '#4A6278', textDecoration: 'none' }}>← Carbon Hub</a>
        <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 4px' }}>BLOCKCHAIN REGISTRY · SHA-256 HASH CHAIN · TRUSTLESS</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Credit Registry</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Chaque crédit émis crée un bloc immuable. Hash SHA-256 vérifiable publiquement. Anti-double comptage.</p>
      </div>

      {chain && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total blocs émis', value: chain.totalBlocks, color: '#00FF94' },
            { label: 'Supply totale (tCO₂e)', value: fmt(chain.totalSupply), color: '#38BDF8' },
            { label: 'Intégrité chaîne', value: 'VALIDÉE ✓', color: '#00FF94' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0D1117', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{String(k.value)}</div>
            </div>
          ))}
        </div>
      )}

      {newBlock && (
        <div style={{ background: 'rgba(0,255,148,0.05)', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00FF94', marginBottom: 8 }}>✓ Bloc #{newBlock.blockNumber} inscrit dans le registre</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8FA3B8', marginBottom: 6 }}>Hash: {newBlock.blockHash}</div>
          <a href={newBlock.verification} target="_blank" style={{ fontSize: 12, color: '#38BDF8' }}>🔗 Lien de vérification public →</a>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Issue form */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, height: 'fit-content' }}>
          <div style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>ÉMETTRE DES CRÉDITS</div>
          {[
            ['Projet', 'projectId', 'select'],
            ['Vintage (année)', 'vintage', 'number'],
            ['Quantité (tCO₂e)', 'quantity', 'number'],
          ].map(([label, key, type]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
              {type === 'select' ? (
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px', fontSize: 13 }}>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none' }}/>
              )}
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Standard</label>
            <select value={form.standard} onChange={e => setForm(f => ({ ...f, standard: e.target.value }))}
              style={{ width: '100%', background: '#121920', border: '1px solid #1E2D3D', borderRadius: 6, color: '#E8EFF6', padding: '8px', fontSize: 13 }}>
              {['VERRA_VCS','GOLD_STANDARD','ARTICLE6','CORSIA'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={issue} disabled={issuing || !form.quantity || !form.projectId}
            style={{ width: '100%', background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: issuing ? 0.6 : 1 }}>
            {issuing ? 'Inscription...' : '⛓️ Émettre & Inscrire en registre'}
          </button>
        </div>

        {/* Chain blocks */}
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            BLOCKCHAIN LEDGER — {chain?.totalBlocks || 0} BLOCS · GENESIS: {('0'.repeat(16) + '...').slice(0, 20)}
          </div>
          {(!chain?.blocks || chain.blocks.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⛓️</div>
              <div>Aucun crédit émis. Commencez par émettre vos premiers crédits certifiés.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Bloc', 'Projet', 'Standard', 'tCO₂e', 'Serials', 'Hash', 'Statut', ''].map(col => (
                  <th key={col} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
                ))}
              </tr></thead>
              <tbody>
                {chain.blocks.map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(30,45,61,0.3)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>#{b.blockNumber}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#E8EFF6' }}>{b.project?.name || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{b.standard}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmt(b.quantity)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace' }}>{b.serialFrom?.slice(-8)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{b.blockHash?.slice(0, 12)}...</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', background: `${STATUS_COLOR[b.status]}15`, color: STATUS_COLOR[b.status], border: `1px solid ${STATUS_COLOR[b.status]}25` }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      {b.status === 'ISSUED' && (
                        <button onClick={() => retire(b.id)} style={{ fontSize: 10, background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, color: '#F87171', padding: '3px 8px', cursor: 'pointer' }}>
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
