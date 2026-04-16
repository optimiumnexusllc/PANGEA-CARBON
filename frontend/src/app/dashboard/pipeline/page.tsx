'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';
import Link from 'next/link';

const C = { bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D', green:'#00FF94', blue:'#38BDF8', purple:'#A78BFA', yellow:'#FCD34D', red:'#F87171', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8' };

const STEPS = [
  { key:'MRV_DATA',           label:'1. MRV Data',         color:C.blue },
  { key:'MRV_CALCULATION',    label:'2. Calculation',      color:C.blue },
  { key:'PDD',                label:'3. PDD',              color:C.purple },
  { key:'VVB_VALIDATION',     label:'4. VVB Validation',   color:C.yellow },
  { key:'MONITORING_PERIOD',  label:'5. Monitoring',       color:C.yellow },
  { key:'MONITORING_REPORT',  label:'6. Report',           color:C.orange },
  { key:'VVB_VERIFICATION',   label:'7. Verification',     color:C.orange },
  { key:'REGISTRY_SUBMISSION',label:'8. Registry',         color:C.red },
  { key:'REGISTRY_REVIEW',    label:'9. Review',           color:C.red },
  { key:'CREDIT_ISSUANCE',    label:'10. Issuance',        color:C.green },
  { key:'MARKET_LISTING',     label:'11. Market',          color:C.green },
];

export default function PipelinePage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuthJson('/pipeline');
      setPipelines(data.pipelines || data || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getStepColor = (status) => {
    if (status === 'COMPLETED') return C.green;
    if (status === 'ACTIVE') return C.yellow;
    if (status === 'BLOCKED') return C.red;
    return C.muted;
  };

  return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:C.green, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:4 }}>
          VERRA VCS · GOLD STANDARD · ARTICLE 6 ITMO · CORSIA
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:C.text, margin:0 }}>
            {L('Credit Issuance Pipeline','Pipeline Emission de Credits')}
          </h1>
          <Link href="/dashboard/projects/new"
            style={{ background:C.green, color:C.bg, border:'none', borderRadius:9, padding:'10px 20px', fontWeight:700, fontSize:13, textDecoration:'none', display:'inline-block' }}>
            + {L('New Project','Nouveau Projet')}
          </Link>
        </div>
        <p style={{ fontSize:13, color:C.muted, marginTop:8 }}>
          {L('11-step certification workflow — 6 to 24 months to first carbon credits.',
             'Processus de certification 11 etapes — 6 a 24 mois jusqu'aux premiers credits carbone.')}
        </p>
      </div>

      {error && (
        <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, color:C.red, fontSize:13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted, fontFamily:'JetBrains Mono, monospace', fontSize:13 }}>
          {L('Loading pipelines...','Chargement...')}
        </div>
      ) : pipelines.length === 0 ? (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:16 }}>🔄</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>
            {L('No active pipelines','Aucun pipeline actif')}
          </div>
          <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
            {L('Start a credit issuance pipeline from one of your MRV projects.',
               'Demarrez un pipeline depuis un de vos projets MRV.')}
          </p>
          <Link href="/dashboard/projects"
            style={{ background:C.green, color:C.bg, borderRadius:9, padding:'11px 24px', fontWeight:700, fontSize:13, textDecoration:'none', display:'inline-block' }}>
            {L('Go to Projects','Voir les Projets')}
          </Link>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {pipelines.map(pipe => {
            const currentStep = STEPS.findIndex(s => s.key === pipe.currentStep);
            const pct = Math.round(((currentStep + 1) / STEPS.length) * 100);
            return (
              <div key={pipe.id} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:14, overflow:'hidden' }}>
                <div style={{ height:3, background:'linear-gradient(90deg,'+C.green+' 0%,'+C.green+' '+pct+'%,'+C.border+' '+pct+'% 100%)' }}/>
                <div style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                        {pipe.standard || 'Verra VCS'} · {pct}%
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>
                        {pipe.project?.name || pipe.name || L('Pipeline','Pipeline')}
                      </div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                        {L('Step','Etape')} {currentStep + 1}/{STEPS.length}: {STEPS[currentStep]?.label}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:20, fontWeight:800, color:C.green }}>
                        {pipe.estimatedCredits ? pipe.estimatedCredits.toLocaleString() : '—'}
                      </div>
                      <div style={{ fontSize:10, color:C.muted }}>est. tCO₂e</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, marginTop:14, flexWrap:'wrap' }}>
                    {STEPS.map((step, idx) => (
                      <div key={step.key} title={step.label}
                        style={{ height:6, flex:1, minWidth:12, borderRadius:3, background: idx < currentStep ? C.green : idx === currentStep ? C.yellow : C.card2, transition:'background 0.3s' }}/>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
