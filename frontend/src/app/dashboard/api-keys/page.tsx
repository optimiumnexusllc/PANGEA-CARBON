'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { fetchAuth, fetchAuthJson } from '@/lib/fetch-auth';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

// ─── Intégrations supportées ──────────────────────────────────────────────────
const INTEGRATIONS = [
  { name:'SMA Solar',           slug:'sma',         icon:'☀️',  color:'#FCD34D', desc:'Solar inverters — REST webhook', docs:'https://developer.sma.de', status:'STABLE' },
  { name:'Huawei FusionSolar',  slug:'huawei',      icon:'🔶',  color:'#F97316', desc:'FusionSolar cloud push API',     docs:'https://solar.huawei.com', status:'STABLE' },
  { name:'SolarEdge',           slug:'solaredge',   icon:'🔷',  color:'#38BDF8', desc:'Monitoring platform webhook',    docs:'https://developers.solaredge.com', status:'STABLE' },
  { name:'Fronius',             slug:'fronius',     icon:'⚡',  color:'#A78BFA', desc:'Solar.web push notifications',   docs:'https://www.fronius.com', status:'STABLE' },
  { name:'SMA Sunny Portal',    slug:'sunnyportal', icon:'🌤️', color:'#FCD34D', desc:'Legacy Sunny Portal webhook',    docs:'https://www.sunnyportal.com', status:'BETA' },
  { name:'GoodWe SEMS',         slug:'goodwe',      icon:'🟢',  color:'#00FF94', desc:'SEMS portal data push',          docs:'https://www.goodwe.com', status:'BETA' },
  { name:'Sungrow iSolarCloud', slug:'sungrow',     icon:'🌞',  color:'#F97316', desc:'iSolarCloud push gateway',       docs:'https://isolarcloud.com', status:'BETA' },
  { name:'Tesla Powerwall',     slug:'tesla',       icon:'⚡',  color:'#F87171', desc:'Powerwall gateway REST',         docs:'https://tesla.com', status:'COMING_SOON' },
  { name:'Generic REST',        slug:'generic',     icon:'🔌',  color:'#8FA3B8', desc:'Custom REST payload — any sensor',docs:'', status:'STABLE' },
];

const SCOPES = [
  { id:'read',          label:'Read',           desc:'GET endpoints — lire projets, lectures, audits',                  color:'#38BDF8' },
  { id:'write',         label:'Write',          desc:'POST/PUT endpoints — envoyer des readings, créer des entrées',   color:'#00FF94' },
  { id:'equipment',     label:'Equipment',      desc:'Webhooks inverters, bulk imports, OTA push',                     color:'#FCD34D' },
  { id:'marketplace',   label:'Marketplace',    desc:'Lister et acheter des crédits carbone via API',                  color:'#A78BFA' },
  { id:'admin',         label:'Admin',          desc:'Gestion utilisateurs et organisations (SUPER_ADMIN uniquement)',  color:'#F87171' },
];

const ENDPOINTS = [
  { method:'POST', path:'/api/equipment/reading',         desc:'Envoyer une lecture énergie (MWh)',         scope:'equipment' },
  { method:'POST', path:'/api/equipment/readings/bulk',   desc:'Import CSV / bulk array de lectures',       scope:'equipment' },
  { method:'GET',  path:'/api/projects',                  desc:'Lister vos projets',                        scope:'read' },
  { method:'GET',  path:'/api/mrv/{id}/calculate',        desc:'Calculer les crédits (MRV)',                scope:'read' },
  { method:'POST', path:'/api/ghg/audits',                desc:'Créer un audit GHG',                        scope:'write' },
  { method:'POST', path:'/api/ghg/audits/{id}/entries',   desc:'Ajouter une entrée GHG',                    scope:'write' },
  { method:'GET',  path:'/api/marketplace/listings',      desc:'Consulter les crédits disponibles',         scope:'marketplace' },
  { method:'POST', path:'/api/marketplace/orders',        desc:'Acheter des crédits carbone',               scope:'marketplace' },
];

const METHOD_C = { GET:'#38BDF8', POST:'#00FF94', PUT:'#FCD34D', DELETE:'#F87171', PATCH:'#A78BFA' };

