'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else { const d = await res.json(); setError(d.error || 'Erreur'); }
    } catch(_e) { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⬡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </a>
        </div>

        <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#E8EFF6', marginBottom: 12 }}>Email envoyé !</h2>
              <p style={{ fontSize: 14, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 20 }}>
                Si <strong style={{ color: '#00FF94' }}>{email}</strong> est associé à un compte, vous recevrez un lien de réinitialisation valable <strong style={{ color: '#E8EFF6' }}>1 heure</strong>.
              </p>
              <div style={{ fontSize: 12, color: '#4A6278', marginBottom: 20 }}>Vérifiez vos spams si vous ne voyez rien.</div>
              <a href="/auth/login" style={{ display: 'block', background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '11px', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                ← Back to login
              </a>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#E8EFF6', marginBottom: 6 }}>Forgot password</h1>
              <p style={{ fontSize: 13, color: '#4A6278', marginBottom: 24 }}>Entrez votre email pour recevoir un lien de réinitialisation.</p>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
                  {error}
                </div>
              )}

              <form onSubmit={submit}>
                <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const }}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                  placeholder="votre@email.com"
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '11px 14px', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none', marginBottom: 20 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,255,148,0.35)'}
                  onBlur={e => e.target.style.borderColor = '#1E2D3D'}/>
                <button type="submit" disabled={loading || !email}
                  style={{ width: '100%', background: loading ? '#1E2D3D' : '#00FF94', color: loading ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer' }}>
                  {loading ? 'Sending...' : 'Send reset link →'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <a href="/auth/login" style={{ fontSize: 13, color: '#4A6278', textDecoration: 'none' }}>← Back to login</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
