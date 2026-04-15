'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuthJson, fetchAuth } from '@/lib/fetch-auth';

// ─── Charte PANGEA ───────────────────────────────────────────────────────────
const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:'mrv_report', name:'Rapport MRV', icon:'📊', color:C.green,
    desc:'Rapport de calcul ACM0002 pour client ou partenaire',
    subject:'Votre rapport MRV ACM0002 — PANGEA CARBON',
    variables:['recipientName','projectName','netCredits','revenueUSD','year','methodology'],
    badge:'VERRA',
  },
  {
    id:'credit_issuance', name:'Émission crédits', icon:'🌿', color:C.green,
    desc:'Notification émission crédits carbone blockchain',
    subject:'Crédits carbone émis — {{projectName}}',
    variables:['recipientName','projectName','quantity','standard','blockHash','vintage'],
    badge:'BLOCKCHAIN',
  },
  {
    id:'investor_update', name:'Update investisseur', icon:'💼', color:C.yellow,
    desc:'Rapport périodique portfolio pour investisseurs',
    subject:'Portfolio Update — PANGEA CARBON Africa',
    variables:['recipientName','totalCredits','totalRevenue','projectCount','period'],
    badge:'INVESTOR',
  },
  {
    id:'welcome', name:'Bienvenue', icon:'👋', color:C.blue,
    desc:'Email de bienvenue nouveaux utilisateurs',
    subject:'Bienvenue sur PANGEA CARBON — Plateforme MRV Africa',
    variables:['recipientName','orgName','loginUrl'],
    badge:'ONBOARDING',
  },
  {
    id:'custom', name:'Email libre', icon:'✏️', color:C.purple,
    desc:'Composez votre propre email avec la charte PANGEA CARBON',
    subject:'',
    variables:[],
    badge:'CUSTOM',
  },
];

const VARIABLE_EXAMPLES = {
  recipientName:'Dayiri Esdras', projectName:'Centrale Solaire Korhogo',
  netCredits:'193,759', revenueUSD:'2,139,105', year:'2024',
  methodology:'ACM0002 v19.0', quantity:'50,000', standard:'Verra VCS',
  blockHash:'0x7a3f...d9b2', vintage:'2024', totalCredits:'500,000',
  totalRevenue:'5,525,200', projectCount:'6', period:'Q1 2025',
  orgName:'Solar Africa Mali', loginUrl:'https://pangea-carbon.com/dashboard',
};

const inp = {
  background:C.card2, border:'1px solid '+C.border, borderRadius:8,
  color:C.text, padding:'10px 14px', fontSize:13, outline:'none',
  width:'100%', boxSizing:'border-box' as const, fontFamily:'Inter, sans-serif',
};

