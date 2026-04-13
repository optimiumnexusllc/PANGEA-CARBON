'use client';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const PLAN_DETAILS: Record<string, { label: string; color: string; price: string; limits: string }> = {
  FREE:       { label: 'Free',       color: '#4A6278', price: '$0',     limits: '1 projet - 10 MW' },
  TRIAL:      { label: 'Trial 14j',  color: '#38BDF8', price: '$0',     limits: 'Toutes features - 14 jours' },
  STARTER:    { label: 'Starter',    color: '#38BDF8', price: '$299',   limits: '5 projets - 50 MW - 2 users' },
  PRO:        { label: 'Pro',        color: '#00FF94', price: '$799',   limits: 'Illimite - Equipment API - AI' },
  ENTERPRISE: { label: 'Enterprise', color: '#A78BFA', price: 'Custom', limits: 'White-label - SSO - SLA 99.9%' },
};

const TABS = [
  { id: 'profile',  label: 'Profil',           icon: 'U' },
  { id: 'plan',     label: 'Plan & Facturation', icon: '$' },
  { id: 'notifs',   label: 'Notifications',     icon: 'N' },
  { id: 'security', label: 'Securite',          icon: 'S' },
];

const inputStyle = (disabled: boolean) => ({
  width: '100%',
  background: '#0D1117',
  border: '1px solid #1E2D3D',
  borderRadius: 7,
  color: disabled ? '#4A6278' : '#E8EFF6',
  padding: '10px 12px',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
  cursor: disabled ? 'default' : 'text',
  marginBottom: 16,
});

