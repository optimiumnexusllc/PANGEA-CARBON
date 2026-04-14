'use client';
import { useLang } from '@/lib/lang-context';
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
    subtitle: 'Getting started',
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
    subtitle: 'For IPPs',
    badge: 'Recommended',
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
    price: 'Custom pricing',
    period: '',
    color: '#FCD34D',
    subtitle: 'Enterprise',
    badge: 'Custom',
    features: [
      'Everything in Pro',
      'White-label complet',
      'SSO SAML / LDAP',
      'SLA 99.9% garanti',
      'Customer Success Manager dedie',
      'Intégrations custom',
      'Unlimited users',
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


export default function SettingsPage() {
  const { t } = useLang();
  const [user, setUser] = useState<any>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactErr, setContactErr] = useState('');
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

  async function sendContact() {
    if (!contactForm.name || !contactForm.email || !contactForm.message) { setContactErr('Nom, email et message requis'); return; }
    setContactSending(true); setContactErr('');
    try {
      await fetchAuthJson('/email-composer/send', {
        method: 'POST',
        body: JSON.stringify({
          to: contactEmail || 'contact@pangea-carbon.com',
          subject: 'Demande Enterprise — ' + (contactForm.company || contactForm.name),
          body: 'Nom: ' + contactForm.name + '\nEmail: ' + contactForm.email + '\nEntreprise: ' + contactForm.company + '\n\nMessage:\n' + contactForm.message,
          templateId: 'custom',
        }),
      });
      setContactSent(true);
    } catch (e: any) { setContactErr(e.message || 'Erreur envoi'); }
    finally { setContactSending(false); }
  }

  async function handlePlan(plan: any) {
    if (plan.isEnterprise) { setShowContact(true); return; }
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
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>{t('settings_title')}</h1>
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
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>{t('settings_current').toUpperCase()}</div>
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
                <span style={{ fontSize: plan.price === 'Custom pricing' ? 18 : 32, fontWeight: 800, color: plan.color, fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
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

            {plan.isEnterprise && showContact && (
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(252,211,77,0.2)', paddingTop: 20 }}>
                <div style={{ fontSize: 11, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.08em' }}>FORMULAIRE DE CONTACT</div>
                {!contactSent ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Votre nom *"
                        style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 12, outline: 'none', width: '100%' }} />
                      <input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="Email pro *"
                        style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 12, outline: 'none', width: '100%' }} />
                    </div>
                    <input value={contactForm.company} onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))} placeholder="Entreprise"
                      style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 12, outline: 'none', width: '100%', marginBottom: 8 }} />
                    <textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} placeholder="Votre besoin (projets, MW, pays...)" rows={3}
                      style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 12, outline: 'none', width: '100%', resize: 'none', marginBottom: 10 }} />
                    {contactErr && <div style={{ color: '#F87171', fontSize: 11, marginBottom: 8 }}>{contactErr}</div>}
                    <button onClick={sendContact} disabled={contactSending}
                      style={{ width: '100%', background: contactSending ? '#1E2D3D' : '#FCD34D', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 800, fontSize: 13, cursor: contactSending ? 'wait' : 'pointer' }}>
                      {contactSending ? '{t('contact_sending')}' : '{t('contact_send')}'}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                    <div style={{ fontSize: 13, color: '#00FF94', fontWeight: 600, marginBottom: 4 }}>Demande envoyee !</div>
                    <div style={{ fontSize: 11, color: '#4A6278' }}>Notre equipe vous contacte sous 24h.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>STANDARDS INCLUDED IN ALL PLANS</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Verra ACM0002 v19.0', 'UNFCCC 2024', 'Gold Standard', 'Article 6 ITMO', 'CORSIA Aviation', 'ACMI Africa', 'Blockchain Registry', 'dMRV Satellite'].map(s => (
            <span key={s} style={{ fontSize: 11, background: 'rgba(0,255,148,0.06)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.15)', borderRadius: 5, padding: '4px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
          ))}
        </div>
      </div>


    </div>
  );
}
