'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const C = {
  bg:'#060A0F', card:'#0D1117', card2:'#0A1628', border:'#1E2D3D',
  green:'#00FF94', blue:'#38BDF8', yellow:'#FCD34D', purple:'#A78BFA',
  red:'#F87171', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const LEVEL_CFG = {
  PLATINUM:{ color:'#60A5FA', icon:'💎', label:'Platinum', labelFr:'Platine',   min:80 },
  GOLD:    { color:'#FCD34D', icon:'🏆', label:'Gold',     labelFr:'Or',         min:65 },
  SILVER:  { color:'#E2E8F0', icon:'🥈', label:'Silver',   labelFr:'Argent',    min:50 },
  BRONZE:  { color:'#F97316', icon:'🥉', label:'Bronze',   labelFr:'Bronze',    min:35 },
  BASIC:   { color:'#6B7280', icon:'📋', label:'Basic',    labelFr:'De base',   min:0  },
};

export default function VerifyPage() {
  const params = useParams();
  const id = (params?.hash || params?.id) as string;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr');
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;

  useEffect(() => {
    if (!id) return;
    const url = (process.env.NEXT_PUBLIC_API_URL || '') + '/esg/verify/' + id;
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ verified: false }); setLoading(false); });
  }, [id]);

  const lc = data?.level ? (LEVEL_CFG[data.level as keyof typeof LEVEL_CFG] || LEVEL_CFG.BASIC) : LEVEL_CFG.BASIC;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ fontSize:28, color:C.green }}>⬡</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, fontFamily:'Syne, sans-serif' }}>PANGEA CARBON</div>
            <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em' }}>ESG CERTIFICATE VERIFICATION</div>
          </div>
        </a>
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          {['fr','en'].map(l=>(
            <button key={l} onClick={()=>setLang(l)}
              style={{ padding:'4px 10px', borderRadius:5, border:'none', cursor:'pointer', fontSize:11, fontWeight:lang===l?700:400, background:lang===l?C.green:'rgba(30,45,61,0.6)', color:lang===l?C.bg:C.muted }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', color:C.muted }}>
          <div style={{ width:32, height:32, border:'2px solid rgba(0,255,148,0.2)', borderTopColor:C.green, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>{L('Verifying certificate...','Vérification du certificat...')}</div>
        </div>
      )}

      {!loading && data && !data.verified && (
        <div style={{ background:C.card, border:'1px solid rgba(248,113,113,0.3)', borderRadius:16, padding:32, maxWidth:500, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
          <div style={{ fontSize:18, fontWeight:700, color:C.red, marginBottom:8, fontFamily:'Syne, sans-serif' }}>
            {L('Certificate not found','Certificat introuvable')}
          </div>
          <div style={{ fontSize:13, color:C.text2, lineHeight:1.7, marginBottom:16 }}>
            {L('This ESG certificate ID does not match any verified record in the PANGEA CARBON database. Please verify the certificate ID and try again.','Cet ID de certificat ESG ne correspond à aucun enregistrement vérifié dans la base de données PANGEA CARBON. Veuillez vérifier l\'ID du certificat et réessayer.')}
          </div>
          <div style={{ fontSize:11, color:C.muted, fontFamily:'JetBrains Mono, monospace', padding:'8px 12px', background:C.card2, borderRadius:8 }}>
            ID: {id}
          </div>
        </div>
      )}

      {!loading && data?.verified && (
        <div style={{ maxWidth:640, width:'100%' }}>
          {/* Certificate card */}
          <div style={{ background:C.card, border:'2px solid '+lc.color+'40', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            {/* Top accent */}
            <div style={{ background:'linear-gradient(90deg,'+lc.color+' 0%,'+lc.color+'44 50%,transparent 100%)', height:4 }}/>

            {/* Header */}
            <div style={{ background:'#080B0F', padding:'24px 28px', borderBottom:'1px solid '+C.border }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:10, color:lc.color, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:6 }}>
                    ✓ {L('VERIFIED ESG CERTIFICATE','CERTIFICAT ESG VÉRIFIÉ')}
                  </div>
                  <div style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:'Syne, sans-serif' }}>
                    {data.companyName}
                  </div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                    {data.framework} · {data.sector} · {data.country} · {data.reportingYear}
                  </div>
                </div>
                {/* Level badge */}
                <div style={{ textAlign:'center', background:lc.color+'15', border:'2px solid '+lc.color+'40', borderRadius:12, padding:'12px 16px', minWidth:100 }}>
                  <div style={{ fontSize:28 }}>{lc.icon}</div>
                  <div style={{ fontSize:11, fontWeight:800, color:lc.color, fontFamily:'Syne, sans-serif' }}>
                    {lang==='fr'?lc.labelFr:lc.label}
                  </div>
                  <div style={{ fontSize:10, color:lc.color, fontFamily:'JetBrains Mono, monospace' }}>{data.rating}</div>
                </div>
              </div>
            </div>

            {/* Score section */}
            <div style={{ padding:'24px 28px', borderBottom:'1px solid '+C.border }}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:20, alignItems:'center' }}>
                {/* Big score */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:56, fontWeight:800, color:lc.color, fontFamily:'Syne, sans-serif', lineHeight:1 }}>
                    {Math.round(data.totalScore)}
                  </div>
                  <div style={{ fontSize:13, color:C.muted }}>/100</div>
                  <div style={{ fontSize:11, color:lc.color, fontFamily:'JetBrains Mono, monospace', marginTop:4 }}>
                    {L('Overall ESG Score','Score ESG Global')}
                  </div>
                </div>
                {/* Pillar bars */}
                <div>
                  {[
                    { l:'E — '+L('Environmental','Environnement'), v:data.eScore, c:C.green },
                    { l:'S — Social',                              v:data.sScore, c:C.blue },
                    { l:'G — '+L('Governance','Gouvernance'),     v:data.gScore, c:C.purple },
                  ].map(p=>(
                    <div key={p.l} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:C.text2 }}>{p.l}</span>
                        <span style={{ fontSize:11, color:p.c, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{Math.round(p.v)}%</span>
                      </div>
                      <div style={{ height:6, background:C.border, borderRadius:3 }}>
                        <div style={{ width:Math.round(p.v)+'%', height:'100%', background:p.c, borderRadius:3 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ padding:'20px 28px', borderBottom:'1px solid '+C.border }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { l:L('Certificate ID','ID Certificat'), v:id },
                  { l:L('Framework','Référentiel'), v:data.framework },
                  { l:L('Status','Statut'), v:data.status },
                  { l:L('Reporting Year','Année référence'), v:String(data.reportingYear) },
                  { l:L('Issued by','Émis par'), v:'PANGEA CARBON Africa' },
                  { l:L('Issue date','Date d\'émission'), v:data.completedAt ? new Date(data.completedAt).toLocaleDateString(lang==='fr'?'fr-FR':'en-US',{year:'numeric',month:'long',day:'numeric'}) : '—' },
                ].map(item=>(
                  <div key={item.l} style={{ background:C.card2, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:3 }}>{item.l.toUpperCase()}</div>
                    <div style={{ fontSize:11, color:C.text, fontFamily:item.l.includes('ID')||item.l.includes('Statut')||item.l.includes('Status')?'JetBrains Mono, monospace':'inherit', wordBreak:'break-all' }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Declaration */}
            <div style={{ padding:'20px 28px', background:'rgba(0,255,148,0.03)' }}>
              <div style={{ fontSize:11, color:C.muted, lineHeight:1.7, marginBottom:12 }}>
                {L('This certificate confirms that the above organization has completed a formal ESG self-assessment on the PANGEA CARBON platform. The assessment covers Environmental, Social and Governance criteria across 33 questions aligned with international standards (GRI, CSRD, SASB, IFRS S2, UN SDGs, King IV, TCFD). For independent third-party assurance, contact PANGEA CARBON.',
                   'Ce certificat confirme que l\'organisation ci-dessus a complété une auto-évaluation ESG formelle sur la plateforme PANGEA CARBON. L\'évaluation couvre les critères Environnement, Social et Gouvernance sur 33 questions alignées avec les standards internationaux (GRI, CSRD, SASB, IFRS S2, ODD ONU, King IV, TCFD). Pour une assurance tierce indépendante, contactez PANGEA CARBON.')}
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ fontSize:24 }}>⬡</div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.green }}>PANGEA CARBON Africa</div>
                  <div style={{ fontSize:9, color:C.muted }}>pangea-carbon.com · ESG Intelligence Platform</div>
                </div>
                <a href="https://pangea-carbon.com" style={{ marginLeft:'auto', fontSize:11, color:C.blue, textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(56,189,248,0.3)', borderRadius:7 }}>
                  pangea-carbon.com →
                </a>
              </div>
            </div>
          </div>

          {/* Share / Actions */}
          <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'center' }}>
            <button onClick={()=>window.print()} style={{ background:'transparent', border:'1px solid '+C.border, borderRadius:8, color:C.muted, padding:'8px 18px', cursor:'pointer', fontSize:12 }}>
              🖨️ {L('Print','Imprimer')}
            </button>
            <button onClick={()=>{navigator.clipboard.writeText(window.location.href); alert(L('Link copied!','Lien copié !'));}}
              style={{ background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:8, color:C.green, padding:'8px 18px', cursor:'pointer', fontSize:12 }}>
              🔗 {L('Copy link','Copier lien')}
            </button>
            <a href="/dashboard/esg" style={{ background:C.green, color:C.bg, borderRadius:8, padding:'8px 18px', textDecoration:'none', fontSize:12, fontWeight:700, fontFamily:'Syne, sans-serif' }}>
              {L('My ESG Dashboard →','Mon Dashboard ESG →')}
            </a>
          </div>

          {/* ID display */}
          <div style={{ marginTop:16, textAlign:'center' }}>
            <div style={{ fontSize:10, color:C.muted, fontFamily:'JetBrains Mono, monospace' }}>
              {L('Certificate verified at','Certificat vérifié sur')} pangea-carbon.com/verify/{id}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
