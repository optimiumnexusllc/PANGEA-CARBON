'use client';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mois',
    color: '#4A6278',
    subtitle: 'Exploration',
    badge: null,
    features: [
      '1 projet MRV',
      'Jusqu\'a 10 MW',
      'Calcul ACM0002 de base',
      'Dashboard lecture seule',
      '1 utilisateur',
      'Support communaute',
    ],
    cta: 'Plan actuel',
    planKey: 'FREE',
    disabled: true,
  },
  {
    name: 'Starter',
    price: '$299',
    period: '/mois',
    color: '#38BDF8',
    subtitle: 'Pour debuter',
    badge: null,
    features: [
      '5 projets MRV',
      'Jusqu\'a 50 MW',
      'Calcul ACM0002 automatique',
      'Rapports PDF basiques',
      'Dashboard temps reel',
      '2 utilisateurs',
      'Support email 48h',
    ],
    cta: 'Demarrer',
    planKey: 'STARTER',
    disabled: false,
  },
  {
    name: 'Pro',
    price: '$799',
    period: '/mois',
    color: '#00FF94',
    subtitle: 'Pour les IPPs',
    badge: 'Recommande',
    highlight: true,
    features: [
      'Projets illimites',
      'MW illimites',
      'Rapports PDF certifies',
      'Projection 10 ans Monte Carlo',
      'Article 6 ITMO',
      'Gold Standard SDG',
      'AI Assistant + AI Baseline',
      'API Equipment IoT',
      '10 utilisateurs',
      'Support prioritaire 24h',
    ],
    cta: 'Demarrer Pro',
    planKey: 'PRO',
    disabled: false,
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    color: '#FCD34D',
    subtitle: 'Grands comptes',
    badge: 'Personnalise',
    features: [
      'Tout Pro inclus',
      'White-label complet',
      'SSO SAML / LDAP',
      'SLA 99.9% garanti',
      'Customer Success Manager dedie',
      'Intégrations custom',
      'Utilisateurs illimites',
      'Multi-organisations',
      'Audit trail avance',
      'Formation & onboarding dedie',
    ],
    cta: 'Nous contacter',
    planKey: 'ENTERPRISE',
    disabled: false,
    isEnterprise: true,
  },
];

