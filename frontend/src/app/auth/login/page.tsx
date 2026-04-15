'use client';
import { useLang } from '@/lib/lang-context';
import LangToggle from '@/components/LangToggle';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', blue:'#38BDF8', purple:'#A78BFA',
  yellow:'#FCD34D', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const inp = (focus) => ({
  background:C.card2, border:'1px solid '+(focus?C.green:C.border),
  borderRadius:9, color:C.text, padding:'12px 14px', fontSize:14,
  outline:'none', width:'100%', boxSizing:'border-box', transition:'border-color .15s',
});

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em' }}>{label}</label>
        {hint}
      </div>
      {children}
      {error && <div style={{ fontSize:11, color:C.red, marginTop:5 }}>{error}</div>}
    </div>
  );
}

export default function LoginPage() {
  const { lang } = useLang();
  const router = useRouter();
  const codeRef = useRef(null);

  const [step, setStep]             = useState('credentials');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass]   = useState(false);
  const [mfaCode, setMfaCode]       = useState('');
  const [mfaMethod, setMfaMethod]   = useState('totp');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [pendingUser, setPendingUser]   = useState(null);
  const [error, setError]           = useState('');
  const [fieldErr, setFieldErr]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [pendingVerif, setPendingVerif] = useState(false);
  const [resending, setResending]   = useState(false);
  const [resent, setResent]         = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailSent, setEmailSent]   = useState(false);
  const [shake, setShake]           = useState(false);
  const countdownRef = useRef(null);

  useEffect(() => {
    if (step === 'mfa' && codeRef.current) setTimeout(() => codeRef.current?.focus(), 100);
  }, [step, mfaMethod]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email) errs.email = lang==='fr'?'Email requis':'Email required';
    if (!password) errs.password = lang==='fr'?'Mot de passe requis':'Password required';
    if (Object.keys(errs).length) { setFieldErr(errs); triggerShake(); return; }
    setFieldErr({}); setLoading(true); setError(''); setPendingVerif(false);
    try {
      const res = await fetch(API+'/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ email:email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.pendingVerification) setPendingVerif(true);
        setError(data.error||data.message||(lang==='fr'?'Identifiants invalides':'Invalid credentials'));
        triggerShake();
        return;
      }
      if (data.requiresMFA) {
        setPreAuthToken(data.preAuthToken);
        setPendingUser(data.user);
        setStep('mfa');
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch(err) {
      setError(lang==='fr'?'Erreur réseau — réessayez':'Network error — please retry');
      triggerShake();
    } finally { setLoading(false); }
  };

  const handleMFA = async (e) => {
    e?.preventDefault();
    if (mfaCode.length < 6) { triggerShake(); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(API+'/auth/mfa-verify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ preAuthToken, code:mfaCode.trim(), method:mfaMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error||(lang==='fr'?'Code invalide':'Invalid code'));
        setMfaCode('');
        triggerShake();
        codeRef.current?.focus();
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch(err) {
      setError(lang==='fr'?'Erreur réseau':'Network error');
      triggerShake();
    } finally { setLoading(false); }
  };

  const sendEmailCode = async () => {
    setEmailSending(true);
    try {
      const res = await fetch(API+'/2fa/email/send?lang='+lang, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+preAuthToken}
      });
      const data = await res.json();
      if (data.devCode) setMfaCode(data.devCode);
      setEmailSent(true);
      setEmailCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setEmailCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
      }, 1000);
    } catch(err) {
      setError(lang==='fr'?'Erreur envoi email':'Email send error');
    } finally { setEmailSending(false); }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await fetch(API+'/auth/resend-verification', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ email })
      });
      setResent(true);
    } catch(e) {} finally { setResending(false); }
  };

  const digits = mfaCode.padEnd(6,'').slice(0,6).split('');

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:600, height:300, background:'radial-gradient(ellipse, rgba(0,255,148,0.05) 0%, transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:0, right:0, width:400, height:400, background:'radial-gradient(ellipse, rgba(167,139,250,0.04) 0%, transparent 70%)' }}/>
      </div>

      <div style={{ position:'fixed', top:20, right:20 }}><LangToggle/></div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .card-shake { animation: shake 0.4s ease; }
        .card-fade { animation: fadeIn 0.3s ease; }
      `}</style>

      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28, animation:'fadeIn 0.4s ease' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>PANGEA CARBON</span>
          </div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.12em' }}>
            {lang==='fr'?'INTELLIGENCE CARBONE · AFRIQUE':'CARBON INTELLIGENCE · AFRICA'}
          </div>
        </div>

        {/* ── STEP 1: CREDENTIALS ───────────────────────────────── */}
        {step==='credentials' && (
          <div className={'card-fade'+(shake?' card-shake':'')}
            style={{ background:C.card, border:'1px solid '+C.border, borderRadius:18, padding:28, boxShadow:'0 32px 80px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,'+C.green+' 0%,rgba(0,255,148,0.2) 60%,transparent 100%)' }}/>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:5 }}>
                {lang==='fr'?'AUTHENTIFICATION · ÉTAPE 1/2 (SI MFA ACTIVÉ)':'AUTHENTICATION · STEP 1/2 (IF MFA ENABLED)'}
              </div>
              <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:C.text, margin:0 }}>
                {lang==='fr'?'Connexion à votre compte':'Sign in to your account'}
              </h1>
            </div>

            {error && !pendingVerif && (
              <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:13, color:C.red, display:'flex', gap:8 }}>
                <span style={{ flexShrink:0 }}>⚠</span><span>{error}</span>
              </div>
            )}

            {pendingVerif && (
              <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:9, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:12, color:C.blue, marginBottom:8 }}>
                  ✉️ {lang==='fr'?'Email non vérifié — vérifiez votre boîte mail et cliquez le lien d\'activation.':'Email not verified — check your inbox and click the activation link.'}
                </div>
                <button onClick={resendVerification} disabled={resending||resent}
                  style={{ fontSize:11, color:resent?C.green:C.blue, background:'transparent', border:'1px solid '+(resent?'rgba(0,255,148,0.3)':'rgba(56,189,248,0.25)'), borderRadius:6, padding:'5px 12px', cursor:resent?'default':'pointer' }}>
                  {resent?('✓ '+(lang==='fr'?'Envoyé !':'Sent!')):resending?'⟳...':(lang==='fr'?'Renvoyer le lien':'Resend activation link')}
                </button>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <Field label="EMAIL *" error={fieldErr.email}>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus
                  placeholder="contact@company.com"
                  onFocus={()=>setFocusEmail(true)} onBlur={()=>setFocusEmail(false)}
                  style={inp(focusEmail)}/>
              </Field>
              <Field label={lang==='fr'?'MOT DE PASSE *':'PASSWORD *'} error={fieldErr.password}
                hint={<a href="/auth/forgot-password" style={{ fontSize:10, color:C.muted, textDecoration:'none' }}
                  onMouseEnter={e=>e.target.style.color=C.blue} onMouseLeave={e=>e.target.style.color=C.muted}>
                  {lang==='fr'?'Oublié ?':'Forgot?'}
                </a>}>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••"
                    onFocus={()=>setFocusPass(true)} onBlur={()=>setFocusPass(false)}
                    style={{ ...inp(focusPass), paddingRight:46 }}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </Field>

              <button type="submit" disabled={loading}
                style={{ width:'100%', background:loading?C.card2:C.green, color:loading?C.muted:C.bg, border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, cursor:loading?'wait':'pointer', fontSize:14, fontFamily:'Syne, sans-serif', transition:'all .2s', marginTop:4 }}>
                {loading
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ width:14, height:14, border:'2px solid #4A6278', borderTopColor:C.green, borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
                      {lang==='fr'?'Connexion...':'Signing in...'}
                    </span>
                  : (lang==='fr'?'Se connecter →':'Sign in →')
                }
              </button>
            </form>

            <div style={{ marginTop:18, textAlign:'center', fontSize:12, color:C.muted }}>
              {lang==='fr'?'Pas de compte ?':'No account?'}{' '}
              <a href="/auth/register" style={{ color:C.green, textDecoration:'none', fontWeight:700 }}>
                {lang==='fr'?'Créer un compte':'Create account'}
              </a>
            </div>

            <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(167,139,250,0.04)', border:'1px solid rgba(167,139,250,0.12)', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>🔐</span>
              <span style={{ fontSize:10, color:C.muted, lineHeight:1.6 }}>
                {lang==='fr'
                  ?'Si MFA activé sur votre compte, un code de vérification sera requis après cette étape.'
                  :'If MFA is enabled on your account, a verification code will be required after this step.'}
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 2: MFA ───────────────────────────────────────── */}
        {step==='mfa' && (
          <div className={'card-fade'+(shake?' card-shake':'')}
            style={{ background:C.card, border:'1px solid rgba(167,139,250,0.4)', borderRadius:18, padding:28, boxShadow:'0 32px 80px rgba(0,0,0,0.6)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,'+C.purple+' 0%,rgba(167,139,250,0.3) 60%,transparent 100%)' }}/>

            {/* Header MFA */}
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:20 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>🔐</div>
              <div>
                <div style={{ fontSize:9, color:C.purple, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.13em', marginBottom:4 }}>
                  PANGEA CARBON · MFA · {lang==='fr'?'ÉTAPE 2/2':'STEP 2/2'}
                </div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:C.text, margin:0 }}>
                  {lang==='fr'?'Vérification en deux étapes':'Two-step verification'}
                </h2>
              </div>
            </div>

            {/* User badge */}
            {pendingUser && (
              <div style={{ background:C.card2, border:'1px solid '+C.border, borderRadius:10, padding:'10px 14px', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,rgba(167,139,250,0.2),rgba(167,139,250,0.05))', border:'1px solid rgba(167,139,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:C.purple, flexShrink:0 }}>
                  {(pendingUser.name||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pendingUser.name}</div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pendingUser.email}</div>
                </div>
                <div style={{ fontSize:10, color:C.green, fontFamily:'JetBrains Mono, monospace', background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:5, padding:'2px 8px' }}>
                  {lang==='fr'?'CONNECTÉ':'LOGGED IN'}
                </div>
              </div>
            )}

            {/* Method selector */}
            <div style={{ display:'flex', gap:6, marginBottom:18, background:C.card2, borderRadius:10, padding:5 }}>
              {[['totp','📱 '+(lang==='fr'?'App TOTP':'TOTP App'),'RFC 6238'],['email','📧 Email OTP',lang==='fr'?'5 minutes':'5 min']].map(([m,label,sub])=>(
                <button key={m} onClick={()=>{ setMfaMethod(m); setMfaCode(''); setError(''); setEmailSent(false); }}
                  style={{ flex:1, padding:'9px 0', border:'none', borderRadius:7, background:mfaMethod===m?'rgba(167,139,250,0.15)':'transparent',
                    color:mfaMethod===m?C.purple:C.muted, cursor:'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <span style={{ fontSize:12, fontWeight:mfaMethod===m?700:400 }}>{label}</span>
                  <span style={{ fontSize:9, color:mfaMethod===m?'rgba(167,139,250,0.7)':C.muted, fontFamily:'JetBrains Mono, monospace' }}>{sub}</span>
                  {mfaMethod===m&&<div style={{ width:24, height:2, background:C.purple, borderRadius:2, marginTop:2 }}/>}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.28)', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:13, color:C.red, display:'flex', gap:8 }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            {/* TOTP instructions */}
            {mfaMethod==='totp' && (
              <div style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:C.text2, lineHeight:1.7 }}>
                📱 {lang==='fr'
                  ?'Ouvrez votre application TOTP (Google Authenticator, Authy, 1Password) et entrez le code à 6 chiffres pour PANGEA CARBON.'
                  :'Open your TOTP app (Google Authenticator, Authy, 1Password) and enter the 6-digit code for PANGEA CARBON.'}
              </div>
            )}

            {/* Email OTP */}
            {mfaMethod==='email' && (
              <div style={{ marginBottom:16 }}>
                <div style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:C.text2, lineHeight:1.7 }}>
                  📧 {lang==='fr'
                    ?'Recevez un code à 6 chiffres sur votre email enregistré. Valide 5 minutes, usage unique.'
                    :'Receive a 6-digit code to your registered email. Valid for 5 minutes, single use.'}
                </div>
                <button onClick={sendEmailCode} disabled={emailSending||emailCountdown>0}
                  style={{ width:'100%', background:emailCountdown>0?C.card2:C.blue, color:emailCountdown>0?C.muted:C.bg, border:'none', borderRadius:9, padding:'11px 0', fontWeight:700, cursor:emailSending||emailCountdown>0?'not-allowed':'pointer', fontSize:13, transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {emailSending
                    ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>{lang==='fr'?'Envoi...':'Sending...'}</>
                    : emailCountdown>0
                      ? (lang==='fr'?'Renvoyer dans ':'Resend in ')+emailCountdown+'s'
                      : '📧 '+(lang==='fr'?'Envoyer le code par email':'Send code by email')
                  }
                </button>
                {emailSent && (
                  <div style={{ marginTop:8, fontSize:11, color:C.green, textAlign:'center', fontFamily:'JetBrains Mono, monospace' }}>
                    ✓ {lang==='fr'?'Code envoyé — vérifiez votre boîte mail et vos spams':'Code sent — check your inbox and spam folder'}
                  </div>
                )}
              </div>
            )}

            {/* Code input — digit boxes */}
            <form onSubmit={handleMFA}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', display:'block', marginBottom:10, letterSpacing:'0.08em' }}>
                  {lang==='fr'?'CODE D\'AUTHENTIFICATION':'AUTHENTICATION CODE'}
                  {mfaMethod==='totp'&&<span style={{ marginLeft:8, color:'rgba(167,139,250,0.5)' }}>· {lang==='fr'?'renouvelé toutes les 30s':'refreshes every 30s'}</span>}
                </label>
                <div style={{ position:'relative' }}>
                  <input ref={codeRef} type="text" inputMode="numeric" maxLength={8}
                    value={mfaCode} onChange={e=>{ setMfaCode(e.target.value.replace(/\D/g,'').slice(0,8)); setError(''); }}
                    onKeyDown={e=>{ if(e.key==='Enter') handleMFA(e); }}
                    placeholder="000000"
                    style={{ width:'100%', background:C.card2, border:'2px solid '+(mfaCode.length>=6?C.purple:C.border), borderRadius:10, color:C.text, padding:'16px 0', fontSize:32, textAlign:'center', letterSpacing:'0.5em', fontFamily:'JetBrains Mono, monospace', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}/>
                  {mfaCode.length>=6&&(
                    <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', width:24, height:24, borderRadius:'50%', background:'rgba(167,139,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:C.purple }}>✓</div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading||mfaCode.length<6}
                style={{ width:'100%', background:loading||mfaCode.length<6?C.card2:C.purple, color:loading||mfaCode.length<6?C.muted:C.bg, border:'none', borderRadius:10, padding:'13px 0', fontWeight:800, cursor:loading||mfaCode.length<6?'not-allowed':'pointer', fontSize:14, fontFamily:'Syne, sans-serif', transition:'all .2s' }}>
                {loading
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ width:14, height:14, border:'2px solid rgba(167,139,250,0.3)', borderTopColor:C.purple, borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
                      {lang==='fr'?'Vérification...':'Verifying...'}
                    </span>
                  : '🔐 '+(lang==='fr'?'Vérifier et accéder au dashboard':'Verify & access dashboard')
                }
              </button>
            </form>

            {/* Footer links */}
            <div style={{ marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={()=>{ setStep('credentials'); setError(''); setMfaCode(''); setPreAuthToken(''); setPendingUser(null); }}
                style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, padding:0 }}
                onMouseEnter={e=>e.currentTarget.style.color=C.blue} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                ← {lang==='fr'?'Changer de compte':'Different account'}
              </button>
              <a href="/auth/backup-code" style={{ fontSize:12, color:C.muted, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}
                onMouseEnter={e=>e.currentTarget.style.color=C.yellow} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
                🗝 {lang==='fr'?'Code de secours':'Backup code'}
              </a>
            </div>

            <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(0,0,0,0.3)', borderRadius:8, fontSize:10, color:C.muted, lineHeight:1.7, fontFamily:'JetBrains Mono, monospace', textAlign:'center' }}>
              🛡 {lang==='fr'
                ?'Session pré-auth valide 15 minutes · Aucun accès sans validation MFA'
                :'Pre-auth session valid 15 min · No access without MFA validation'}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:24, fontSize:10, color:C.muted }}>
          PANGEA CARBON Africa · Verra ACM0002 · Gold Standard · Article 6
        </div>
      </div>
    </div>
  );
}
