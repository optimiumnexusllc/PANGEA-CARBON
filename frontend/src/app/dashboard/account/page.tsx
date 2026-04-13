'use client';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const PLAN_DETAILS: Record<string, { label: string; color: string; price: string; limits: string }> = {
  FREE:       { label: 'Free',       color: '#4A6278', price: '$0',     limits: '1 projet · 10 MW' },
  TRIAL:      { label: 'Trial 14j',  color: '#38BDF8', price: '$0',     limits: 'Toutes features · 14 jours' },
  STARTER:    { label: 'Starter',    color: '#38BDF8', price: '$299',   limits: '5 projets · 50 MW · 2 users' },
  PRO:        { label: 'Pro',        color: '#00FF94', price: '$799',   limits: 'Illimité · Equipment API · AI' },
  ENTERPRISE: { label: 'Enterprise', color: '#A78BFA', price: 'Custom', limits: 'White-label · SSO · SLA 99.9%' },
};

const TABS = [
  { id: 'profile',  label: 'Profil',           icon: '👤' },
  { id: 'plan',     label: 'Plan & Facturation', icon: '💳' },
  { id: 'notifs',   label: 'Notifications',     icon: '🔔' },
  { id: 'security', label: 'Sécurité',          icon: '🔐' },
];

function Field({ label, value, onChange, type = 'text', disabled = false }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const }}>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: disabled ? '#4A6278' : '#E8EFF6', padding: '10px 12px', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', cursor: disabled ? 'default' : 'text' }}
        onFocus={e => !disabled && (e.target.style.borderColor = 'rgba(0,255,148,0.35)')}
        onBlur={e => (e.target.style.borderColor = '#1E2D3D')}
      />
    </div>
  );
}

