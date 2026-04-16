'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { useLang } from '@/lib/lang-context';

// ─── Design tokens PANGEA ─────────────────────────────────────────────────────
const BG    = '#080B0F';
const CARD  = '#0D1117';
const CARD2 = '#0A1628';
const BORDER = '#1E2D3D';
const GREEN = '#00FF94';
const RED   = '#F87171';
const YELLOW= '#FCD34D';
const BLUE  = '#38BDF8';
const PURPLE= '#A78BFA';
const MUTED = '#4A6278';
const TEXT  = '#E8EFF6';
const TEXT2 = '#8FA3B8';

// ─── Gateways ─────────────────────────────────────────────────────────────────
const GATEWAYS = [
  {
    id: 'MTN_MOMO',
    label: 'MTN Mobile Money',
    icon: '📱',
    color: '#FCD34D',
    regions: 'CI · GH · UG · RW · CM',
    countries: ['CI','GH','UG','RW','CM','BJ','NE','SN','MR'],
    description: 'Paiement mobile MTN — Leader en Afrique subsaharienne',
    fields: [
      { key:'mtnMomoNumber',    label:'NUMÉRO DE TÉLÉPHONE ENREGISTRÉ *', placeholder:'+225 07 12 34 56', type:'tel', required:true,
        help:'Numéro MoMo actif, inscrit à MTN Mobile Money. Format international +XXX XX XX XX XX' },
      { key:'mtnMomoName',      label:"NOM DU TITULAIRE DU COMPTE *", placeholder:'Jean-Baptiste Koné', type:'text', required:true,
        help:'Nom exact tel qu\'il apparaît sur votre compte MoMo MTN' },
      { key:'mtnMomoCountry',   label:'PAYS *', placeholder:'', type:'select', required:true,
        options:['CI','GH','UG','RW','CM','BJ','NE','SN','MR'],
        help:'Pays où le compte MoMo est enregistré' },
      { key:'mtnMomoMerchantId',label:'MERCHANT ID (optionnel)', placeholder:'MTN-MOMO-XXXXXX', type:'text', required:false,
        help:'Identifiant commerçant si vous avez un compte Business MoMo' },
    ]
  },
  {
    id: 'ORANGE_MONEY',
    label: 'Orange Money',
    icon: '🟠',
    color: '#F97316',
    regions: 'CI · SN · ML · BF · CM',
    countries: ['CI','SN','ML','BF','CM','GN','MR','MG'],
    description: 'Orange Money — 2ème réseau mobile money en Afrique de l\'Ouest',
    fields: [
      { key:'orangeMoneyNumber',  label:'NUMÉRO DE TÉLÉPHONE ORANGE MONEY *', placeholder:'+225 05 23 45 67', type:'tel', required:true,
        help:'Numéro Orange Money actif. Doit être enregistré et KYC validé' },
      { key:'orangeMoneyName',    label:'NOM DU TITULAIRE *', placeholder:'Aminata Diallo', type:'text', required:true,
        help:'Nom exact enregistré sur votre compte Orange Money' },
      { key:'orangeMoneyCountry', label:'PAYS *', placeholder:'', type:'select', required:true,
        options:['CI','SN','ML','BF','CM','GN','MR','MG'],
        help:'Pays d\'enregistrement du compte Orange Money' },
      { key:'orangeMoneyApiKey',  label:'ORANGE MONEY API KEY (Business)', placeholder:'OM-API-XXXXXXXXXXXX', type:'password', required:false,
        help:'Clé API Orange Money Business pour les virements automatisés. Obtenir via developer.orange.com' },
      { key:'orangeMoneyMerchantCode', label:'CODE MARCHAND', placeholder:'OM-MERCHANT-XXXX', type:'text', required:false,
        help:'Code marchand Orange Money Business (pour intégration API directe)' },
    ]
  },
  {
    id: 'WAVE',
    label: 'Wave',
    icon: '🌊',
    color: '#38BDF8',
    regions: 'CI · SN',
    countries: ['CI','SN'],
    description: 'Wave — Meilleur taux de change, 0% frais pour les particuliers',
    fields: [
      { key:'waveNumber',      label:'NUMÉRO DE TÉLÉPHONE WAVE *', placeholder:'+225 07 99 88 77', type:'tel', required:true,
        help:'Numéro Wave actif. Wave opère actuellement en Côte d\'Ivoire et Sénégal' },
      { key:'waveName',        label:'NOM DU TITULAIRE *', placeholder:'Kouassi Yao', type:'text', required:true,
        help:'Nom exact associé au compte Wave' },
      { key:'waveCountry',     label:'PAYS *', placeholder:'', type:'select', required:true,
        options:['CI','SN'],
        help:'Pays du compte Wave' },
      { key:'waveBusinessId',  label:'WAVE BUSINESS ID', placeholder:'WAVE-BIZ-XXXXXXXX', type:'text', required:false,
        help:'ID Business Wave pour les virements marchands automatiques (>500k XOF). Créer un compte Wave Business sur business.wave.com' },
    ]
  },
  {
    id: 'FLUTTERWAVE',
    label: 'Flutterwave',
    icon: '🦋',
    color: '#A78BFA',
    regions: 'NG · GH · KE · ZA + 20 pays',
    countries: ['NG','GH','KE','ZA','CI','TZ','UG','RW','CM','SN','EG','MA','TN','DZ'],
    description: 'Flutterwave — Infrastructure de paiement panafricaine B2B',
    fields: [
      { key:'flutterwaveSubaccountId',  label:'SUBACCOUNT ID *', placeholder:'RS_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', type:'text', required:true,
        help:'Votre Subaccount ID Flutterwave. Dashboard → Settings → Subaccounts → Create Subaccount. Format: RS_XXXXXXXX' },
      { key:'flutterwaveSecretKey',     label:'SECRET KEY *', placeholder:'FLWSECK-VOTRE_CLE_FLUTTERWAVE', type:'password', required:true,
        help:'Clé secrète API Flutterwave. Dashboard → Settings → API Keys. Commencer avec la clé TEST en premier' },
      { key:'flutterwavePublicKey',     label:'PUBLIC KEY', placeholder:'FLWPUBK-VOTRE_CLE_PUBLIQUE', type:'text', required:false,
        help:'Clé publique Flutterwave (optionnel, pour vérification côté client)' },
      { key:'flutterwaveBankAccount',   label:'COMPTE BANCAIRE LIÉ *', placeholder:'0012345678', type:'text', required:true,
        help:'Numéro de compte bancaire lié à votre compte Flutterwave pour les retraits' },
      { key:'flutterwaveBankCode',      label:'CODE BANQUE', placeholder:'044 (Access Bank)', type:'text', required:false,
        help:'Code de votre banque (ex: 044 pour Access Bank Nigeria). Voir liste sur docs.flutterwave.com' },
      { key:'flutterwaveCurrency',      label:'DEVISE DE PAIEMENT', placeholder:'', type:'select', required:false,
        options:['USD','NGN','GHS','KES','ZAR','XOF','XAF','UGX','TZS','RWF'],
        help:'Devise dans laquelle vous voulez recevoir les paiements' },
      { key:'flutterwaveBusinessName',  label:'NOM COMMERCIAL', placeholder:'Solar Africa Ltd', type:'text', required:false,
        help:'Nom de votre entreprise sur Flutterwave' },
    ]
  },
  {
    id: 'PAYSTACK',
    label: 'Paystack',
    icon: '💚',
    color: '#00FF94',
    regions: 'NG · GH · KE · ZA',
    countries: ['NG','GH','KE','ZA'],
    description: 'Paystack (Stripe company) — Leader au Nigeria, Kenya, Ghana',
    fields: [
      { key:'paystackSecretKey',        label:'SECRET KEY *', placeholder:'sk_live_VOTRE_CLE_SECRETE_PAYSTACK', type:'password', required:true,
        help:'Clé secrète Paystack. Dashboard → Settings → API Keys & Webhooks. Utiliser sk_live_* en production' },
      { key:'paystackPublicKey',        label:'PUBLIC KEY', placeholder:'pk_live_VOTRE_CLE_PUBLIQUE_PAYSTACK', type:'text', required:false,
        help:'Clé publique Paystack (pour les paiements front-end)' },
      { key:'paystackRecipientCode',    label:'RECIPIENT CODE *', placeholder:'RCP_XXXXXXXXXXXXXXXXX', type:'text', required:true,
        help:'Code de transfert Paystack. Dashboard → Transfers → Recipients → Create Recipient. Format: RCP_XXXXXXXX' },
      { key:'paystackBankCode',         label:'CODE BANQUE', placeholder:'058 (GTBank)', type:'text', required:false,
        help:'Code banque pour les transferts (ex: 058 GTBank). Liste sur paystack.com/blog/banks' },
      { key:'paystackAccountNumber',    label:'NUMÉRO DE COMPTE BANCAIRE *', placeholder:'0123456789', type:'text', required:true,
        help:'Numéro de compte bancaire lié à votre profil Paystack pour les settlements' },
      { key:'paystackCurrency',         label:'DEVISE', placeholder:'', type:'select', required:false,
        options:['NGN','GHS','KES','ZAR','USD'],
        help:'Devise principale de votre compte Paystack' },
      { key:'paystackBusinessName',     label:'NOM COMMERCIAL', placeholder:'Green Energy Co', type:'text', required:false,
        help:'Nom affiché sur les reçus de paiement' },
    ]
  },
  {
    id: 'WIRE',
    label: 'Virement SWIFT/SEPA',
    icon: '🏦',
    color: TEXT,
    regions: 'International — Tous pays',
    countries: [],
    description: 'Virement bancaire international — USD, EUR, GBP, XOF, XAF et toutes devises',
    fields: [
      { key:'bankBeneficiary',   label:'NOM DU BÉNÉFICIAIRE *', placeholder:'Optimium Nexus LLC', type:'text', required:true,
        help:'Nom exact du titulaire du compte tel qu\'il apparaît sur les documents bancaires' },
      { key:'bankName',          label:'NOM DE LA BANQUE *', placeholder:'Ecobank Côte d\'Ivoire', type:'text', required:true,
        help:'Nom complet de votre banque (ex: Ecobank CI, Stanbic Bank Kenya, Standard Bank ZA)' },
      { key:'bankAccountNumber', label:'NUMÉRO DE COMPTE *', placeholder:'CI06CI0080011300010080000456', type:'text', required:true,
        help:'Numéro de compte bancaire ou IBAN. Format IBAN pour les pays qui l\'utilisent (CI: 28 chars, MA, TN, EG...)' },
      { key:'bankIBAN',          label:'IBAN (si applicable)', placeholder:'FR76 3000 6000 0112 3456 7890 189', type:'text', required:false,
        help:'IBAN requis pour les virements SEPA (Europe, Maghreb). Laisser vide si votre pays n\'utilise pas l\'IBAN' },
      { key:'bankSwift',         label:'CODE SWIFT / BIC *', placeholder:'ECOCCIAB', type:'text', required:true,
        help:'Code SWIFT/BIC de votre banque (8 ou 11 caractères). Trouver sur wise.com/swift-codes ou votre RIB' },
      { key:'bankRoutingNumber', label:'ROUTING NUMBER (USA/Canada)', placeholder:'021000021', type:'text', required:false,
        help:'Requis uniquement pour les comptes bancaires américains ou canadiens (ABA Routing Number)' },
      { key:'bankCurrency',      label:'DEVISE DU COMPTE *', placeholder:'', type:'select', required:true,
        options:['USD','EUR','GBP','XOF','XAF','GHS','NGN','KES','ZAR','MAD','EGP','TND','DZD'],
        help:'Devise principale du compte (les conversions sont à votre charge selon votre banque)' },
      { key:'bankCountry',       label:'PAYS DE LA BANQUE *', placeholder:'CI', type:'text', required:true,
        help:'Pays où est domiciliée votre banque (code ISO 2 lettres: CI, NG, KE, ZA, MA...)' },
      { key:'bankCity',          label:'VILLE DE LA BANQUE', placeholder:'Abidjan', type:'text', required:false,
        help:'Ville du siège de votre banque (utile pour les virements internationaux)' },
      { key:'bankAddress',       label:'ADRESSE AGENCE', placeholder:'Avenue du Général de Gaulle, Plateau', type:'text', required:false,
        help:'Adresse complète de votre agence bancaire (requis pour certains virements internationaux)' },
      { key:'bankIntermediarySwift', label:'BANQUE CORRESPONDANTE (SWIFT)', placeholder:'CHASUS33', type:'text', required:false,
        help:'SWIFT de la banque intermédiaire (correspondante) si requis — généralement JP Morgan (CHASUS33) ou Citibank (CITIUS33) pour les virements USD' },
    ]
  },
];

