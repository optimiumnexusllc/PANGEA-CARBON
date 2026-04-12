'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { user, accessToken, refreshToken } = await api.login(email, password);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#080B0F' }}>
      {/* Grid bg */}
      <div className="absolute inset-0 bg-grid-dark opacity-30" />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,255,148,0.04) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#00FF94" strokeWidth="1.5" fill="none"/>
                <path d="M8 5L11 6.8V10.2L8 12L5 10.2V6.8L8 5Z" fill="#00FF94" fillOpacity="0.3"/>
              </svg>
            </div>
            <span className="font-display text-lg font-700" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
              PANGEA CARBON
            </span>
          </div>
          <p className="text-sm" style={{ color: '#4A6278' }}>Carbon Credit Intelligence · Africa</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px' }}>
          <h1 className="font-display text-xl mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
            Connexion
          </h1>
          <p className="text-sm mb-6" style={{ color: '#4A6278' }}>Accès sécurisé à la plateforme MRV</p>

          {error && (
            <div className="badge-danger badge mb-4 w-full justify-center" style={{ padding: '8px 12px', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                EMAIL
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark" placeholder="nom@organisation.com" required autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-mono mb-1.5 block" style={{ color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
                MOT DE PASSE
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-dark" placeholder="••••••••" required autoComplete="current-password"
              />
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
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#2A3F55' }}>
          PANGEA CARBON Africa v1.0 · Verra ACM0002 · Gold Standard
        </p>
      </div>
    </div>
  );
}
