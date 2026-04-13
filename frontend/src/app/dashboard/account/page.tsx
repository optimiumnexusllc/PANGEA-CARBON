'use client';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

// Plans sans annotation TypeScript (cause parsing SWC)
const PLANS = {
  FREE:       { label: 'Free',       color: '#4A6278', price: '$0',     limits: '1 projet - 10 MW' },
  TRIAL:      { label: 'Trial 14j',  color: '#38BDF8', price: '$0',     limits: 'Toutes features - 14 jours' },
  STARTER:    { label: 'Starter',    color: '#38BDF8', price: '$299',   limits: '5 projets - 50 MW - 2 users' },
  PRO:        { label: 'Pro',        color: '#00FF94', price: '$799',   limits: 'Illimite - Equipment API - AI' },
  ENTERPRISE: { label: 'Enterprise', color: '#A78BFA', price: 'Custom', limits: 'White-label - SSO - SLA 99.9%' },
};

const TABS = [
  { id: 'profile',  label: 'Profil' },
  { id: 'plan',     label: 'Plan' },
  { id: 'notifs',   label: 'Notifications' },
  { id: 'security', label: 'Securite' },
];

const iStyle = {
  width: '100%',
  background: '#0D1117',
  border: '1px solid #1E2D3D',
  borderRadius: 7,
  color: '#E8EFF6',
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
  display: 'block',
  marginBottom: 16,
};

