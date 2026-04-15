'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuth, fetchAuthJson } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const NOTIF_TYPES = [
  { key:'notif_email_signup',      icon:'👤', cat:'Auth',   labelEn:'New user signup',          labelFr:'Nouvel utilisateur' },
  { key:'notif_email_verify',      icon:'✉️',  cat:'Auth',   labelEn:'Email verification',       labelFr:'Vérification email' },
  { key:'notif_email_2fa',         icon:'🔐', cat:'Auth',   labelEn:'2FA / MFA code',            labelFr:'Code 2FA / MFA' },
  { key:'notif_email_project',     icon:'🌍', cat:'MRV',    labelEn:'New project created',       labelFr:'Nouveau projet créé' },
  { key:'notif_email_mrv',         icon:'📊', cat:'MRV',    labelEn:'MRV report generated',      labelFr:'Rapport MRV généré' },
  { key:'notif_email_credit',      icon:'⚡', cat:'Carbon', labelEn:'Carbon credits issued',     labelFr:'Crédits carbone émis' },
  { key:'notif_email_marketplace', icon:'🏪', cat:'Carbon', labelEn:'Marketplace order',         labelFr:'Commande marketplace' },
  { key:'notif_email_esg',         icon:'⬡',  cat:'ESG',    labelEn:'ESG assessment complete',   labelFr:'Évaluation ESG complète' },
  { key:'notif_email_pipeline',    icon:'🔄', cat:'Carbon', labelEn:'Pipeline stage change',     labelFr:'Changement étape pipeline' },
  { key:'notif_email_invoice',     icon:'💳', cat:'Billing',labelEn:'Invoice generated',         labelFr:'Facture générée' },
  { key:'notif_email_alert',       icon:'⚠️',  cat:'System', labelEn:'System alert',              labelFr:'Alerte système' },
];

const inp = {background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'10px 13px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box'};

