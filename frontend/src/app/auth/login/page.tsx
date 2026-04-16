'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', blue:'#38BDF8', purple:'#A78BFA',
  yellow:'#FCD34D', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

export default function LoginPage() {
  const { lang, setLang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState('');

  // MFA state
  const [mfaStep, setMfaStep] = useState<'none'|'totp'|'email_otp'>('none');
  const [code, setCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  const inp = (id: string) => ({
    background: C.card2,
    border: '1px solid ' + (focused === id ? C.green : C.border),
    borderRadius: 9, color: C.text, padding: '13px 15px', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color .15s',
  });

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(lang === 'fr' ? 'Email et mot de passe requis.' : 'Email and password required.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (lang === 'fr' ? 'Identifiants invalides.' : 'Invalid credentials.'));
        return;
      }
      // Login direct sans MFA
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
        return;
      }
      // MFA requis
      if (data.requiresMFA && data.preAuthToken) {
        setPreAuthToken(data.preAuthToken);
        setMaskedEmail(data.user?.email || email);
        if (data.hasTOTP) {
          setMfaStep('totp');
        } else {
          setMfaStep('email_otp');
        }
        return;
      }
      setError(lang === 'fr' ? 'Reponse inattendue. Reessayez.' : 'Unexpected response. Please try again.');
    } catch {
      setError(lang === 'fr' ? 'Erreur de connexion.' : 'Connection error.');
    } finally { setLoading(false); }
  };

  const handleMFA = async () => {
    if (!code || code.length < 4) {
      setError(lang === 'fr' ? 'Entrez le code complet.' : 'Enter the full code.');
      return;
    }
    setMfaLoading(true); setError('');
    try {
      const method = mfaStep === 'totp' ? 'totp' : 'email_otp';
      const res = await fetch(API + '/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken, code, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (lang === 'fr' ? 'Code invalide. Reessayez.' : 'Invalid code. Try again.'));
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError(lang === 'fr' ? 'Erreur de connexion.' : 'Connection error.');
    } finally { setMfaLoading(false); }
  };

  const reset = () => { setMfaStep('none'); setCode(''); setError(''); };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'system-ui, sans-serif' }}>

      {/* Lang toggle */}
      <div style={{ position:'fixed', top:16, right:16, display:'flex', gap:6, zIndex:10 }}>
        {['fr','en'].map((l: string) => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid '+(lang===l?C.green:C.border),
              background: lang===l?'rgba(0,255,148,0.08)':'transparent',
              color: lang===l?C.green:C.muted, cursor:'pointer', fontSize:12, fontWeight:700 }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:38, height:38, background:'linear-gradient(135deg,#00FF94,#38BDF8)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#080B0F' }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontWeight:900, fontSize:21, color:C.text, letterSpacing:'0.04em' }}>PANGEA CARBON</span>
          </div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em' }}>
            {L('AFRICA MRV PLATFORM · SECURE ACCESS', 'PLATEFORME MRV AFRIQUE · ACCES SECURISE')}
          </div>
        </div>

        {/* Card */}
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, overflow:'hidden' }}>
          <div style={{ height:3, background:'linear-gradient(90deg,'+C.green+','+C.blue+')' }}/>
          <div style={{ padding:28 }}>

            {/* ── STEP 1: EMAIL + PASSWORD ─────────────────── */}
            {mfaStep === 'none' && (
              <>
                <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:C.text, margin:'0 0 4px' }}>
                  {L('Sign in', 'Connexion')}
                </h1>
                <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>
                  {L('Access your carbon portfolio', 'Accedez a votre portefeuille carbone')}
                </p>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:16, color:C.red, fontSize:13 }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.10em', display:'block', marginBottom:7 }}>
                    {L('EMAIL ADDRESS', 'ADRESSE EMAIL')}
                  </label>
                  <input type="email" value={email}
                    placeholder={L('you@company.com','vous@entreprise.com')}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                    onKeyDown={e => e.key==='Enter' && handleLogin()}
                    style={inp('email')} autoComplete="email"/>
                </div>

                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                    <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.10em' }}>
                      {L('PASSWORD', 'MOT DE PASSE')}
                    </label>
                    <Link href="/auth/forgot-password" style={{ fontSize:11, color:C.blue, textDecoration:'none' }}>
                      {L('Forgot password?', 'Mot de passe oublie ?')}
                    </Link>
                  </div>
                  <div style={{ position:'relative' }}>
                    <input type={showPw?'text':'password'} value={password} placeholder="••••••••"
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                      onKeyDown={e => e.key==='Enter' && handleLogin()}
                      style={inp('pw')} autoComplete="current-password"/>
                    <button onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:14, padding:0 }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button onClick={handleLogin} disabled={loading}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:loading?0.7:1 }}>
                  {loading ? L('Signing in...','Connexion en cours...') : L('Sign in','Se connecter')}
                </button>

                <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.muted }}>
                  {L("Don't have an account?", "Pas de compte ?")}
                  {' '}
                  <Link href="/signup" style={{ color:C.green, textDecoration:'none', fontWeight:600 }}>
                    {L('Get started','Commencer')}
                  </Link>
                </div>
              </>
            )}

            {/* ── STEP 2A: TOTP AUTHENTICATOR ──────────────── */}
            {mfaStep === 'totp' && (
              <>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                  <div style={{ width:54, height:54, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 12px' }}>
                    🔐
                  </div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:19, color:C.text, margin:'0 0 6px' }}>
                    {L('Authenticator Code', 'Code Authentificateur')}
                  </h2>
                  <p style={{ fontSize:13, color:C.muted }}>
                    {L('Enter the 6-digit code from your authenticator app (Google Authenticator, Authy...)',
                       'Entrez le code a 6 chiffres de votre application authentificateur (Google Authenticator, Authy...)')}
                  </p>
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13 }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom:20 }}>
                  <input type="text" value={code} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    onKeyDown={e => e.key==='Enter' && handleMFA()}
                    style={{ ...inp('totp'), fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:'0.5em', fontFamily:'JetBrains Mono, monospace' }}/>
                  <div style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:8, fontFamily:'JetBrains Mono, monospace' }}>
                    {L('TOTP · 30s refresh · Google Authenticator / Authy', 'TOTP · Rafraichi toutes 30s')}
                  </div>
                </div>

                <button onClick={handleMFA} disabled={mfaLoading || code.length < 6}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.purple+',#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:(mfaLoading||code.length<6)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(mfaLoading||code.length<6)?0.6:1 }}>
                  {mfaLoading ? L('Verifying...','Verification...') : L('Verify & Sign in','Verifier et acceder')}
                </button>

                <button onClick={reset}
                  style={{ width:'100%', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:13, marginTop:12, padding:'8px 0' }}>
                  ← {L('Back to login','Retour a la connexion')}
                </button>
              </>
            )}

            {/* ── STEP 2B: EMAIL OTP ───────────────────────── */}
            {mfaStep === 'email_otp' && (
              <>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                  <div style={{ width:54, height:54, background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.25)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 12px' }}>
                    📧
                  </div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:19, color:C.text, margin:'0 0 6px' }}>
                    {L('Email Verification', 'Verification par Email')}
                  </h2>
                  <p style={{ fontSize:13, color:C.muted }}>
                    {L('A 6-digit code was sent to', 'Un code a 6 chiffres a ete envoye a')}
                    <br/>
                    <strong style={{ color:C.text }}>{maskedEmail}</strong>
                  </p>
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13 }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom:20 }}>
                  <input type="text" value={code} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    onKeyDown={e => e.key==='Enter' && handleMFA()}
                    style={{ ...inp('otp'), fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:'0.5em', fontFamily:'JetBrains Mono, monospace' }}/>
                  <div style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:8 }}>
                    {L('Valid for 5 minutes · Check spam if not received','Valide 5 min · Verifiez vos spams si non recu')}
                  </div>
                </div>

                <button onClick={handleMFA} disabled={mfaLoading || code.length < 4}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:(mfaLoading||code.length<4)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(mfaLoading||code.length<4)?0.6:1 }}>
                  {mfaLoading ? L('Verifying...','Verification...') : L('Verify & Sign in','Verifier et acceder')}
                </button>

                <button onClick={reset}
                  style={{ width:'100%', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:13, marginTop:12, padding:'8px 0' }}>
                  ← {L('Back to login','Retour a la connexion')}
                </button>
              </>
            )}

          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:18, fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em' }}>
          PANGEA CARBON · {L('AFRICAN MRV PLATFORM','PLATEFORME MRV AFRICAINE')} · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