function ContactModal({ onClose, contactEmail }: { onClose: () => void; contactEmail: string }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', employees: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  async function send() {
    if (!form.name || !form.email || !form.message) { setErr('Nom, email et message requis'); return; }
    setSending(true);
    setErr('');
    try {
      await fetchAuthJson('/email-composer/send', {
        method: 'POST',
        body: JSON.stringify({
          to: contactEmail || 'contact@pangea-carbon.com',
          subject: 'Demande Enterprise — ' + form.company + ' (' + form.name + ')',
          body: 'Nom: ' + form.name + '\nEmail: ' + form.email + '\nEntreprise: ' + form.company + '\nEmployes: ' + form.employees + '\n\nMessage:\n' + form.message,
          templateId: 'custom',
        }),
      });
      setSent(true);
    } catch (e: any) {
      setErr(e.message || 'Erreur envoi');
    } finally { setSending(false); }
  }

  const inp = { width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none', marginBottom: 12 };
  const lbl = { fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const };

  return (
    <div style={{ position: 'relative', background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, minHeight: 400, borderRadius: 16 }}>
      <div style={{ background: '#121920', border: '1px solid rgba(252,211,77,0.2)', borderRadius: 16, padding: 32, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {!sent ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.1em' }}>PLAN ENTERPRISE · PANGEA CARBON</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Contactez notre equipe</h2>
                <p style={{ fontSize: 13, color: '#8FA3B8', marginTop: 6 }}>Un expert vous rappelle sous 24h pour construire votre offre sur mesure.</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A6278', cursor: 'pointer', fontSize: 20, lineHeight: 1, paddingLeft: 12 }}>x</button>
            </div>

            <div style={{ background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.15)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {['White-label complet', 'SSO SAML / LDAP', 'SLA 99.9% garanti', 'CSM dedie', 'API custom', 'Utilisateurs illimites'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#FCD34D' }}>
                    <span style={{ fontSize: 14 }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Prenom et Nom *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Dayiri Esdras" style={inp} />
              </div>
              <div>
                <label style={lbl}>Email professionnel *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="vous@company.com" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Entreprise</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="SIEPA, CIE, CIPREL..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Nb projets carbone</label>
                <select value={form.employees} onChange={e => setForm(p => ({ ...p, employees: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Selectionner</option>
                  <option value="1-5">1 a 5 projets</option>
                  <option value="5-20">5 a 20 projets</option>
                  <option value="20+">Plus de 20 projets</option>
                  <option value="portfolio">Portfolio multi-pays</option>
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Votre besoin *</label>
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Decrivez votre projet, vos besoins specifiques, vos contraintes..."
                rows={4}
                style={{ ...inp, resize: 'vertical', marginBottom: 16, lineHeight: 1.6 }} />
            </div>

            {err && <div style={{ color: '#F87171', fontSize: 12, marginBottom: 12 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, color: '#4A6278', padding: 12, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={send} disabled={sending} style={{ flex: 2, background: sending ? '#1E2D3D' : '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 8, padding: 12, fontWeight: 800, fontSize: 14, cursor: sending ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                {sending ? 'Envoi...' : 'Envoyer ma demande'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#00FF94', marginBottom: 10 }}>Demande envoyee !</h2>
            <p style={{ fontSize: 14, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 24 }}>Notre equipe vous contactera sous 24h pour construire votre offre Enterprise personnalisee.</p>
            <button onClick={onClose} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactEmail, setContactEmail] = useState('contact@pangea-carbon.com');

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) setUser(JSON.parse(u));
    fetchAuthJson('/admin/settings').then((d: any) => {
      const s = d.settings || [];
      const ce = s.find((x: any) => x.key === 'contact_email');
      if (ce) setContactEmail(ce.value);
    }).catch(() => {});
  }, []);

  async function handlePlan(plan: any) {
    if (plan.isEnterprise) {
      setShowContact(true);
      setTimeout(() => {
        const el = document.getElementById('contact-form');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }
    if (plan.disabled) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` },
        body: JSON.stringify({ plan: plan.planKey.toLowerCase() }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Configurez Stripe dans Admin → Secrets');
    } catch { alert('Erreur paiement — contactez contact@pangea-carbon.com'); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>COMPTE & ABONNEMENT</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Plans & Tarifs</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 6 }}>Plateforme MRV carbone enterprise-grade pour l\'Afrique · Verra ACM0002 · Gold Standard · ACMI</p>
      </div>

      {user && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,255,148,0.12)', border: '1px solid rgba(0,255,148,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#00FF94' }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>{user.email} · {user.role}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>PLAN ACTUEL</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#00FF94' }}>{user.plan || 'FREE'}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{ background: plan.highlight ? 'rgba(0,255,148,0.04)' : plan.isEnterprise ? 'rgba(252,211,77,0.03)' : '#0D1117', border: `1px solid ${plan.highlight ? 'rgba(0,255,148,0.25)' : plan.isEnterprise ? 'rgba(252,211,77,0.2)' : '#1E2D3D'}`, borderRadius: 14, padding: 24, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {plan.badge && (
              <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, background: plan.highlight ? 'rgba(0,255,148,0.15)' : 'rgba(252,211,77,0.12)', color: plan.highlight ? '#00FF94' : '#FCD34D', border: `1px solid ${plan.highlight ? 'rgba(0,255,148,0.3)' : 'rgba(252,211,77,0.25)'}`, borderRadius: 4, padding: '3px 8px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
                {plan.badge}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: plan.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.08em' }}>{plan.subtitle.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#E8EFF6', marginBottom: 10 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: plan.price === 'Sur devis' ? 18 : 32, fontWeight: 800, color: plan.color, fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 12, color: '#4A6278' }}>{plan.period}</span>}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16, marginBottom: 20, flex: 1 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${plan.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: plan.color }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#8FA3B8', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handlePlan(plan)}
              disabled={plan.disabled}
              style={{
                width: '100%',
                background: plan.disabled ? 'transparent' : plan.highlight ? '#00FF94' : plan.isEnterprise ? '#FCD34D' : 'transparent',
                color: plan.disabled ? '#2A3F55' : plan.highlight || plan.isEnterprise ? '#080B0F' : plan.color,
                border: plan.disabled ? '1px solid #1E2D3D' : plan.highlight || plan.isEnterprise ? 'none' : `1px solid ${plan.color}40`,
                borderRadius: 9,
                padding: '12px 16px',
                fontWeight: 800,
                fontSize: 14,
                cursor: plan.disabled ? 'default' : 'pointer',
                fontFamily: 'Syne, sans-serif',
                transition: 'all 0.15s',
              }}>
              {plan.cta} {plan.isEnterprise ? '→' : ''}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>STANDARDS INCLUS DANS TOUS LES PLANS</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Verra ACM0002 v19.0', 'UNFCCC 2024', 'Gold Standard', 'Article 6 ITMO', 'CORSIA Aviation', 'ACMI Africa', 'Blockchain Registry', 'dMRV Satellite'].map(s => (
            <span key={s} style={{ fontSize: 11, background: 'rgba(0,255,148,0.06)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 5, padding: '4px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
          ))}
        </div>
      </div>

      {showContact && (
        <div id="contact-form" style={{ marginTop: 24, scrollMarginTop: 80 }}>
          <ContactModal onClose={() => setShowContact(false)} contactEmail={contactEmail} />
        </div>
      )}
    </div>
  );
}