export default function EmailAdminPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab]             = useState('smtp');
  const [settings, setSettings]   = useState({});
  const [notifs, setNotifs]        = useState({});
  const [loading, setLoading]      = useState(true);
  const [saving, setSaving]        = useState(false);
  const [testing, setTesting]      = useState(false);
  const [testResult, setTestResult]= useState(null);
  const [testEmail, setTestEmail]  = useState('');
  const [logs, setLogs]            = useState([]);
  const [toast, setToast]          = useState(null);
  const [showPass, setShowPass]    = useState(false);
  const [smtpStatus, setSmtpStatus]= useState(null);

  const showToast = useCallback((msg, type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/settings/all');
      const data = await res.json();
      const s = {};
      (data.settings||[]).forEach(s2 => { s[s2.key] = s2.value||''; });
      setSettings(s);
      // Load notification toggles
      const notifState = {};
      NOTIF_TYPES.forEach(n => { notifState[n.key] = s[n.key] !== 'false'; });
      setNotifs(notifState);
      setTestEmail(s['smtp_user']||'');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key, value, encrypted=false) => {
    await fetchAuth('/admin/settings/'+key, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ value, encrypted }) });
  };

  const saveSmtp = async () => {
    setSaving(true);
    try {
      const fields = ['smtp_host','smtp_port','smtp_user','smtp_from_name','smtp_from_email'];
      for (const k of fields) await saveSetting(k, settings[k]||'', false);
      if (settings['smtp_password']) await saveSetting('smtp_password', settings['smtp_password'], true);
      showToast(lang==='fr'?'Configuration SMTP sauvegardée !':'SMTP configuration saved!');
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const saveNotifs = async () => {
    setSaving(true);
    try {
      for (const [k,v] of Object.entries(notifs)) await saveSetting(k, String(v), false);
      showToast(lang==='fr'?'Paramètres de notification sauvegardés !':'Notification settings saved!');
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetchAuthJson('/admin/settings/test-smtp', { method:'POST' });
      setTestResult({ ok:true, msg: r.message||'Test email sent!' });
      setSmtpStatus('ok');
      showToast(lang==='fr'?'Email de test envoyé !':'Test email sent successfully!');
    } catch(e) {
      setTestResult({ ok:false, msg: e.message });
      setSmtpStatus('error');
      showToast(e.message,'error');
    } finally { setTesting(false); }
  };

  const set = (key, val) => setSettings(s => ({...s, [key]:val}));

  const PRESETS = [
    { name:'Hostinger', host:'smtp.hostinger.com', port:'465', ssl:true, color:'#7C3AED', icon:'🟣', note:lang==='fr'?'Email professionnel Hostinger — Port SSL 465 recommandé':'Business email Hostinger — SSL port 465 recommended' },
    { name:'Gmail', host:'smtp.gmail.com', port:'587', ssl:false, color:'#EA4335', icon:'📧', note:lang==='fr'?'Gmail — Mot de passe application requis (2FA activée)':'Gmail — App password required (2FA enabled)' },
    { name:'SendGrid', host:'smtp.sendgrid.net', port:'587', ssl:false, color:'#1A82E2', icon:'📤', note:lang==='fr'?'SendGrid — Utilisez API key comme mot de passe, login=apikey':'SendGrid — Use API key as password, login=apikey' },
    { name:'Outlook/O365', host:'smtp.office365.com', port:'587', ssl:false, color:'#0078D4', icon:'📋', note:'Microsoft 365 — TLS port 587' },
  ];

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>

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
        <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.18em',marginBottom:8 }}>
          PANGEA CARBON · SUPER ADMIN · {L('EMAIL & NOTIFICATIONS CENTER','CENTRE EMAIL & NOTIFICATIONS')}
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:'0 0 8px' }}>
          {L('Email & Notification Management','Gestion Email & Notifications')}
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0 }}>
          {L('Configure SMTP server, manage notification types, test delivery and view email logs.','Configurez le serveur SMTP, gérez les types de notifications, testez les envois et consultez les logs.')}
        </p>
      </div>

      {/* Status bar */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24 }}>
        {[
          { l:L('SMTP Status','Statut SMTP'), v:settings['smtp_host']?L('Configured','Configuré'):L('Not configured','Non configuré'), c:settings['smtp_host']?C.green:C.red, icon:'📡' },
          { l:L('SMTP Host','Hôte SMTP'), v:settings['smtp_host']||'—', c:C.blue, icon:'🌐' },
          { l:L('From address','Adresse expéditeur'), v:settings['smtp_from_email']||settings['smtp_user']||'—', c:C.text2, icon:'✉️' },
          { l:L('Test result','Résultat test'), v:smtpStatus==='ok'?'✓ OK':smtpStatus==='error'?'✗ Error':'—', c:smtpStatus==='ok'?C.green:smtpStatus==='error'?C.red:C.muted, icon:'🧪' },
        ].map(k=>(
          <div key={k.l} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+k.c+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:16,marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>{k.l}</div>
            <div style={{ fontSize:12,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono, monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:5,marginBottom:24,width:'fit-content' }}>
        {[
          ['smtp','⚙️ '+L('SMTP Config','Config SMTP')],
          ['notifs','🔔 '+L('Notifications','Notifications')],
          ['test','🧪 '+L('Test & Debug','Test & Debug')],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'10px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'JetBrains Mono, monospace',borderRadius:8,background:tab===id?C.blue:'transparent',color:tab===id?C.bg:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SMTP CONFIG ─────────────────────────────────────────────── */}
      {tab==='smtp' && (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:20 }}>
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

            {/* Presets */}
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)' }}/>
              <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                ⚡ {L('QUICK PRESETS — CLICK TO AUTO-FILL','PRÉRÉGLAGES — CLIQUEZ POUR AUTO-REMPLIR')}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10 }}>
                {PRESETS.map(p=>(
                  <button key={p.name} onClick={()=>{ set('smtp_host',p.host); set('smtp_port',p.port); }}
                    style={{ background:'transparent',border:'1px solid '+p.color+'30',borderRadius:10,padding:'12px 16px',cursor:'pointer',textAlign:'left',transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background=p.color+'08'; e.currentTarget.style.borderColor=p.color+'60'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=p.color+'30'; }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                      <span style={{ fontSize:18 }}>{p.icon}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:p.color }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:3 }}>{p.host} · {p.port}</div>
                    <div style={{ fontSize:10,color:C.text2,lineHeight:1.5 }}>{p.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Fields */}
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:20,letterSpacing:'0.1em' }}>
                ⚙️ {L('SMTP SERVER CONFIGURATION','CONFIGURATION SERVEUR SMTP')}
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 140px',gap:12,marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>SMTP HOST *</label>
                  <input value={settings['smtp_host']||''} onChange={e=>set('smtp_host',e.target.value)}
                    placeholder="smtp.hostinger.com" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>PORT *</label>
                  <input value={settings['smtp_port']||''} onChange={e=>set('smtp_port',e.target.value)}
                    placeholder="465" style={inp}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('LOGIN EMAIL *','EMAIL DE CONNEXION *')} <span style={{ color:C.muted }}>({L('same as your Hostinger email','identique à votre email Hostinger')})</span>
                </label>
                <input value={settings['smtp_user']||''} onChange={e=>set('smtp_user',e.target.value)}
                  placeholder="contact@pangea-carbon.com" style={inp}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('PASSWORD *','MOT DE PASSE *')} <span style={{ fontSize:8,color:C.purple }}>🔐 {L('Encrypted in database','Chiffré en base de données')}</span>
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={settings['smtp_password']||''} onChange={e=>set('smtp_password',e.target.value)}
                    placeholder={settings['smtp_password']?'••••••••':L('Enter Hostinger email password','Entrez le mot de passe email Hostinger')}
                    style={{ ...inp, paddingRight:44 }}/>
                  <button onClick={()=>setShowPass(!showPass)} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    {L('SENDER NAME','NOM EXPÉDITEUR')}
                  </label>
                  <input value={settings['smtp_from_name']||''} onChange={e=>set('smtp_from_name',e.target.value)}
                    placeholder="PANGEA CARBON" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    {L('SENDER EMAIL','EMAIL EXPÉDITEUR')}
                  </label>
                  <input value={settings['smtp_from_email']||''} onChange={e=>set('smtp_from_email',e.target.value)}
                    placeholder="noreply@pangea-carbon.com" style={inp}/>
                </div>
              </div>

              <div style={{ display:'flex',gap:10 }}>
                <button onClick={saveSmtp} disabled={saving}
                  style={{ flex:1,background:saving?C.card2:C.green,color:saving?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,cursor:saving?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                  {saving?'⟳ '+L('Saving...','Sauvegarde...'):'✓ '+L('Save SMTP configuration','Sauvegarder la configuration SMTP')}
                </button>
                <button onClick={()=>setTab('test')}
                  style={{ background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.25)',borderRadius:9,color:C.blue,padding:'13px 20px',cursor:'pointer',fontSize:12,fontWeight:700 }}>
                  🧪 {L('Test →','Tester →')}
                </button>
              </div>
            </div>
          </div>

          {/* Hostinger Guide */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08) 0%,rgba(56,189,248,0.05) 100%)', border:'1px solid rgba(124,58,237,0.3)',borderRadius:16,padding:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7C3AED 0%,'+C.blue+' 100%)' }}/>
              <div style={{ fontSize:9,color:'#7C3AED',fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                🟣 HOSTINGER · {L('STEP BY STEP GUIDE','GUIDE ÉTAPE PAR ÉTAPE')}
              </div>
              {[
                { n:'1', t:L('Login to Hostinger','Connectez-vous à Hostinger'), d:'hpanel.hostinger.com → Emails → Email Accounts' },
                { n:'2', t:L('Find SMTP settings','Trouvez les paramètres SMTP'), d:L('Click on your email → Configure email client → SMTP','Cliquez sur votre email → Configurer le client → SMTP') },
                { n:'3', t:'SMTP Host', d:'smtp.hostinger.com' },
                { n:'4', t:'Port SSL', d:'465 (SSL/TLS) — '+L('recommended','recommandé') },
                { n:'5', t:L('Login & Password','Identifiants'), d:L('Use your full email address as login','Utilisez votre adresse email complète comme identifiant') },
                { n:'6', t:L('Test & Save','Tester & Sauvegarder'), d:L('Click "Test" after saving to verify delivery','Cliquez "Tester" après sauvegarde pour vérifier') },
              ].map(s=>(
                <div key={s.n} style={{ display:'flex',gap:10,marginBottom:12,alignItems:'flex-start' }}>
                  <div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#A78BFA',fontWeight:800,flexShrink:0,marginTop:1 }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:C.text,marginBottom:2 }}>{s.t}</div>
                    <div style={{ fontSize:10,color:C.muted,lineHeight:1.5 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security note */}
            <div style={{ background:'rgba(0,255,148,0.04)',border:'1px solid rgba(0,255,148,0.15)',borderRadius:12,padding:16 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>🔐 {L('SECURITY','SÉCURITÉ')}</div>
              <div style={{ fontSize:11,color:C.text2,lineHeight:1.7 }}>
                {L('SMTP passwords are encrypted with AES-256 before storage. They are never accessible in plain text from the interface.','Les mots de passe SMTP sont chiffrés AES-256 avant stockage. Ils ne sont jamais accessibles en clair depuis l\'interface.')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ──────────────────────────────────────────── */}
      {tab==='notifs' && (
        <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,overflow:'hidden' }}>
          <div style={{ padding:'16px 22px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:3 }}>
                {L('EMAIL NOTIFICATION TYPES — ENABLE / DISABLE PER TYPE','TYPES DE NOTIFICATIONS EMAIL — ACTIVER / DÉSACTIVER')}
              </div>
              <div style={{ fontSize:14,color:C.text,fontWeight:600 }}>
                {Object.values(notifs).filter(Boolean).length} / {NOTIF_TYPES.length} {L('active','actifs')}
              </div>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setNotifs(n=>Object.fromEntries(Object.keys(n).map(k=>[k,true])))}
                style={{ background:'rgba(0,255,148,0.08)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:8,color:C.green,padding:'7px 14px',cursor:'pointer',fontSize:11,fontWeight:700 }}>
                {L('All ON','Tout activer')}
              </button>
              <button onClick={()=>setNotifs(n=>Object.fromEntries(Object.keys(n).map(k=>[k,false])))}
                style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'7px 14px',cursor:'pointer',fontSize:11,fontWeight:700 }}>
                {L('All OFF','Tout désactiver')}
              </button>
            </div>
          </div>

          {['Auth','MRV','Carbon','ESG','Billing','System'].map(cat=>{
            const items = NOTIF_TYPES.filter(n=>n.cat===cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <div style={{ padding:'10px 22px',background:'rgba(255,255,255,0.015)',borderBottom:'1px solid '+C.border+'60' }}>
                  <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>{cat.toUpperCase()}</span>
                </div>
                {items.map((notif,i)=>(
                  <div key={notif.key}
                    style={{ padding:'14px 22px',borderBottom:i<items.length-1?'1px solid '+C.border+'30':'none',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <span style={{ fontSize:20,flexShrink:0 }}>{notif.icon}</span>
                      <div>
                        <div style={{ fontSize:13,color:notifs[notif.key]?C.text:C.muted,fontWeight:600 }}>
                          {lang==='fr'?notif.labelFr:notif.labelEn}
                        </div>
                        <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{notif.key}</div>
                      </div>
                    </div>
                    <button onClick={()=>setNotifs(n=>({...n,[notif.key]:!n[notif.key]}))}
                      style={{ width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',background:notifs[notif.key]?C.green:'#1E2D3D',position:'relative',transition:'background .2s',flexShrink:0 }}>
                      <div style={{ position:'absolute',top:3,left:notifs[notif.key]?24:3,width:20,height:20,borderRadius:'50%',background:'white',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ padding:20,borderTop:'1px solid '+C.border,display:'flex',gap:10 }}>
            <button onClick={saveNotifs} disabled={saving}
              style={{ flex:1,background:saving?C.card2:C.green,color:saving?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,cursor:saving?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
              {saving?'⟳ '+L('Saving...','Sauvegarde...'):'✓ '+L('Save notification settings','Sauvegarder les paramètres')}
            </button>
          </div>
        </div>
      )}

      {/* ── TEST & DEBUG ───────────────────────────────────────────── */}
      {tab==='test' && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

          {/* Test send */}
          <div style={{ background:C.card,border:'1px solid rgba(56,189,248,0.25)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.blue+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>
              🧪 {L('SMTP CONNECTION & DELIVERY TEST','TEST DE CONNEXION & LIVRAISON SMTP')}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:12,marginBottom:16 }}>
              <div>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('RECIPIENT EMAIL FOR TEST','EMAIL DESTINATAIRE DU TEST')}
                </label>
                <input value={testEmail} onChange={e=>setTestEmail(e.target.value)}
                  placeholder="admin@pangea-carbon.com" style={inp}/>
              </div>
              <div style={{ display:'flex',alignItems:'flex-end' }}>
                <button onClick={sendTestEmail} disabled={testing||!settings['smtp_host']}
                  style={{ background:testing?C.card2:settings['smtp_host']?C.blue:C.card2, color:testing?C.muted:settings['smtp_host']?C.bg:C.muted, border:'none', borderRadius:9, padding:'11px 24px', cursor:testing||!settings['smtp_host']?'not-allowed':'pointer', fontWeight:800, fontSize:13, whiteSpace:'nowrap' }}>
                  {testing?'⟳ '+L('Sending...','Envoi...'):'📨 '+L('Send test email','Envoyer email test')}
                </button>
              </div>
            </div>

            {testResult && (
              <div style={{ padding:'14px 16px',background:testResult.ok?'rgba(0,255,148,0.06)':'rgba(248,113,113,0.06)', border:'1px solid '+(testResult.ok?'rgba(0,255,148,0.3)':'rgba(248,113,113,0.3)'),borderRadius:10,display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ fontSize:20 }}>{testResult.ok?'✅':'❌'}</span>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:testResult.ok?C.green:C.red,marginBottom:4 }}>
                    {testResult.ok?L('SMTP test successful!','Test SMTP réussi !'):L('SMTP test failed','Test SMTP échoué')}
                  </div>
                  <div style={{ fontSize:12,color:C.text2,fontFamily:'JetBrains Mono, monospace' }}>{testResult.msg}</div>
                </div>
              </div>
            )}
          </div>

          {/* Config check */}
          <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,padding:22 }}>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:16,letterSpacing:'0.1em' }}>
              📋 {L('CONFIGURATION CHECKLIST','LISTE DE VÉRIFICATION')}
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { l:'smtp_host',        label:L('SMTP Host defined','Hôte SMTP défini') },
                { l:'smtp_port',        label:L('SMTP Port defined','Port SMTP défini') },
                { l:'smtp_user',        label:L('Login email defined','Email de connexion défini') },
                { l:'smtp_password',    label:L('Password saved','Mot de passe sauvegardé') },
                { l:'smtp_from_email',  label:L('Sender email defined','Email expéditeur défini') },
                { l:'smtp_from_name',   label:L('Sender name defined','Nom expéditeur défini') },
              ].map(item=>{
                const ok = !!(settings[item.l]);
                return (
                  <div key={item.l} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:C.card2,borderRadius:8,border:'1px solid '+(ok?'rgba(0,255,148,0.12)':C.border) }}>
                    <div style={{ width:20,height:20,borderRadius:'50%',background:ok?'rgba(0,255,148,0.15)':'rgba(248,113,113,0.1)',border:'1px solid '+(ok?'rgba(0,255,148,0.3)':'rgba(248,113,113,0.3)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:ok?C.green:C.red,flexShrink:0,fontWeight:800 }}>
                      {ok?'✓':'✗'}
                    </div>
                    <span style={{ fontSize:12,color:ok?C.text:C.muted }}>{item.label}</span>
                    <span style={{ marginLeft:'auto',fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{item.l}</span>
                    {settings[item.l]&&item.l!=='smtp_password'&&(
                      <span style={{ fontSize:10,color:C.text2,fontFamily:'JetBrains Mono, monospace',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{settings[item.l]}</span>
                    )}
                    {item.l==='smtp_password'&&settings[item.l]&&(
                      <span style={{ fontSize:10,color:C.purple }}>🔐 {L('Encrypted','Chiffré')}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:14,padding:'12px 14px',background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:8,fontSize:11,color:C.text2,lineHeight:1.7 }}>
              💡 {L('For Hostinger: use smtp.hostinger.com port 465 (SSL). Your login is your full email address and password is your Hostinger email password.','Pour Hostinger: utilisez smtp.hostinger.com port 465 (SSL). Le login est votre adresse email complète et le mot de passe est celui de votre messagerie Hostinger.')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