const STATUS_COLOR: Record<string,string> = {
  PENDING:'#FCD34D', PAYMENT_PENDING:'#38BDF8', PAID:'#00FF94',
  SETTLED:'#00FF94', CANCELLED:'#F87171', REFUNDED:'#F87171', PROCESSING:'#A78BFA'
};

const GRADE_COLOR: Record<string,string> = {
  AAA:'#00FF94', AA:'#34D399', A:'#6EE7B7', BBB:'#FCD34D',
  BB:'#F97316', B:'#F87171', CCC:'#DC2626', UNRATED:'#4A6278'
};

function fmt(n: number) {
  return '$' + (n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

export default function SellerPortal() {
  const { lang } = useLang();
  const L = (en: string, fr: string) => lang === 'fr' ? fr : en;

  const [tab, setTab] = useState<'overview'|'gateway'|'payouts'|'listings'>('overview');
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGw, setSelectedGw] = useState('WIRE');
  const [gwData, setGwData] = useState<Record<string,string>>({});
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuthJson('/seller/dashboard');
      setDash(data);
      if (data.profile) {
        setGwData(data.profile);
        setSelectedGw(data.profile.preferredGateway || 'WIRE');
      }
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGateway = async () => {
    setSaving(true);
    try {
      await fetchAuthJson('/seller/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...gwData, preferredGateway: selectedGw }),
      });
      showToast(lang==='fr'?'Gateway enregistre':'Payment gateway saved'ée'));
      await load();
    } catch(e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const inp = {
    background: CARD2, border: "1px solid "+(BORDER)+"", borderRadius: 8,
    color: TEXT, padding: '10px 14px', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif',
    transition: 'border-color .15s',
  };

  const currentGw = GATEWAYS.find(g => g.id === selectedGw) || GATEWAYS[5];

  const statCard = (label: string, value: string, sub: string, color: string, icon: string) => (
    <div style={{ background:CARD, border:"1px solid "+(color)+"20", borderRadius:14, padding:20, flex:1, minWidth:150, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,"+(color)+" 0%,transparent 100%)" }}/>
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'JetBrains Mono, monospace', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:TEXT, fontWeight:600, marginTop:6 }}>{label}</div>
      <div style={{ fontSize:10, color:MUTED, marginTop:2, fontFamily:'JetBrains Mono, monospace' }}>{sub}</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:MUTED, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>
      ◌ LOADING SELLER PORTAL...
    </div>
  );

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto', minHeight:'100vh' }}>

      {/* Toast PANGEA */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:99999, maxWidth:420, animation:'pgIn .25s ease' }}>
          <div style={{ background:toast.type==='error'?'rgba(248,113,113,0.1)':'rgba(0,255,148,0.08)', border:`1px solid ${toast.type==='error'?'rgba(248,113,113,0.35)':'rgba(0,255,148,0.3)'}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:toast.type==='error'?RED:GREEN, borderRadius:'12px 0 0 12px' }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:toast.type==='error'?'rgba(248,113,113,0.15)':'rgba(0,255,148,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:toast.type==='error'?RED:GREEN, fontWeight:800, marginLeft:8 }}>
              {toast.type==='error'?'✗':'✓'}
            </div>
            <span style={{ fontSize:13, color:TEXT, flex:1 }}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, color:GREEN, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', marginBottom:8 }}>
          PANGEA CARBON · SELLER PORTAL
        </div>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:TEXT, margin:0, marginBottom:6 }}>
          Seller Portal
        </h1>
        <p style={{ fontSize:13, color:MUTED, margin:0 }}>
          {L('Manage your credit listings, configure your payout gateway, track your revenue.',
             'Gérez vos listings de crédits, configurez votre gateway, suivez vos revenus.')}
        </p>

        {!dash?.hasGateway && (
          <div onClick={() => setTab('gateway')} style={{ marginTop:16, padding:'14px 18px', background:'rgba(252,211,77,0.06)', border:'1px solid rgba(252,211,77,0.25)', borderRadius:10, display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'all .2s' }}>
            <span style={{ fontSize:22 }}>⚠</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:YELLOW, fontWeight:700 }}>{L('Payment gateway not configured','Gateway de paiement non configurée')}</div>
              <div style={{ fontSize:12, color:TEXT2 }}>{L('Configure your payout method to receive funds from carbon credit sales.','Configurez votre méthode de paiement pour recevoir les fonds.')}</div>
            </div>
            <span style={{ fontSize:12, color:YELLOW, fontFamily:'JetBrains Mono, monospace', whiteSpace:'nowrap' }}>{L('Configure →','Configurer →')}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:28, flexWrap:'wrap' }}>
        {statCard(L('Total Revenue','Revenus totaux'), fmt(dash?.revenue||0), L('Settled','Réglé'), GREEN, '💰')}
        {statCard(L('Pending','En attente'), fmt(dash?.pending||0), L('Processing','En cours'), YELLOW, '⏳')}
        {statCard(L('Active Listings','Listings actifs'), String(dash?.listings?.length||0), 'credits listed', BLUE, '📋')}
        {statCard(L('Total Orders','Ordres total'), String(dash?.ordersCount||0), 'all time', PURPLE, '📦')}
        {statCard(L('Settled','Réglés'), String(dash?.settledCount||0), 'completed', GREEN, '✅')}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:`1px solid ${BORDER}` }}>
        {([
          ['overview',  L('Overview','Vue d\'ensemble'), '📊'],
          ['listings',  L('My Listings','Mes Listings'),  '🌿'],
          ['gateway',   L('Payment Gateway','Gateway'),   '💳'],
          ['payouts',   L('Payouts','Paiements'),         '💸'],
        ] as [string,string,string][]).map(([id,label,icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ padding:'11px 20px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono, monospace', borderBottom:`2px solid ${tab===id?GREEN:'transparent'}`, background:'transparent', color:tab===id?GREEN:MUTED, transition:'all .15s', letterSpacing:'0.03em' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Recent orders */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:22, gridColumn:'1' }}>
            <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:16 }}>RECENT ORDERS</div>
            {(!dash?.recentOrders?.length) ? (
              <div style={{ textAlign:'center', padding:32, color:MUTED, fontSize:13 }}>
                {L('No orders yet — list your credits on the marketplace.','Aucun ordre — listez vos crédits sur la marketplace.')}
              </div>
            ) : dash.recentOrders.map((o: any) => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize:13, color:TEXT, fontWeight:600 }}>{o.quantity?.toFixed(1)} tCO₂e</div>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color:GREEN, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{fmt(o.sellerAmount||0)}</div>
                  <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:(STATUS_COLOR[o.status]||MUTED)+'20', color:STATUS_COLOR[o.status]||MUTED, fontFamily:'JetBrains Mono, monospace' }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Gateway card */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:22 }}>
            <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:16 }}>CONFIGURED GATEWAY</div>
            {dash?.profile?.preferredGateway ? (() => {
              const gw = GATEWAYS.find(g => g.id === dash.profile.preferredGateway) || GATEWAYS[5];
              return (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:16, padding:16, background:`${gw.color}08`, border:`1px solid ${gw.color}20`, borderRadius:12, marginBottom:16 }}>
                    <span style={{ fontSize:30 }}>{gw.icon}</span>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{gw.label}</div>
                      <div style={{ fontSize:11, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>{gw.regions}</div>
                      <div style={{ fontSize:10, marginTop:6, color:dash.profile.verificationStatus==='VERIFIED'?GREEN:YELLOW, fontFamily:'JetBrains Mono, monospace' }}>
                        {dash.profile.verificationStatus === 'VERIFIED' ? '✓ VERIFIED BY PANGEA' : '⏳ PENDING VERIFICATION'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setTab('gateway')}
                    style={{ width:'100%', background:'transparent', border:`1px solid ${BORDER}`, borderRadius:9, color:MUTED, padding:'10px', cursor:'pointer', fontSize:12 }}>
                    {L('Edit configuration →','Modifier la configuration →')}
                  </button>
                </div>
              );
            })() : (
              <div style={{ textAlign:'center', padding:32 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🏦</div>
                <button onClick={() => setTab('gateway')} style={{ background:`rgba(0,255,148,0.1)`, border:`1px solid rgba(0,255,148,0.3)`, borderRadius:10, color:GREEN, padding:'12px 24px', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {L('Configure gateway','Configurer une gateway')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LISTINGS ──────────────────────────────────────────────────────────── */}
      {tab === 'listings' && (
        <div>
          {(!dash?.listings?.length) ? (
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:48, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16 }}>🌿</div>
              <div style={{ fontSize:16, color:TEXT, fontWeight:700, marginBottom:8 }}>{L('No credits listed','Aucun crédit listé')}</div>
              <div style={{ fontSize:13, color:MUTED }}>{L('Complete the 11-step pipeline to issue and list your carbon credits.','Complétez le pipeline 11 étapes pour émettre et lister vos crédits carbone.')}</div>
            </div>
          ) : dash.listings.map((l: any) => {
            const grade = l.carbonScore?.grade || 'UNRATED';
            return (
              <div key={l.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:20, display:'flex', alignItems:'center', gap:20, marginBottom:12 }}>
                <div style={{ width:54, height:54, borderRadius:12, background:`${GRADE_COLOR[grade]}15`, border:`1px solid ${GRADE_COLOR[grade]}30`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:GRADE_COLOR[grade], fontFamily:'JetBrains Mono, monospace' }}>{grade}</div>
                  <div style={{ fontSize:8, color:MUTED }}>SCORE</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{l.project?.name}</div>
                  <div style={{ fontSize:11, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>
                    {l.project?.countryCode} · {l.vintage} · {l.standard} · {l.quantity?.toFixed(1)} tCO₂e
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:GREEN, fontFamily:'JetBrains Mono, monospace' }}>${(l.askPrice||12).toFixed(2)}/t</div>
                  {l.carbonScore?.premiumPct > 0 && (
                    <div style={{ fontSize:10, color:GREEN, fontFamily:'JetBrains Mono, monospace' }}>+{l.carbonScore.premiumPct}% PANGEA PREMIUM</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GATEWAY CONFIGURATION ─────────────────────────────────────────────── */}
      {tab === 'gateway' && (
        <div style={{ maxWidth:760 }}>
          <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.1em', marginBottom:20 }}>
            CONFIGURE YOUR PAYOUT GATEWAY
          </div>

          {/* Gateway selector */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:28 }}>
            {GATEWAYS.map(g => (
              <button key={g.id} onClick={() => setSelectedGw(g.id)}
                style={{ background:selectedGw===g.id?`${g.color}12`:CARD, border:`1px solid ${selectedGw===g.id?g.color:BORDER}`, borderRadius:12, padding:'16px 14px', cursor:'pointer', textAlign:'left', transition:'all .2s' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{g.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:selectedGw===g.id?g.color:TEXT, marginBottom:4 }}>{g.label}</div>
                <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace' }}>{g.regions}</div>
              </button>
            ))}
          </div>

          {/* Gateway form */}
          <div style={{ background:CARD, border:`1px solid ${currentGw.color}30`, borderRadius:16, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'20px 24px', background:`${currentGw.color}08`, borderBottom:`1px solid ${currentGw.color}20`, display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ fontSize:28 }}>{currentGw.icon}</span>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:currentGw.color, fontFamily:'Syne, sans-serif' }}>{currentGw.label}</div>
                <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>{currentGw.description}</div>
              </div>
            </div>

            {/* Fields */}
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
              {currentGw.fields.map(field => (
                <div key={field.key}>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6, letterSpacing:'0.05em' }}>
                    {field.label}
                    {field.required && <span style={{ color:RED, marginLeft:4 }}>*</span>}
                  </div>

                  {field.type === 'select' ? (
                    <select
                      style={inp}
                      value={gwData[field.key] || ''}
                      onChange={e => setGwData(prev => ({ ...prev, [field.key]: e.target.value }))}>
                      <option value="">{L('Select','Sélectionner')}</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ position:'relative' }}>
                      <input
                        style={{ ...inp, paddingRight: field.type === 'password' ? 44 : 14 }}
                        type={field.type === 'password' ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={gwData[field.key] || ''}
                        onChange={e => setGwData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        autoComplete="off"
                      />
                      {field.type === 'password' && (
                        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:14, cursor:'pointer', color:MUTED }}>
                          🔒
                        </span>
                      )}
                    </div>
                  )}

                  {field.help && (
                    <div style={{ fontSize:11, color:MUTED, marginTop:6, lineHeight:1.6, paddingLeft:2 }}>
                      ℹ {field.help}
                    </div>
                  )}
                </div>
              ))}

              {/* Pays disponibles */}
              {currentGw.countries.length > 0 && (
                <div style={{ padding:'12px 16px', background:`rgba(56,189,248,0.05)`, border:`1px solid rgba(56,189,248,0.15)`, borderRadius:10, fontSize:12, color:TEXT2, lineHeight:1.7 }}>
                  🌍 {L('Available countries','Pays disponibles')} : <strong style={{ color:BLUE }}>{currentGw.countries.join(', ')}</strong>
                </div>
              )}

              {/* Security note */}
              <div style={{ padding:'14px 18px', background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:10 }}>
                <div style={{ fontSize:11, color:RED, fontFamily:'JetBrains Mono, monospace', marginBottom:6, letterSpacing:'0.05em' }}>⚠ SÉCURITÉ & CONFIDENTIALITÉ</div>
                <div style={{ fontSize:12, color:TEXT2, lineHeight:1.7 }}>
                  {L(
                    'All credentials are encrypted (AES-256) and stored exclusively for settlement payouts. PANGEA CARBON never debits, charges, or makes outbound transactions on this account. You can update or remove this information at any time.',
                    'Toutes les informations sont chiffrées (AES-256) et utilisées uniquement pour les virements de ventes. PANGEA CARBON ne débite jamais ce compte et ne réalise aucune transaction sortante. Vous pouvez modifier ou supprimer ces informations à tout moment.'
                  )}
                </div>
              </div>

              <button onClick={saveGateway} disabled={saving}
                style={{ background:saving?CARD:`${GREEN}15`, border:`1px solid ${saving?BORDER:`${GREEN}40`}`, borderRadius:10, color:saving?MUTED:GREEN, padding:'14px', cursor:saving?'wait':'pointer', fontSize:14, fontWeight:800, fontFamily:'Syne, sans-serif', transition:'all .2s', marginTop:4 }}>
                {saving ? '⟳ ' + L('Saving...','Enregistrement...') : '💾 ' + L('Save Gateway Configuration','Enregistrer la configuration')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYOUTS ───────────────────────────────────────────────────────────── */}
      {tab === 'payouts' && (
        <div>
          <div style={{ display:'flex', gap:14, marginBottom:20 }}>
            <div style={{ background:CARD, border:`1px solid ${GREEN}25`, borderRadius:12, padding:'16px 20px', flex:1 }}>
              <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>TOTAL PAID</div>
              <div style={{ fontSize:24, fontWeight:800, color:GREEN, fontFamily:'JetBrains Mono, monospace' }}>
                {fmt(dash?.payouts?.filter((p:any) => p.status==='PAID').reduce((s:number,p:any) => s+p.amount, 0) || 0)}
              </div>
            </div>
            <div style={{ background:CARD, border:`1px solid ${YELLOW}25`, borderRadius:12, padding:'16px 20px', flex:1 }}>
              <div style={{ fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', marginBottom:6 }}>PENDING</div>
              <div style={{ fontSize:24, fontWeight:800, color:YELLOW, fontFamily:'JetBrains Mono, monospace' }}>
                {fmt(dash?.payouts?.filter((p:any) => p.status==='PENDING').reduce((s:number,p:any) => s+p.amount, 0) || 0)}
              </div>
            </div>
          </div>

          {(!dash?.payouts?.length) ? (
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:40, textAlign:'center', color:MUTED, fontSize:13 }}>
              {L('No payouts yet','Aucun versement')}
            </div>
          ) : (
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(0,255,148,0.03)' }}>
                    {[L('DATE','DATE'),L('AMOUNT','MONTANT'),L('GATEWAY','GATEWAY'),L('STATUS','STATUT'),L('REF','REF')].map(h => (
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:9, color:MUTED, fontFamily:'JetBrains Mono, monospace', borderBottom:`1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dash.payouts.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom:`1px solid ${CARD}` }}>
                      <td style={{ padding:'12px 16px', fontSize:12, color:TEXT2 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:GREEN, fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{fmt(p.amount)}</td>
                      <td style={{ padding:'12px 16px', fontSize:11, color:TEXT }}>{p.gateway}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:9, padding:'3px 8px', borderRadius:4, background:`${STATUS_COLOR[p.status]||MUTED}20`, color:STATUS_COLOR[p.status]||MUTED, fontFamily:'JetBrains Mono, monospace' }}>{p.status}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:10, color:MUTED, fontFamily:'JetBrains Mono, monospace' }}>{p.gatewayRef || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes pgIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}