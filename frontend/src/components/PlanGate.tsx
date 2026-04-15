'use client';
/**
 * PANGEA CARBON — Plan Gate System v1.0 Elite
 * Upgrade modals, plan-gated wrappers, feature locks
 */
import { useState, useCallback, createContext, useContext } from 'react';
import { useUserContext, PLAN_METADATA } from '@/lib/features';
import { useLang } from '@/lib/lang-context';
import { useRouter } from 'next/navigation';

const C = {
  bg:'#080B0F', card:'#0D1117', card2:'#121920', border:'#1E2D3D',
  green:'#00FF94', red:'#F87171', yellow:'#FCD34D', blue:'#38BDF8',
  purple:'#A78BFA', orange:'#F97316', muted:'#4A6278', text:'#E8EFF6', text2:'#8FA3B8',
};

const PLAN_ORDER = ['FREE','TRIAL','STARTER','PRO','GROWTH','ENTERPRISE','CUSTOM'];
function planIndex(p) { return PLAN_ORDER.indexOf(p||'TRIAL'); }
function planSatisfies(userPlan, requiredPlan) {
  if (!requiredPlan) return true;
  if (userPlan === 'ENTERPRISE' || userPlan === 'CUSTOM') return true;
  return planIndex(userPlan) >= planIndex(requiredPlan);
}

