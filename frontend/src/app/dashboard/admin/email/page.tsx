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
const inp = {background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text, padding:'10px 13px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box'};

const NOTIF_TYPES = [
  { key:'notif_email_signup',      icon:'👤', cat:'Auth',    en:'New user signup',          fr:'Nouvel utilisateur' },
  { key:'notif_email_verify',      icon:'✉️',  cat:'Auth',    en:'Email verification',       fr:'Vérification email' },
  { key:'notif_email_2fa',         icon:'🔐', cat:'Auth',    en:'2FA / MFA OTP code',       fr:'Code 2FA / MFA' },
  { key:'notif_email_password',    icon:'🔑', cat:'Auth',    en:'Password reset',           fr:'Réinitialisation mot de passe' },
  { key:'notif_email_project',     icon:'🌍', cat:'MRV',     en:'New project created',      fr:'Nouveau projet créé' },
  { key:'notif_email_mrv',         icon:'📊', cat:'MRV',     en:'MRV report generated',     fr:'Rapport MRV généré' },
  { key:'notif_email_credit',      icon:'⚡', cat:'Carbon',  en:'Carbon credits issued',    fr:'Crédits carbone émis' },
  { key:'notif_email_marketplace', icon:'🏪', cat:'Carbon',  en:'Marketplace order',        fr:'Commande marketplace' },
  { key:'notif_email_pipeline',    icon:'🔄', cat:'Carbon',  en:'Pipeline stage change',    fr:'Changement étape pipeline' },
  { key:'notif_email_esg',         icon:'⬡',  cat:'ESG',     en:'ESG assessment complete',  fr:'Évaluation ESG terminée' },
  { key:'notif_email_invoice',     icon:'💳', cat:'Billing', en:'Invoice generated',        fr:'Facture générée' },
  { key:'notif_email_payment',     icon:'✅', cat:'Billing', en:'Payment confirmed',        fr:'Paiement confirmé' },
  { key:'notif_email_alert',       icon:'⚠️',  cat:'System',  en:'System alert',             fr:'Alerte système' },
  { key:'notif_email_digest',      icon:'📈', cat:'System',  en:'Weekly digest',            fr:'Résumé hebdomadaire' },
];

const PRESETS = [
  { id:'hostinger',  name:'Hostinger',       host:'smtp.hostinger.com',   port:'465', color:'#7C3AED', icon:'🟣',
    en:'Hostinger Business Email — SSL port 465', fr:'Email Hostinger — Port SSL 465' },
  { id:'gmail',      name:'Gmail',            host:'smtp.gmail.com',       port:'587', color:'#EA4335', icon:'📧',
    en:'Gmail — App password required (2FA on)', fr:'Gmail — Mot de passe application requis' },
  { id:'sendgrid',   name:'SendGrid',         host:'smtp.sendgrid.net',    port:'587', color:'#1A82E2', icon:'📤',
    en:'SendGrid — login=apikey, pass=API Key',  fr:'SendGrid — login=apikey, pass=API Key' },
  { id:'outlook',    name:'Outlook / O365',   host:'smtp.office365.com',   port:'587', color:'#0078D4', icon:'📋',
    en:'Microsoft 365 — TLS port 587',           fr:'Microsoft 365 — TLS port 587' },
  { id:'ovh',        name:'OVH / OVHcloud',   host:'ssl0.ovh.net',         port:'465', color:'#00B2FF', icon:'☁️',
    en:'OVH hosting email — SSL port 465',       fr:'Email OVH — Port SSL 465' },
  { id:'mailgun',    name:'Mailgun',           host:'smtp.mailgun.org',     port:'587', color:'#F06A35', icon:'🔫',
    en:'Mailgun — Use SMTP credentials from dashboard', fr:'Mailgun — Identifiants SMTP depuis le dashboard' },
];

