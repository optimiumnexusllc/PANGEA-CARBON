'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const PLANS = {
  FREE:       { label: 'Free',       color: '#4A6278', price: '$0'    },
  TRIAL:      { label: 'Trial 14j',  color: '#38BDF8', price: '$0'    },
  STARTER:    { label: 'Starter',    color: '#38BDF8', price: '$299'  },
  PRO:        { label: 'Pro',        color: '#00FF94', price: '$799'  },
  ENTERPRISE: { label: 'Enterprise', color: '#A78BFA', price: 'Custom'},
};

const TABS = [
  { id: 'profile',  label: 'Profil' },
  { id: 'plan',     label: 'Plan' },
  { id: 'notifs',   label: 'Notifications' },
  { id: 'security', label: 'Securite' },
];

function AccountPage() {
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editName, setEditName] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [tfa, setTfa] = useState({ enabled: false });
  const [tfaStep, setTfaStep] = useState('idle');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaQR, setTfaQR] = useState('');
  const [tfaSecret, setTfaSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    fetchAuthJson('/auth/me').then((u) => {
      setUser(u);
      setOrg(u.organization || null);
      setEditName(u.name || '');
    }).catch(console.error);
    fetchAuthJson('/notifications/preferences').then(setPrefs).catch(() => {});
    fetchAuthJson('/2fa/status').then(setTfa).catch(() => {});
    setLoading(false);
  }, []);

  function flash(text, ok) {
    setMsg({ text, ok: ok !== false });
    setTimeout(() => setMsg(null), 4000);
  }

  function saveProfile() {
    setSaving(true);
    fetchAuthJson('/auth/me', { method: 'PUT', body: JSON.stringify({ name: editName }) })
      .then(() => { flash('Profil mis a jour'); })
      .catch((e) => flash(e.message, false))
      .finally(() => setSaving(false));
  }

  function changePassword() {
    if (pwNew !== pwConfirm) { flash('Mots de passe differents', false); return; }
    if (pwNew.length < 8) { flash('Minimum 8 caracteres', false); return; }
    setSaving(true);
    fetchAuthJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }) })
      .then(() => { setPwCurrent(''); setPwNew(''); setPwConfirm(''); flash('Password modifie'); })
      .catch((e) => flash(e.message, false))
      .finally(() => setSaving(false));
  }

  function savePref(key, val) {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    fetchAuthJson('/notifications/preferences', { method: 'PUT', body: JSON.stringify(next) }).catch(() => {});
  }

  function setup2FA() {
    fetchAuthJson('/2fa/setup', { method: 'POST' })
      .then((d) => { setTfaQR(d.qrCode); setTfaSecret(d.secret); setTfaStep('setup'); })
      .catch((e) => flash(e.message, false));
  }

  function verify2FA() {
    fetchAuthJson('/2fa/verify', { method: 'POST', body: JSON.stringify({ code: tfaCode }) })
      .then((d) => { setBackupCodes(d.backupCodes || []); setTfa({ enabled: true }); setTfaStep('backup'); setTfaCode(''); flash('2FA active'); })
      .catch((e) => flash(e.message, false));
  }

  function disable2FA() {
    fetchAuthJson('/2fa/disable', { method: 'DELETE', body: JSON.stringify({ code: tfaCode }) })
      .then(() => { setTfa({ enabled: false }); setTfaStep('idle'); setTfaCode(''); flash('2FA desactive'); })
      .catch((e) => flash(e.message, false));
  }

  const planInfo = PLANS[(org && org.plan) || 'FREE'] || PLANS.FREE;
  const card = { background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24 };
  const inp = { width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none', display: 'block', marginBottom: 16 };
  const inpD = { ...inp, color: '#4A6278' };
  const lbl = { fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 };
  const btn = (bg, fg) => ({ background: bg, color: fg, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' });

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>MON COMPTE</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>Parametres</h1>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: '1px solid', borderColor: msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msg.ok ? '#00FF94' : '#F87171' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: 8, borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, background: tab === t.id ? '#1E2D3D' : 'transparent', color: tab === t.id ? '#E8EFF6' : '#4A6278' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={card}><p style={{ color: '#4A6278' }}>Loading...</p></div>
      ) : (
        <div style={card}>

          {tab === 'profile' && (
            <div>
              <label style={lbl}>NOM</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inp} />
              <label style={lbl}>EMAIL</label>
              <input value={(user && user.email) || ''} disabled style={inpD} />
              <label style={lbl}>ROLE</label>
              <input value={(user && user.role) || ''} disabled style={inpD} />
              <label style={lbl}>ORGANISATION</label>
              <input value={(org && org.name) || '---'} disabled style={inpD} />
              <button onClick={saveProfile} disabled={saving} style={btn('#00FF94', '#080B0F')}>
                {saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {tab === 'plan' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Plan actuel</div>
              <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: 18, marginBottom: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: planInfo.color }}>{planInfo.label} <span style={{ fontSize: 13, color: '#4A6278' }}>{planInfo.price}/mois</span></div>
              </div>
              <a href="/dashboard/settings" style={{ background: '#00FF94', color: '#080B0F', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                Changer de plan
              </a>
            </div>
          )}

          {tab === 'notifs' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 16 }}>Notifications</div>
              {['email_alerts', 'weekly_digest', 'production_drops', 'credit_milestones', 'availability_warnings'].map((key) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <span style={{ fontSize: 13, color: '#E8EFF6' }}>{key.replace(/_/g, ' ')}</span>
                  <div onClick={() => savePref(key, !prefs[key])}
                    style={{ width: 44, height: 24, background: prefs[key] ? '#00FF94' : '#1E2D3D', borderRadius: 12, cursor: 'pointer', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: prefs[key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'security' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 12 }}>2FA</div>
              <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <div style={{ color: tfa.enabled ? '#00FF94' : '#FCD34D', fontWeight: 600, marginBottom: 10 }}>
                  {tfa.enabled ? 'Protege par 2FA' : 'Non protege'}
                </div>
                {!tfa.enabled && tfaStep === 'idle' && (
                  <button onClick={setup2FA} style={btn('#00FF94', '#080B0F')}>Activer 2FA</button>
                )}
                {tfaStep === 'setup' && (
                  <div>
                    {tfaQR && <img src={tfaQR} alt="QR" style={{ width: 150, height: 150, marginBottom: 10, display: 'block' }} />}
                    <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>Cle: {tfaSecret}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={tfaCode} onChange={(e) => setTfaCode(e.target.value.slice(0, 6))} placeholder="000000"
                        style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: 10, fontSize: 18, textAlign: 'center', outline: 'none' }} />
                      <button onClick={verify2FA} disabled={tfaCode.length !== 6} style={btn('#00FF94', '#080B0F')}>OK</button>
                    </div>
                  </div>
                )}
                {tfaStep === 'backup' && backupCodes.length > 0 && (
                  <div>
                    <div style={{ color: '#FCD34D', marginBottom: 8 }}>Sauvegardez ces codes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                      {backupCodes.map((code, i) => (
                        <div key={i} style={{ background: '#0D1117', borderRadius: 5, padding: '4px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#E8EFF6', textAlign: 'center' }}>{code}</div>
                      ))}
                    </div>
                    <button onClick={() => setTfaStep('idle')} style={btn('#00FF94', '#080B0F')}>Termine</button>
                  </div>
                )}
                {tfa.enabled && tfaStep === 'idle' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input value={tfaCode} onChange={(e) => setTfaCode(e.target.value.slice(0, 6))} placeholder="Code 2FA"
                      style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                    <button onClick={disable2FA} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>Desactiver</button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 12 }}>Password</div>
              <label style={lbl}>ACTUEL</label>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} style={inp} />
              <label style={lbl}>NOUVEAU</label>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} style={inp} />
              <label style={lbl}>CONFIRMER</label>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} style={inp} />
              <button onClick={changePassword} disabled={saving} style={btn('#F87171', '#080B0F')}>
                {saving ? '...' : 'Edit'}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default AccountPage;