// ─── FEATURE DEFINITIONS ──────────────────────────────────────────────────────
export const GATED_FEATURES = {
  esg: {
    name: 'ESG Intelligence Engine',
    nameEn: 'ESG Intelligence Engine',
    nameFr: 'Moteur ESG Intelligence',
    icon: '⬡',
    minPlan: 'STARTER',
    color: C.green,
    descEn: 'Generate ESG assessments, scoring E/S/G, compliance reports (GRI, CSRD, SASB, IFRS, UNGC) and your ESG Passport with QR verification.',
    descFr: 'Générez des évaluations ESG, scoring E/S/G, rapports de conformité (GRI, CSRD, SASB, IFRS, UNGC) et votre Passeport ESG avec vérification QR.',
    features: [
      ['⬡ ESG Scoring E/S/G','Pondéré par secteur et région'],
      ['📋 Compliance Grid','GRI · CSRD · SASB · IFRS · UNGC · King IV · TCFD'],
      ['🛂 ESG Passport QR','Vérification publique pangea-carbon.com/verify'],
      ['📊 AI Recommendations','Axes d\'amélioration générés par IA'],
    ],
  },
  carbon_tax: {
    name: 'Carbon Tax Engine',
    nameEn: 'Carbon Tax Engine',
    nameFr: 'Moteur Taxe Carbone',
    icon: '💰',
    minPlan: 'PRO',
    color: C.orange,
    descEn: 'Simulate carbon tax exposure, model regulatory scenarios (EU ETS, CBAM, Article 6) and optimize your hedging strategy.',
    descFr: 'Simulez votre exposition à la taxe carbone, modelisez les scénarios réglementaires (EU ETS, CBAM, Article 6) et optimisez votre stratégie de couverture.',
    features: [
      ['💰 Tax Simulation','EU ETS · CBAM · CORSIA · Article 6 · Afrique'],
      ['📈 Scenario Modeling','Scénarios optimiste · médian · pessimiste'],
      ['🔄 Hedge Optimization','Calcul couverture carbone optimale'],
      ['📤 Regulatory Export','Rapports PDF pour commissaires aux comptes'],
    ],
  },
  email_composer: {
    name: 'Email Composer',
    nameEn: 'Email Composer',
    nameFr: 'Compositeur Email',
    icon: '✉️',
    minPlan: 'PRO',
    color: C.blue,
    descEn: 'Send branded carbon credit certificates, investor reports and regulatory notifications directly from PANGEA CARBON.',
    descFr: 'Envoyez des certificats de crédits carbone, rapports investisseurs et notifications réglementaires brandés directement depuis PANGEA CARBON.',
    features: [
      ['📧 Branded Templates','Certificats, rapports, alertes réglementaires'],
      ['📋 Audit Trail','Historique complet des envois'],
      ['🎯 Segmentation','Envoi par rôle, organisation, projet'],
      ['📊 Analytics','Taux ouverture · clics · désinscriptions'],
    ],
  },
  pdf_reports: {
    name: 'PDF Reports',
    nameEn: 'PDF Reports',
    nameFr: 'Rapports PDF',
    icon: '📄',
    minPlan: 'STARTER',
    color: C.purple,
    descEn: 'Generate certifiable PDF reports for Verra ACM0002, Gold Standard, CORSIA and all 9 GHG standards.',
    descFr: 'Générez des rapports PDF certifiables pour Verra ACM0002, Gold Standard, CORSIA et les 9 normes GHG.',
    features: [
      ['📄 9 Standards','Verra · GS · CORSIA · ISO14064 · GHG Protocol · +4'],
      ['🔐 Digital Signature','Signature cryptographique PDF'],
      ['📬 Auto-delivery','Envoi automatique aux auditeurs VVB'],
      ['⏱ Scheduled Reports','Rapports mensuels/trimestriels automatiques'],
    ],
  },
  marketplace_sell: {
    name: 'Marketplace — Sell',
    nameEn: 'Marketplace — Sell Credits',
    nameFr: 'Marketplace — Vendre des crédits',
    icon: '🏪',
    minPlan: 'STARTER',
    color: C.yellow,
    descEn: 'List and sell your carbon credits on the PANGEA CARBON marketplace. Accept USD, XOF, XAF via Stripe, CinetPay or Flutterwave.',
    descFr: 'Listez et vendez vos crédits carbone sur le marketplace PANGEA CARBON. Acceptez USD, XOF, XAF via Stripe, CinetPay ou Flutterwave.',
    features: [
      ['🏪 Credit Listings','Publier vos crédits avec prix et description'],
      ['💳 Multi-Gateway','Stripe · CinetPay · Flutterwave · Wire'],
      ['📊 Sales Analytics','Revenue · conversions · top acheteurs'],
      ['🤝 Forward Contracts','Contrats à terme sur crédits futurs'],
    ],
  },
  ai_assistant: {
    name: 'AI Assistant',
    nameEn: 'AI Carbon Intelligence',
    nameFr: 'Assistant IA Carbone',
    icon: '🤖',
    minPlan: 'GROWTH',
    color: '#EF9F27',
    descEn: 'Claude AI-powered assistant specialized in carbon markets, Verra methodologies, ACM0002 calculations and regulatory compliance.',
    descFr: 'Assistant IA Claude spécialisé dans les marchés carbone, méthodologies Verra, calculs ACM0002 et conformité réglementaire.',
    features: [
      ['🤖 Carbon Expert AI','Réponses spécialisées carbone/MRV/ESG'],
      ['📊 Auto-Analysis','Analyse automatique de vos données MRV'],
      ['📋 Report Generation','Rédaction de rapports réglementaires'],
      ['🌍 Africa Context','Facteurs d\'émission UNFCCC · ALL pays africains'],
    ],
  },
  reports_schedule: {
    name: 'Scheduled Reports',
    nameEn: 'Scheduled Reports',
    nameFr: 'Rapports Planifiés',
    icon: '⏱',
    minPlan: 'PRO',
    color: C.purple,
    descEn: 'Automatically generate and deliver reports on a schedule.',
    descFr: 'Générez et livrez automatiquement des rapports selon un calendrier.',
    features: [
      ['⏱ Auto-Schedule','Mensuel · Trimestriel · Annuel'],
      ['📬 Auto-Delivery','Envoi aux auditeurs VVB par email'],
    ],
  },
  bulk_import: {
    name: 'CSV Bulk Import',
    nameEn: 'CSV Bulk Import',
    nameFr: 'Import CSV en masse',
    icon: '📥',
    minPlan: 'STARTER',
    color: C.blue,
    descEn: 'Import thousands of energy readings at once via CSV.',
    descFr: 'Importez des milliers de lectures énergétiques en une fois via CSV.',
    features: [
      ['📥 Bulk Upload','CSV illimité · Validation automatique'],
      ['🔄 Auto-Mapping','Détection automatique des colonnes'],
    ],
  },
};

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
export function UpgradeModal({ featureKey, onClose }) {
  const { lang } = useLang();
  const { plan: userPlan } = useUserContext();
  const router = useRouter();
  const feature = GATED_FEATURES[featureKey];
  if (!feature) return null;

  const meta = PLAN_METADATA[feature.minPlan] || PLAN_METADATA.STARTER;
  const currentMeta = PLAN_METADATA[userPlan] || PLAN_METADATA.TRIAL;
  const name = lang === 'fr' ? feature.nameFr : feature.nameEn;
  const desc = lang === 'fr' ? feature.descFr : feature.descEn;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.92)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:16 }}>
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:20, padding:0, width:'100%', maxWidth:520, boxShadow:'0 40px 120px rgba(0,0,0,0.85)', position:'relative', overflow:'hidden' }}>

        {/* Accent header */}
        <div style={{ height:4, background:'linear-gradient(90deg,'+feature.color+' 0%,'+feature.color+'40 60%,transparent 100%)' }}/>

        {/* Top */}
        <div style={{ padding:'24px 28px 20px', borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              {feature.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:feature.color, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:4 }}>
                PANGEA CARBON · {lang==='fr'?'FONCTIONNALITÉ PREMIUM':'PREMIUM FEATURE'} · {feature.minPlan}
              </div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:C.text, margin:'0 0 6px' }}>
                {name}
              </h2>
              <p style={{ fontSize:12, color:C.text2, margin:0, lineHeight:1.7 }}>{desc}</p>
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:20, flexShrink:0, lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* Features list */}
        <div style={{ padding:'20px 28px', borderBottom:'1px solid '+C.border }}>
          <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:12, letterSpacing:'0.1em' }}>
            {lang==='fr'?'INCLUS DANS CE MODULE:':'INCLUDED IN THIS MODULE:'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {feature.features.map(([title, sub], i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 10px', background:C.card2, borderRadius:8, border:'1px solid '+C.border+'60' }}>
                <div style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{title.split(' ')[0]}</div>
                <div>
                  <div style={{ fontSize:11, color:C.text, fontWeight:600 }}>{title.split(' ').slice(1).join(' ')}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan comparison */}
        <div style={{ padding:'16px 28px', borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ flex:1, padding:'10px 14px', background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, textAlign:'center' }}>
              <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                {lang==='fr'?'VOTRE PLAN':'YOUR PLAN'}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:currentMeta.color, fontFamily:'JetBrains Mono, monospace' }}>{userPlan||'TRIAL'}</div>
              <div style={{ fontSize:10, color:C.red, marginTop:2 }}>✗ {lang==='fr'?'Pas inclus':'Not included'}</div>
            </div>
            <div style={{ fontSize:20, color:C.muted }}>→</div>
            <div style={{ flex:1, padding:'10px 14px', background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.25)', borderRadius:10, textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:C.green }}/>
              <div style={{ fontSize:8, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                {lang==='fr'?'REQUIS':'REQUIRED'}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:meta.color, fontFamily:'JetBrains Mono, monospace' }}>{feature.minPlan}</div>
              <div style={{ fontSize:10, color:meta.color, marginTop:2 }}>✓ {meta.price}</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding:'20px 28px' }}>
          <button onClick={() => { router.push('/dashboard/settings'); onClose(); }}
            style={{ width:'100%', background:C.green, color:C.bg, border:'none', borderRadius:10, padding:'14px 0', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Syne, sans-serif', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}>
            ⚡ {lang==='fr'?'Passer au plan '+feature.minPlan+' →':'Upgrade to '+feature.minPlan+' →'}
          </button>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { router.push('/dashboard/settings'); onClose(); }}
              style={{ flex:1, background:'transparent', border:'1px solid '+C.border, borderRadius:9, color:C.text2, padding:'10px 0', cursor:'pointer', fontSize:12 }}>
              {lang==='fr'?'Voir tous les plans':'View all plans'}
            </button>
            <button onClick={onClose}
              style={{ flex:1, background:'transparent', border:'1px solid '+C.border, borderRadius:9, color:C.muted, padding:'10px 0', cursor:'pointer', fontSize:12 }}>
              {lang==='fr'?'Plus tard':'Maybe later'}
            </button>
          </div>
          <div style={{ marginTop:12, textAlign:'center', fontSize:10, color:C.muted }}>
            🔒 {lang==='fr'
              ?'Paiement sécurisé via Stripe · Annulation à tout moment · Support 24/7'
              :'Secure payment via Stripe · Cancel anytime · 24/7 support'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PLAN GATE WRAPPER ────────────────────────────────────────────────────────
export function PlanGate({ featureKey, children, fallback = null }) {
  const { plan: userPlan } = useUserContext();
  const [showModal, setShowModal] = useState(false);
  const feature = GATED_FEATURES[featureKey];

  if (!feature) return <>{children}</>;
  if (planSatisfies(userPlan, feature.minPlan)) return <>{children}</>;

  return (
    <>
      <div onClick={() => setShowModal(true)} style={{ cursor:'pointer', position:'relative' }}>
        {fallback || (
          <div style={{ opacity:0.4, pointerEvents:'none', userSelect:'none' }}>
            {children}
          </div>
        )}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(8,11,15,0.6)', borderRadius:8, backdropFilter:'blur(4px)' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>🔒</div>
            <div style={{ fontSize:11, color:C.yellow, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>
              {feature.minPlan} REQUIRED
            </div>
          </div>
        </div>
      </div>
      {showModal && <UpgradeModal featureKey={featureKey} onClose={() => setShowModal(false)}/>}
    </>
  );
}

// ─── PLAN BANNER (haut de page) ───────────────────────────────────────────────
export function PlanBanner({ featureKey }) {
  const { lang } = useLang();
  const { plan: userPlan } = useUserContext();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const feature = GATED_FEATURES[featureKey];

  if (!feature || planSatisfies(userPlan, feature.minPlan) || dismissed) return null;

  const meta = PLAN_METADATA[feature.minPlan] || {};
  const name = lang === 'fr' ? feature.nameFr : feature.nameEn;

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,rgba(252,211,77,0.08) 0%,rgba(249,115,22,0.06) 100%)', border:'1px solid rgba(252,211,77,0.3)', borderRadius:14, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, bottom:0, width:4, borderRadius:'14px 0 0 14px', background:'linear-gradient(180deg,'+C.yellow+' 0%,'+C.orange+' 100%)' }}/>
        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(252,211,77,0.12)', border:'1px solid rgba(252,211,77,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, marginLeft:8 }}>
          {feature.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.yellow, marginBottom:3 }}>
            {lang==='fr'
              ?(name+' — Plan '+feature.minPlan+' requis')
              :(name+' — '+feature.minPlan+' plan required')}
          </div>
          <div style={{ fontSize:11, color:C.text2, lineHeight:1.6 }}>
            {lang==='fr'
              ?('Votre plan actuel ('+(userPlan||'TRIAL')+') ne permet pas l\'acces a ce module. Passez au plan '+feature.minPlan+' pour deverrouiller '+name+'.')
              :('Your current plan ('+(userPlan||'TRIAL')+') does not include this module. Upgrade to '+feature.minPlan+' to unlock '+name+'.')}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={() => setShowModal(true)}
            style={{ background:C.yellow, color:C.bg, border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:800, fontFamily:'Syne, sans-serif', whiteSpace:'nowrap' }}>
            ⚡ {lang==='fr'?'Voir les plans':'View plans'}
          </button>
          <button onClick={() => setDismissed(true)}
            style={{ background:'transparent', border:'1px solid rgba(252,211,77,0.2)', borderRadius:8, color:C.muted, padding:'8px 12px', cursor:'pointer', fontSize:14 }}>×</button>
        </div>
      </div>
      {showModal && <UpgradeModal featureKey={featureKey} onClose={() => setShowModal(false)}/>}
    </>
  );
}