export default function EmailAdminPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab]               = useState('smtp');
  const [settings, setSettings]     = useState({});
  const [notifs, setNotifs]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testEmail, setTestEmail]   = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showPass, setShowPass]     = useState(false);
  const [smtpOk, setSmtpOk]        = useState(null);
  const [toast, setToast]           = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const showToast = useCallback((msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuth('/admin/settings');
      const data = await res.json();
      const s = {};
      (data.settings||[]).forEach(x => { s[x.key] = x.value||''; });
      setSettings(s);
      const ns = {};
      NOTIF_TYPES.forEach(n => { ns[n.key] = s[n.key] !== 'false'; });
      setNotifs(ns);
      setTestEmail(s['smtp_from_email']||s['smtp_user']||'');
    } catch(e) { showToast(e.message,'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const set = (key, val) => setSettings(s => ({...s, [key]:val}));

  const bulkSave = async (items) => {
    const res = await fetchAuth('/admin/settings/bulk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ settings: items })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error||'Save failed'); }
    return res.json();
  };

  const saveSmtp = async () => {
    setSaving(true);
    try {
      const items = [
        { key:'smtp_host',       value:settings['smtp_host']||'' },
        { key:'smtp_port',       value:settings['smtp_port']||'' },
        { key:'smtp_user',       value:settings['smtp_user']||'' },
        { key:'smtp_from_name',  value:settings['smtp_from_name']||'' },
        { key:'smtp_from_email', value:settings['smtp_from_email']||'' },
      ];
      if (settings['smtp_password']) items.push({ key:'smtp_password', value:settings['smtp_password'] });
      const r = await bulkSave(items);
      showToast((lang==='fr'?'SMTP sauvegardé — ':'SMTP saved — ')+r.saved+'/'+(r.total)+' OK');
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const saveNotifs = async () => {
    setSaving(true);
    try {
      const items = Object.entries(notifs).map(([k,v])=>({ key:k, value:String(v) }));
      const r = await bulkSave(items);
      showToast((lang==='fr'?'Notifications sauvegardées — ':'Notifications saved — ')+r.saved+'/'+(r.total)+' OK');
    } catch(e) { showToast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testEmail||!settings['smtp_host']) return;
    setTesting(true); setTestResult(null);
    try {
      const r = await fetchAuthJson('/admin/settings/test-smtp', {
        method:'POST', body:JSON.stringify({ to:testEmail })
      });
      setTestResult({ ok:true, msg:r.message||'OK' });
      setSmtpOk(true);
      showToast(lang==='fr'?'Email de test envoyé !':'Test email sent!');
    } catch(e) {
      const apiErr = e.apiError||{};
      setTestResult({ ok:false, msg:e.message, diagnostic:apiErr.diagnostic||null });
      setSmtpOk(false);
      showToast(e.message,'error');
    } finally { setTesting(false); }
  };

  const configured = !!(settings['smtp_host']&&settings['smtp_user']);
  const score = [settings['smtp_host'],settings['smtp_port'],settings['smtp_user'],settings['smtp_password'],settings['smtp_from_email'],settings['smtp_from_name']].filter(Boolean).length;
  const scoreColor = score===6?C.green:score>=4?C.yellow:score>=2?C.orange:C.red;

  return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>

      {/* Toast PANGEA */}
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

      {/* Modal confirm PANGEA */}
      {confirmModal && (
        <div onClick={e=>{if(e.target===e.currentTarget)setConfirmModal(null);}}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.9)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(252,211,77,0.35)',borderRadius:18,padding:28,maxWidth:460,width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.8)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.yellow+' 0%,transparent 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:52,height:52,borderRadius:13,background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{confirmModal.icon||'⚠️'}</div>
              <div>
                <div style={{ fontSize:9,color:C.yellow,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.13em',marginBottom:4 }}>PANGEA CARBON · ADMIN · {confirmModal.eyebrow||'CONFIRM'}</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.text,margin:0 }}>{confirmModal.title}</h2>
              </div>
            </div>
            <p style={{ fontSize:13,color:C.text2,marginBottom:20,lineHeight:1.7 }}>{confirmModal.body}</p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setConfirmModal(null)} style={{ flex:1,background:'transparent',border:'1px solid '+C.border,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>
                {L('Cancel','Annuler')}
              </button>
              <button onClick={()=>{ confirmModal.onConfirm(); setConfirmModal(null); }}
                style={{ flex:1,background:'rgba(252,211,77,0.12)',border:'1px solid rgba(252,211,77,0.4)',borderRadius:9,color:C.yellow,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                {confirmModal.confirmLabel||'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.18em',marginBottom:8 }}>
          PANGEA CARBON · SUPER ADMIN · {L('EMAIL & NOTIFICATIONS CENTER','CENTRE EMAIL & NOTIFICATIONS')}
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:28,fontWeight:800,color:C.text,margin:'0 0 8px' }}>
          {L('Email & Notification Management','Gestion Email & Notifications')}
        </h1>
        <p style={{ fontSize:13,color:C.muted,margin:0 }}>
          {L('Configure SMTP, manage notification types, test delivery and monitor email health.','Configurez SMTP, gérez les notifications, testez les envois et surveillez l\'état de la messagerie.')}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24 }}>
        {[
          { l:L('SMTP Status','Statut SMTP'),     v:configured?L('Configured','Configuré'):L('Not set','Non configuré'), c:configured?C.green:C.red, icon:'📡' },
          { l:L('Config Score','Score config'),   v:score+'/6', c:scoreColor, icon:'📊' },
          { l:'SMTP Host',                        v:settings['smtp_host']||'—', c:C.blue, icon:'🌐' },
          { l:L('Last test','Dernier test'),      v:smtpOk===true?'✓ OK':smtpOk===false?'✗ Error':'—', c:smtpOk===true?C.green:smtpOk===false?C.red:C.muted, icon:'🧪' },
          { l:L('Active notifs','Notifs actives'),v:Object.values(notifs).filter(Boolean).length+'/'+NOTIF_TYPES.length, c:C.purple, icon:'🔔' },
        ].map(k=>(
          <div key={k.l} style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,'+k.c+' 0%,transparent 100%)' }}/>
            <div style={{ fontSize:18,marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>{k.l}</div>
            <div style={{ fontSize:11,fontWeight:700,color:k.c,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:5,marginBottom:24,width:'fit-content' }}>
        {[
          ['smtp', '⚙️ SMTP'],
          ['notifs', '🔔 '+L('Notifications','Notifications')],
          ['test', '🧪 '+L('Test','Test')],
          ['guide', '📖 '+L('Guide Hostinger','Guide Hostinger')],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'10px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'JetBrains Mono, monospace',borderRadius:8,background:tab===id?C.blue:'transparent',color:tab===id?C.bg:C.muted,transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SMTP ─────────────────────────────────────────────────────── */}
      {tab==='smtp' && (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:20 }}>
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

            {/* Presets */}
            <div style={{ background:C.card,border:'1px solid rgba(167,139,250,0.25)',borderRadius:16,padding:20,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.purple+' 0%,transparent 100%)' }}/>
              <div style={{ fontSize:9,color:C.purple,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                ⚡ {L('PROVIDER PRESETS — CLICK TO AUTO-FILL HOST & PORT','PRÉRÉGLAGES FOURNISSEUR — CLIQUEZ POUR AUTO-REMPLIR')}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {PRESETS.map(p=>(
                  <button key={p.id} onClick={()=>{ set('smtp_host',p.host); set('smtp_port',p.port); }}
                    style={{ background:'transparent',border:'1px solid '+p.color+'30',borderRadius:10,padding:'12px 14px',cursor:'pointer',textAlign:'left',transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background=p.color+'0A'; e.currentTarget.style.borderColor=p.color+'60'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=p.color+'30'; }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
                      <span style={{ fontSize:16 }}>{p.icon}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:p.color }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:2 }}>{p.host} · {p.port}</div>
                    <div style={{ fontSize:10,color:C.text2,lineHeight:1.4 }}>{lang==='fr'?p.fr:p.en}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP fields */}
            <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.2)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.green+' 0%,transparent 100%)' }}/>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:20,letterSpacing:'0.1em' }}>
                ⚙️ {L('SMTP SERVER CONFIGURATION','CONFIGURATION SERVEUR SMTP')}
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 140px',gap:12,marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    SMTP HOST * <span style={{ color:C.muted,fontWeight:400 }}>(ex: smtp.hostinger.com)</span>
                  </label>
                  <input value={settings['smtp_host']||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.hostinger.com" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    PORT * <span style={{ color:C.muted,fontWeight:400 }}>(SSL=465)</span>
                  </label>
                  <input value={settings['smtp_port']||''} onChange={e=>set('smtp_port',e.target.value)} placeholder="465" style={inp}/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('LOGIN EMAIL *','EMAIL DE CONNEXION *')}
                  <span style={{ color:C.muted,fontWeight:400,marginLeft:6 }}>{L('(full email address = Hostinger login)','(adresse email complète = identifiant Hostinger)')}</span>
                </label>
                <input value={settings['smtp_user']||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="contact@pangea-carbon.com" style={inp}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('PASSWORD *','MOT DE PASSE *')}
                  <span style={{ fontSize:8,color:C.purple,marginLeft:6 }}>🔐 AES-256</span>
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={settings['smtp_password']||''}
                    onChange={e=>set('smtp_password',e.target.value)}
                    placeholder={settings['smtp_password']?'••••••••':L('Hostinger email password','Mot de passe email Hostinger')}
                    style={{ ...inp, paddingRight:46 }}/>
                  <button onClick={()=>setShowPass(!showPass)}
                    style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',color:C.muted,cursor:'pointer',fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    {L('SENDER NAME','NOM EXPÉDITEUR')}
                  </label>
                  <input value={settings['smtp_from_name']||''} onChange={e=>set('smtp_from_name',e.target.value)} placeholder="PANGEA CARBON" style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                    {L('SENDER EMAIL','EMAIL EXPÉDITEUR')}
                  </label>
                  <input value={settings['smtp_from_email']||''} onChange={e=>set('smtp_from_email',e.target.value)} placeholder="noreply@pangea-carbon.com" style={inp}/>
                </div>
              </div>

              {/* Config score bar */}
              <div style={{ background:C.card2,borderRadius:8,padding:'10px 14px',marginBottom:20 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                  <span style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                    {L('Config completeness','Complétude de la configuration')}
                  </span>
                  <span style={{ fontSize:11,fontWeight:700,color:scoreColor }}>{score}/6</span>
                </div>
                <div style={{ height:4,background:C.border,borderRadius:2 }}>
                  <div style={{ width:(score/6*100)+'%',height:'100%',background:scoreColor,borderRadius:2,transition:'width .3s' }}/>
                </div>
              </div>

              <div style={{ display:'flex',gap:10 }}>
                <button onClick={saveSmtp} disabled={saving}
                  style={{ flex:1,background:saving?C.card2:C.green,color:saving?C.muted:C.bg,border:'none',borderRadius:9,padding:13,fontWeight:800,cursor:saving?'wait':'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                  {saving?'⟳ '+(lang==='fr'?'Sauvegarde...':'Saving...'):'✓ '+(lang==='fr'?'Sauvegarder la configuration':'Save configuration')}
                </button>
                <button onClick={()=>setTab('test')}
                  style={{ background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.25)',borderRadius:9,color:C.blue,padding:'13px 20px',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0 }}>
                  🧪 {L('Test →','Tester →')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Security + checklist */}
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>

            {/* Checklist */}
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:18 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>
                📋 {L('CHECKLIST','LISTE DE VÉRIFICATION')}
              </div>
              {[
                { k:'smtp_host',       l:L('SMTP Host','Hôte SMTP') },
                { k:'smtp_port',       l:'Port' },
                { k:'smtp_user',       l:L('Login email','Email connexion') },
                { k:'smtp_password',   l:L('Password','Mot de passe'), encrypted:true },
                { k:'smtp_from_email', l:L('Sender email','Email expéditeur') },
                { k:'smtp_from_name',  l:L('Sender name','Nom expéditeur') },
              ].map(item=>{
                const ok = !!(settings[item.k]);
                return (
                  <div key={item.k} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid '+C.border+'30' }}>
                    <div style={{ width:18,height:18,borderRadius:'50%',background:ok?'rgba(0,255,148,0.15)':'rgba(248,113,113,0.1)',border:'1px solid '+(ok?'rgba(0,255,148,0.4)':'rgba(248,113,113,0.3)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:ok?C.green:C.red,fontWeight:800,flexShrink:0 }}>
                      {ok?'✓':'✗'}
                    </div>
                    <span style={{ fontSize:11,color:ok?C.text:C.muted,flex:1 }}>{item.l}</span>
                    {ok&&item.encrypted&&<span style={{ fontSize:9,color:C.purple }}>🔐</span>}
                    {ok&&!item.encrypted&&<span style={{ fontSize:9,color:C.text2,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{settings[item.k]}</span>}
                  </div>
                );
              })}
            </div>

            {/* Security */}
            <div style={{ background:'rgba(0,255,148,0.04)',border:'1px solid rgba(0,255,148,0.15)',borderRadius:12,padding:16 }}>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>🔐 {L('SECURITY','SÉCURITÉ')}</div>
              <div style={{ fontSize:11,color:C.text2,lineHeight:1.7 }}>
                {L('SMTP passwords are encrypted with AES-256-GCM before database storage. Never accessible in plain text.','Les mots de passe SMTP sont chiffrés AES-256-GCM avant stockage. Jamais accessibles en clair.')}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:12,padding:16 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12 }}>
                {L('QUICK ACTIONS','ACTIONS RAPIDES')}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                <button onClick={()=>setConfirmModal({
                  icon:'🗑', eyebrow:'SMTP RESET',
                  title:L('Reset SMTP configuration?','Réinitialiser la config SMTP ?'),
                  body:L('All SMTP settings will be cleared. You will need to reconfigure.','Tous les paramètres SMTP seront effacés. Vous devrez reconfigurer.'),
                  confirmLabel:L('Reset','Réinitialiser'),
                  onConfirm:()=>{ ['smtp_host','smtp_port','smtp_user','smtp_password','smtp_from_name','smtp_from_email'].forEach(k=>set(k,'')); }
                })} style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'8px 14px',cursor:'pointer',fontSize:12,fontWeight:600 }}>
                  🗑 {L('Reset SMTP config','Réinitialiser config SMTP')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ──────────────────────────────────────────── */}
      {tab==='notifs' && (
        <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:16,overflow:'hidden' }}>
          <div style={{ padding:'16px 22px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
            <div>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:3,letterSpacing:'0.1em' }}>
                {L('EMAIL NOTIFICATION TYPES','TYPES DE NOTIFICATIONS EMAIL')} · {L('ENABLE / DISABLE','ACTIVER / DÉSACTIVER')}
              </div>
              <div style={{ fontSize:14,color:C.text,fontWeight:600 }}>
                {Object.values(notifs).filter(Boolean).length}/{NOTIF_TYPES.length} {L('active','actifs')}
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>setNotifs(n=>Object.fromEntries(Object.keys(n).map(k=>[k,true])))}
                style={{ background:'rgba(0,255,148,0.08)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:8,color:C.green,padding:'8px 16px',cursor:'pointer',fontSize:12,fontWeight:700 }}>
                {L('Enable all','Tout activer')}
              </button>
              <button onClick={()=>setNotifs(n=>Object.fromEntries(Object.keys(n).map(k=>[k,false])))}
                style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'8px 16px',cursor:'pointer',fontSize:12,fontWeight:700 }}>
                {L('Disable all','Tout désactiver')}
              </button>
              <button onClick={saveNotifs} disabled={saving}
                style={{ background:saving?C.card2:C.green,color:saving?C.muted:C.bg,border:'none',borderRadius:8,padding:'8px 18px',cursor:saving?'wait':'pointer',fontSize:12,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
                {saving?'⟳':('✓ '+L('Save','Sauver'))}
              </button>
            </div>
          </div>

          {['Auth','MRV','Carbon','ESG','Billing','System'].map(cat=>{
            const items = NOTIF_TYPES.filter(n=>n.cat===cat);
            if (!items.length) return null;
            const activeCount = items.filter(n=>notifs[n.key]).length;
            return (
              <div key={cat}>
                <div style={{ padding:'10px 22px',background:'rgba(255,255,255,0.012)',borderBottom:'1px solid '+C.border+'50',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',fontWeight:700 }}>{cat.toUpperCase()}</span>
                  <span style={{ fontSize:9,color:activeCount===items.length?C.green:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{activeCount}/{items.length}</span>
                </div>
                {items.map((notif,i)=>(
                  <div key={notif.key}
                    style={{ padding:'14px 22px',borderBottom:i<items.length-1?'1px solid '+C.border+'25':'none',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(30,45,61,0.2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <span style={{ fontSize:20,flexShrink:0 }}>{notif.icon}</span>
                      <div>
                        <div style={{ fontSize:13,color:notifs[notif.key]?C.text:C.muted,fontWeight:600 }}>
                          {lang==='fr'?notif.fr:notif.en}
                        </div>
                        <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginTop:2 }}>{notif.key}</div>
                      </div>
                    </div>
                    <button onClick={()=>setNotifs(n=>({...n,[notif.key]:!n[notif.key]}))}
                      style={{ width:50,height:26,borderRadius:13,border:'none',cursor:'pointer',background:notifs[notif.key]?C.green:'#1E2D3D',position:'relative',transition:'background .2s',flexShrink:0 }}>
                      <div style={{ position:'absolute',top:3,left:notifs[notif.key]?26:3,width:20,height:20,borderRadius:'50%',background:'white',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }}/>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TEST ─────────────────────────────────────────────────────── */}
      {tab==='test' && (
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(56,189,248,0.25)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+C.blue+' 0%,transparent 100%)' }}/>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🧪</div>
              <div>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:3 }}>
                  {L('SMTP TEST — LIVE DELIVERY CHECK','TEST SMTP — VÉRIFICATION DE LIVRAISON EN DIRECT')}
                </div>
                <h3 style={{ fontFamily:'Syne, sans-serif',fontSize:16,fontWeight:800,color:C.text,margin:0 }}>
                  {L('Send a test email','Envoyer un email de test')}
                </h3>
              </div>
            </div>

            {!configured && (
              <div style={{ padding:'12px 14px',background:'rgba(252,211,77,0.06)',border:'1px solid rgba(252,211,77,0.25)',borderRadius:8,marginBottom:16,fontSize:12,color:C.yellow }}>
                ⚠ {L('Configure SMTP first in the SMTP tab before testing.','Configurez d\'abord le SMTP dans l\'onglet SMTP avant de tester.')}
              </div>
            )}

            <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:12,marginBottom:16 }}>
              <div>
                <label style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',display:'block',marginBottom:6 }}>
                  {L('TEST EMAIL RECIPIENT','EMAIL DESTINATAIRE DU TEST')}
                </label>
                <input value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="contact@pangea-carbon.com" style={inp}/>
              </div>
              <div style={{ display:'flex',alignItems:'flex-end' }}>
                <button onClick={sendTest} disabled={testing||!configured||!testEmail}
                  style={{ background:testing||!configured||!testEmail?C.card2:C.blue, color:testing||!configured||!testEmail?C.muted:C.bg, border:'none', borderRadius:9, padding:'11px 24px', cursor:testing||!configured||!testEmail?'not-allowed':'pointer', fontWeight:800, fontSize:13, whiteSpace:'nowrap' }}>
                  {testing?'⟳ '+(lang==='fr'?'Envoi...':'Sending...'):'📨 '+(lang==='fr'?'Envoyer test':'Send test')}
                </button>
              </div>
            </div>

            {testResult && (
              <div style={{ padding:'18px 20px',background:testResult.ok?'rgba(0,255,148,0.06)':'rgba(248,113,113,0.06)', border:'1px solid '+(testResult.ok?'rgba(0,255,148,0.3)':'rgba(248,113,113,0.3)'),borderRadius:12,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',left:0,top:0,bottom:0,width:4,borderRadius:'12px 0 0 12px',background:testResult.ok?C.green:C.red }}/>
                <div style={{ display:'flex',alignItems:'flex-start',gap:14,paddingLeft:8 }}>
                  <div style={{ width:42,height:42,borderRadius:10,background:testResult.ok?'rgba(0,255,148,0.15)':'rgba(248,113,113,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                    {testResult.ok?'✅':'❌'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:testResult.ok?C.green:C.red,marginBottom:6,fontFamily:'Syne, sans-serif' }}>
                      {testResult.ok?L('✓ SMTP test successful — email delivered!','✓ Test SMTP réussi — email livré !'):L('✗ SMTP test failed','✗ Test SMTP échoué')}
                    </div>
                    <div style={{ fontSize:12,color:C.text2,fontFamily:'JetBrains Mono, monospace',marginBottom:testResult.diagnostic?10:0 }}>{testResult.msg}</div>
                    {testResult.diagnostic&&(
                      <div style={{ background:C.card2,borderRadius:8,padding:'10px 12px',fontSize:11,color:C.text2,fontFamily:'JetBrains Mono, monospace',lineHeight:1.8 }}>
                        <div style={{ color:C.muted,marginBottom:4 }}>DIAGNOSTIC:</div>
                        {Object.entries(testResult.diagnostic).map(([k,v])=>(
                          <div key={k}><span style={{ color:C.muted }}>{k}: </span><span style={{ color:C.text }}>{String(v)}</span></div>
                        ))}
                      </div>
                    )}
                    {!testResult.ok&&(
                      <div style={{ marginTop:12,padding:'10px 12px',background:'rgba(252,211,77,0.06)',border:'1px solid rgba(252,211,77,0.2)',borderRadius:8,fontSize:11,color:C.yellow,lineHeight:1.7 }}>
                        💡 {L('Hostinger tips: (1) Use email password (not hPanel password) (2) Try port 587 instead of 465 (3) Verify email account exists in Hostinger panel','Hostinger: (1) Utilisez le mot de passe email (pas le mot de passe hPanel) (2) Essayez le port 587 au lieu de 465 (3) Vérifiez que le compte email existe dans le panel Hostinger')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GUIDE HOSTINGER ──────────────────────────────────────────── */}
      {tab==='guide' && (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.08) 0%,rgba(56,189,248,0.04) 100%)', border:'1px solid rgba(124,58,237,0.3)',borderRadius:16,padding:24,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7C3AED 0%,'+C.blue+' 100%)' }}/>
            <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:20 }}>
              <span style={{ fontSize:28 }}>🟣</span>
              <div>
                <div style={{ fontSize:9,color:'#7C3AED',fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em',marginBottom:3 }}>HOSTINGER · EMAIL CONFIGURATION</div>
                <h3 style={{ fontFamily:'Syne, sans-serif',fontSize:16,fontWeight:800,color:C.text,margin:0 }}>
                  {L('Step-by-step guide','Guide étape par étape')}
                </h3>
              </div>
            </div>
            {[
              { n:'1', en:'Login to Hostinger Panel', fr:'Connectez-vous à Hostinger', d:'hpanel.hostinger.com → My Emails' },
              { n:'2', en:'Open Email Accounts', fr:'Ouvrez Email Accounts', d:L('Click "Manage" on your domain emails','Cliquez "Gérer" sur vos emails de domaine') },
              { n:'3', en:'Configure Email Client', fr:'Configurer le client', d:'Connect Devices → Configure Manually → SMTP' },
              { n:'4', en:'SMTP Settings', fr:'Paramètres SMTP', d:'Host: smtp.hostinger.com · Port: 465 (SSL)' },
              { n:'5', en:'Login credentials', fr:'Identifiants', d:L('Full email address as login + email password','Adresse email complète + mot de passe email') },
              { n:'6', en:'Apply preset & save', fr:'Appliquer le préréglage', d:L('Use 🟣 Hostinger preset → enter password → Save → Test','Utilisez préréglage 🟣 → mot de passe → Sauvegarder → Tester') },
            ].map(s=>(
              <div key={s.n} style={{ display:'flex',gap:12,marginBottom:14,alignItems:'flex-start' }}>
                <div style={{ width:24,height:24,borderRadius:'50%',background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#A78BFA',fontWeight:800,flexShrink:0,marginTop:1 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:C.text,marginBottom:3 }}>{lang==='fr'?s.fr:s.en}</div>
                  <div style={{ fontSize:11,color:C.muted,lineHeight:1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ background:C.card,border:'1px solid '+C.border,borderRadius:14,padding:20 }}>
              <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14 }}>
                📊 {L('HOSTINGER SMTP REFERENCE','RÉFÉRENCE SMTP HOSTINGER')}
              </div>
              {[
                { l:'SMTP Host', v:'smtp.hostinger.com', c:C.blue },
                { l:'Port SSL', v:'465', c:C.green },
                { l:'Port TLS', v:'587', c:C.yellow },
                { l:'Security', v:'SSL / TLS', c:C.purple },
                { l:'Auth', v:'LOGIN', c:C.text2 },
                { l:L('Login','Identifiant'), v:L('Full email address','Adresse email complète'), c:C.text2 },
              ].map(r=>(
                <div key={r.l} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid '+C.border+'30' }}>
                  <span style={{ fontSize:12,color:C.muted }}>{r.l}</span>
                  <span style={{ fontSize:12,color:r.c,fontWeight:600,fontFamily:'JetBrains Mono, monospace' }}>{r.v}</span>
                </div>
              ))}
              <div style={{ marginTop:14,padding:'12px 14px',background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:8 }}>
                <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:4 }}>
                  {L('QUICK COPY CONFIG','COPIE RAPIDE CONFIG')}
                </div>
                <div style={{ fontSize:11,color:C.text2,fontFamily:'JetBrains Mono, monospace',lineHeight:2 }}>
                  Host: smtp.hostinger.com<br/>
                  Port: 465 · Security: SSL<br/>
                  Login: contact@pangea-carbon.com
                </div>
              </div>
            </div>

            <div style={{ background:'rgba(248,113,113,0.04)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:12,padding:16 }}>
              <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>
                ⚠ {L('COMMON ISSUES','PROBLÈMES FRÉQUENTS')}
              </div>
              {[
                { en:'Wrong password → Use Hostinger email password (not hPanel login)', fr:'Mauvais mot de passe → Utilisez le mot de passe email Hostinger (pas hPanel)' },
                { en:'Port 587 blocked → Try port 465 with SSL', fr:'Port 587 bloqué → Essayez le port 465 avec SSL' },
                { en:'Emails in spam → Add SPF/DKIM records in DNS', fr:'Emails en spam → Ajoutez les entrées SPF/DKIM dans le DNS' },
              ].map((tip,i)=>(
                <div key={i} style={{ fontSize:11,color:C.text2,padding:'6px 0',borderBottom:i<2?'1px solid '+C.border+'30':'none',lineHeight:1.6 }}>
                  • {lang==='fr'?tip.fr:tip.en}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