export default function AccountPage() {
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editName, setEditName] = useState('');
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });

  // 2FA state
  const [twofaStatus, setTwofaStatus] = useState<any>(null);
  const [twofaStep, setTwofaStep] = useState<'idle' | 'setup' | 'verify' | 'backup'>('idle');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaQR, setTwofaQR] = useState('');
  const [twofaSecret, setTwofaSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchAuthJson('/auth/me'),
      fetchAuthJson('/notifications/preferences').catch(() => ({})),
      fetchAuthJson('/2fa/status').catch(() => ({ enabled: false })),
    ]).then(([u, p, tfa]) => {
      setUser(u);
      setOrg(u.organization);
      setEditName(u.name);
      setPrefs(p);
      setTwofaStatus(tfa);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetchAuthJson('/auth/me', { method: 'PUT', body: JSON.stringify({ name: editName }) });
      setUser((u: any) => ({ ...u, name: editName }));
      const stored = localStorage.getItem('user');
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), name: editName }));
      flash('✓ Profil mis à jour');
    } catch (e: any) { flash('✗ ' + e.message, false); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { flash('✗ Mots de passe différents', false); return; }
    if (pw.newPw.length < 8) { flash('✗ Minimum 8 caractères', false); return; }
    setSaving(true);
    try {
      await fetchAuthJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }) });
      setPw({ current: '', newPw: '', confirm: '' });
      flash('✓ Mot de passe modifié');
    } catch (e: any) { flash('✗ ' + e.message, false); }
    finally { setSaving(false); }
  };

  const savePref = async (key: string, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    await fetchAuthJson('/notifications/preferences', { method: 'PUT', body: JSON.stringify(next) }).catch(() => {});
  };

  const setup2FA = async () => {
    try {
      const d = await fetchAuthJson('/2fa/setup', { method: 'POST' });
      setTwofaQR(d.qrCode);
      setTwofaSecret(d.secret);
      setTwofaStep('setup');
    } catch (e: any) { flash('✗ ' + e.message, false); }
  };

  const verify2FA = async () => {
    try {
      const d = await fetchAuthJson('/2fa/verify', { method: 'POST', body: JSON.stringify({ code: twofaCode }) });
      setBackupCodes(d.backupCodes || []);
      setTwofaStatus({ enabled: true });
      setTwofaStep('backup');
      setTwofaCode('');
      flash('✓ 2FA activé');
    } catch (e: any) { flash('✗ ' + e.message, false); }
  };

  const disable2FA = async () => {
    try {
      await fetchAuthJson('/2fa/disable', { method: 'DELETE', body: JSON.stringify({ code: twofaCode }) });
      setTwofaStatus({ enabled: false });
      setTwofaStep('idle');
      setTwofaCode('');
      flash('✓ 2FA désactivé');
    } catch (e: any) { flash('✗ ' + e.message, false); }
  };

  const planInfo = PLAN_DETAILS[org?.plan || 'FREE'] || PLAN_DETAILS.FREE;

  if (loading) return (
    <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#4A6278' }}>
      Chargement...
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MON COMPTE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Paramètres du compte</h1>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? '#00FF94' : '#F87171' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: tab === t.id ? '#1E2D3D' : 'transparent', color: tab === t.id ? '#E8EFF6' : '#4A6278' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 }}>

        {/* ── PROFIL ── */}
        {tab === 'profile' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#00FF94', flexShrink: 0 }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EFF6' }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{user?.role}</div>
                {user?.emailVerified && <div style={{ fontSize: 11, color: '#00FF94', marginTop: 2 }}>✓ Email vérifié</div>}
              </div>
            </div>
            <Field label="Nom complet" value={editName} onChange={(e: any) => setEditName(e.target.value)} />
            <Field label="Email" value={user?.email} disabled />
            <Field label="Rôle" value={user?.role} disabled />
            <Field label="Organisation" value={org?.name || '—'} disabled />
            <button onClick={saveProfile} disabled={saving || editName === user?.name}
              style={{ background: saving ? '#1E2D3D' : '#00FF94', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {saving ? '...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {/* ── PLAN ── */}
        {tab === 'plan' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Plan actuel</div>
            <div style={{ background: `${planInfo.color}08`, border: `1px solid ${planInfo.color}30`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: planInfo.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{planInfo.label.toUpperCase()}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: planInfo.color, fontFamily: 'Syne, sans-serif' }}>
                    {planInfo.price}<span style={{ fontSize: 13, fontWeight: 400, color: '#4A6278' }}>/mois</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4A6278', marginTop: 6 }}>{planInfo.limits}</div>
                </div>
                <a href="/dashboard/settings" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  Changer de plan →
                </a>
              </div>
            </div>
            <div style={{ padding: 14, background: '#121920', borderRadius: 8, fontSize: 12, color: '#4A6278' }}>
              💡 Factures via <a href="/dashboard/settings" style={{ color: '#38BDF8', textDecoration: 'none' }}>portail Stripe →</a>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'notifs' && prefs && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Préférences de notifications</div>
            {[
              { key: 'email_alerts',          label: 'Alertes email',          desc: 'Alertes de performance par email' },
              { key: 'weekly_digest',         label: 'Digest hebdomadaire',    desc: 'Résumé MRV chaque lundi' },
              { key: 'production_drops',      label: 'Chutes de production',   desc: 'Alerte si production > 20% sous la moyenne' },
              { key: 'credit_milestones',     label: 'Jalons crédits carbone', desc: 'Notification à 1K, 5K, 10K tCO₂e' },
              { key: 'availability_warnings', label: 'Alertes disponibilité',  desc: 'Alerte si disponibilité < 95%' },
            ].map(p => (
              <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: '#4A6278' }}>{p.desc}</div>
                </div>
                <div onClick={() => savePref(p.key, !prefs[p.key])}
                  style={{ width: 44, height: 24, background: prefs[p.key] ? '#00FF94' : '#1E2D3D', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: prefs[p.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SÉCURITÉ ── */}
        {tab === 'security' && (
          <div>
            {/* 2FA */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Authentification à deux facteurs (2FA)</div>
            <div style={{ background: twofaStatus?.enabled ? 'rgba(0,255,148,0.06)' : '#121920', border: `1px solid ${twofaStatus?.enabled ? 'rgba(0,255,148,0.25)' : '#1E2D3D'}`, borderRadius: 10, padding: 18, marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{twofaStatus?.enabled ? '🛡️' : '⚠️'}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: twofaStatus?.enabled ? '#00FF94' : '#FCD34D' }}>
                      {twofaStatus?.enabled ? '2FA Activé' : '2FA Non activé'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4A6278' }}>
                    {twofaStatus?.enabled ? 'Compatible Google Authenticator, Authy' : 'Protégez vos crédits carbone avec une double vérification'}
                  </div>
                </div>
                {!twofaStatus?.enabled && twofaStep === 'idle' && (
                  <button onClick={setup2FA} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Activer 2FA →
                  </button>
                )}
              </div>

              {twofaStep === 'setup' && twofaQR && (
                <div style={{ marginTop: 16, borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 12 }}>Scannez avec <strong style={{ color: '#E8EFF6' }}>Google Authenticator</strong> ou <strong style={{ color: '#E8EFF6' }}>Authy</strong></div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <img src={twofaQR} alt="QR 2FA" style={{ width: 150, height: 150, borderRadius: 8, border: '2px solid rgba(0,255,148,0.3)' }} />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 4 }}>Ou saisir manuellement :</div>
                      <div style={{ background: '#0D1117', borderRadius: 6, padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00FF94', wordBreak: 'break-all', marginBottom: 12 }}>{twofaSecret}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000" maxLength={6}
                          style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px', fontSize: 20, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', outline: 'none', letterSpacing: '0.3em' }}
                          onKeyDown={e => e.key === 'Enter' && verify2FA()} />
                        <button onClick={verify2FA} disabled={twofaCode.length !== 6}
                          style={{ background: twofaCode.length === 6 ? '#00FF94' : '#1E2D3D', color: twofaCode.length === 6 ? '#080B0F' : '#4A6278', border: 'none', borderRadius: 7, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>✓</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {twofaStep === 'backup' && backupCodes.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,255,148,0.2)', paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#FCD34D', marginBottom: 10 }}>⚠️ Sauvegardez ces codes — affichés une seule fois</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {backupCodes.map((code, i) => (
                      <div key={i} style={{ background: '#0D1117', borderRadius: 6, padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#E8EFF6', textAlign: 'center', border: '1px solid #1E2D3D' }}>{code}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); flash('✓ Codes copiés'); }}
                      style={{ background: 'transparent', border: '1px solid #FCD34D', borderRadius: 7, color: '#FCD34D', padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}>
                      📋 Copier
                    </button>
                    <button onClick={() => setTwofaStep('idle')}
                      style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                      Terminé ✓
                    </button>
                  </div>
                </div>
              )}

              {twofaStatus?.enabled && twofaStep === 'idle' && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(30,45,61,0.5)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Code 2FA pour désactiver"
                    style={{ flex: 1, minWidth: 160, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.2em' }} />
                  <button onClick={disable2FA} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>
                    Désactiver 2FA
                  </button>
                </div>
              )}
            </div>

            {/* Mot de passe */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Changer le mot de passe</div>
            <Field label="Mot de passe actuel" value={pw.current} onChange={(e: any) => setPw(p => ({ ...p, current: e.target.value }))} type="password" />
            <Field label="Nouveau mot de passe" value={pw.newPw} onChange={(e: any) => setPw(p => ({ ...p, newPw: e.target.value }))} type="password" />
            <Field label="Confirmer" value={pw.confirm} onChange={(e: any) => setPw(p => ({ ...p, confirm: e.target.value }))} type="password" />
            <button onClick={changePassword} disabled={saving || !pw.current || !pw.newPw || !pw.confirm}
              style={{ background: saving ? '#1E2D3D' : '#F87171', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {saving ? '...' : 'Modifier le mot de passe'}
            </button>
          </div>
        )}

      </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
