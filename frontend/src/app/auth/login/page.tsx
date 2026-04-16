'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useRef } from 'react';
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
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const inp = (id) => ({
    background: C.card2,
    border: '1px solid ' + (focusedField === id ? C.green : C.border),
    borderRadius: 9, color: C.text, padding: '13px 15px', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color .15s', fontFamily: 'system-ui, sans-serif',
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setError(lang==='fr'?'Veuillez saisir votre email et mot de passe.':'Please enter your email and password.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (lang==='fr'?'Identifiants invalides.':'Invalid credentials.'));
        return;
      }
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else if (data.requiresMFA && data.preAuthToken) {
        setPreAuthToken(data.preAuthToken);
        setOtpStep(true);
      } else {
        setError(lang==='fr'?'Reponse inattendue. Reessayez.':'Unexpected response. Please try again.');
      }
    } catch(e) {
      setError(lang==='fr'?'Erreur de connexion.':'Connection error.');
    } finally { setLoading(false); }
  };

  const handleOtp = async () => {
    if (!otp || otp.length < 4) {
      setError(lang==='fr'?'Entrez le code a 6 chiffres recu par email.':'Enter the 6-digit code from your email.');
      return;
    }
    setOtpLoading(true); setError('');
    try {
      const res = await fetch(API + '/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken, code: otp, method: 'email_otp' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (lang==='fr'?'Code invalide. Reessayez.':'Invalid code. Try again.'));
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch(e) {
      setError(lang==='fr'?'Erreur de connexion.':'Connection error.');
    } finally { setOtpLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'system-ui, sans-serif' }}>
      {/* Lang toggle */}
      <div style={{ position:'fixed', top:16, right:16, display:'flex', gap:6 }}>
        {['fr','en'].map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid '+(lang===l?C.green:C.border),
              background: lang===l?'rgba(0,255,148,0.08)':'transparent',
              color: lang===l?C.green:C.muted, cursor:'pointer', fontSize:12, fontWeight:700,
              textTransform:'uppercase', transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, background:'linear-gradient(135deg,#00FF94,#38BDF8)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#080B0F' }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontWeight:900, fontSize:20, color:C.text, letterSpacing:'0.04em' }}>PANGEA CARBON</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em' }}>
            {L('AFRICA MRV PLATFORM · SECURE ACCESS', 'PLATEFORME MRV AFRIQUE · ACCES SECURISE')}
          </div>
        </div>

        {/* Card */}
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, overflow:'hidden' }}>
          <div style={{ height:3, background:'linear-gradient(90deg,'+C.green+','+C.blue+')', borderRadius:'3px 3px 0 0' }}/>
          <div style={{ padding:28 }}>

            {!otpStep ? (
              <>
                <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:C.text, margin:'0 0 6px' }}>
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
                  <input
                    type="email" value={email} placeholder={L('you@company.com','vous@entreprise.com')}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('')}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={inp('email')}
                    autoComplete="email"
                  />
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
                    <input
                      type={showPw ? 'text' : 'password'} value={password} placeholder="••••••••"
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('pw')}
                      onBlur={() => setFocusedField('')}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      style={inp('pw')}
                      autoComplete="current-password"
                    />
                    <button onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:15 }}>
                      {showPw ? '👁' : '👁'}
                    </button>
                  </div>
                </div>

                <button onClick={handleLogin} disabled={loading}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:loading?0.7:1, transition:'opacity .15s' }}>
                  {loading ? L('Signing in...', 'Connexion...') : L('Sign in', 'Se connecter')}
                </button>

                <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:C.muted }}>
                  {L("Don't have an account?", "Pas encore de compte ?")}
                  {' '}
                  <Link href="/signup" style={{ color:C.green, textDecoration:'none', fontWeight:600 }}>
                    {L('Get started', 'Commencer')}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ width:52, height:52, background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.25)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 14px' }}>
                    🔐
                  </div>
                  <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:19, color:C.text, margin:'0 0 6px' }}>
                    {L('Verification code', 'Code de verification')}
                  </h1>
                  <p style={{ fontSize:13, color:C.muted }}>
                    {L('Check your email for the 6-digit code.', 'Verifiez votre email pour le code a 6 chiffres.')}
                  </p>
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:16, color:C.red, fontSize:13 }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom:20 }}>
                  <input
                    type="text" value={otp} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                    onKeyDown={e => e.key === 'Enter' && handleOtp()}
                    style={{ ...inp('otp'), fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'0.5em', fontFamily:'JetBrains Mono, monospace' }}
                  />
                </div>

                <button onClick={handleOtp} disabled={otpLoading || otp.length < 4}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:(otpLoading||otp.length<4)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(otpLoading||otp.length<4)?0.6:1 }}>
                  {otpLoading ? L('Verifying...', 'Verification...') : L('Verify & Sign in', 'Verifier et se connecter')}
                </button>

                <button onClick={() => { setOtpStep(false); setOtp(''); setError(''); }}
                  style={{ width:'100%', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:13, marginTop:14, padding:'8px 0' }}>
                  ← {L('Back to login', 'Retour a la connexion')}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em' }}>
          PANGEA CARBON · {L('AFRICAN MRV PLATFORM', 'PLATEFORME MRV AFRICAINE')} · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