// ─── FEATURE LOCK ICON (sidebar/nav) ─────────────────────────────────────────
export function FeatureLock({ featureKey }) {
  const { plan: userPlan } = useUserContext();
  const feature = GATED_FEATURES[featureKey];
  if (!feature || planSatisfies(userPlan, feature.minPlan)) return null;

  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:4, background:'rgba(252,211,77,0.12)', border:'1px solid rgba(252,211,77,0.25)', fontSize:9, color:C.yellow, marginLeft:4, flexShrink:0 }}>
      🔒
    </span>
  );
}

// ─── HOOK usePlanGate ─────────────────────────────────────────────────────────
export function usePlanGate() {
  const { plan: userPlan } = useUserContext();
  const [modal, setModal] = useState(null);

  const check = useCallback((featureKey) => {
    const feature = GATED_FEATURES[featureKey];
    if (!feature) return true;
    if (planSatisfies(userPlan, feature.minPlan)) return true;
    setModal(featureKey);
    return false;
  }, [userPlan]);

  const Modal = modal
    ? <UpgradeModal featureKey={modal} onClose={() => setModal(null)}/>
    : null;

  return { check, Modal, isLocked: (key) => {
    const f = GATED_FEATURES[key];
    return f ? !planSatisfies(userPlan, f.minPlan) : false;
  }};
}

