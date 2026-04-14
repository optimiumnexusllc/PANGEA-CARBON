'use client';
import { useLang } from '@/lib/lang-context';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid link — missing token.');
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Minimum 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/auth/login'), 3000);
      } else {
        setError(data.error || 'Reset error.');
      }
    } catch(_e) { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4 : 3;
  const strengthColors = ['', '#F87171', '#FCD34D', '#38BDF8', '#00FF94'];
  const strengthLabels = ['', 'Trop court', 'Faible', 'Correct', 'Fort'];

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⬡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </a>
        </div>

        <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 32 }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#00FF94', marginBottom: 10 }}>Mot de passe réinitialisé !</h2>
              <p style={{ fontSize: 13, color: '#8FA3B8', marginBottom: 20 }}>Redirection vers la connexion dans 3 secondes...</p>
              <a href="/auth/login" style={{ display: 'block', background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '11px', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                Sign in →
              </a>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#E8EFF6', marginBottom: 6 }}>New password</h1>
              <p style={{ fontSize: 13, color: '#4A6278', marginBottom: 24 }}>Choisissez un mot de passe sécurisé pour votre compte.</p>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
                  ✗ {error}
                </div>
              )}

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const }}>NOUVEAU MOT DE PASSE</label>
                  <div style={{ position: 'relative' }}>
                    <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required autoFocus
                      placeholder="8 characters minimum"
                      style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '11px 40px 11px 14px', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,255,148,0.35)'}
                      onBlur={e => e.target.style.borderColor = '#1E2D3D'}/>
                    <button type="button" onClick={() => setShow(!show)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                      {show ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : '#1E2D3D', transition: 'all 0.2s' }}/>)}
                      </div>
                      <div style={{ fontSize: 11, color: strengthColors[strength] }}>{strengthLabels[strength]}</div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const }}>CONFIRMER LE MOT DE PASSE</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    placeholder="Répétez le mot de passe"
                    style={{ width: '100%', background: '#0D1117', border: `1px solid ${confirm && confirm !== password ? 'rgba(248,113,113,0.4)' : confirm && confirm === password ? 'rgba(0,255,148,0.35)' : '#1E2D3D'}`, borderRadius: 7, color: '#E8EFF6', padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' }}/>
                  {confirm && confirm === password && <div style={{ fontSize: 11, color: '#00FF94', marginTop: 4 }}>✓ Mots de passe identiques</div>}
                  {confirm && confirm !== password && <div style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>✗ Les mots de passe ne correspondent pas</div>}
                </div>

                <button type="submit" disabled={loading || !token || password.length < 8 || password !== confirm}
                  style={{ background: loading ? '#1E2D3D' : '#00FF94', color: loading ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: password !== confirm && confirm ? 0.5 : 1, transition: 'all 0.15s' }}>
                  {loading ? '⏳ Réinitialisation...' : '✓ Reset mon mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  return (
    <Suspense fallback={<div style={{ background: '#080B0F', minHeight: '100vh' }}/>}>
      <ResetPasswordInner/>
    </Suspense>
  );
}
