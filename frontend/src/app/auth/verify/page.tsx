'use client';
import { useLang } from '@/lib/lang-context';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid link — missing token.'); return; }

    fetch(""+(API)+"/auth/verify?token="+(token)+"")
      .then(r => r.json())
      .then(data => {
        if (data.success && data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          setStatus('success');
          setMessage(data.message);
          // Countdown redirect
          let t = 5;
          const interval = setInterval(() => {
            t--;
            setCountdown(t);
            if (t === 0) { clearInterval(interval); router.push('/dashboard'); }
          }, 1000);
        } else {
          setStatus('error');
          setMessage(data.error || data.message || 'Erreur de vérification.');
        }
      })
      .catch(() => { setStatus('error'); setMessage('Network error. Please try again.'); });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⬡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#E8EFF6' }}>PANGEA CARBON</span>
          </div>
        </div>

        <div style={{ background: '#121920', border: '1px solid #1E2D3D', borderRadius: 14, padding: 40 }}>
          {status === 'verifying' && (
            <>
              <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }}/>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#E8EFF6', fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Verification en cours...</div>
              <div style={{ fontSize: 13, color: '#4A6278' }}>Activation de votre compte PANGEA CARBON</div>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,255,148,0.15)', border: '2px solid rgba(0,255,148,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00FF94', fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Email vérifié !</div>
              <div style={{ fontSize: 14, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 24 }}>{message}</div>
              <div style={{ background: '#0D1117', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#4A6278' }}>Redirection vers le dashboard dans</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#00FF94', fontFamily: 'Syne, sans-serif' }}>{countdown}s</div>
              </div>
              <a href="/dashboard" style={{ display: 'block', background: '#00FF94', color: '#080B0F', borderRadius: 8, padding: '12px', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                Accéder au dashboard →
              </a>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', border: '2px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: '#F87171' }}>✗</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F87171', fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Lien invalide</div>
              <div style={{ fontSize: 14, color: '#8FA3B8', lineHeight: 1.7, marginBottom: 24 }}>{message}</div>
              <ResendForm />
              <a href="/auth/login" style={{ display: 'block', marginTop: 12, fontSize: 13, color: '#4A6278', textDecoration: 'none' }}>
                ← Back to login
              </a>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ResendForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSent(true);
    } finally { setLoading(false); }
  };

  if (sent) return (
    <div style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 8, padding: '12px', fontSize: 13, color: '#00FF94' }}>
      ✓ Email renvoyé à {email}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: '#4A6278', marginBottom: 8 }}>Renvoyer un nouveau lien de vérification</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)}
          style={{ flex: 1, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: '#E8EFF6', padding: '9px 12px', fontSize: 13, outline: 'none' }}/>
        <button onClick={resend} disabled={loading || !email}
          style={{ background: '#1E2D3D', color: '#8FA3B8', border: 'none', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', fontSize: 12 }}>
          {loading ? '...' : 'Renvoyer'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  return <Suspense fallback={null}><VerifyEmailInner /></Suspense>;
}