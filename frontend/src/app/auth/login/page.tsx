'use client';
import { useLang } from '@/lib/lang-context';
import LangToggle from '@/components/LangToggle';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', blue:'#38BDF8', purple:'#A78BFA',
  muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const inp = {
  background:C.card2, border:'1px solid '+C.border, borderRadius:9, color:C.text,
  padding:'12px 14px', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box',
  transition:'border-color .15s',
};

export default function LoginPage() {
  const { lang } = useLang();
  const router = useRouter();

  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerif, setPendingVerif] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setPendingVerif(false);
    try {
      const res = await fetch(API+'/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.pendingVerification) { setPendingVerif(true); }
        setError(data.error||data.message||'Invalid credentials');
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
    } finally { setLoading(false); }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(API+'/auth/mfa-verify', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ preAuthToken, code:mfaCode.trim(), method:mfaMethod }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error||'Invalid code'); return; }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch(err) {
      setError(lang==='fr'?'Erreur réseau':'Network error');
    } finally { setLoading(false); }
  };

  const sendEmailOTP = async () => {
    setEmailSending(true);
    try {
      const res = await fetch(API+'/2fa/email/send?lang='+lang, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+preAuthToken}
      });
      const data = await res.json();
      if (data.devCode) { setMfaCode(data.devCode); }
      setEmailCountdown(60);
      const t = setInterval(()=>{ setEmailCountdown(c=>{ if(c<=1){clearInterval(t);return 0;} return c-1; }); },1000);
    } catch(err) { setError(lang==='fr'?'Erreur envoi email':'Email send error'); }
    finally { setEmailSending(false); }
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

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,255,148,0.04) 0%, transparent 70%)', pointerEvents:'none' }}/>

      {/* Lang toggle */}
      <div style={{ position:'fixed', top:20, right:20 }}>
        <LangToggle/>
      </div>

      <div style={{ width:'100%', maxWidth:440 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⬡</div>
            <span style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:800, color:C.text }}>PANGEA CARBON</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em' }}>
            {lang==='fr'?'PLATEFORME INTELLIGENCE CARBONE · AFRIQUE':'CARBON INTELLIGENCE PLATFORM · AFRICA'}
          </div>
        </div>

        {/* ── STEP 1: Credentials ─────────────────────────────────── */}
        {step==='credentials' && (
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:18, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>

            <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:C.text, margin:'0 0 6px' }}>
              {lang==='fr'?'Connexion':'Sign in'}
            </h1>
            <p style={{ fontSize:13, color:C.muted, margin:'0 0 24px' }}>
              {lang==='fr'?'Accédez à votre espace PANGEA CARBON':'Access your PANGEA CARBON workspace'}
            </p>

            {error && (
              <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:13, color:C.red, display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {pendingVerif && (
              <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:9, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:12, color:C.blue, marginBottom:8 }}>
                  {lang==='fr'?'Email non vérifié. Vérifiez votre boîte email.':'Email not verified. Check your inbox.'}
                </div>
                {!resent ? (
                  <button onClick={resendVerification} disabled={resending}
                    style={{ fontSize:12, color:C.blue, background:'transparent', border:'1px solid rgba(56,189,248,0.3)', borderRadius:6, padding:'5px 12px', cursor:'pointer' }}>
                    {resending?'⟳ ...':(lang==='fr'?'Renvoyer le lien':'Resend link')}
                  </button>
                ) : (
                  <span style={{ fontSize:12, color:C.green }}>✓ {lang==='fr'?'Envoyé !':'Sent!'}</span>
                )}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', display:'block', marginBottom:6 }}>EMAIL *</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
                  placeholder="contact@company.com"
                  style={{ ...inp, borderColor:error&&!email?C.red:C.border }}
                  onFocus={e=>e.target.style.borderColor=C.green}
                  onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{lang==='fr'?'MOT DE PASSE *':'PASSWORD *'}</label>
                  <a href="/auth/forgot-password" style={{ fontSize:10, color:C.muted, textDecoration:'none' }}
                    onMouseEnter={e=>e.target.style.color=C.blue} onMouseLeave={e=>e.target.style.color=C.muted}>
                    {lang==='fr'?'Mot de passe oublié ?':'Forgot password?'}
                  </a>
                </div>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ ...inp, paddingRight:46 }}
                    onFocus={e=>e.target.style.borderColor=C.green}
                    onBlur={e=>e.target.style.borderColor=C.border}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading||!email||!password}
                style={{ width:'100%', background:loading||!email||!password?C.card2:C.green, color:loading||!email||!password?C.muted:C.bg, border:'none', borderRadius:9, padding:'13px 0', fontWeight:800, cursor:loading||!email||!password?'not-allowed':'pointer', fontSize:14, fontFamily:'Syne, sans-serif', transition:'all .15s' }}>
                {loading?'⟳ '+(lang==='fr'?'Connexion...':'Signing in...'):(lang==='fr'?'Se connecter →':'Sign in →')}
              </button>
            </form>

            <div style={{ marginTop:20, textAlign:'center', fontSize:12, color:C.muted }}>
              {lang==='fr'?'Pas encore de compte ?':'No account yet?'}{' '}
              <a href="/auth/register" style={{ color:C.green, textDecoration:'none', fontWeight:700 }}>
                {lang==='fr'?'Créer un compte':'Create account'}
              </a>
            </div>
          </div>
        )}

        {/* ── STEP 2: MFA ─────────────────────────────────────────── */}
        {step==='mfa' && (
          <div style={{ background:C.card, border:'1px solid rgba(167,139,250,0.35)', borderRadius:18, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)' }}/>

            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:20 }}>
              <div style={{ width:52, height:52, borderRadius:13, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>🔐</div>
              <div>
                <div style={{ fontSize:9, color:C.purple, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.13em', marginBottom:4 }}>
                  PANGEA CARBON · MFA / 2FA · {lang==='fr'?'VÉRIFICATION':'VERIFICATION'}
                </div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:C.text, margin:0 }}>
                  {lang==='fr'?'Vérification en deux étapes':'Two-step verification'}
                </h2>
              </div>
            </div>

            <div style={{ height:1, background:'linear-gradient(90deg,rgba(167,139,250,0.3) 0%,transparent 100%)', marginBottom:20 }}/>

            {/* User info */}
            {pendingUser && (
              <div style={{ background:C.card2, border:'1px solid '+C.border, borderRadius:9, padding:'10px 14px', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:C.purple }}>
                  {(pendingUser.name||'?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{pendingUser.name}</div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{pendingUser.email}</div>
                </div>
              </div>
            )}

            {/* Method selector */}
            <div style={{ display:'flex', gap:6, marginBottom:18 }}>
              {[['totp','📱 '+( lang==='fr'?'App TOTP':'TOTP App')],['email','📧 Email OTP']].map(([m,label])=>(
                <button key={m} onClick={()=>{ setMfaMethod(m); setMfaCode(''); setError(''); }}
                  style={{ flex:1, padding:'9px 0', border:'1px solid '+(mfaMethod===m?C.purple:C.border), borderRadius:8, background:mfaMethod===m?'rgba(167,139,250,0.1)':'transparent', color:mfaMethod===m?C.purple:C.muted, cursor:'pointer', fontSize:12, fontWeight:mfaMethod===m?700:400, transition:'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:13, color:C.red }}>
                ⚠ {error}
              </div>
            )}

            {/* TOTP method */}
            {mfaMethod==='totp' && (
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:12, color:C.text2, lineHeight:1.7, marginBottom:14 }}>
                  {lang==='fr'
                    ?'Ouvrez Google Authenticator, Authy ou votre application TOTP et entrez le code à 6 chiffres affiché pour PANGEA CARBON.'
                    :'Open Google Authenticator, Authy or your TOTP app and enter the 6-digit code shown for PANGEA CARBON.'}
                </div>
              </div>
            )}

            {/* Email method */}
            {mfaMethod==='email' && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:C.text2, lineHeight:1.7, marginBottom:14 }}>
                  {lang==='fr'
                    ?'Recevez un code à 6 chiffres sur votre adresse email enregistrée. Valide 5 minutes.'
                    :'Receive a 6-digit code on your registered email address. Valid for 5 minutes.'}
                </div>
                <button onClick={sendEmailOTP} disabled={emailSending||emailCountdown>0}
                  style={{ width:'100%', background:emailCountdown>0?C.card2:C.blue, color:emailCountdown>0?C.muted:C.bg, border:'none', borderRadius:8, padding:'10px 0', fontWeight:700, cursor:emailSending||emailCountdown>0?'not-allowed':'pointer', fontSize:13, marginBottom:14 }}>
                  {emailSending?'⟳ '+(lang==='fr'?'Envoi...':'Sending...')
                    :emailCountdown>0?('⟳ '+lang==='fr'?'Renvoyer dans ':'Resend in ')+emailCountdown+'s'
                    :'📧 '+(lang==='fr'?'Envoyer le code par email':'Send code by email')}
                </button>
              </div>
            )}

            {/* Code input */}
            <form onSubmit={handleMFA}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', display:'block', marginBottom:8 }}>
                  {lang==='fr'?'CODE D\'AUTHENTIFICATION (6 CHIFFRES)':'AUTHENTICATION CODE (6 DIGITS)'}
                </label>
                <input type="text" inputMode="numeric" maxLength={8} value={mfaCode}
                  onChange={e=>{ setMfaCode(e.target.value.replace(/\D/g,'').slice(0,8)); setError(''); }}
                  onKeyDown={e=>{ if(e.key==='Enter'&&mfaCode.length>=6)handleMFA(e); }}
                  placeholder="000 000"
                  style={{ ...inp, fontSize:28, textAlign:'center', letterSpacing:'0.4em', fontFamily:'JetBrains Mono, monospace', borderColor:mfaCode.length===6?C.purple:C.border, padding:'14px 0' }}
                  autoFocus/>
                {mfaMethod==='totp' && (
                  <div style={{ fontSize:10, color:C.muted, textAlign:'center', marginTop:6, fontFamily:'JetBrains Mono, monospace' }}>
                    {lang==='fr'?'Renouvelé toutes les 30 secondes':'Refreshes every 30 seconds'}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading||mfaCode.length<6}
                style={{ width:'100%', background:loading||mfaCode.length<6?C.card2:C.purple, color:loading||mfaCode.length<6?C.muted:C.bg, border:'none', borderRadius:9, padding:'13px 0', fontWeight:800, cursor:loading||mfaCode.length<6?'not-allowed':'pointer', fontSize:14, fontFamily:'Syne, sans-serif', transition:'all .15s' }}>
                {loading?'⟳ '+(lang==='fr'?'Vérification...':'Verifying...'):'🔐 '+(lang==='fr'?'Vérifier et accéder':'Verify & Sign in')}
              </button>
            </form>

            {/* Backup code + back */}
            <div style={{ marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={()=>{ setStep('credentials'); setError(''); setMfaCode(''); setPreAuthToken(''); }}
                style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:12 }}>
                ← {lang==='fr'?'Changer de compte':'Different account'}
              </button>
              <a href="/auth/backup-code" style={{ fontSize:12, color:C.muted, textDecoration:'none' }}
                onMouseEnter={e=>e.target.style.color=C.yellow} onMouseLeave={e=>e.target.style.color=C.muted}>
                🗝 {lang==='fr'?'Code de secours':'Backup code'}
              </a>
            </div>

            <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(56,189,248,0.04)', border:'1px solid rgba(56,189,248,0.12)', borderRadius:8, fontSize:11, color:C.muted, lineHeight:1.6 }}>
              🔐 {lang==='fr'
                ?'Cette étape protège votre compte contre les accès non autorisés. Le code expire dans 15 minutes.'
                :'This step protects your account from unauthorized access. The code expires in 15 minutes.'}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:C.muted }}>
          PANGEA CARBON Africa · {lang==='fr'?'Plateforme Carbone':'Carbon Intelligence Platform'}<br/>
          <a href="/auth/register" style={{ color:C.muted, textDecoration:'none' }}>Verra ACM0002 · Gold Standard · Article 6</a>
        </div>
      </div>
    </div>
  );
}
