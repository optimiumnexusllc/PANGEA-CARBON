'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};
const inp = { background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'10px 13px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

export default function SecurityPage() {
  const { lang } = useLang();

  const [status2fa, setStatus2fa] = useState(null);
  const [step, setStep] = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableToken, setDisableToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  useEffect(() => {
    fetchAuthJson('/2fa/status').then(s=>setStatus2fa(s)).catch(()=>{});
  }, []);

  const setupTwoFactor = async () => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/setup', { method:'POST' });
      setQrCode(r.qrCode); setSecret(r.manualEntry?.key||r.secret||''); setStep('scan');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const verifyAndEnable = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/verify', { method:'POST', body:JSON.stringify({ code:token.trim() }) });
      setBackupCodes(r.backupCodes||[]);
      setStatus2fa(s=>({...s, enabled:true}));
      setStep('backup'); setToken('');
      showToast(lang==='fr'?'2FA activé !':'2FA enabled!');
    } catch(e) { showToast(e.message||'Invalid code','error'); }
    finally { setLoading(false); }
  };

  const disableTwoFactor = async () => {
    if (!disableToken.trim()) return;
    setLoading(true);
    try {
      await fetchAuthJson('/2fa/disable', { method:'DELETE', body:JSON.stringify({ code:disableToken.trim() }) });
      setStatus2fa(s=>({...s, enabled:false}));
      setStep('idle'); setDisableToken('');
      showToast(lang==='fr'?'2FA désactivé.':'2FA disabled.');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const regenerateBackup = async () => {
    setLoading(true);
    try {
      const r = await fetchAuthJson('/2fa/backup-codes/regenerate', { method:'POST' });
      setBackupCodes(r.backupCodes||[]);
      showToast(lang==='fr'?'Codes régénérés !':'Codes regenerated!');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(()=>{}); }
    else { const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    showToast(lang==='fr'?'Copié !':'Copied!');
  };

  return (
    <div style={{ padding:24, maxWidth:900, margin:'0 auto' }}>

      {toast && (
        <div style={{ position:'fixed',top:24,right:24,zIndex:99999,maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.07)':'rgba(0,255,148,0.07)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'), borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 40px rgba(0,0,0,0.6)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:C.green }}/>
            <span style={{ fontSize:13,color:C.text,flex:1,marginLeft:8 }}>{toast.msg}</span>
            <button onClick={()=>setToast(null)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16 }}>×</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>
          PANGEA CARBON · {lang==='fr'?'SÉCURITÉ':'SECURITY'} · MFA/2FA/TOTP
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:'0 0 8px' }}>
          {lang==='fr'?'Sécurité du compte':'Account Security'}
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0 }}>
          {lang==='fr'
            ?'Protégez votre compte avec une authentification multi-facteurs (2FA) via application TOTP.'
            :'Protect your account with multi-factor authentication (2FA) via TOTP authenticator app.'}
        </p>
      </div>

      {/* Status card */}
      <div style={{ background:C.card,border:'1px solid '+(status2fa?.enabled?'rgba(0,255,148,0.25)':C.border),borderRadius:16,padding:24,marginBottom:20,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+(status2fa?.enabled?C.green:C.purple)+' 0%,transparent 100%)' }}/>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16 }}>
          <div style={{ display:'flex',gap:16,alignItems:'center' }}>
            <div style={{ width:56,height:56,borderRadius:14,background:status2fa?.enabled?'rgba(0,255,148,0.1)':'rgba(167,139,250,0.1)',border:'1px solid '+(status2fa?.enabled?'rgba(0,255,148,0.25)':'rgba(167,139,250,0.25)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:26 }}>
              {status2fa?.enabled?'🔐':'🔓'}
            </div>
            <div>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>2FA / TOTP</div>
              <div style={{ fontSize:16,fontWeight:700,color:status2fa?.enabled?C.green:C.text2,fontFamily:'Syne, sans-serif',marginBottom:4 }}>
                {status2fa?.enabled
                  ?(lang==='fr'?'Activée — Compte protégé':'Enabled — Account protected')
                  :(lang==='fr'?'Désactivée — Activez 2FA':'Disabled — Enable 2FA')}
              </div>
              <div style={{ fontSize:11,color:C.muted }}>Google Authenticator · Authy · 1Password · Bitwarden</div>
            </div>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            {!status2fa?.enabled ? (
              <button onClick={setupTwoFactor} disabled={loading||step==='scan'}
                style={{ background:C.green,color:C.bg,border:'none',borderRadius:9,padding:'12px 24px',fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {lang==='fr'?'Activer 2FA →':'Enable 2FA →'}
              </button>
            ) : (
              <>
                <button onClick={()=>setStep(step==='disable'?'idle':'disable')}
                  style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:9,color:C.red,padding:'12px 20px',cursor:'pointer',fontSize:13,fontWeight:700 }}>
                  {lang==='fr'?'Désactiver':'Disable'}
                </button>
                <button onClick={regenerateBackup} disabled={loading}
                  style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:'12px 20px',cursor:'pointer',fontSize:13 }}>
                  {lang==='fr'?'Codes de secours':'Backup codes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step: QR scan */}
      {step === 'scan' && (
        <div style={{ background:C.card,border:'1px solid rgba(167,139,250,0.3)',borderRadius:16,padding:28,marginBottom:20,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)' }}/>
          <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:16 }}>
            {lang==='fr'?'ÉTAPE 1 — SCANNER LE QR CODE AVEC VOTRE APPLICATION':'STEP 1 — SCAN QR CODE WITH YOUR AUTHENTICATOR APP'}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'auto 1fr',gap:28,alignItems:'flex-start' }}>
            {qrCode && (
              <div style={{ textAlign:'center' }}>
                <img src={qrCode} alt="2FA QR Code" width={180} height={180} style={{ borderRadius:12,border:'3px solid rgba(167,139,250,0.3)',background:'white',padding:8 }}/>
                <div style={{ fontSize:9,color:C.muted,marginTop:8,fontFamily:'JetBrains Mono, monospace' }}>
                  {lang==='fr'?'Scannez avec votre app':'Scan with your app'}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize:12,color:C.text2,lineHeight:1.9,marginBottom:16,whiteSpace:'pre-line' }}>
                {lang==='fr'
                  ?'1. Ouvrez Google Authenticator, Authy ou similaire\n2. Appuyez sur + puis «Scanner QR code»\n3. Entrez le code à 6 chiffres généré ci-dessous'
                  :'1. Open Google Authenticator, Authy or similar\n2. Tap + then "Scan QR code"\n3. Enter the 6-digit code generated below'}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>
                  {lang==='fr'?'CLÉ MANUELLE':'MANUAL KEY'}
                </div>
                <div style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,padding:'10px 14px',fontFamily:'JetBrains Mono, monospace',fontSize:11,color:C.purple,letterSpacing:'0.08em',wordBreak:'break-all',display:'flex',justifyContent:'space-between',gap:8 }}>
                  <span style={{ flex:1 }}>{secret}</span>
                  <button onClick={()=>copyToClipboard(secret)} style={{ background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16,flexShrink:0 }}>📋</button>
                </div>
              </div>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>
                {lang==='fr'?'CODE DE VÉRIFICATION (6 chiffres)':'VERIFICATION CODE (6 digits)'}
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={token}
                  onChange={e=>setToken(e.target.value.replace(/\D/g,'').slice(0,6))}
                  onKeyDown={e=>{ if(e.key==='Enter'&&token.length===6)verifyAndEnable(); }}
                  style={{ ...inp, flex:1, fontSize:20, textAlign:'center', letterSpacing:'0.3em', fontFamily:'JetBrains Mono, monospace' }}
                  autoFocus/>
                <button onClick={verifyAndEnable} disabled={loading||token.length<6}
                  style={{ background:token.length===6?C.green:C.card2,color:token.length===6?C.bg:C.muted,border:'none',borderRadius:8,padding:'10px 22px',cursor:token.length<6?'not-allowed':'pointer',fontWeight:800,fontSize:13,flexShrink:0 }}>
                  {loading?'⟳':(lang==='fr'?'Activer':'Activate')}
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop:18,padding:'10px 14px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,fontSize:11,color:C.red }}>
            ⚠ {lang==='fr'?'Ne partagez jamais votre clé secrète. Elle donne accès à votre compte.':'Never share your secret key. It grants access to your account.'}
          </div>
        </div>
      )}

      {/* Step: Backup codes */}
      {backupCodes.length > 0 && (
        <div style={{ background:C.card,border:'1px solid rgba(252,211,77,0.3)',borderRadius:16,padding:28,marginBottom:20,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.yellow+' 0%,transparent 100%)' }}/>
          <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
            <div style={{ width:48,height:48,borderRadius:12,background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>🗝</div>
            <div>
              <div style={{ fontSize:9,color:C.yellow,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>{lang==='fr'?'CODES DE SECOURS — À CONSERVER EN LIEU SÛR':'BACKUP CODES — STORE SAFELY'}</div>
              <p style={{ fontSize:12,color:C.text2,margin:0,lineHeight:1.7 }}>
                {lang==='fr'?'Utilisez ces codes si vous perdez votre app TOTP. Chaque code ne peut être utilisé qu\'une seule fois.':'Use these if you lose access to your TOTP app. Each code can only be used once.'}
              </p>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16 }}>
            {backupCodes.map((code,i)=>(
              <div key={i} style={{ background:C.card2,border:'1px solid '+C.border,borderRadius:8,padding:'10px 0',textAlign:'center',fontFamily:'JetBrains Mono, monospace',fontSize:13,fontWeight:700,color:C.yellow,letterSpacing:'0.05em' }}>
                {code}
              </div>
            ))}
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={()=>copyToClipboard('PANGEA CARBON 2FA Backup Codes\n\n'+backupCodes.join('\n'))}
              style={{ background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',borderRadius:8,color:C.yellow,padding:'9px 18px',cursor:'pointer',fontSize:12,fontWeight:700 }}>
              📋 {lang==='fr'?'Copier tout':'Copy all'}
            </button>
          </div>
        </div>
      )}

      {/* Disable 2FA */}
      {step === 'disable' && (
        <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.3)',borderRadius:16,padding:28,marginBottom:20,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.red+' 0%,transparent 100%)' }}/>
          <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',marginBottom:12 }}>
            {lang==='fr'?'DÉSACTIVER 2FA':'DISABLE 2FA'}
          </div>
          <div style={{ padding:'12px 14px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:8,marginBottom:18,fontSize:12,color:C.text2,lineHeight:1.7 }}>
            ⚠ {lang==='fr'?'Votre compte sera moins protégé. Entrez votre code TOTP actuel pour confirmer.':'Your account will be less protected. Enter your current TOTP code to confirm.'}
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={disableToken}
              onChange={e=>setDisableToken(e.target.value.replace(/\D/g,'').slice(0,6))}
              style={{ ...inp, flex:1, fontSize:18, textAlign:'center', letterSpacing:'0.3em', fontFamily:'JetBrains Mono, monospace' }}
              autoFocus/>
            <button onClick={disableTwoFactor} disabled={loading||disableToken.length<6}
              style={{ background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:8,color:C.red,padding:'10px 20px',cursor:'pointer',fontWeight:800,fontSize:13 }}>
              {lang==='fr'?'Confirmer':'Confirm'}
            </button>
            <button onClick={()=>{ setStep('idle'); setDisableToken(''); }}
              style={{ background:'transparent',border:'1px solid '+C.border,borderRadius:8,color:C.muted,padding:'10px 16px',cursor:'pointer',fontSize:12 }}>
              {lang==='fr'?'Annuler':'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:24 }}>
        {[
          { icon:'🔐', color:C.green, title:'TOTP RFC 6238', desc:lang==='fr'?'Codes 6 chiffres valides 30s. Standard international.':'6-digit codes valid 30s. International standard.' },
          { icon:'📱', color:C.blue, title:lang==='fr'?'Apps Compatibles':'Compatible Apps', desc:'Google Authenticator · Authy · Microsoft · 1Password · Bitwarden · Duo' },
          { icon:'🗝', color:C.yellow, title:lang==='fr'?'Codes de secours':'Backup Codes', desc:lang==='fr'?'8 codes usage unique. Accès de secours si téléphone perdu.':'8 one-time codes. Emergency access if phone lost.' },
        ].map(card=>(
          <div key={card.title} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:'16px 18px' }}>
            <div style={{ fontSize:24,marginBottom:10 }}>{card.icon}</div>
            <div style={{ fontSize:10,color:card.color,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>{card.title}</div>
            <div style={{ fontSize:11,color:C.text2,lineHeight:1.6 }}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