export { planSatisfies, PLAN_ORDER };


// ─── PLAN LIMIT MODAL (spécifique aux erreurs 402 numériques) ────────────────
export function PlanLimitModal({ error, onClose }) {
  const { lang } = useLang();
  const router = useRouter();
  if (!error) return null;

  const isProject = error.code === 'PLAN_PROJECT_LIMIT';
  const isMW      = error.code === 'PLAN_MW_LIMIT';
  const isUser    = error.code === 'PLAN_USER_LIMIT';
  const isApiKey  = error.code === 'PLAN_APIKEY_LIMIT';

  const icon = isProject ? '📁' : isMW ? '⚡' : isUser ? '👤' : isApiKey ? '🔑' : '⚠️';
  const color = C.yellow;

  const title = isProject
    ? (lang==='fr' ? 'Limite de projets atteinte' : 'Project limit reached')
    : isMW
    ? (lang==='fr' ? 'Limite de capacité MW atteinte' : 'MW capacity limit reached')
    : isUser
    ? (lang==='fr' ? 'Limite utilisateurs atteinte' : 'User limit reached')
    : (lang==='fr' ? 'Limite atteinte' : 'Limit reached');

  const desc = isProject
    ? (lang==='fr'
      ? 'Votre plan ' + (error.currentPlan||'') + ' est limité à ' + (error.max||0) + ' projet(s). Vous en avez actuellement ' + (error.current||0) + '.'
      : 'Your ' + (error.currentPlan||'') + ' plan is limited to ' + (error.max||0) + ' project(s). You currently have ' + (error.current||0) + '.')
    : isMW
    ? (lang==='fr'
      ? 'La capacité MW totale de votre plan ' + (error.currentPlan||'') + ' est de ' + (error.max||0) + ' MW.'
      : 'Your ' + (error.currentPlan||'') + ' plan MW capacity is ' + (error.max||0) + ' MW.')
    : error.error || (lang==='fr' ? 'Limite de plan atteinte.' : 'Plan limit reached.');

  const currentMeta = { FREE:'#4A6278', TRIAL:'#4A6278', STARTER:'#38BDF8', PRO:'#A78BFA', GROWTH:'#A78BFA', ENTERPRISE:'#FCD34D' };
  const currentColor = currentMeta[error.currentPlan] || C.muted;
  const requiredColor = currentMeta[error.requiredPlan] || C.green;

  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.92)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:16 }}>
      <div style={{ background:C.card, border:'1px solid rgba(252,211,77,0.4)', borderRadius:20, padding:0, width:'100%', maxWidth:480, boxShadow:'0 40px 120px rgba(0,0,0,0.85)', overflow:'hidden', position:'relative' }}>

        <div style={{ height:4, background:'linear-gradient(90deg,'+color+' 0%,'+color+'40 60%,transparent 100%)' }}/>

        <div style={{ padding:'24px 28px 0' }}>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:20 }}>
            <div style={{ width:60, height:60, borderRadius:15, background:'rgba(252,211,77,0.1)', border:'1px solid rgba(252,211,77,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
              {icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:color, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.14em', marginBottom:4 }}>
                PANGEA CARBON · {lang==='fr'?'LIMITE DE PLAN':'PLAN LIMIT'} · {error.currentPlan||''}
              </div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:19, fontWeight:800, color:C.text, margin:'0 0 6px' }}>
                {title}
              </h2>
              <p style={{ fontSize:13, color:C.text2, margin:0, lineHeight:1.7 }}>{desc}</p>
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:20, flexShrink:0, padding:0 }}>×</button>
          </div>

          <div style={{ background:C.card2, borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center' }}>
              <div style={{ textAlign:'center', padding:'10px', background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:9 }}>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                  {lang==='fr'?'VOTRE PLAN':'YOUR PLAN'}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:currentColor }}>{error.currentPlan||'FREE'}</div>
                <div style={{ fontSize:10, color:C.red, marginTop:2 }}>✗ {lang==='fr'?'Limite atteinte':'Limit reached'}</div>
              </div>
              <div style={{ fontSize:22, color:C.muted, textAlign:'center' }}>→</div>
              <div style={{ textAlign:'center', padding:'10px', background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.2)', borderRadius:9, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:C.green }}/>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'JetBrains Mono, monospace', marginBottom:4 }}>
                  {lang==='fr'?'REQUIS':'REQUIRED'}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:requiredColor }}>{error.requiredPlan||'STARTER'}</div>
                <div style={{ fontSize:10, color:C.green, marginTop:2 }}>✓ {lang==='fr'?'Inclus':'Included'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'0 28px 24px' }}>
          <button onClick={()=>{ router.push('/dashboard/settings'); onClose(); }}
            style={{ width:'100%', background:C.green, color:C.bg, border:'none', borderRadius:10, padding:'14px 0', fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'Syne, sans-serif', marginBottom:10, transition:'opacity .15s' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.9'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            ⚡ {lang==='fr'?'Passer au plan '+(error.requiredPlan||'STARTER')+' →':'Upgrade to '+(error.requiredPlan||'STARTER')+' →'}
          </button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={()=>{ router.push('/dashboard/settings'); onClose(); }}
              style={{ background:'transparent', border:'1px solid '+C.border, borderRadius:9, color:C.text2, padding:'10px 0', cursor:'pointer', fontSize:12 }}>
              {lang==='fr'?'Voir les plans':'View all plans'}
            </button>
            <button onClick={onClose}
              style={{ background:'transparent', border:'1px solid '+C.border, borderRadius:9, color:C.muted, padding:'10px 0', cursor:'pointer', fontSize:12 }}>
              {lang==='fr'?'Plus tard':'Maybe later'}
            </button>
          </div>
          <div style={{ textAlign:'center', marginTop:12, fontSize:10, color:C.muted }}>
            🔒 {lang==='fr'?'Stripe · Annulation à tout moment · Support 24/7':'Stripe · Cancel anytime · 24/7 Support'}
          </div>
        </div>
      </div>
    </div>
  );
}