export default function AccountPage() {
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editName, setEditName] = useState('');
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [twofaStatus, setTwofaStatus] = useState<any>({ enabled: false });
  const [twofaStep, setTwofaStep] = useState<string>('idle');
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
      setEditName(u.name || '');
      setPrefs(p || {});
      setTwofaStatus(tfa || { enabled: false });
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
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), name: editName }));
      flash('Profil mis a jour');
    } catch (e: any) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) { flash('Mots de passe differents', false); return; }
    if (pw.newPw.length < 8) { flash('Minimum 8 caracteres', false); return; }
    setSaving(true);
    try {
      await fetchAuthJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }) });
      setPw({ current: '', newPw: '', confirm: '' });
      flash('Mot de passe modifie');
    } catch (e: any) { flash(e.message, false); }
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
    } catch (e: any) { flash(e.message, false); }
  };

  const verify2FA = async () => {
    try {
      const d = await fetchAuthJson('/2fa/verify', { method: 'POST', body: JSON.stringify({ code: twofaCode }) });
      setBackupCodes(d.backupCodes || []);
      setTwofaStatus({ enabled: true });
      setTwofaStep('backup');
      setTwofaCode('');
      flash('2FA active');
    } catch (e: any) { flash(e.message, false); }
  };

  const disable2FA = async () => {
    try {
      await fetchAuthJson('/2fa/disable', { method: 'DELETE', body: JSON.stringify({ code: twofaCode }) });
      setTwofaStatus({ enabled: false });
      setTwofaStep('idle');
      setTwofaCode('');
      flash('2FA desactive');
    } catch (e: any) { flash(e.message, false); }
  };

  const planInfo = PLAN_DETAILS[org?.plan || 'FREE'] || PLAN_DETAILS.FREE;

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MON COMPTE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Parametres du compte</h1>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: '1px solid', borderColor: msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? '#00FF94' : '#F87171' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: 8, borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: tab === t.id ? '#1E2D3D' : 'transparent', color: tab === t.id ? '#E8EFF6' : '#4A6278' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 48, textAlign: 'center', color: '#4A6278' }}>
          Chargement...
        </div>
      ) : (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 }}>

          {tab === 'profile' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#00FF94', flexShrink: 0 }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EFF6' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: '#4A6278', marginTop: 2 }}>{user?.role}</div>
                  {user?.emailVerified && <div style={{ fontSize: 11, color: '#00FF94', marginTop: 2 }}>Email verifie</div>}
                </div>
              </div>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>NOM COMPLET</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle(false)} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>EMAIL</label>
              <input value={user?.email || ''} disabled style={inputStyle(true)} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>ROLE</label>
              <input value={user?.role || ''} disabled style={inputStyle(true)} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>ORGANISATION</label>
              <input value={org?.name || '---'} disabled style={inputStyle(true)} />
              <button onClick={saveProfile} disabled={saving || editName === user?.name}
                style={{ background: saving ? '#1E2D3D' : '#00FF94', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {tab === 'plan' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Plan actuel</div>
              <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: planInfo.color, fontFamily: 'Syne, sans-serif' }}>
                  {planInfo.label}
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#4A6278', marginLeft: 8 }}>{planInfo.price}/mois</span>
                </div>
                <div style={{ fontSize: 12, color: '#4A6278', marginTop: 6 }}>{planInfo.limits}</div>
                <a href="/dashboard/settings" style={{ display: 'inline-block', marginTop: 14, background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  Changer de plan
                </a>
              </div>
              <div style={{ padding: 14, background: '#121920', borderRadius: 8, fontSize: 12, color: '#4A6278' }}>
                Factures via le portail Stripe dans les parametres.
              </div>
            </div>
          )}

          {tab === 'notifs' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Preferences de notifications</div>
              {[
                { key: 'email_alerts',          label: 'Alertes email' },
                { key: 'weekly_digest',         label: 'Digest hebdomadaire' },
                { key: 'production_drops',      label: 'Chutes de production' },
                { key: 'credit_milestones',     label: 'Jalons credits carbone' },
                { key: 'availability_warnings', label: 'Alertes disponibilite' },
              ].map(p => (
                <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <span style={{ fontSize: 13, color: '#E8EFF6' }}>{p.label}</span>
                  <div onClick={() => savePref(p.key, !prefs[p.key])}
                    style={{ width: 44, height: 24, background: prefs[p.key] ? '#00FF94' : '#1E2D3D', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, left: prefs[p.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'security' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Authentification a deux facteurs (2FA)</div>
              <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: 18, marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: twofaStatus?.enabled ? '#00FF94' : '#FCD34D', marginBottom: 4 }}>
                      {twofaStatus?.enabled ? 'Protege par 2FA' : 'Non protege'}
                    </div>
                    <div style={{ fontSize: 12, color: '#4A6278' }}>Compatible Google Authenticator, Authy</div>
                  </div>
                  {!twofaStatus?.enabled && twofaStep === 'idle' && (
                    <button onClick={setup2FA} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Activer 2FA
                    </button>
                  )}
                </div>

                {twofaStep === 'setup' && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 12 }}>Scannez avec Google Authenticator</div>
                    {twofaQR && <img src={twofaQR} alt="QR 2FA" style={{ width: 150, height: 150, borderRadius: 8, marginBottom: 12 }} />}
                    <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 6 }}>Cle manuelle : {twofaSecret}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.slice(0, 6))}
                        placeholder="000000" maxLength={6}
                        style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: 10, fontSize: 20, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }} />
                      <button onClick={verify2FA} disabled={twofaCode.length !== 6}
                        style={{ background: twofaCode.length === 6 ? '#00FF94' : '#1E2D3D', color: twofaCode.length === 6 ? '#080B0F' : '#4A6278', border: 'none', borderRadius: 7, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>
                        Verifier
                      </button>
                    </div>
                  </div>
                )}

                {twofaStep === 'backup' && backupCodes.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#FCD34D', marginBottom: 10 }}>Sauvegardez ces codes (affiches une seule fois)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                      {backupCodes.map((code, i) => (
                        <div key={i} style={{ background: '#0D1117', borderRadius: 6, padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#E8EFF6', textAlign: 'center', border: '1px solid #1E2D3D' }}>{code}</div>
                      ))}
                    </div>
                    <button onClick={() => setTwofaStep('idle')} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                      Termine
                    </button>
                  </div>
                )}

                {twofaStatus?.enabled && twofaStep === 'idle' && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(30,45,61,0.5)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.slice(0, 6))}
                      placeholder="Code 2FA pour desactiver"
                      style={{ flex: 1, minWidth: 160, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                    <button onClick={disable2FA} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>
                      Desactiver 2FA
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Changer le mot de passe</div>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>MOT DE PASSE ACTUEL</label>
              <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={inputStyle(false)} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>NOUVEAU MOT DE PASSE</label>
              <input type="password" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} style={inputStyle(false)} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>CONFIRMER</label>
              <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} style={inputStyle(false)} />
              <button onClick={changePassword} disabled={saving || !pw.current || !pw.newPw || !pw.confirm}
                style={{ background: saving ? '#1E2D3D' : '#F87171', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {saving ? '...' : 'Modifier le mot de passe'}
              </button>
            </div>
          </div>
          )}

        </div>
      )}
    </div>
  );
}