const iStyleDisabled = {
  width: '100%',
  background: '#0D1117',
  border: '1px solid #1E2D3D',
  borderRadius: 7,
  color: '#4A6278',
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
  display: 'block',
  marginBottom: 16,
};

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
    Promise.all([
      fetchAuthJson('/auth/me'),
      fetchAuthJson('/notifications/preferences').catch(function() { return {}; }),
      fetchAuthJson('/2fa/status').catch(function() { return { enabled: false }; }),
    ]).then(function(results) {
      var u = results[0];
      var p = results[1];
      var t = results[2];
      setUser(u);
      setOrg(u.organization);
      setEditName(u.name || '');
      setPrefs(p || {});
      setTfa(t || { enabled: false });
    }).catch(function(e) { console.error(e); }).finally(function() { setLoading(false); });
  }, []);

  function flash(text, ok) {
    setMsg({ text: text, ok: ok !== false });
    setTimeout(function() { setMsg(null); }, 4000);
  }

  function saveProfile() {
    setSaving(true);
    fetchAuthJson('/auth/me', { method: 'PUT', body: JSON.stringify({ name: editName }) })
      .then(function() {
        setUser(function(u) { return Object.assign({}, u, { name: editName }); });
        flash('Profil mis a jour');
      })
      .catch(function(e) { flash(e.message, false); })
      .finally(function() { setSaving(false); });
  }

  function changePassword() {
    if (pwNew !== pwConfirm) { flash('Mots de passe differents', false); return; }
    if (pwNew.length < 8) { flash('Minimum 8 caracteres', false); return; }
    setSaving(true);
    fetchAuthJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }) })
      .then(function() {
        setPwCurrent(''); setPwNew(''); setPwConfirm('');
        flash('Mot de passe modifie');
      })
      .catch(function(e) { flash(e.message, false); })
      .finally(function() { setSaving(false); });
  }

  function savePref(key, val) {
    var next = Object.assign({}, prefs, { [key]: val });
    setPrefs(next);
    fetchAuthJson('/notifications/preferences', { method: 'PUT', body: JSON.stringify(next) }).catch(function() {});
  }

  function setup2FA() {
    fetchAuthJson('/2fa/setup', { method: 'POST' })
      .then(function(d) { setTfaQR(d.qrCode); setTfaSecret(d.secret); setTfaStep('setup'); })
      .catch(function(e) { flash(e.message, false); });
  }

  function verify2FA() {
    fetchAuthJson('/2fa/verify', { method: 'POST', body: JSON.stringify({ code: tfaCode }) })
      .then(function(d) {
        setBackupCodes(d.backupCodes || []);
        setTfa({ enabled: true });
        setTfaStep('backup');
        setTfaCode('');
        flash('2FA active');
      })
      .catch(function(e) { flash(e.message, false); });
  }

  function disable2FA() {
    fetchAuthJson('/2fa/disable', { method: 'DELETE', body: JSON.stringify({ code: tfaCode }) })
      .then(function() { setTfa({ enabled: false }); setTfaStep('idle'); setTfaCode(''); flash('2FA desactive'); })
      .catch(function(e) { flash(e.message, false); });
  }

  var planInfo = PLANS[org && org.plan] || PLANS.FREE;

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
        {TABS.map(function(t) {
          return (
            <button key={t.id} onClick={function() { setTab(t.id); }}
              style={{ flex: 1, padding: 8, borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, background: tab === t.id ? '#1E2D3D' : 'transparent', color: tab === t.id ? '#E8EFF6' : '#4A6278' }}>
              {t.label}
            </button>
          );
        })}
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
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#00FF94' }}>
                  {user && user.name && user.name[0] ? user.name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#E8EFF6' }}>{user && user.name}</div>
                  <div style={{ fontSize: 12, color: '#4A6278', marginTop: 2 }}>{user && user.role}</div>
                </div>
              </div>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>NOM</label>
              <input value={editName} onChange={function(e) { setEditName(e.target.value); }} style={iStyle} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>EMAIL</label>
              <input value={user ? user.email || '' : ''} disabled style={iStyleDisabled} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>ROLE</label>
              <input value={user ? user.role || '' : ''} disabled style={iStyleDisabled} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>ORGANISATION</label>
              <input value={org ? org.name || '---' : '---'} disabled style={iStyleDisabled} />
              <button onClick={saveProfile} disabled={saving}
                style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
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
            </div>
          )}

          {tab === 'notifs' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 18 }}>Notifications</div>
              {[
                { key: 'email_alerts',          label: 'Alertes email' },
                { key: 'weekly_digest',         label: 'Digest hebdomadaire' },
                { key: 'production_drops',      label: 'Chutes de production' },
                { key: 'credit_milestones',     label: 'Jalons credits' },
                { key: 'availability_warnings', label: 'Alertes disponibilite' },
              ].map(function(p) {
                return (
                  <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                    <span style={{ fontSize: 13, color: '#E8EFF6' }}>{p.label}</span>
                    <div onClick={function() { savePref(p.key, !prefs[p.key]); }}
                      style={{ width: 44, height: 24, background: prefs[p.key] ? '#00FF94' : '#1E2D3D', borderRadius: 12, cursor: 'pointer', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 2, left: prefs[p.key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'security' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Authentification 2FA</div>
              <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: 18, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: tfa.enabled ? '#00FF94' : '#FCD34D', marginBottom: 8 }}>
                  {tfa.enabled ? 'Protege par 2FA' : 'Non protege'}
                </div>
                {!tfa.enabled && tfaStep === 'idle' && (
                  <button onClick={setup2FA} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Activer 2FA
                  </button>
                )}
                {tfaStep === 'setup' && tfaQR && (
                  <div style={{ marginTop: 12 }}>
                    <img src={tfaQR} alt="QR 2FA" style={{ width: 150, height: 150, borderRadius: 8, marginBottom: 10 }} />
                    <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 8 }}>Cle: {tfaSecret}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={tfaCode} onChange={function(e) { setTfaCode(e.target.value.slice(0, 6)); }} placeholder="000000" maxLength={6}
                        style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: 10, fontSize: 20, textAlign: 'center', outline: 'none' }} />
                      <button onClick={verify2FA} disabled={tfaCode.length !== 6}
                        style={{ background: tfaCode.length === 6 ? '#00FF94' : '#1E2D3D', color: '#080B0F', border: 'none', borderRadius: 7, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>
                        OK
                      </button>
                    </div>
                  </div>
                )}
                {tfaStep === 'backup' && backupCodes.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: '#FCD34D', marginBottom: 8 }}>Sauvegardez ces codes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                      {backupCodes.map(function(code, i) {
                        return <div key={i} style={{ background: '#0D1117', borderRadius: 5, padding: '5px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#E8EFF6', textAlign: 'center' }}>{code}</div>;
                      })}
                    </div>
                    <button onClick={function() { setTfaStep('idle'); }} style={{ background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                      Termine
                    </button>
                  </div>
                )}
                {tfa.enabled && tfaStep === 'idle' && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <input value={tfaCode} onChange={function(e) { setTfaCode(e.target.value.slice(0, 6)); }} placeholder="Code pour desactiver"
                      style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                    <button onClick={disable2FA} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#F87171', padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>
                      Desactiver
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6', marginBottom: 14 }}>Mot de passe</div>
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>ACTUEL</label>
              <input type="password" value={pwCurrent} onChange={function(e) { setPwCurrent(e.target.value); }} style={iStyle} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>NOUVEAU</label>
              <input type="password" value={pwNew} onChange={function(e) { setPwNew(e.target.value); }} style={iStyle} />
              <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 5 }}>CONFIRMER</label>
              <input type="password" value={pwConfirm} onChange={function(e) { setPwConfirm(e.target.value); }} style={iStyle} />
              <button onClick={changePassword} disabled={saving}
                style={{ background: '#F87171', color: '#080B0F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {saving ? '...' : 'Modifier'}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  </div>
  );
}

export default AccountPage;
