'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', blue:'#38BDF8', purple:'#A78BFA',
  muted:'#4A6278', text:'#E8EFF6',
};

type Step = 'login' | 'setup' | 'totp';

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

  const [step, setStep] = useState<Step>('login');
  const [totpCode, setTotpCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [userName, setUserName] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const fieldStyle = (id: string) => ({
    background: C.card2,
    border: '1px solid ' + (focused === id ? C.green : C.border),
    borderRadius: 9, color: C.text, padding: '13px 15px', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color .15s',
  });

  // ── STEP 1: Login ────────────────────────────────────────
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
      // Connexion directe (cas rare - compte admin sans MFA)
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
        setUserName(data.user?.name || '');
        if (data.setupRequired) {
          // Premier login - configurer le TOTP
          setQrCode(data.qrCode || '');
          setSecretKey(data.secret || '');
          setStep('setup');
        } else {
          // TOTP déjà configuré
          setStep('totp');
        }
        return;
      }
      setError(lang === 'fr' ? 'Reponse inattendue.' : 'Unexpected response. Try again.');
    } catch {
      setError(lang === 'fr' ? 'Erreur de connexion reseau.' : 'Network error. Check connection.');
    } finally { setLoading(false); }
  };

  // ── STEP 2 (setup ou totp): Vérifier le code TOTP ────────
  const handleTOTP = async (isSetup = false) => {
    if (!totpCode || totpCode.length < 6) {
      setError(lang === 'fr' ? 'Entrez le code 6 chiffres.' : 'Enter the 6-digit code.');
      return;
    }
    setMfaLoading(true); setError('');
    try {
      const res = await fetch(API + '/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken, code: totpCode, method: 'totp' }),
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

  const resetToLogin = () => { setStep('login'); setTotpCode(''); setError(''); setPassword(''); };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'system-ui, sans-serif' }}>

      {/* Lang toggle */}
      <div style={{ position:'fixed', top:16, right:16, display:'flex', gap:6, zIndex:10 }}>
        {(['fr','en'] as string[]).map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding:'5px 11px', borderRadius:6, border:'1px solid '+(lang===l?C.green:C.border),
              background: lang===l?'rgba(0,255,148,0.08)':'transparent',
              color: lang===l?C.green:C.muted, cursor:'pointer', fontSize:11, fontWeight:700 }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ width:'100%', maxWidth: step === 'setup' ? 480 : 420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:38, height:38, background:'linear-gradient(135deg,#00FF94,#38BDF8)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#080B0F' }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontWeight:900, fontSize:21, color:C.text, letterSpacing:'0.04em' }}>PANGEA CARBON</span>
          </div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em' }}>
            {L('AFRICA MRV PLATFORM · SECURE ACCESS', 'PLATEFORME MRV AFRIQUE · ACCES SECURISE')}
          </div>
        </div>

        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, overflow:'hidden' }}>
          <div style={{ height:3, background:'linear-gradient(90deg,'+C.green+','+C.blue+')' }}/>
          <div style={{ padding:28 }}>

            {/* ═══════════════════════════════════════════════ */}
            {/* ÉTAPE 1 — EMAIL + PASSWORD                      */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 'login' && (
              <>
                <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:C.text, margin:'0 0 4px' }}>
                  {L('Sign in', 'Connexion')}
                </h1>
                <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>
                  {L('Secure access — TOTP required for all accounts', 'Acces securise — TOTP obligatoire pour tous les comptes')}
                </p>

                {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:16, color:C.red, fontSize:13 }}>{error}</div>}

                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.10em', display:'block', marginBottom:7 }}>
                    {L('EMAIL ADDRESS', 'ADRESSE EMAIL')}
                  </label>
                  <input type="email" value={email} placeholder={L('you@company.com','vous@societe.com')}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                    onKeyDown={e => e.key==='Enter' && handleLogin()}
                    style={fieldStyle('email')} autoComplete="email"/>
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
                      style={fieldStyle('pw')} autoComplete="current-password"/>
                    <button onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:14, padding:0 }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button onClick={handleLogin} disabled={loading}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:loading?0.7:1 }}>
                  {loading ? L('Verifying...','Verification...') : L('Sign in','Se connecter')}
                </button>

                <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:C.muted }}>
                  {L("Don't have an account?", "Pas de compte ?")}
                  {' '}<Link href="/signup" style={{ color:C.green, textDecoration:'none', fontWeight:600 }}>{L('Get started','Commencer')}</Link>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ÉTAPE 2A — SETUP TOTP (premier login)           */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 'setup' && (
              <>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ display:'inline-block', background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:10, padding:'6px 14px', fontSize:10, color:C.green, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:12 }}>
                    {L('FIRST CONNECTION · TOTP SETUP', 'PREMIERE CONNEXION · CONFIGURATION TOTP')}
                  </div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18, color:C.text, margin:'0 0 8px' }}>
                    {L('Configure your Authenticator', 'Configurez votre Authentificateur')}
                  </h2>
                  <p style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
                    {L('Scan this QR code with Google Authenticator or Authy, then enter the 6-digit code to activate.',
                       'Scannez ce QR code avec Google Authenticator ou Authy, puis entrez le code a 6 chiffres pour activer.')}
                  </p>
                </div>

                {/* QR Code */}
                {qrCode && (
                  <div style={{ textAlign:'center', marginBottom:16 }}>
                    <div style={{ display:'inline-block', background:'#fff', padding:12, borderRadius:12, marginBottom:10 }}>
                      <img src={qrCode} alt="QR Code TOTP" width={180} height={180} style={{ display:'block' }}/>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>
                      {L('Manual entry key:', 'Cle de saisie manuelle :')}
                    </div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:C.text, background:C.card2, border:'1px solid '+C.border, borderRadius:7, padding:'6px 12px', display:'inline-block', letterSpacing:'0.15em', wordBreak:'break-all' }}>
                      {secretKey}
                    </div>
                  </div>
                )}

                <div style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.15)', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:12, color:C.muted }}>
                  <div style={{ color:C.green, fontWeight:700, marginBottom:4, fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>
                    {L('HOW TO SETUP', 'COMMENT CONFIGURER')}
                  </div>
                  <div>1. {L('Open Google Authenticator or Authy on your phone', 'Ouvrez Google Authenticator ou Authy sur votre telephone')}</div>
                  <div>2. {L('Tap "+" then "Scan QR code"', 'Appuyez sur "+" puis "Scanner un code QR"')}</div>
                  <div>3. {L('Scan the code above — PANGEA CARBON will appear', 'Scannez le code — PANGEA CARBON apparaitra')}</div>
                  <div>4. {L('Enter the 6-digit code shown in the app below', 'Entrez ci-dessous le code a 6 chiffres affiche')}</div>
                </div>

                {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13 }}>{error}</div>}

                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.10em', display:'block', marginBottom:7 }}>
                    {L('6-DIGIT CODE FROM YOUR APP', 'CODE 6 CHIFFRES DE L APP')}
                  </label>
                  <input type="text" value={totpCode} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
                    onKeyDown={e => e.key==='Enter' && handleTOTP(true)}
                    style={{ ...fieldStyle('setup-totp'), fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'0.4em', fontFamily:'JetBrains Mono, monospace' }}/>
                </div>

                <button onClick={() => handleTOTP(true)} disabled={mfaLoading || totpCode.length < 6}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:(mfaLoading||totpCode.length<6)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(mfaLoading||totpCode.length<6)?0.6:1 }}>
                  {mfaLoading ? L('Activating...','Activation...') : L('Activate TOTP & Sign in','Activer TOTP et se connecter')}
                </button>

                <button onClick={resetToLogin}
                  style={{ width:'100%', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:12, marginTop:10, padding:'6px 0' }}>
                  ← {L('Back','Retour')}
                </button>
              </>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ÉTAPE 2B — TOTP CODE (connexions suivantes)     */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 'totp' && (
              <>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                  <div style={{ width:56, height:56, background:'rgba(167,139,250,0.1)', border:'2px solid rgba(167,139,250,0.3)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 12px' }}>🔐</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:19, color:C.text, margin:'0 0 6px' }}>
                    {L('Authenticator Code', 'Code Authentificateur')}
                  </h2>
                  {userName && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>{userName}</div>}
                  <p style={{ fontSize:12, color:C.muted }}>
                    {L('Enter the 6-digit code from Google Authenticator or Authy',
                       'Entrez le code a 6 chiffres de Google Authenticator ou Authy')}
                  </p>
                </div>

                {error && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13 }}>{error}</div>}

                <div style={{ marginBottom:20 }}>
                  <input type="text" value={totpCode} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setTotpCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
                    onKeyDown={e => e.key==='Enter' && handleTOTP(false)}
                    style={{ ...fieldStyle('totp'), fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:'0.5em', fontFamily:'JetBrains Mono, monospace' }}/>
                  <div style={{ fontSize:10, color:C.muted, textAlign:'center', marginTop:8, fontFamily:'JetBrains Mono, monospace' }}>
                    TOTP · {L('Refreshes every 30 seconds', 'Se rafraichit toutes les 30 secondes')}
                  </div>
                </div>

                <button onClick={() => handleTOTP(false)} disabled={mfaLoading || totpCode.length < 6}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.purple+',#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:(mfaLoading||totpCode.length<6)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(mfaLoading||totpCode.length<6)?0.6:1 }}>
                  {mfaLoading ? L('Verifying...','Verification...') : L('Verify & Enter','Verifier et entrer')}
                </button>

                <button onClick={resetToLogin}
                  style={{ width:'100%', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:12, marginTop:10, padding:'6px 0' }}>
                  ← {L('Back to login','Retour a la connexion')}
                </button>
              </>
            )}

          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em' }}>
          PANGEA CARBON · {L('AFRICAN MRV PLATFORM','PLATEFORME MRV AFRICAINE')} · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
