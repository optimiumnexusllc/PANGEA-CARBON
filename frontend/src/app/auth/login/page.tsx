'use client';
import { useLang } from '@/lib/lang-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', blue:'#38BDF8', purple:'#A78BFA',
  muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

type Step = 'credentials' | 'otp';

export default function LoginPage() {
  const { lang, setLang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;
  const router = useRouter();

  // Étape 1
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  // Étape 2
  const [step, setStep]               = useState<Step>('credentials');
  const [otp, setOtp]                 = useState('');
  const [preAuthToken, setPreAuth]    = useState('');
  const [maskedEmail, setMasked]      = useState('');
  const [expiresIn, setExpires]       = useState(10);
  const [verifying, setVerifying]     = useState(false);
  const [resending, setResending]     = useState(false);

  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState('');

  const field = (id: string) => ({
    background: C.card2,
    border: '1px solid ' + (focused === id ? C.green : C.border),
    borderRadius: 9, color: C.text, padding: '13px 15px', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color .15s',
  });

  // ── Étape 1: valider identifiants → recevoir OTP ────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(L('Email and password are required.', 'Email et mot de passe requis.'));
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, lang }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.smtpError) {
          setError(L(
            'Cannot send OTP code. SMTP not configured. Contact your administrator.',
            'Impossible d envoyer le code OTP. SMTP non configure. Contactez votre administrateur.'
          ));
        } else {
          setError(data.error || L('Invalid credentials.', 'Identifiants invalides.'));
        }
        return;
      }

      // Accès direct (cas exceptionnel)
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
        return;
      }

      // OTP envoyé → passer à l'étape 2
      if (data.requiresMFA && data.preAuthToken) {
        setPreAuth(data.preAuthToken);
        setMasked(data.maskedEmail || data.user?.email || email);
        setExpires(data.expiresInMinutes || 10);
        setStep('otp');
        setSuccess(L('Code sent!', 'Code envoye !'));
        return;
      }

      setError(L('Unexpected response.', 'Reponse inattendue.'));
    } catch {
      setError(L('Connection error. Check your network.', 'Erreur de connexion reseau.'));
    } finally { setLoading(false); }
  };

  // ── Étape 2: vérifier le code OTP ───────────────────────────
  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setError(L('Enter the 6-digit code.', 'Entrez le code a 6 chiffres.'));
      return;
    }
    setVerifying(true); setError('');
    try {
      const res = await fetch(API + '/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken, code: otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || L('Invalid or expired code.', 'Code invalide ou expire.'));
        return;
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError(L('Connection error.', 'Erreur de connexion.'));
    } finally { setVerifying(false); }
  };

  // ── Renvoyer un code ─────────────────────────────────────────
  const handleResend = async () => {
    setResending(true); setError(''); setSuccess(''); setOtp('');
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, lang }),
      });
      const data = await res.json();
      if (res.ok && data.preAuthToken) {
        setPreAuth(data.preAuthToken);
        setMasked(data.maskedEmail || maskedEmail);
        setSuccess(L('New code sent!', 'Nouveau code envoye !'));
      } else {
        setError(data.error || L('Could not resend code.', 'Impossible de renvoyer le code.'));
      }
    } catch {
      setError(L('Connection error.', 'Erreur de connexion.'));
    } finally { setResending(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', fontFamily:'system-ui, sans-serif' }}>

      {/* Lang toggle */}
      <div style={{ position:'fixed', top:16, right:16, display:'flex', gap:6, zIndex:10 }}>
        {(['fr','en'] as string[]).map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid '+(lang===l?C.green:C.border),
              background: lang===l?'rgba(0,255,148,0.08)':'transparent',
              color: lang===l?C.green:C.muted, cursor:'pointer', fontSize:11, fontWeight:700 }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ width:'100%', maxWidth:420 }}>

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

            {/* ══════════════════════════════════════════ */}
            {/* ÉTAPE 1 — IDENTIFIANTS                    */}
            {/* ══════════════════════════════════════════ */}
            {step === 'credentials' && (
              <>
                <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:C.text, margin:'0 0 4px' }}>
                  {L('Sign in', 'Connexion')}
                </h1>
                <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>
                  {L('A verification code will be sent to your email.', 'Un code de verification sera envoye a votre email.')}
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
                    placeholder={L('you@company.com', 'vous@societe.com')}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={field('email')} autoComplete="email"/>
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
                    <input type={showPw ? 'text' : 'password'} value={password}
                      placeholder="••••••••"
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      style={field('pw')} autoComplete="current-password"/>
                    <button onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:14, padding:0 }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button onClick={handleLogin} disabled={loading}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:loading?0.7:1 }}>
                  {loading
                    ? L('Sending code...', 'Envoi du code...')
                    : L('Continue', 'Continuer →')}
                </button>

                <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:C.muted }}>
                  {L("Don't have an account?", "Pas de compte ?")}
                  {' '}
                  <Link href="/signup" style={{ color:C.green, textDecoration:'none', fontWeight:600 }}>
                    {L('Get started', 'Commencer')}
                  </Link>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════ */}
            {/* ÉTAPE 2 — CODE OTP EMAIL                  */}
            {/* ══════════════════════════════════════════ */}
            {step === 'otp' && (
              <>
                <div style={{ textAlign:'center', marginBottom:24 }}>
                  <div style={{ width:60, height:60, background:'rgba(0,255,148,0.08)', border:'2px solid rgba(0,255,148,0.25)', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 14px' }}>
                    📧
                  </div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:19, color:C.text, margin:'0 0 8px' }}>
                    {L('Check your email', 'Verifiez votre email')}
                  </h2>
                  <p style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
                    {L('We sent a 6-digit code to', 'Nous avons envoye un code a 6 chiffres a')}
                  </p>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, color:C.text, fontWeight:700, marginTop:4 }}>
                    {maskedEmail}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:6, fontFamily:'JetBrains Mono, monospace' }}>
                    {L('Valid for', 'Valide')} {expiresIn} {L('minutes', 'minutes')}
                    {' · '}
                    {L('Check spam folder', 'Verifiez vos spams')}
                  </div>
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.red, fontSize:13 }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:9, padding:'10px 14px', marginBottom:14, color:C.green, fontSize:13 }}>
                    ✓ {success}
                  </div>
                )}

                {/* Saisie OTP */}
                <div style={{ marginBottom:20 }}>
                  <input
                    type="text" value={otp} maxLength={6} autoFocus
                    placeholder="000000"
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    style={{
                      ...field('otp'),
                      fontSize: 34, fontWeight: 800, textAlign: 'center',
                      letterSpacing: '0.5em', fontFamily: 'JetBrains Mono, monospace',
                      padding: '16px 0',
                    }}
                  />
                </div>

                {/* Bouton vérifier */}
                <button onClick={handleVerify} disabled={verifying || otp.length < 6}
                  style={{ width:'100%', background:'linear-gradient(135deg,'+C.green+',#00CC77)', color:'#080B0F', border:'none', borderRadius:10, padding:'14px 0', fontWeight:800, fontSize:15, cursor:(verifying||otp.length<6)?'not-allowed':'pointer', fontFamily:'Syne, sans-serif', opacity:(verifying||otp.length<6)?0.6:1, marginBottom:10 }}>
                  {verifying
                    ? L('Verifying...', 'Verification en cours...')
                    : L('Verify code', 'Verifier le code')}
                </button>

                {/* Renvoyer le code */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <button onClick={handleResend} disabled={resending}
                    style={{ background:'transparent', border:'none', color:resending?C.muted:C.blue, cursor:resending?'not-allowed':'pointer', fontSize:13, padding:'8px 0' }}>
                    {resending ? L('Sending...', 'Envoi...') : L('Resend code', 'Renvoyer le code')}
                  </button>
                  <button onClick={() => { setStep('credentials'); setOtp(''); setError(''); setSuccess(''); }}
                    style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:13, padding:'8px 0' }}>
                    ← {L('Change email', 'Changer d email')}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em' }}>
          PANGEA CARBON · {L('AFRICAN MRV PLATFORM', 'PLATEFORME MRV AFRICAINE')} · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
