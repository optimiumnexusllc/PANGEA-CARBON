'use client';
import { useEffect, useState } from 'react';

const PLANS = [
  {
    name: 'Starter', price: '$299', period: '/mois', color: '#38BDF8',
    subtitle: 'Pour débuter',
    features: ['5 projets MRV', 'Jusqu\'à 50 MW', 'Calcul ACM0002 automatique', 'Dashboard temps réel', '2 utilisateurs', 'Support email'],
    cta: 'Démarrer',
  },
  {
    name: 'Pro', price: '$799', period: '/mois', color: '#00FF94',
    subtitle: 'Pour les IPPs', highlight: true,
    features: ['Projets illimités', 'MW illimités', 'Rapports PDF certifiables', 'Projection 10 ans', '10 utilisateurs', 'API access', 'Support prioritaire'],
    cta: 'Démarrer Pro',
  },
  {
    name: 'Enterprise', price: 'Sur devis', period: '', color: '#FCD34D',
    subtitle: 'Pour les grands comptes',
    features: ['Tout Pro inclus', 'Multi-pays', 'White-label', 'SSO / SAML', 'Utilisateurs illimités', 'Gestionnaire dédié', 'SLA 99.9%'],
    cta: 'Contacter',
  },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>COMPTE & ABONNEMENT</div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Paramètres</h1>
      </div>

      {/* Profil */}
      {user && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>PROFIL UTILISATEUR</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Nom', user.name], ['Email', user.email], ['Rôle', user.role], ['Organisation', user.organization || '—']].map(([k, v]) => (
              <div key={String(k)}>
                <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 14, color: '#E8EFF6' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>PLANS TARIFAIRES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {PLANS.map(plan => (
          <div key={plan.name} className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden',
            borderColor: plan.highlight ? 'rgba(0,255,148,0.3)' : '#1E2D3D',
            background: plan.highlight ? 'rgba(0,255,148,0.03)' : '#121920' }}>
            {plan.highlight && (
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span className="badge badge-acid">Recommandé</span>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: plan.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{plan.subtitle}</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#E8EFF6' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                <span style={{ fontSize: 12, color: '#4A6278' }}>{plan.period}</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16, marginBottom: 20 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${plan.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: plan.color }}/>
                  </div>
                  <span style={{ fontSize: 12, color: '#8FA3B8' }}>{f}</span>
                </div>
              ))}
            </div>
            <button className={plan.highlight ? 'btn-primary' : 'btn-ghost'} style={{ width: '100%', justifyContent: 'center' }}
              onClick={async () => {
                if (plan.name === 'Enterprise') { window.location.href = 'mailto:contact@pangea-carbon.com?subject=Plan Enterprise PANGEA CARBON'; return; }
                try {
                  const token = localStorage.getItem('accessToken');
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ plan: plan.name.toLowerCase() }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert('Stripe non configuré — contactez contact@pangea-carbon.com');
                } catch { alert('contactez contact@pangea-carbon.com'); }
              }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Revenue share model */}
      <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.12)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#00CC77', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>MODÈLE ALTERNATIF · REVENUE SHARE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', marginBottom: 6 }}>0€ par mois · % sur vos revenus</div>
            <p style={{ fontSize: 12, color: '#4A6278', margin: 0 }}>Aucun abonnement mensuel. PANGEA CARBON prend 3% des revenus carbone générés grâce à la plateforme. Vous payez uniquement quand vous gagnez.</p>
          </div>
          <div>
            {[['Abonnement mensuel', '$0'], ['% sur crédits vendus', '3%'], ['Seuil minimum', '$10 000/an'], ['Engagement', 'Aucun']].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#4A6278' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>CONTACT & SUPPORT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: '📧', label: 'Email', value: 'contact@pangea-carbon.com' },
            { icon: '💬', label: 'LinkedIn', value: 'PANGEA CARBON Africa' },
            { icon: '🌍', label: 'Web', value: 'pangea-carbon.com' },
          ].map(c => (
            <div key={c.label} style={{ textAlign: 'center', padding: 16, background: '#0D1117', borderRadius: 8 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: '#38BDF8' }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