export default function EmailComposerPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  // Auth guard - SUPER_ADMIN only
  const [userRole, setUserRole] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const user = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user')||'{}' : '{}');
    setUserRole(user.role || '');
    setAuthChecked(true);
  }, []);

  const [tab, setTab] = useState('compose');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState('');
  const [toField, setToField] = useState('');
  const [ccField, setCcField] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [variables, setVariables] = useState(VARIABLE_EXAMPLES);
  const [previewHTML, setPreviewHTML] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [users, setUsers] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const previewRef = useRef(null);

  const showToast = (msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),5000);
  };

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchAuthJson('/admin/users?limit=200&page=1');
      setUsers(data.users || []);
    } catch(e) {}
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchAuthJson('/email-composer/history');
      setHistory(data.history || []);
    } catch(e) {} finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    loadUsers();
    if (tab === 'history') loadHistory();
  }, [tab]);

  // Sélection de template
  const selectTemplate = (t) => {
    setSelectedTemplate(t);
    setSubject(t.subject);
    setBody('');
    setPreviewHTML('');
  };

  // Interpolation preview
  const interpolate = (str) => {
    if (!str) return '';
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] || '{{'+k+'}}');
  };

  const refreshPreview = async () => {
    setPreviewLoading(true);
    try {
      const data = await fetchAuthJson('/email-composer/preview', {
        method:'POST',
        body: JSON.stringify({ templateId: selectedTemplate.id, subject, body, variables }),
      });
      setPreviewHTML(data.html || '');
    } catch(e) { showToast(e.message, 'error'); }
    finally { setPreviewLoading(false); }
  };

  const addRecipient = (email, name) => {
    if (!email || recipients.find(r => r.email === email)) return;
    setRecipients(prev => [...prev, { email, name: name||email }]);
  };

  const removeRecipient = (email) => {
    setRecipients(prev => prev.filter(r => r.email !== email));
  };

  const sendEmail = async () => {
    const toList = bulkMode
      ? recipients.map(r => r.email)
      : toField.split(',').map(e => e.trim()).filter(Boolean);

    if (toList.length === 0) { showToast(L('Destinataire requis','Destinataire requis'), 'error'); return; }
    if (!subject.trim()) { showToast(L('Subject required','Sujet requis'), 'error'); return; }

    setSending(true); setSendResult(null);
    try {
      const result = await fetchAuthJson('/email-composer/send', {
        method:'POST',
        body: JSON.stringify({ to: toList, subject, body, variables, templateId: selectedTemplate.id, cc: ccField||undefined, replyTo: replyTo||undefined }),
      });
      setSendResult({ success:true, count:toList.length, messageId: result.messageId });
      showToast(L('Email sent!','Email envoyé !') + ' → '+toList.join(', '));
      setTab('history');
      loadHistory();
    } catch(e) {
      setSendResult({ success:false, error: e.message });
      showToast(e.message, 'error');
    } finally { setSending(false); }
  };

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (!authChecked) return null;

  if (userRole !== 'SUPER_ADMIN') {
    return (
      <div style={{ padding:40, maxWidth:600, margin:'80px auto', textAlign:'center' }}>
        <div style={{ background:C.card, border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:48 }}>
          <div style={{ fontSize:48, marginBottom:20 }}>🔒</div>
          <div style={{ fontSize:9, color:C.red, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:12 }}>ACCÈS RESTREINT</div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:C.text, margin:'0 0 12px' }}>Super Admin uniquement</h2>
          <p style={{ fontSize:13, color:C.muted, lineHeight:1.8 }}>
            L'Email Composer est réservé aux <strong style={{ color:C.red }}>SUPER_ADMIN</strong>.<br/>
            Votre rôle actuel: <code style={{ color:C.yellow, fontFamily:'JetBrains Mono, monospace' }}>{userRole || 'non connecté'}</code>
          </p>
          <a href="/dashboard" style={{ display:'inline-block', marginTop:24, background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.3)', borderRadius:9, color:C.green, padding:'10px 22px', textDecoration:'none', fontSize:13, fontWeight:700 }}>
            ← Retour au Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:24, maxWidth:1500, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:99999, maxWidth:440 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':toast.type==='info'?'rgba(56,189,248,0.08)':'rgba(0,255,148,0.08)', border:'1px solid '+(toast.type==='error'?'rgba(248,113,113,0.35)':toast.type==='info'?'rgba(56,189,248,0.3)':'rgba(0,255,148,0.3)'), borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:toast.type==='error'?C.red:toast.type==='info'?C.blue:C.green }}/>
            <span style={{ fontSize:13, color:C.text, marginLeft:8 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ fontSize:9, color:C.red, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em' }}>
            PANGEA CARBON · EMAIL COMPOSER · SUPER_ADMIN
          </div>
          <span style={{ fontSize:8, padding:'2px 8px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:20, color:C.red, fontFamily:'JetBrains Mono, monospace' }}>
            ⚡ ACCÈS RESTREINT
          </span>
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:C.text, margin:0, marginBottom:6 }}>
          Email Composer
        </h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>
          Composez, prévisualisez et envoyez des emails branded PANGEA CARBON. Envoi individuel ou campagne vers tous les utilisateurs.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:'1px solid '+C.border }}>
        {([
          ['compose', '✍ Composer', C.green],
          ['preview', '👁 Prévisualiser', C.blue],
          ['bulk',    '📨 Campagne', C.orange],
          ['history', '📋 Historique', C.muted],
        ] as [string,string,string][]).map(([id, label, color]) => (
          <button key={id} onClick={()=>{ setTab(id); if(id==='history') loadHistory(); }}
            style={{ padding:'11px 20px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono, monospace', borderBottom:'2px solid '+(tab===id?color:'transparent'), background:'transparent', color:tab===id?color:C.muted, transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── COMPOSER ─────────────────────────────────────────────────────────── */}
      {(tab === 'compose' || tab === 'preview') && (
        <div style={{ display:'grid', gridTemplateColumns: tab==='preview'?'320px 1fr':'340px 1fr', gap:20 }}>

          {/* LEFT: Templates + Config */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Templates */}
            <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:12, letterSpacing:'0.1em' }}>TEMPLATES</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={()=>selectTemplate(t)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, border:'1px solid '+(selectedTemplate.id===t.id?t.color+'40':C.border), background:selectedTemplate.id===t.id?t.color+'10':C.card2, cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{t.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:selectedTemplate.id===t.id?t.color:C.text }}>{t.name}</div>
                      <div style={{ fontSize:9, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.desc}</div>
                    </div>
                    <span style={{ fontSize:7, padding:'2px 6px', borderRadius:4, background:t.color+'15', color:t.color, fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>{t.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Variables */}
            {selectedTemplate.variables.length > 0 && (
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:12, letterSpacing:'0.1em' }}>VARIABLES — cliquez pour copier</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {selectedTemplate.variables.map(v => (
                    <div key={v} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                        <button onClick={()=>navigator.clipboard.writeText('{{'+v+'}}')}
                          style={{ fontSize:10, padding:'3px 8px', background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:5, color:C.green, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                          {'{{'}{v}{'}}'}
                        </button>
                      </div>
                      <input
                        style={{ ...inp, fontSize:11, padding:'6px 10px' }}
                        placeholder={'Valeur de '+v}
                        value={variables[v] || ''}
                        onChange={e => setVariables(prev => ({...prev, [v]: e.target.value}))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Editor ou Preview */}
          {tab === 'compose' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Destinataires */}
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:20 }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14, letterSpacing:'0.1em' }}>DESTINATAIRES</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>À *</div>
                    <input style={inp} type="email" placeholder="email@example.com, email2@example.com"
                      value={toField} onChange={e=>setToField(e.target.value)}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>CC (optionnel)</div>
                    <input style={inp} type="email" placeholder="cc@example.com"
                      value={ccField} onChange={e=>setCcField(e.target.value)}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>REPLY-TO (optionnel)</div>
                    <input style={inp} type="email" placeholder="noreply@pangea-carbon.com"
                      value={replyTo} onChange={e=>setReplyTo(e.target.value)}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>SÉLECTIONNER UN USER</div>
                    <select style={inp} onChange={e => { if(e.target.value) { const u = users.find(x=>x.id===e.target.value); if(u) setToField(prev => prev ? prev+', '+u.email : u.email); } }}>
                      <option value="">Choisir un utilisateur...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Éditeur */}
              <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:20, flex:1 }}>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>SUJET *</div>
                  <input style={inp} placeholder="Sujet de l'email" value={subject} onChange={e=>setSubject(e.target.value)}/>
                  {subject && (
                    <div style={{ fontSize:10, color:C.muted, marginTop:4, fontFamily:'JetBrains Mono, monospace' }}>
                      Preview: <span style={{ color:C.blue }}>{interpolate(subject)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>CORPS DU MESSAGE</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>{ setBody(prev => prev + '\n\n---\nCordialement,\nL\'équipe PANGEA CARBON Africa'); }}
                        style={{ fontSize:9, padding:'3px 8px', background:C.card2, border:'1px solid '+C.border, borderRadius:5, color:C.text2, cursor:'pointer' }}>
                        + Signature
                      </button>
                    </div>
                  </div>
                  <textarea
                    style={{ ...inp, minHeight:280, resize:'vertical', lineHeight:1.7 }}
                    placeholder={'Corps du message...\n\nUtilisez {{variable}} pour insérer des valeurs dynamiques.\nEx: Bonjour {{recipientName}},'}
                    value={body} onChange={e=>setBody(e.target.value)}
                  />
                  <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>
                    {body.length} caractères · Laissez vide pour utiliser le template par défaut
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>{ setTab('preview'); refreshPreview(); }}
                  style={{ flex:1, background:C.card2, border:'1px solid '+C.border, borderRadius:9, color:C.text2, padding:12, cursor:'pointer', fontSize:13 }}>
                  👁 Prévisualiser
                </button>
                <button onClick={sendEmail} disabled={sending}
                  style={{ flex:2, background:sending?C.card2:'rgba(0,255,148,0.12)', border:'1px solid '+(sending?C.border:'rgba(0,255,148,0.35)'), borderRadius:9, color:sending?C.muted:C.green, padding:12, fontWeight:800, cursor:sending?'wait':'pointer', fontSize:13, fontFamily:'Syne, sans-serif', transition:'all .15s' }}>
                  {sending ? '⟳ Envoi en cours...' : '🚀 Envoyer l\'email'}
                </button>
              </div>

              {/* Send result */}
              {sendResult && (
                <div style={{ padding:'14px 18px', background:sendResult.success?'rgba(0,255,148,0.06)':'rgba(248,113,113,0.06)', border:'1px solid '+(sendResult.success?'rgba(0,255,148,0.2)':'rgba(248,113,113,0.2)'), borderRadius:10 }}>
                  {sendResult.success ? (
                    <div style={{ fontSize:13, color:C.green }}>
                      ✓ Email envoyé avec succès à <strong>{sendResult.count}</strong> destinataire{sendResult.count>1?'s':''}
                      <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginTop:4 }}>ID: {sendResult.messageId}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize:13, color:C.red }}>✗ {sendResult.error}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PREVIEW */}
          {tab === 'preview' && (
            <div>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <button onClick={refreshPreview} disabled={previewLoading}
                  style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.3)', borderRadius:8, color:C.blue, padding:'9px 16px', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  {previewLoading ? '⟳ Chargement...' : '↺ Actualiser le rendu'}
                </button>
                <button onClick={()=>setTab('compose')}
                  style={{ background:C.card2, border:'1px solid '+C.border, borderRadius:8, color:C.text2, padding:'9px 16px', cursor:'pointer', fontSize:12 }}>
                  ← Retour éditeur
                </button>
                <button onClick={sendEmail} disabled={sending}
                  style={{ marginLeft:'auto', background:'rgba(0,255,148,0.12)', border:'1px solid rgba(0,255,148,0.35)', borderRadius:8, color:C.green, padding:'9px 18px', cursor:'pointer', fontSize:12, fontWeight:800 }}>
                  🚀 Envoyer
                </button>
              </div>
              {previewHTML ? (
                <div style={{ background:'#ffffff', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.4)' }}>
                  <div style={{ background:'#2d2d2d', padding:'10px 16px', display:'flex', gap:8, alignItems:'center' }}>
                    {['#F87171','#FCD34D','#00FF94'].map(c => <div key={c} style={{ width:12, height:12, borderRadius:'50%', background:c }}/>)}
                    <div style={{ flex:1, background:'#1a1a1a', borderRadius:4, padding:'4px 12px', fontSize:11, color:'#888', fontFamily:'monospace' }}>
                      Email Preview — {interpolate(subject)}
                    </div>
                  </div>
                  <iframe ref={previewRef} srcDoc={previewHTML} style={{ width:'100%', height:700, border:'none' }} title="Email Preview"/>
                </div>
              ) : (
                <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:60, textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>👁</div>
                  <div style={{ fontSize:14, color:C.text, marginBottom:8 }}>Cliquez sur "Actualiser le rendu" pour prévisualiser l'email</div>
                  <div style={{ fontSize:12, color:C.muted }}>Le rendu HTML PANGEA branded s'affichera ici</div>
                  <button onClick={refreshPreview} style={{ marginTop:20, background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.3)', borderRadius:9, color:C.blue, padding:'10px 20px', cursor:'pointer', fontSize:13 }}>
                    Charger la prévisualisation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CAMPAGNE BULK ─────────────────────────────────────────────────────── */}
      {tab === 'bulk' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:C.card, border:'1px solid rgba(249,115,22,0.2)', borderRadius:14, padding:20 }}>
              <div style={{ fontSize:9, color:C.orange, fontFamily:'JetBrains Mono, monospace', marginBottom:14, letterSpacing:'0.1em' }}>SÉLECTION DES DESTINATAIRES</div>

              {/* Filtres rapides */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {[
                  { label:'Tous les users',    filter: (u) => true },
                  { label:'ORG_OWNER',          filter: (u) => u.role === 'ORG_OWNER' },
                  { label:'Buyers actifs',      filter: (u) => u.role === 'CLIENT' },
                  { label:'ANALYST',            filter: (u) => u.role === 'ANALYST' },
                ].map(seg => (
                  <button key={seg.label} onClick={()=>{
                    const filtered = users.filter(seg.filter);
                    setRecipients(filtered.map(u => ({ email:u.email, name:u.name })));
                    showToast(filtered.length+' destinataires sélectionnés', 'info');
                  }} style={{ fontSize:11, padding:'6px 12px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:8, color:C.orange, cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
                    {seg.label}
                  </button>
                ))}
                <button onClick={()=>setRecipients([])}
                  style={{ fontSize:11, padding:'6px 12px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, color:C.red, cursor:'pointer' }}>
                  ✕ Vider
                </button>
              </div>

              {/* Search + add */}
              <select style={inp} onChange={e=>{ const u = users.find(x=>x.id===e.target.value); if(u) addRecipient(u.email, u.name); }}>
                <option value="">Ajouter un utilisateur...</option>
                {users.filter(u => !recipients.find(r=>r.email===u.email)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email} ({u.role})</option>
                ))}
              </select>

              {/* Liste destinataires */}
              <div style={{ marginTop:14, maxHeight:300, overflowY:'auto' }}>
                {recipients.length === 0 ? (
                  <div style={{ textAlign:'center', padding:24, color:C.muted, fontSize:12 }}>Aucun destinataire sélectionné</div>
                ) : recipients.map(r => (
                  <div key={r.email} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:C.card2, marginBottom:4 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,255,148,0.1)', color:C.green, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:C.text }}>{r.name}</div>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>{r.email}</div>
                    </div>
                    <button onClick={()=>removeRecipient(r.email)} style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:14 }}>✕</button>
                  </div>
                ))}
              </div>

              {recipients.length > 0 && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:9, fontSize:12, color:C.orange }}>
                  ⚡ {recipients.length} destinataire{recipients.length>1?'s':''} sélectionné{recipients.length>1?'s':''} — campagne prête
                </div>
              )}
            </div>
          </div>

          {/* Template + Send */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:20 }}>
              <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:14, letterSpacing:'0.1em' }}>CONTENU DE LA CAMPAGNE</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>TEMPLATE</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={()=>selectTemplate(t)}
                      style={{ fontSize:11, padding:'6px 12px', borderRadius:8, border:'1px solid '+(selectedTemplate.id===t.id?t.color+'50':C.border), background:selectedTemplate.id===t.id?t.color+'12':C.card2, color:selectedTemplate.id===t.id?t.color:C.muted, cursor:'pointer' }}>
                      {t.icon} {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>SUJET</div>
                <input style={inp} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Sujet de la campagne"/>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>MESSAGE (optionnel)</div>
                <textarea style={{ ...inp, minHeight:150, resize:'vertical', lineHeight:1.7 }}
                  placeholder="Corps du message (laissez vide pour le template par défaut)"
                  value={body} onChange={e=>setBody(e.target.value)}/>
              </div>
            </div>

            <div style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:12, padding:'16px 20px' }}>
              <div style={{ fontSize:11, color:C.orange, marginBottom:12, lineHeight:1.7 }}>
                ⚠ Cette action va envoyer l'email à <strong>{recipients.length}</strong> destinataire{recipients.length>1?'s':''}. Vérifiez le contenu avant d'envoyer.
              </div>
              <button onClick={()=>{ setBulkMode(true); sendEmail(); }}
                disabled={sending || recipients.length === 0}
                style={{ width:'100%', background:sending||recipients.length===0?C.card2:'rgba(249,115,22,0.15)', border:'1px solid '+(sending||recipients.length===0?C.border:'rgba(249,115,22,0.4)'), borderRadius:9, color:sending||recipients.length===0?C.muted:C.orange, padding:13, fontWeight:800, cursor:sending||recipients.length===0?'not-allowed':'pointer', fontSize:14, fontFamily:'Syne, sans-serif' }}>
                {sending ? '⟳ Envoi en cours...' : '📨 Lancer la campagne ('+ recipients.length +' destinataires)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIQUE ────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ textAlign:'center', padding:48, color:C.muted, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>◌ Chargement historique...</div>
          ) : history.length === 0 ? (
            <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:56, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>📋</div>
              <div style={{ fontSize:15, color:C.text, marginBottom:8, fontWeight:700 }}>Aucun email envoyé</div>
              <div style={{ fontSize:13, color:C.muted }}>Les emails que vous envoyez apparaîtront ici</div>
            </div>
          ) : (
            <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid '+C.border, fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                HISTORIQUE EMAIL — {history.length} envoi{history.length>1?'s':''}
              </div>
              {history.map((h, i) => (
                <div key={h.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom: i<history.length-1?'1px solid '+C.border+'30':'none', transition:'background .1s' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>✉</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {h.subject || '(sans sujet)'}
                    </div>
                    <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
                      → {Array.isArray(h.to) ? h.to.join(', ') : h.to}
                      {h.templateId && <span style={{ marginLeft:8, color:C.blue }}>[{h.templateId}]</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace', flexShrink:0, textAlign:'right' }}>
                    <div>{h.sentAt ? new Date(h.sentAt).toLocaleDateString('fr-FR') : '—'}</div>
                    <div style={{ color:C.muted, marginTop:2 }}>{h.sentAt ? new Date(h.sentAt).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : ''}</div>
                  </div>
                  <span style={{ fontSize:9, padding:'3px 8px', background:'rgba(0,255,148,0.1)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:4, color:C.green, fontFamily:'JetBrains Mono, monospace', flexShrink:0 }}>
                    ENVOYÉ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