const inp = { background:C.card2, border:'1px solid #1E2D3D', borderRadius:8, color:'#E8EFF6', padding:'10px 14px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

export default function ApiKeysPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;

  const [tab, setTab] = useState('keys');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['read','write','equipment']);
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchAuth('/admin/apikeys');
      const d = await r.json();
      setKeys(Array.isArray(d) ? d : []);
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newKeyName.trim()) return;
    setSaving(true);
    try {
      const user = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('user')||'{}' : '{}');
      const res = await fetchAuth('/admin/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          userId: user.id,
          scopes: newKeyScopes,
          expiresAt: newKeyExpiry || null,
        }),
      });
      const data = await res.json();
      setNewKey(data.rawKey || data.key || data.apiKey);
      setCreating(false);
      setNewKeyName('');
      setNewKeyScopes(['read','write','equipment']);
      setNewKeyExpiry('');
      load();
    } catch(e: any) {
      showToast(e.message, 'error');
    } finally { setSaving(false); }
  };

  const executeRevoke = async () => {
    if (!confirmRevoke) return;
    const id = confirmRevoke;
    setConfirmRevoke(null);
    try {
      await fetchAuth('/admin/apikeys/'+id, { method: 'DELETE' });
      showToast(L('Key revoked','Clé révoquée'));
      load();
    } catch(e: any) { showToast(e.message,'error'); }
  };

  const copyKey = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast(L('Copied to clipboard!','Copié dans le presse-papiers !'));
  };

  const activeKeys = keys.filter(k => k.isActive);
  const revokedKeys = keys.filter(k => !k.isActive);

  return (
    <div style={{ padding:24, maxWidth:1300, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',top:20,right:20,zIndex:99999,maxWidth:420 }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':'rgba(0,255,148,0.08)', border:`1px solid ${toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:toast.type==='error'?C.red:C.green }}/>
            <div style={{ fontSize:12,color:toast.type==='error'?C.red:C.green,fontWeight:800,marginLeft:8 }}>{toast.type==='error'?'✗':'✓'}</div>
            <span style={{ fontSize:13,color:C.text }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.15em',marginBottom:8 }}>PANGEA CARBON · EQUIPMENT API v2</div>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end' }}>
          <div>
            <h1 style={{ fontFamily:'Syne, sans-serif',fontSize:26,fontWeight:800,color:C.text,margin:0,marginBottom:6 }}>API Keys & Intégrations</h1>
            <p style={{ fontSize:13,color:C.muted,margin:0 }}>Connectez vos onduleurs, capteurs IoT et systèmes tiers à PANGEA CARBON</p>
          </div>
          <button onClick={() => setCreating(true)}
            style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:10,color:C.green,padding:'10px 20px',cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'Syne, sans-serif',display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:18 }}>+</span> Nouvelle clé API
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'flex',gap:12,marginBottom:28,flexWrap:'wrap' }}>
        {[
          { v:activeKeys.length,    l:'Clés actives',     c:C.green,  icon:'✓',  s:'sur '+keys.length+' total' },
          { v:INTEGRATIONS.filter(i=>i.status==='STABLE').length, l:'Intégrations stables', c:C.blue, icon:'🔌', s:'équipements supportés' },
          { v:ENDPOINTS.length,     l:'Endpoints API',    c:C.purple, icon:'⚡', s:'REST + Webhooks' },
          { v:revokedKeys.length,   l:'Clés révoquées',   c:C.muted,  icon:'✗',  s:'archivées' },
        ].map(s => (
          <div key={s.l} style={{ background:C.card,border:`1px solid ${s.c}20`,borderRadius:14,padding:'16px 20px',flex:1,minWidth:140,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${s.c} 0%,transparent 100%)` }}/>
            <div style={{ fontSize:9,color:s.c,fontFamily:'JetBrains Mono, monospace',marginBottom:2 }}>{s.icon}</div>
            <div style={{ fontSize:22,fontWeight:800,color:s.c,fontFamily:'JetBrains Mono, monospace',lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:11,color:C.text,fontWeight:600,marginTop:6 }}>{s.l}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:2,fontFamily:'JetBrains Mono, monospace' }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* New key banner */}
      {newKey && (
        <div style={{ background:'rgba(0,255,148,0.06)',border:'1px solid rgba(0,255,148,0.3)',borderRadius:14,padding:24,marginBottom:24,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00FF94,transparent)' }}/>
          <div style={{ display:'flex',gap:12,alignItems:'center',marginBottom:16 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:'rgba(0,255,148,0.15)',border:'1px solid rgba(0,255,148,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🔑</div>
            <div>
              <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:3 }}>NOUVELLE CLÉ API CRÉÉE</div>
              <div style={{ fontSize:14,fontWeight:700,color:C.green }}>⚠ Copiez cette clé maintenant — elle ne sera plus jamais affichée</div>
            </div>
          </div>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <code style={{ flex:1,fontFamily:'JetBrains Mono, monospace',fontSize:13,color:C.text,background:C.card,padding:'12px 16px',borderRadius:9,border:`1px solid ${C.border}`,wordBreak:'break-all',letterSpacing:'0.05em' }}>
              {newKey}
            </code>
            <button onClick={() => copyKey(newKey)}
              style={{ background:copied?'rgba(0,255,148,0.15)':'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:9,color:C.green,padding:'12px 18px',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0,whiteSpace:'nowrap' }}>
              {copied ? '✓ Copié !' : '📋 Copier'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} style={{ marginTop:12,background:'transparent',border:'none',color:C.muted,fontSize:12,cursor:'pointer' }}>
            ✕ J'ai copié la clé en lieu sûr
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,marginBottom:24,borderBottom:`1px solid ${C.border}` }}>
        {([
          ['keys',     L('My Keys','Mes Clés'),            '🔑'],
          ['docs',     L('API Reference','Référence API'), '📄'],
          ['webhooks', L('Integrations','Intégrations'),   '🔌'],
          ['logs',     L('Usage Logs','Logs d\'usage'),    '📊'],
        ] as [string,string,string][]).map(([id,label,icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ padding:'11px 20px',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'JetBrains Mono, monospace',borderBottom:`2px solid ${tab===id?C.blue:'transparent'}`,background:'transparent',color:tab===id?C.blue:C.muted,transition:'all .15s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── KEYS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'keys' && (
        <div>
          {loading ? (
            <div style={{ textAlign:'center',padding:48,color:C.muted,fontFamily:'JetBrains Mono, monospace',fontSize:11 }}>◌ Chargement des clés...</div>
          ) : keys.length === 0 ? (
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:56,textAlign:'center' }}>
              <div style={{ fontSize:48,marginBottom:16 }}>🔑</div>
              <div style={{ fontSize:16,color:C.text,fontWeight:700,marginBottom:8 }}>Aucune clé API</div>
              <div style={{ fontSize:13,color:C.muted,marginBottom:20 }}>Créez votre première clé pour connecter vos équipements solaires et systèmes tiers</div>
              <button onClick={() => setCreating(true)} style={{ background:'rgba(0,255,148,0.12)',border:'1px solid rgba(0,255,148,0.35)',borderRadius:10,color:C.green,padding:'12px 24px',cursor:'pointer',fontSize:14,fontWeight:800,fontFamily:'Syne, sans-serif' }}>
                + Créer une clé API
              </button>
            </div>
          ) : (
            <div>
              {/* Active keys */}
              {activeKeys.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:12,letterSpacing:'0.1em' }}>✓ CLÉS ACTIVES — {activeKeys.length}</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    {activeKeys.map(key => (
                      <div key={key.id} style={{ background:C.card,border:`1px solid rgba(0,255,148,0.12)`,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:16,borderLeft:`3px solid ${C.green}` }}>
                        <div style={{ width:10,height:10,borderRadius:'50%',background:C.green,boxShadow:'0 0 8px rgba(0,255,148,0.5)',flexShrink:0,animation:'pgPulse 2s infinite' }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>{key.name}</div>
                          <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                            <code style={{ fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace',background:C.card2,padding:'2px 8px',borderRadius:4,border:`1px solid ${C.border}` }}>
                              {key.keyPrefix || 'pgc_'}••••••••••••••••••••
                            </code>
                            {key.lastUsedAt && (
                              <span style={{ fontSize:10,color:C.muted }}>Dernier usage: {new Date(key.lastUsedAt).toLocaleDateString('fr-FR')}</span>
                            )}
                            {key.expiresAt && (
                              <span style={{ fontSize:10,color:C.yellow }}>Expire: {new Date(key.expiresAt).toLocaleDateString('fr-FR')}</span>
                            )}
                            <span style={{ fontSize:9,color:C.green,background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',borderRadius:4,padding:'2px 7px',fontFamily:'JetBrains Mono, monospace' }}>ACTIVE</span>
                          </div>
                        </div>
                        <button onClick={() => setConfirmRevoke(key.id)}
                          style={{ background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'8px 14px',cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap' }}>
                          Révoquer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Revoked keys */}
              {revokedKeys.length > 0 && (
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:12,letterSpacing:'0.1em' }}>✗ RÉVOQUÉES — {revokedKeys.length}</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:6,opacity:0.5 }}>
                    {revokedKeys.map(key => (
                      <div key={key.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:14,borderLeft:`3px solid ${C.red}` }}>
                        <div style={{ width:8,height:8,borderRadius:'50%',background:C.red,flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,color:C.text2 }}>{key.name}</div>
                          <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{key.keyPrefix || 'pgc_'}••••••••••••••••</div>
                        </div>
                        <span style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace' }}>RÉVOQUÉE</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── API REFERENCE ────────────────────────────────────────────────────── */}
      {tab === 'docs' && (
        <div>
          {/* Auth header */}
          <div style={{ background:C.card,border:`1px solid rgba(56,189,248,0.2)`,borderRadius:14,padding:22,marginBottom:20 }}>
            <div style={{ fontSize:9,color:C.blue,fontFamily:'JetBrains Mono, monospace',marginBottom:12,letterSpacing:'0.1em' }}>AUTHENTIFICATION</div>
            <p style={{ fontSize:13,color:C.text2,margin:'0 0 12px',lineHeight:1.7 }}>
              Toutes les requêtes API doivent inclure votre clé dans le header <code style={{ color:C.blue,background:C.card2,padding:'1px 6px',borderRadius:4,fontFamily:'JetBrains Mono, monospace' }}>X-API-Key</code>.
            </p>
            <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'14px 16px' }}>
              <pre style={{ margin:0,fontSize:12,color:C.text2,fontFamily:'JetBrains Mono, monospace',lineHeight:1.7 }}>{`curl -X GET https://pangea-carbon.com/api/projects \\
  -H "X-API-Key: pgc_votre_cle_ici" \\
  -H "Content-Type: application/json"`}</pre>
            </div>
          </div>

          {/* Scopes */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,marginBottom:20 }}>
            <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:14,letterSpacing:'0.1em' }}>SCOPES DISPONIBLES</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {SCOPES.map(scope => (
                <div key={scope.id} style={{ display:'flex',alignItems:'center',gap:14,padding:'10px 14px',background:C.card2,borderRadius:10,border:`1px solid ${scope.color}20` }}>
                  <code style={{ fontSize:11,padding:'3px 10px',background:`${scope.color}15`,border:`1px solid ${scope.color}30`,borderRadius:6,color:scope.color,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{scope.id}</code>
                  <span style={{ fontSize:12,color:C.text2,flex:1 }}>{scope.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoints table */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden',marginBottom:20 }}>
            <div style={{ padding:'16px 20px',borderBottom:`1px solid ${C.border}`,fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.1em' }}>ENDPOINTS RÉFÉRENCE</div>
            {ENDPOINTS.map((ep, i) => (
              <div key={ep.path} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom: i < ENDPOINTS.length-1 ? `1px solid ${C.border}22` : 'none',background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,background:`${METHOD_C[ep.method]}15`,color:METHOD_C[ep.method],fontFamily:'JetBrains Mono, monospace',flexShrink:0,width:42,textAlign:'center' }}>{ep.method}</span>
                <code style={{ fontSize:12,color:C.blue,fontFamily:'JetBrains Mono, monospace',flex:1 }}>{ep.path}</code>
                <span style={{ fontSize:11,color:C.text2,flex:2 }}>{ep.desc}</span>
                <span style={{ fontSize:9,padding:'2px 7px',background:`rgba(56,189,248,0.1)`,borderRadius:4,color:C.blue,fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>{ep.scope}</span>
              </div>
            ))}
          </div>

          {/* Code examples */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {[
              { title:'📡 Envoyer une lecture',     scope:'equipment', code:`curl -X POST https://pangea-carbon.com/api/equipment/reading \\
  -H "X-API-Key: pgc_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "cma123...",
    "energy_mwh": 125.5,
    "timestamp": "2025-01-15T10:00:00Z",
    "source": "sma_inverter_01"
  }'` },
              { title:'📦 Bulk import (CSV/JSON)', scope:'equipment', code:`curl -X POST https://pangea-carbon.com/api/equipment/readings/bulk \\
  -H "X-API-Key: pgc_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "cma123...",
    "readings": [
      {"energy_mwh": 125.5, "timestamp": "2025-01-15T10:00:00Z"},
      {"energy_mwh": 130.2, "timestamp": "2025-01-15T11:00:00Z"}
    ]
  }'` },
              { title:'📁 Lister vos projets',     scope:'read', code:`curl -X GET https://pangea-carbon.com/api/projects \\
  -H "X-API-Key: pgc_votre_cle"

// Response
{
  "projects": [
    {
      "id": "cma123...",
      "name": "Centrale Solaire Korhogo",
      "type": "SOLAR",
      "installedMW": 50,
      "countryCode": "CI"
    }
  ]
}` },
              { title:'🌿 Calculer les crédits',   scope:'read', code:`curl -X GET https://pangea-carbon.com/api/mrv/cma123/calculate \\
  -H "X-API-Key: pgc_votre_cle"

// Response
{
  "grossReductions": 18432.5,
  "leakage": 553.0,
  "netCredits": 17879.5,
  "gridEmissionFactor": 0.547,
  "methodology": "ACM0002"
}` },
            ].map(ex => (
              <div key={ex.title} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden' }}>
                <div style={{ padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:12,fontWeight:700,color:C.text }}>{ex.title}</span>
                  <span style={{ fontSize:9,padding:'2px 7px',background:'rgba(56,189,248,0.1)',borderRadius:4,color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>{ex.scope}</span>
                </div>
                <pre style={{ margin:0,padding:'14px 16px',fontSize:11,color:C.text2,fontFamily:'JetBrains Mono, monospace',overflowX:'auto',lineHeight:1.7,background:C.card2 }}>
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WEBHOOKS / INTÉGRATIONS ──────────────────────────────────────────── */}
      {tab === 'webhooks' && (
        <div>
          <p style={{ fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.7 }}>
            Configurez votre onduleur pour envoyer ses données directement à PANGEA CARBON via webhook.
            Chaque intégration dispose d'un endpoint dédié — aucun agent logiciel requis.
          </p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24 }}>
            {INTEGRATIONS.map(integ => (
              <div key={integ.slug} onClick={() => setSelectedIntegration(selectedIntegration?.slug===integ.slug?null:integ)}
                style={{ background:C.card,border:`1px solid ${selectedIntegration?.slug===integ.slug?integ.color:C.border}`,borderRadius:12,padding:18,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:selectedIntegration?.slug===integ.slug?integ.color:'transparent',transition:'background .2s' }}/>
                <div style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:10 }}>
                  <span style={{ fontSize:24 }}>{integ.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:selectedIntegration?.slug===integ.slug?integ.color:C.text,marginBottom:3 }}>{integ.name}</div>
                    <div style={{ fontSize:10,color:C.muted,lineHeight:1.5 }}>{integ.desc}</div>
                  </div>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <code style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>/webhook/{integ.slug}</code>
                  <span style={{ fontSize:8,padding:'2px 6px',borderRadius:4,fontFamily:'JetBrains Mono, monospace',fontWeight:700,
                    background:integ.status==='STABLE'?'rgba(0,255,148,0.1)':integ.status==='BETA'?'rgba(252,211,77,0.1)':'rgba(74,98,120,0.1)',
                    color:integ.status==='STABLE'?C.green:integ.status==='BETA'?C.yellow:C.muted }}>
                    {integ.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Détail intégration sélectionnée */}
          {selectedIntegration && (
            <div style={{ background:C.card,border:`1px solid ${selectedIntegration.color}30`,borderRadius:14,padding:24 }}>
              <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
                <span style={{ fontSize:32 }}>{selectedIntegration.icon}</span>
                <div>
                  <div style={{ fontSize:9,color:selectedIntegration.color,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>CONFIGURATION WEBHOOK</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:18,fontWeight:800,color:C.text,margin:0 }}>{selectedIntegration.name}</h2>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
                <div>
                  <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>WEBHOOK URL</div>
                  <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'12px 14px',display:'flex',gap:10,alignItems:'center' }}>
                    <code style={{ flex:1,fontSize:12,color:C.blue,fontFamily:'JetBrains Mono, monospace',wordBreak:'break-all' }}>
                      https://pangea-carbon.com/api/equipment/webhook/{selectedIntegration.slug}
                    </code>
                    <button onClick={() => copyKey('https://pangea-carbon.com/api/equipment/webhook/'+selectedIntegration.slug)}
                      style={{ background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,cursor:'pointer',padding:'4px 8px',fontSize:10,flexShrink:0 }}>
                      📋
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>AUTHENTICATION HEADER</div>
                  <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'12px 14px' }}>
                    <code style={{ fontSize:12,color:C.green,fontFamily:'JetBrains Mono, monospace' }}>X-API-Key: pgc_votre_cle</code>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>EXEMPLE DE PAYLOAD REÇU</div>
                <pre style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'14px 16px',margin:0,fontSize:11,color:C.text2,fontFamily:'JetBrains Mono, monospace',lineHeight:1.7 }}>{selectedIntegration.slug === 'sma' ? `{
  "device": "SB50-1SP-US-41",
  "serial": "3012345678",
  "energy_today_kwh": 125.5,
  "power_now_w": 48200,
  "timestamp": "2025-01-15T14:30:00Z"
}` : selectedIntegration.slug === 'huawei' ? `{
  "stationCode": "NE=123456789",
  "dataValue": {
    "radiation_intensity": 842.3,
    "inverter_state": 512,
    "mppt_total_cap": 125.5
  },
  "collectTime": 1736951400000
}` : `{
  "project_id": "cma123...",
  "energy_mwh": 125.5,
  "power_kw": 48.2,
  "timestamp": "2025-01-15T14:30:00Z",
  "device_id": "inverter_01"
}`}</pre>
              </div>
              {selectedIntegration.docs && (
                <div style={{ marginTop:14 }}>
                  <a href={selectedIntegration.docs} target="_blank" rel="noreferrer" style={{ fontSize:12,color:selectedIntegration.color,textDecoration:'none' }}>
                    📖 Documentation officielle {selectedIntegration.name} →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:'center' }}>
          <div style={{ fontSize:40,marginBottom:16 }}>📊</div>
          <div style={{ fontSize:16,color:C.text,fontWeight:700,marginBottom:8 }}>Usage Analytics</div>
          <div style={{ fontSize:13,color:C.muted,maxWidth:400,margin:'0 auto',lineHeight:1.7 }}>
            Les logs d'usage API (requêtes par clé, erreurs 4xx/5xx, latence P95) seront disponibles dans la prochaine version.
          </div>
          <div style={{ marginTop:20,padding:'12px 20px',background:'rgba(56,189,248,0.06)',border:'1px solid rgba(56,189,248,0.15)',borderRadius:10,display:'inline-block' }}>
            <div style={{ fontSize:10,color:C.blue,fontFamily:'JetBrains Mono, monospace' }}>COMING SOON — Q3 2025</div>
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ─────────────────────────────────────────────────────── */}
      {creating && (
        <div onClick={e => { if(e.target===e.currentTarget) setCreating(false); }}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(0,255,148,0.25)',borderRadius:16,padding:28,maxWidth:540,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🔑</div>
              <div>
                <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>EQUIPMENT API · NOUVELLE CLÉ</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:18,fontWeight:800,color:C.text,margin:0 }}>Créer une clé API</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(0,255,148,0.2) 0%,transparent 100%)',marginBottom:20 }}/>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>NOM DE LA CLÉ *</div>
              <input style={inp} placeholder="ex: SMA Inverter Abidjan, Huawei Lagos, dMRV Sensor..."
                value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && create()} autoFocus/>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>SCOPES (permissions)</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {SCOPES.map(scope => {
                  const sel = newKeyScopes.includes(scope.id);
                  return (
                    <button key={scope.id} type="button" onClick={() => {
                      const next = sel ? newKeyScopes.filter(s=>s!==scope.id) : [...newKeyScopes, scope.id];
                      setNewKeyScopes(next);
                    }} style={{ padding:'7px 12px',borderRadius:8,border:`1px solid ${sel?scope.color+'50':C.border}`,background:sel?`${scope.color}12`:C.card2,color:sel?scope.color:C.muted,cursor:'pointer',fontSize:11,fontFamily:'JetBrains Mono, monospace',transition:'all .15s' }}>
                      {sel ? '✓ ' : ''}{scope.id}
                    </button>
                  );
                })}
              </div>
              {newKeyScopes.length > 0 && (
                <div style={{ marginTop:8,fontSize:10,color:C.muted,lineHeight:1.6 }}>
                  {newKeyScopes.map(s => SCOPES.find(sc=>sc.id===s)?.desc).join(' · ')}
                </div>
              )}
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>EXPIRATION (optionnel)</div>
              <input style={inp} type="date" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}/>
              <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Laissez vide pour une clé permanente</div>
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setCreating(false)} style={{ flex:1,background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>Annuler</button>
              <button onClick={create} disabled={saving||!newKeyName.trim()}
                style={{ flex:2,background:saving||!newKeyName.trim()?C.card2:'rgba(0,255,148,0.12)',border:`1px solid ${saving||!newKeyName.trim()?C.border:'rgba(0,255,148,0.35)'}`,borderRadius:9,color:saving||!newKeyName.trim()?C.muted:C.green,padding:12,fontWeight:800,cursor:saving||!newKeyName.trim()?'not-allowed':'pointer',fontSize:13,fontFamily:'Syne, sans-serif',transition:'all .15s' }}>
                {saving ? '⟳ Création...' : '🔑 Créer la clé API'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVOKE MODAL ─────────────────────────────────────────────────────── */}
      {confirmRevoke && (
        <div onClick={e => { if(e.target===e.currentTarget) setConfirmRevoke(null); }}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(252,211,77,0.35)',borderRadius:16,padding:28,maxWidth:440,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🔑</div>
              <div>
                <div style={{ fontSize:9,color:C.yellow,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>API KEYS · RÉVOCATION</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.yellow,margin:0 }}>Révoquer cette clé ?</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(252,211,77,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            <div style={{ background:'rgba(252,211,77,0.05)',border:'1px solid rgba(252,211,77,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <p style={{ fontSize:13,color:C.text2,margin:0,lineHeight:1.7 }}>
                Cette clé sera <strong style={{ color:C.yellow }}>immédiatement révoquée</strong>. Toutes les intégrations utilisant cette clé cesseront de fonctionner et cette action est irréversible.
              </p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setConfirmRevoke(null)} style={{ flex:1,background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>Annuler</button>
              <button onClick={executeRevoke} style={{ flex:1,background:'rgba(252,211,77,0.1)',border:'1px solid rgba(252,211,77,0.35)',borderRadius:9,color:C.yellow,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                🔑 Révoquer la clé
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pgPulse { 0%,100%{opacity:1;box-shadow:0 0 8px rgba(0,255,148,0.5)} 50%{opacity:0.5;box-shadow:0 0 4px rgba(0,255,148,0.2)} }
      `}</style>

    </div>
  );
}
