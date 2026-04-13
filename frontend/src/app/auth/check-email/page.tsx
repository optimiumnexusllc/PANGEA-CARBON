'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CheckEmailPage() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setResent(true);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⬡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </div>
        </div>

        <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: '36px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: '0 0 12px' }}>
            Vérifiez votre email
          </h1>
          <p style={{ fontSize: 14, color: '#8FA3B8', lineHeight: 1.7, margin: '0 0 24px' }}>
            Un email de vérification a été envoyé à<br/>
            <strong style={{ color: '#00FF94' }}>{email || 'votre adresse email'}</strong>
          </p>

          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, padding: 20, marginBottom: 24, textAlign: 'left' }}>
            {[
              ['1.', 'Ouvrez votre boîte email'],
              ['2.', 'Cliquez sur "Activer mon compte"'],
              ['3.', 'Accédez à votre dashboard PANGEA CARBON'],
            ].map(([num, text]) => (
              <div key={num} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', color: '#00FF94', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                <span style={{ color: '#8FA3B8' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Notification admin */}
          <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#38BDF8', textAlign: 'left' }}>
            ℹ️ L'équipe PANGEA CARBON a également été notifiée de votre inscription.
          </div>

          {resent ? (
            <div style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 8, padding: '10px', fontSize: 13, color: '#00FF94', marginBottom: 16 }}>
              ✓ Email renvoyé avec succès
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#4A6278', marginBottom: 16 }}>
              Pas reçu l'email ?{' '}
              <button onClick={resend} disabled={loading}
                style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                {loading ? 'Envoi...' : 'Renvoyer'}
              </button>
            </div>
          )}

          <div style={{ fontSize: 12, color: '#2A3F55' }}>
            Le lien expire dans 24 heures · Vérifiez vos spams
          </div>
        </div>

        <a href="/auth/login" style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: '#4A6278', textDecoration: 'none' }}>
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}
