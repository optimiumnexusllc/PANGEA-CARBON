'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingVerif, setPendingVerif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setPendingVerif(false);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.pendingVerification) {
          setPendingVerif(true);
          setError(data.message || 'Email non vérifié. Consultez votre boîte mail.');
        } else {
          setError(data.error || 'Identifiants invalides');
        }
        return;
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setResent(true);
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#080B0F' }}>
      <div className="absolute inset-0 bg-grid-dark opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,255,148,0.04) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#00FF94" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </Link>
          <p className="text-sm" style={{ color: '#4A6278' }}>Carbon Credit Intelligence · Africa</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 20, color: '#E8EFF6', marginBottom: 4 }}>Connexion</h1>
          <p className="text-sm mb-6" style={{ color: '#4A6278' }}>Accès sécurisé à la plateforme MRV</p>

          {error && (
            <div style={{ background: pendingVerif ? 'rgba(56,189,248,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${pendingVerif ? 'rgba(56,189,248,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: 7, padding: '10px 14px', marginBottom: 16, fontSize: 13,
              color: pendingVerif ? '#38BDF8' : '#F87171' }}>
              <div>{error}</div>
              {pendingVerif && !resent && (
                <button onClick={resendVerification} disabled={resending}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#00FF94', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}>
                  {resending ? 'Envoi...' : '→ Renvoyer l\'email de vérification'}
                </button>
              )}
              {resent && <div style={{ marginTop: 6, color: '#00FF94', fontSize: 12 }}>✓ Email renvoyé !</div>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', fontSize: 10 }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark" placeholder="nom@organisation.com" required autoComplete="email"/>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', fontSize: 10 }}>MOT DE PASSE</label>
                <a href="/auth/forgot-password" style={{ fontSize: 11, color: '#4A6278', textDecoration: 'none' }}>Mot de passe oublié ?</a>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-dark" placeholder="••••••••" required autoComplete="current-password"/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
              style={{ width: '100%', opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/>
                  </svg>
                  Authentification...
                </span>
              ) : 'Accéder à la plateforme →'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1E2D3D', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#4A6278' }}>Pas encore de compte ? </span>
            <a href="/signup" style={{ fontSize: 13, color: '#00FF94', textDecoration: 'none', fontWeight: 600 }}>
              S'inscrire gratuitement →
            </a>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#2A3F55' }}>
          PANGEA CARBON Africa v1.0 · Verra ACM0002 · Gold Standard
        </p>
      </div>
    </div>
  );
}
