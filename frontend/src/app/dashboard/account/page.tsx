'use client';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const API = process.env.NEXT_PUBLIC_API_URL;
const fmt = (n: number) => n?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) ?? '0';

const PLAN_DETAILS: Record<string, { label: string; color: string; price: string; limits: string }> = {
  FREE:       { label: 'Free',       color: '#4A6278', price: '$0',    limits: '1 projet · 10 MW' },
  TRIAL:      { label: 'Trial 14j',  color: '#38BDF8', price: '$0',    limits: 'Toutes features · 14 jours' },
  STARTER:    { label: 'Starter',    color: '#38BDF8', price: '$299',  limits: '5 projets · 50 MW · 2 users' },
  PRO:        { label: 'Pro',        color: '#00FF94', price: '$799',  limits: 'Illimité · Equipment API · AI' },
  ENTERPRISE: { label: 'Enterprise', color: '#A78BFA', price: 'Custom', limits: 'White-label · SSO · SLA 99.9%' },
};

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editName, setEditName] = useState('');
  const [pwData, setPwData] = useState({ current: '', newPw: '', confirm: '' });
  const [twofa, setTwofa] = useState<any>(null);
  const [twofaStep, setTwofaStep] = useState<'idle'|'setup'|'verify'|'backup'>('idle');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaQR, setTwofaQR] = useState('');
  const [twofaSecret, setTwofaSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchAuthJson('/2fa/status').then(setTwofa).catch(() => {});
    Promise.all([
      fetchAuthJson('/auth/me'),
      fetchAuthJson('/notifications/preferences'),
    ]).then(([u, p]) => {
      setUser(u); setEditName(u.name);
      setOrg(u.organization);
      setPrefs(p);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const showMsg = (text: string, ok = true) => {
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
      showMsg('✓ Profil mis à jour');
    } catch (e: any) { showMsg('✗ ' + e.message, false); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwData.newPw !== pwData.confirm) { showMsg('✗ Mots de passe différents', false); return; }
    if (pwData.newPw.length < 8) { showMsg('✗ Minimum 8 caractères', false); return; }
    setSaving(true);
    try {
      await fetchAuthJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pwData.current, newPassword: pwData.newPw }) });
      setPwData({ current: '', newPw: '', confirm: '' });
      showMsg('✓ Mot de passe modifié');
    } catch (e: any) { showMsg('✗ ' + e.message, false); }
    finally { setSaving(false); }
  };

  const setup2FA = async () => {
    const data = await fetchAuthJson('/2fa/setup', { method: 'POST' });
    setTwofaQR(data.qrCode);
    setTwofaSecret(data.secret);
    setTwofaStep('setup');
  };

  const verify2FA = async () => {
    try {
      const data = await fetchAuthJson('/2fa/verify', { method: 'POST', body: JSON.stringify({ code: twofaCode }) });
      setBackupCodes(data.backupCodes || []);
      setTwofa({ enabled: true });
      setTwofaStep('backup');
      setTwofaCode('');
      showMsg('✓ 2FA activé avec succès');
    } catch (e: any) { showMsg('✗ ' + e.message, false); }
  };

  const disable2FA = async () => {
    if (!twofaCode) { showMsg('✗ Code requis pour désactiver', false); return; }
    try {
      await fetchAuthJson('/2fa/disable', { method: 'DELETE', body: JSON.stringify({ code: twofaCode }) });
      setTwofa({ enabled: false });
      setTwofaStep('idle');
      setTwofaCode('');
      showMsg('✓ 2FA désactivé');
    } catch (e: any) { showMsg('✗ ' + e.message, false); }
  };

  const savePrefs = async (newPrefs: any) => {
    setPrefs(newPrefs);
    await fetchAuthJson('/notifications/preferences', { method: 'PUT', body: JSON.stringify(newPrefs) })
      .catch(console.error);
    showMsg('✓ Préférences sauvegardées');
  };

  const planInfo = PLAN_DETAILS[org?.plan || 'FREE'] || PLAN_DETAILS.FREE;

  const TABS = [
    { id: 'profile',  label: 'Profil',         icon: '👤' },
    { id: 'plan',     label: 'Plan & Facturation', icon: '💳' },
    { id: 'notifs',   label: 'Notifications',   icon: '🔔' },
    { id: 'security', label: 'Sécurité',        icon: '🔐' },
  ];

  const InputRow = ({ label, value, onChange, type = 'text', readonly = false }: any) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const }}>{label}</label>
      <input type={type} value={value} onChange={onChange} readOnly={readonly}
        style={{ width: '100%', background: readonly ? '#0D1117' : '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: readonly ? '#4A6278' : '#E8EFF6', padding: '10px 12px', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', cursor: readonly ? 'default' : 'text' }}
        onFocus={e => !readonly && (e.target.style.borderColor = 'rgba(0,255,148,0.35)')}
        onBlur={e => (e.target.style.borderColor = '#1E2D3D')}/>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MON COMPTE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Paramètres du compte</h1>
      </div>

      {/* Success/error message */}
      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? '#00FF94' : '#F87171' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: activeTab === tab.id ? '#1E2D3D' : 'transparent',
              color: activeTab === tab.id ? '#E8EFF6' : '#4A6278' }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#4A6278' }}>Chargement...</div> : (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 }}>

          {/* PROFIL */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Informations personnelles</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#00FF94', flexShrink: 0 }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EFF6' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{user?.role}</div>
                  {user?.emailVerified && <div style={{ fontSize: 11, color: '#00FF94', marginTop: 2 }}>✓ Email vérifié</div>}
                </div>
              </div>
              <InputRow label="Nom complet" value={editName} onChange={(e: any) => setEditName(e.target.value)}/>
              <InputRow label="Email" value={user?.email} readonly/>
              <InputRow label="Rôle" value={user?.role} readonly/>
              <InputRow label="Organisation" value={org?.name || '—'} readonly/>
              <button onClick={saveProfile} disabled={saving || editName === user?.name}
                style={{ background: saving ? '#1E2D3D' : '#00FF94', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {saving ? '...' : 'Sauvegarder le profil'}
              </button>
            </div>
          )}

          {/* PLAN */}
          {activeTab === 'plan' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Plan actuel</div>
              <div style={{ background: `${planInfo.color}08`, border: `1px solid ${planInfo.color}30`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: planInfo.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{planInfo.label.toUpperCase()}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: planInfo.color, fontFamily: 'Syne, sans-serif' }}>{planInfo.price}<span style={{ fontSize: 13, fontWeight: 400, color: '#4A6278' }}>/mois</span></div>
                    <div style={{ fontSize: 12, color: '#4A6278', marginTop: 6 }}>{planInfo.limits}</div>
                  </div>
                  <a href="/dashboard/settings" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    Changer de plan →
                  </a>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Utilisation du compte</div>
              {[
                { label: 'Projets', used: org?._count?.projects || 0, max: org?.maxProjects || 5, color: '#38BDF8' },
                { label: 'Utilisateurs', used: 1, max: org?.maxUsers || 2, color: '#A78BFA' },
              ].map(u => (
                <div key={u.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#8FA3B8' }}>{u.label}</span>
                    <span style={{ fontSize: 12, color: u.color, fontFamily: 'JetBrains Mono, monospace' }}>{u.used} / {u.max}</span>
                  </div>
                  <div style={{ height: 6, background: '#121920', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, u.used / u.max * 100)}%`, height: '100%', background: u.used / u.max > 0.8 ? '#F87171' : u.color, borderRadius: 3 }}/>
                  </div>
                </div>
              ))}

              </div>
              <div style={{ padding: 14, background: '#121920', borderRadius: 8, fontSize: 12, color: '#4A6278' }}>
                💡 Pour les factures et l'historique de paiement, visitez le <a href="/dashboard/settings" style={{ color: '#38BDF8', textDecoration: 'none' }}>portail de facturation Stripe →</a>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifs' && prefs && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Préférences de notifications</div>
              {[
                { key: 'email_alerts', label: 'Alertes email', desc: 'Recevoir les alertes de performance par email' },
                { key: 'weekly_digest', label: 'Digest hebdomadaire', desc: 'Résumé MRV chaque lundi matin' },
                { key: 'production_drops', label: 'Chutes de production', desc: 'Alerte si production > 20% sous la moyenne' },
                { key: 'credit_milestones', label: 'Jalons crédits carbone', desc: 'Notification aux jalons 1K, 5K, 10K tCO₂e' },
                { key: 'availability_warnings', label: 'Alertes disponibilité', desc: 'Alerte si disponibilité < 95%' },
              ].map(pref => (
                <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500, marginBottom: 2 }}>{pref.label}</div>
                    <div style={{ fontSize: 11, color: '#4A6278' }}>{pref.desc}</div>
                  </div>
                  <div style={{ position: 'relative', width: 44, height: 24, background: prefs[pref.key] ? '#00FF94' : '#1E2D3D', borderRadius: 12, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                    onClick={() => savePrefs({ ...prefs, [pref.key]: !prefs[pref.key] })}>
                    <div style={{ position: 'absolute', top: 2, left: prefs[pref.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SÉCURITÉ */}
          {activeTab === 'security' && (
            <div>
              {/* 2FA Section */}
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Authentification à deux facteurs (2FA)</div>
              <div style={{ background: twofa?.enabled ? 'rgba(0,255,148,0.06)' : '#121920', border: `1px solid ${twofa?.enabled ? 'rgba(0,255,148,0.25)' : '#1E2D3D'}`, borderRadius: 10, padding: 18, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{twofa?.enabled ? '🛡️' : '⚠️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: twofa?.enabled ? '#00FF94' : '#FCD34D' }}>
                        {twofa?.enabled ? '2FA Activé' : '2FA Non activé'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4A6278' }}>
                      {twofa?.enabled
                        ? `Compatible Google Authenticator · ${twofa.backupCodesRemaining} codes de secours restants`
                        : 'Protégez vos crédits carbone avec une double vérification'}
                    </div>
                  </div>
                  {twofaStep === 'idle' && !twofa?.enabled && (
                    <button onClick={setup2FA} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Activer 2FA →
                    </button>
                  )}
                </div>

                {/* Étape 1: QR Code */}
                {twofaStep === 'setup' && twofaQR && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, color: '#8FA3B8', marginBottom: 12 }}>
                      1. Scannez ce QR code avec <strong style={{ color: '#E8EFF6' }}>Google Authenticator</strong> ou <strong style={{ color: '#E8EFF6' }}>Authy</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <img src={twofaQR} alt="QR Code 2FA" style={{ width: 160, height: 160, borderRadius: 8, border: '2px solid rgba(0,255,148,0.3)' }}/>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 6 }}>Ou saisissez manuellement :</div>
                        <div style={{ background: '#0D1117', borderRadius: 6, padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00FF94', letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                          {twofaSecret}
                        </div>
                        <div style={{ fontSize: 11, color: '#4A6278', marginTop: 10, marginBottom: 6 }}>2. Entrez le code à 6 chiffres :</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                            placeholder="000000" maxLength={6}
                            style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px', fontSize: 20, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', outline: 'none', letterSpacing: '0.3em' }}
                            onKeyDown={e => e.key === 'Enter' && verify2FA()}/>
                          <button onClick={verify2FA} disabled={twofaCode.length !== 6}
                            style={{ background: twofaCode.length === 6 ? '#00FF94' : '#1E2D3D', color: twofaCode.length === 6 ? '#080B0F' : '#4A6278', border: 'none', borderRadius: 7, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                            Vérifier ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 2: Codes de secours */}
                {twofaStep === 'backup' && backupCodes.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,255,148,0.2)', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#FCD34D', marginBottom: 8 }}>
                      ⚠️ Sauvegardez ces codes de secours maintenant — ils ne seront plus affichés
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                      {backupCodes.map((code, i) => (
                        <div key={i} style={{ background: '#0D1117', borderRadius: 6, padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#E8EFF6', textAlign: 'center', border: '1px solid #1E2D3D' }}>
                          {code}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('
')); showMsg('✓ Codes copiés'); }}
                      style={{ background: 'transparent', border: '1px solid #FCD34D', borderRadius: 7, color: '#FCD34D', padding: '7px 14px', cursor: 'pointer', fontSize: 12, marginRight: 8 }}>
                      📋 Copier tous les codes
                    </button>
                    <button onClick={() => setTwofaStep('idle')}
                      style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                      J'ai sauvegardé → Terminer
                    </button>
                  </div>
                )}

                {/* Désactiver 2FA */}
                {twofa?.enabled && twofaStep === 'idle' && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(30,45,61,0.5)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={twofaCode} onChange={e => setTwofaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="Code 2FA pour désactiver"
                      style={{ flex: 1, minWidth: 160, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.2em' }}/>
                    <button onClick={disable2FA} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>
                      Désactiver 2FA
                    </button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Changer le mot de passe</div>
              <InputRow label="Mot de passe actuel" value={pwData.current} onChange={(e: any) => setPwData(p => ({ ...p, current: e.target.value }))} type="password"/>
              <InputRow label="Nouveau mot de passe" value={pwData.newPw} onChange={(e: any) => setPwData(p => ({ ...p, newPw: e.target.value }))} type="password"/>
              <InputRow label="Confirmer le nouveau mot de passe" value={pwData.confirm} onChange={(e: any) => setPwData(p => ({ ...p, confirm: e.target.value }))} type="password"/>
              <button onClick={changePassword} disabled={saving || !pwData.current || !pwData.newPw || !pwData.confirm}
                style={{ background: saving ? '#1E2D3D' : '#F87171', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 24 }}>
                {saving ? '...' : 'Modifier le mot de passe'}
              </button>

              <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 10 }}>Sessions actives</div>
                <div style={{ padding: '12px 14px', background: '#121920', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#E8EFF6' }}>Session actuelle</div>
                    <div style={{ fontSize: 11, color: '#4A6278', marginTop: 2 }}>Dernière connexion: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : 'N/A'}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
