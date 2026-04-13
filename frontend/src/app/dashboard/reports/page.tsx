'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const fmt = (n: number) => n?.toLocaleString('fr-FR') ?? '—';

export default function ReportsPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.leaderboard().then(setLeaderboard).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>VERRA · GOLD STANDARD</div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Rapports MRV</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Rapports certifiables Verra ACM0002 pour soumission aux auditeurs</p>
      </div>

      {/* Workflow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { step: '01', title: 'Données saisies', desc: 'Lectures de production mensuelles enregistrées', color: '#00FF94', done: true },
          { step: '02', title: 'Calcul MRV', desc: 'Engine ACM0002 — crédits nets calculés', color: '#38BDF8', done: true },
          { step: '03', title: 'Génération PDF', desc: 'Rapport certifiable pour auditeurs VVB', color: '#FCD34D', done: false },
          { step: '04', title: 'Soumission', desc: 'Verra/Gold Standard → issuance crédits', color: '#A78BFA', done: false },
        ].map(s => (
          <div key={s.step} className="card" style={{ padding: 16, opacity: s.done ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.done ? s.color : 'transparent', border: `1px solid ${s.color}`,
                fontSize: 10, fontWeight: 700, color: s.done ? '#080B0F' : s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {s.done ? '✓' : s.step}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: s.done ? '#E8EFF6' : '#4A6278' }}>{s.title}</span>
            </div>
            <p style={{ fontSize: 11, color: '#4A6278', margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Projets avec données MRV */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>PROJETS AVEC DONNÉES MRV — PRÊTS POUR RAPPORT</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#4A6278' }}>Chargement...</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: '#4A6278', marginBottom: 4 }}>Aucun rapport disponible</div>
            <div style={{ fontSize: 12, color: '#2A3F55' }}>Créez un projet, ajoutez des données, calculez le MRV</div>
            <a href="/dashboard/projects/new" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Créer un projet →</a>
          </div>
        ) : (
          <table className="table-dark">
            <thead><tr>
              <th>Projet</th><th>Pays</th><th>Année</th>
              <th style={{ textAlign: 'right' }}>Crédits tCO₂e</th>
              <th style={{ textAlign: 'right' }}>Revenus USD</th>
              <th>Statut</th><th>Action</th>
            </tr></thead>
            <tbody>
              {leaderboard.map((p: any) => (
                <tr key={p.projectId + p.year}>
                  <td><span style={{ color: '#E8EFF6', fontWeight: 500 }}>{p.projectName}</span></td>
                  <td><span className="badge badge-ghost">{p.countryCode}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.year}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00FF94', fontWeight: 600 }}>{fmt(p.carbonCredits)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#38BDF8' }}>${fmt(p.revenueUSD)}</td>
                  <td><span className="badge badge-amber">Prêt</span></td>
                  <td>
                    <button onClick={async () => {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/${p.projectId}/${p.year}/pdf`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (!res.ok) { alert('Erreur génération PDF'); return; }
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `PANGEA-CARBON-MRV-${p.countryCode}-${p.year}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                      📄 Télécharger PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Standards box */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { name: 'Verra VCS', method: 'ACM0002 v19.0', desc: 'Voluntary Carbon Standard — plus grande registry mondiale', color: '#00FF94', supported: true },
          { name: 'Gold Standard', method: 'CDM LCB', desc: 'Gold Standard for the Global Goals', color: '#FCD34D', supported: true },
          { name: 'Article 6 Paris', method: 'ITMO', desc: 'Marchés carbone souverains — bilatéraux', color: '#38BDF8', supported: false },
        ].map(s => (
          <div key={s.name} className="card" style={{ padding: 16, borderColor: s.supported ? `${s.color}20` : '#1E2D3D' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: s.supported ? s.color : '#4A6278', fontFamily: 'Syne, sans-serif' }}>{s.name}</div>
              <span className={`badge ${s.supported ? 'badge-acid' : 'badge-ghost'}`} style={{ marginLeft: 8 }}>{s.supported ? '✓ Supporté' : 'Bientôt'}</span>
            </div>
            <div style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{s.method}</div>
            <p style={{ fontSize: 11, color: '#4A6278', margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
