'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const inp = { background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'11px 14px', fontSize:13, outline:'none', width:'100%' };

export default function SecurityPage() {
  const { lang } = useLang();

  const [status, setStatus] = useState(null);
  const [step, setStep] = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableToken, setDisableToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailCode, setEmailCode] = useState('');
  const [emailSentTo, setEmailSentTo] = useState('');
  const [activeTab, setActiveTab] = useState('totp');

  const showToast = useCallback((msg, type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),5000);
  }, []);

  const copyToClipboard = useCallback((text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
    else { const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    showToast(lang==='fr'?'Copié dans le presse-papiers !':'Copied to clipboard!');
  }, [lang, showToast]);

  useEffect(() => {
    fetchAuthJson('/2fa/status').then(s=>setStatus(s)).catch(()=>{});
  }, []);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setTimeout(()=>setEmailCountdown(c=>c-1), 1000);
    return ()=>clearTimeout(t);
  }, [emailCountdown]);

  const setupTOTP = async () => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/setup', { method:'POST' });
      setQrCode(r.qrCode);
      setSecret(r.manualEntry?.key||r.secret||'');
      setStep('scan');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const verifyTOTP = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/verify', { method:'POST', body:JSON.stringify({ code:token.trim() }) });
      setBackupCodes(r.backupCodes||[]);
      setStatus(s=>({...s, enabled:true}));
      setStep('backup');
      setToken('');
      showToast(lang==='fr'?'2FA TOTP activé !':'2FA TOTP enabled!');
    } catch(e) { showToast(e.message||'Invalid code','error'); }
    finally { setLoading(false); }
  };

  const disableTOTP = async () => {
    if (!disableToken.trim()) return;
    setLoading(true);
    try {
      await fetchAuthJson('/2fa/disable', { method:'DELETE', body:JSON.stringify({ code:disableToken.trim() }) });
      setStatus(s=>({...s, enabled:false}));
      setStep('idle');
      setDisableToken('');
      showToast(lang==='fr'?'2FA désactivé.':'2FA disabled.');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const regenerateBackup = async () => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/backup-codes/regenerate', { method:'POST' });
      setBackupCodes(r.backupCodes||[]);
      showToast(lang==='fr'?'Nouveaux codes générés !':'New backup codes generated!');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const sendEmailOTP = async () => {
    setEmailSending(true);
    try {
      const r = await fetchAuthJson('/2fa/email/send?lang='+lang, { method:'POST' });
      setEmailSentTo(r.sentTo||'');
      setEmailCountdown(60);
      showToast(lang==='fr'?'Code envoyé par email !':'Code sent by email!');
    } catch(e) { showToast(e.message,'error'); }
    finally { setEmailSending(false); }
  };

  const verifyEmailOTP = async () => {
    if (!emailCode.trim()) return;
    setLoading(true);
    try {
      await fetchAuthJson('/2fa/email/verify', { method:'POST', body:JSON.stringify({ code:emailCode.trim() }) });
      showToast(lang==='fr'?'Code email vérifié !':'Email code verified!');
      setEmailCode('');
      setEmailSentTo('');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const enabled = status?.enabled || false;
  const email = status?.email || '';
  const backupLeft = status?.backupCodesRemaining || 0;

  return (
    <div style={{ padding:24, maxWidth:960, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:24,right:24,zIndex:99999,maxWidth:440,minWidth:280 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.07)':'rgba(0,255,148,0.07)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 40px rgba(0,0,0,0.6)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:C.green }}/>
            <div style={{ width:24,height:24,borderRadius:'50%',background:(toast.type==='error'?C.red:C.green)+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:toast.type==='error'?C.red:C.green,fontWeight:800,marginLeft:6 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13,color:C.text,flex:1 }}>{toast.msg}</span>
            <button onClick={()=>setToast(null)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16 }}>×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.18em',marginBottom:8 }}>
          PANGEA CARBON · {lang==='fr'?'CENTRE DE SÉCURITÉ':'SECURITY CENTER'} · MFA/2FA
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:'0 0 8px' }}>
          {lang==='fr'?'Sécurité du compte':'Account Security'}
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0 }}>
          {lang==='fr'
            ?'Protégez votre compte avec une authentification multi-facteurs (MFA/2FA) — Application TOTP ou Email OTP.'
            :'Protect your account with multi-factor authentication (MFA/2FA) — TOTP Authenticator app or Email OTP.'}
        </p>
      </div>

      {/* Security Score */}
      <div style={{ background:'linear-gradient(135deg,#080B0F 0%,'+(enabled?'rgba(0,255,148,0.06)':'rgba(248,113,113,0.04)')+' 100%)', border:'1px solid '+(enabled?'rgba(0,255,148,0.25)':'rgba(248,113,113,0.2)'), borderRadius:16, padding:24, marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+(enabled?C.green:C.red)+' 0%,transparent 100%)' }}/>
        <div style={{ display:'flex',gap:20,alignItems:'center',flexWrap:'wrap' }}>
          <div style={{ width:64,height:64,borderRadius:16,background:enabled?'rgba(0,255,148,0.1)':'rgba(248,113,113,0.1)',border:'1px solid '+(enabled?'rgba(0,255,148,0.3)':'rgba(248,113,113,0.3)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0 }}>
            {enabled?'🔐':'🔓'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:9,color:enabled?C.green:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:4 }}>
              {enabled?'✓ MFA ENABLED':'⚠ MFA DISABLED'} · TOTP RFC 6238
            </div>
            <div style={{ fontSize:18,fontWeight:800,color:C.text,fontFamily:'Syne, sans-serif',marginBottom:6 }}>
              {enabled
                ?(lang==='fr'?'Compte protégé par authentification multi-facteurs':'Account protected by multi-factor authentication')
                :(lang==='fr'?'Activez le MFA pour sécuriser votre compte':'Enable MFA to secure your account')}
            </div>
            <div style={{ fontSize:12,color:C.muted }}>
              {email&&<span style={{ color:C.text2 }}>{email} · </span>}
              {enabled
                ?<span style={{ color:C.green }}>{lang==='fr'?'Actif depuis':'Active since'} {new Date().toLocaleDateString(lang==='fr'?'fr-FR':'en-US')}</span>
                :'Google Authenticator · Authy · Microsoft Authenticator · 1Password · Email OTP'}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6,textAlign:'center' }}>
              {lang==='fr'?'NIVEAU DE SÉCURITÉ':'SECURITY LEVEL'}
            </div>
            <div style={{ fontSize:32,fontWeight:800,color:enabled?C.green:C.red,fontFamily:'Syne, sans-serif',textAlign:'center' }}>
              {enabled?'A+':'C'}
            </div>
            <div style={{ fontSize:9,color:C.muted,textAlign:'center',fontFamily:'JetBrains Mono, monospace' }}>
              {enabled?'STRONG':'WEAK'}
            </div>
          </div>
          {enabled&&backupLeft>0&&(
            <div style={{ textAlign:'center',padding:'12px 20px',background:C.card2,border:'1px solid '+C.border,borderRadius:12 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>BACKUP CODES</div>
              <div style={{ fontSize:24,fontWeight:800,color:backupLeft>4?C.green:backupLeft>1?C.yellow:C.red,fontFamily:'Syne, sans-serif' }}>{backupLeft}</div>
              <div style={{ fontSize:9,color:C.muted }}>remaining</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: TOTP | Email OTP */}
      <div style={{ display:'flex',gap:4,background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:5,marginBottom:20,width:'fit-content' }}>
        {[['totp','🔐 TOTP App'],['email','📧 Email OTP']].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ padding:'10px 22px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'JetBrains Mono, monospace',borderRadius:8,background:activeTab===id?C.purple:'transparent',color:activeTab===id?C.bg:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TOTP TAB ──────────────────────────────────────────────────── */}
      {activeTab==='totp' && (
        <>
          {/* Actions */}
          <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
            {!enabled ? (
              <button onClick={setupTOTP} disabled={loading||step==='scan'}
                style={{ background:C.green,color:C.bg,border:'none',borderRadius:10,padding:'13px 28px',fontWeight:800,cursor:loading?'wait':'pointer',fontSize:14,fontFamily:'Syne, sans-serif',display:'flex',alignItems:'center',gap:10 }}>
                🔐 {loading&&step==='idle'?'⟳...':lang==='fr'?'Activer TOTP →':'Enable TOTP →'}
              </button>
            ) : (
              <>
                <button onClick={()=>setStep(step==='disable'?'idle':'disable')}
                  style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,color:C.red,padding:'13px 22px',cursor:'pointer',fontSize:13,fontWeight:700 }}>
                  🔓 {lang==='fr'?'Désactiver TOTP':'Disable TOTP'}
                </button>
                <button onClick={regenerateBackup} disabled={loading}
                  style={{ background:'rgba(252,211,77,0.08)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:10,color:C.yellow,padding:'13px 22px',cursor:'pointer',fontSize:13,fontWeight:700 }}>
                  🗝 {lang==='fr'?'Régénérer codes de secours':'Regenerate backup codes'}
                </button>
              </>
            )}
          </div>

          {/* Step: QR Scan */}
          {step==='scan' && (
            <div style={{ background:C.card,border:'1px solid rgba(167,139,250,0.3)',borderRadius:16,padding:28,marginBottom:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)' }}/>
              <div style={{ display:'flex',gap:16,alignItems:'center',marginBottom:20 }}>
                <div style={{ width:48,height:48,borderRadius:12,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>📱</div>
                <div>
                  <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:3 }}>
                    {lang==='fr'?'ÉTAPE 1 / 2 — CONFIGURER L\'APPLICATION':'STEP 1 / 2 — CONFIGURE YOUR APP'}
                  </div>
                  <h3 style={{ fontFamily:'Syne, sans-serif',fontSize:16,fontWeight:800,color:C.text,margin:0 }}>
                    {lang==='fr'?'Scanner le QR Code':'Scan the QR Code'}
                  </h3>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'auto 1fr',gap:28,alignItems:'flex-start',marginBottom:20 }}>
                {qrCode&&(
                  <div style={{ textAlign:'center' }}>
                    <div style={{ background:'white',padding:12,borderRadius:12,border:'2px solid rgba(167,139,250,0.4)',display:'inline-block',boxShadow:'0 8px 32px rgba(167,139,250,0.15)' }}>
                      <img src={qrCode} alt="QR Code 2FA" width={200} height={200} style={{ display:'block',borderRadius:6 }}/>
                    </div>
                    <div style={{ fontSize:9,color:C.muted,marginTop:8,fontFamily:'JetBrains Mono, monospace' }}>
                      Google Authenticator · Authy · 1Password
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:12,color:C.text2,lineHeight:1.9,marginBottom:18,whiteSpace:'pre-line' }}>
                    {lang==='fr'
                      ?'1. Ouvrez Google Authenticator, Authy ou similaire\n2. Appuyez sur ⊕ puis «Scanner un QR code»\n3. Entrez ci-dessous le code 6 chiffres affiché\n4. Conservez vos codes de secours en lieu sûr'
                      :'1. Open Google Authenticator, Authy or similar\n2. Tap ⊕ then "Scan QR code"\n3. Enter the 6-digit code shown in your app\n4. Save your backup codes in a safe place'}
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>
                      {lang==='fr'?'CLÉ MANUELLE (si scan impossible)':'MANUAL KEY (if scan fails)'}
                    </div>
                    <div style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,padding:'10px 14px',fontFamily:'JetBrains Mono, monospace',fontSize:12,color:C.purple,letterSpacing:'0.1em',wordBreak:'break-all',display:'flex',justifyContent:'space-between',gap:8 }}>
                      <span style={{ flex:1 }}>{secret}</span>
                      <button onClick={()=>copyToClipboard(secret)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16,flexShrink:0 }}>📋</button>
                    </div>
                  </div>
                  <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',marginBottom:8,letterSpacing:'0.08em' }}>
                    {lang==='fr'?'ÉTAPE 2 / 2 — SAISIR LE CODE':'STEP 2 / 2 — ENTER THE CODE'}
                  </div>
                  <div style={{ display:'flex',gap:10 }}>
                    <input type="text" inputMode="numeric" maxLength={6} placeholder="000 000" value={token}
                      onChange={e=>setToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                      onKeyDown={e=>{ if(e.key==='Enter'&&token.length===6)verifyTOTP(); }}
                      style={{ ...inp, flex:1, fontSize:24, textAlign:'center', letterSpacing:'0.4em', fontFamily:'JetBrains Mono, monospace', borderColor:token.length===6?C.purple:C.border }}
                      autoFocus/>
                    <button onClick={verifyTOTP} disabled={loading||token.length<6}
                      style={{ background:token.length===6?C.purple:C.card2, color:token.length===6?C.bg:C.muted, border:'none', borderRadius:9, padding:'11px 24px', cursor:token.length<6?'not-allowed':'pointer', fontWeight:800, fontSize:13, flexShrink:0 }}>
                      {loading?'⟳':(lang==='fr'?'Activer':'Activate')}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ padding:'10px 14px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,fontSize:11,color:C.red }}>
                ⚠ {lang==='fr'?'Ne partagez jamais cette clé. Elle donne accès à votre compte PANGEA CARBON.':'Never share this key. It grants access to your PANGEA CARBON account.'}
              </div>
            </div>
          )}

          {/* Step: Backup codes */}
          {backupCodes.length>0&&(
            <div style={{ background:C.card,border:'1px solid rgba(252,211,77,0.35)',borderRadius:16,padding:28,marginBottom:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.yellow+' 0%,transparent 100%)' }}/>
              <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
                <div style={{ width:48,height:48,borderRadius:12,background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🗝</div>
                <div>
                  <div style={{ fontSize:9,color:C.yellow,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:3 }}>
                    {lang==='fr'?'CODES DE SECOURS — USAGE UNIQUE':'BACKUP CODES — SINGLE USE'}
                  </div>
                  <h3 style={{ fontFamily:'Syne, sans-serif',fontSize:16,fontWeight:800,color:C.text,margin:0 }}>
                    {lang==='fr'?'Conservez ces codes en lieu sûr':'Store these codes in a safe place'}
                  </h3>
                </div>
              </div>
              <div style={{ padding:'10px 14px',background:'rgba(252,211,77,0.05)',border:'1px solid rgba(252,211,77,0.15)',borderRadius:8,marginBottom:16,fontSize:12,color:C.text2,lineHeight:1.7 }}>
                ⚠ {lang==='fr'
                  ?'Ces codes ne seront plus affichés. Chaque code ne peut être utilisé qu\'une seule fois. En cas de perte de votre téléphone, ces codes vous donnent accès à votre compte.'
                  :'These codes will not be shown again. Each code can only be used once. If you lose your phone, these codes are your only way back in.'}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:18 }}>
                {backupCodes.map((code,i)=>(
                  <div key={i} onClick={()=>copyToClipboard(code)}
                    style={{ background:C.card2,border:'1px solid rgba(252,211,77,0.2)',borderRadius:8,padding:'12px 0',textAlign:'center',fontFamily:'JetBrains Mono, monospace',fontSize:14,fontWeight:700,color:C.yellow,letterSpacing:'0.08em',cursor:'pointer',transition:'all .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(252,211,77,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background=C.card2}>
                    {code.toUpperCase()}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>copyToClipboard('PANGEA CARBON 2FA Backup Codes\n\n'+backupCodes.map(c=>c.toUpperCase()).join('\n'))}
                  style={{ background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',borderRadius:9,color:C.yellow,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
                  📋 {lang==='fr'?'Copier tout':'Copy all'}
                </button>
                <button onClick={()=>{ const w=window.open('','_blank'); w.document.write('<pre style="font-family:monospace;font-size:16px;padding:20px;background:#0D1117;color:#FCD34D">PANGEA CARBON — 2FA Backup Codes\n\n'+backupCodes.map(c=>c.toUpperCase()).join('\n')+'</pre>'); setTimeout(()=>w.print(),300); }}
                  style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:'10px 18px',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:8 }}>
                  🖨️ {lang==='fr'?'Imprimer':'Print'}
                </button>
                <button onClick={()=>{ const a=document.createElement('a'); a.href='data:text/plain;charset=utf-8,PANGEA CARBON 2FA Backup Codes\n\n'+backupCodes.map(c=>c.toUpperCase()).join('\n'); a.download='pangea-carbon-backup-codes.txt'; a.click(); }}
                  style={{ background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:9,color:C.blue,padding:'10px 18px',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
                  💾 {lang==='fr'?'Télécharger':'Download .txt'}
                </button>
              </div>
            </div>
          )}

          {/* Disable panel */}
          {step==='disable'&&(
            <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.3)',borderRadius:16,padding:24,marginBottom:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.red+' 0%,transparent 100%)' }}/>
              <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:16 }}>
                <div style={{ width:42,height:42,borderRadius:11,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>⚠️</div>
                <div>
                  <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',marginBottom:3 }}>{lang==='fr'?'DÉSACTIVER 2FA TOTP':'DISABLE 2FA TOTP'}</div>
                  <div style={{ fontSize:14,fontWeight:700,color:C.text }}>{lang==='fr'?'Confirmez votre identité':'Confirm your identity'}</div>
                </div>
              </div>
              <div style={{ padding:'12px 14px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,marginBottom:16,fontSize:12,color:C.text2,lineHeight:1.7 }}>
                {lang==='fr'?'Votre compte ne sera plus protégé par un second facteur. Entrez votre code TOTP actuel pour confirmer.':'Your account will no longer be protected by a second factor. Enter your current TOTP code to confirm.'}
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={disableToken}
                  onChange={e=>setDisableToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                  style={{ ...inp, flex:1, fontSize:20, textAlign:'center', letterSpacing:'0.3em', fontFamily:'JetBrains Mono, monospace' }} autoFocus/>
                <button onClick={disableTOTP} disabled={loading||disableToken.length<6}
                  style={{ background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:C.red,padding:'11px 20px',cursor:'pointer',fontWeight:800,fontSize:13,flexShrink:0 }}>
                  {loading?'⟳':(lang==='fr'?'Désactiver':'Disable')}
                </button>
                <button onClick={()=>{ setStep('idle'); setDisableToken(''); }}
                  style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:'11px 16px',cursor:'pointer',fontSize:12 }}>
                  {lang==='fr'?'Annuler':'Cancel'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EMAIL OTP TAB ─────────────────────────────────────────────── */}
      {activeTab==='email' && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {/* Info card */}
          <div style={{ background:C.card,border:'1px solid rgba(56,189,248,0.25)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.blue+' 0%,transparent 100%)' }}/>
            <div style={{ display:'flex',gap:16,alignItems:'flex-start',marginBottom:20 }}>
              <div style={{ width:52,height:52,borderRadius:13,background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>📧</div>
              <div>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:4 }}>EMAIL OTP · {lang==='fr'?'CODE À USAGE UNIQUE PAR EMAIL':'ONE-TIME CODE BY EMAIL'}</div>
                <h3 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.text,margin:'0 0 8px' }}>
                  {lang==='fr'?'Authentification par Email':'Email Authentication'}
                </h3>
                <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>
                  {lang==='fr'
                    ?'Recevez un code à 6 chiffres directement sur votre adresse email enregistrée. Valide 5 minutes. Utilisable en complément ou en alternative au TOTP.'
                    :'Receive a 6-digit code directly to your registered email address. Valid for 5 minutes. Use as a complement or alternative to TOTP.'}
                </p>
                {email&&(
                  <div style={{ marginTop:10,fontSize:12,color:C.muted }}>
                    {lang==='fr'?'Email enregistré :':'Registered email:'} <span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Send button */}
            <div style={{ display:'flex',gap:12,alignItems:'center',flexWrap:'wrap' }}>
              <button onClick={sendEmailOTP} disabled={emailSending||emailCountdown>0}
                style={{ background:emailCountdown>0?C.card2:C.blue,color:emailCountdown>0?C.muted:C.bg,border:'none',borderRadius:10,padding:'12px 24px',fontWeight:800,cursor:emailSending||emailCountdown>0?'not-allowed':'pointer',fontSize:13,fontFamily:'Syne, sans-serif',display:'flex',alignItems:'center',gap:10 }}>
                {emailSending?'⟳ '+( lang==='fr'?'Envoi...':'Sending...')
                  :emailCountdown>0?('⟳ '+emailCountdown+'s')
                  :(lang==='fr'?'📧 Envoyer le code':'📧 Send code')}
              </button>
              {emailSentTo&&(
                <div style={{ fontSize:12,color:C.muted }}>
                  {lang==='fr'?'Envoyé à':'Sent to'}: <span style={{ color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{emailSentTo}</span>
                </div>
              )}
            </div>

            {/* Verify email code */}
            {emailSentTo&&(
              <div style={{ marginTop:16,paddingTop:16,borderTop:'1px solid '+C.border }}>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:8,letterSpacing:'0.1em' }}>
                  {lang==='fr'?'ENTRER LE CODE REÇU PAR EMAIL':'ENTER THE CODE RECEIVED BY EMAIL'}
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={emailCode}
                    onChange={e=>setEmailCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    onKeyDown={e=>{ if(e.key==='Enter'&&emailCode.length===6)verifyEmailOTP(); }}
                    style={{ ...inp, flex:1, fontSize:22, textAlign:'center', letterSpacing:'0.4em', fontFamily:'JetBrains Mono, monospace', borderColor:emailCode.length===6?C.blue:C.border }}
                    autoFocus/>
                  <button onClick={verifyEmailOTP} disabled={loading||emailCode.length<6}
                    style={{ background:emailCode.length===6?C.blue:C.card2,color:emailCode.length===6?C.bg:C.muted,border:'none',borderRadius:9,padding:'11px 24px',cursor:emailCode.length<6?'not-allowed':'pointer',fontWeight:800,fontSize:13,flexShrink:0 }}>
                    {loading?'⟳':(lang==='fr'?'Vérifier':'Verify')}
                  </button>
                </div>
                <div style={{ fontSize:11,color:C.muted,marginTop:8,fontFamily:'JetBrains Mono, monospace' }}>
                  {lang==='fr'?'Le code expire dans 5 minutes. Vérifiez vos spams.':'Code expires in 5 minutes. Check your spam folder.'}
                </div>
              </div>
            )}
          </div>

          {/* Email OTP info */}
          <div style={{ background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:12,padding:'16px 18px',display:'flex',gap:10 }}>
            <span style={{ fontSize:16,flexShrink:0 }}>💡</span>
            <div style={{ fontSize:12,color:C.text2,lineHeight:1.7 }}>
              <strong style={{ color:C.blue }}>{lang==='fr'?'Recommandation :':'Recommendation:'}</strong>{' '}
              {lang==='fr'
                ?'Utilisez le TOTP (application) comme méthode principale. L\'Email OTP est utile si vous changez de téléphone ou perdez accès à votre application TOTP.'
                :'Use TOTP (app) as your primary method. Email OTP is useful if you change phones or lose access to your TOTP app.'}
            </div>
          </div>
        </div>
      )}

      {/* ── INFO CARDS ────────────────────────────────────────────────── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:28 }}>
        {[
          { icon:'🔐', color:C.green, t:'TOTP RFC 6238', d:lang==='fr'?'Codes 6 chiffres toutes les 30s. Standard international. Compatible avec tous les gestionnaires de mots de passe.':'6-digit codes every 30s. International standard. Compatible with all password managers.' },
          { icon:'📧', color:C.blue, t:'Email OTP', d:lang==='fr'?'Code envoyé par email. Valide 5 minutes. Idéal comme second facteur ou alternative d\'urgence.':'Code sent by email. Valid 5 minutes. Ideal as a second factor or emergency alternative.' },
          { icon:'🗝', color:C.yellow, t:lang==='fr'?'Codes de secours':'Backup Codes', d:lang==='fr'?'8 codes usage unique. Accès d\'urgence si perte du téléphone. Téléchargeables en .txt.':'8 one-time codes. Emergency access if phone lost. Downloadable as .txt.' },
        ].map(card=>(
          <div key={card.t} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:'18px 20px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+card.color+'60 0%,transparent 100%)' }}/>
            <div style={{ fontSize:26,marginBottom:12 }}>{card.icon}</div>
            <div style={{ fontSize:10,color:card.color,fontFamily:'JetBrains Mono, monospace',marginBottom:6,fontWeight:700 }}>{card.t}</div>
            <div style={{ fontSize:12,color:C.text2,lineHeight:1.7 }}>{card.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
