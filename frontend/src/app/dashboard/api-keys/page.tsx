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
// ─── Catégories ──────────────────────────────────────────────────────────────
const INTEG_CATEGORIES = [
  { id:'all',        label:'Tous',             icon:'🌐' },
  { id:'major',      label:'Afrique Top',      icon:'🌍' },
  { id:'api',        label:'API directe',      icon:'⚡' },
  { id:'aggregator', label:'Agrégateurs',      icon:'🧩' },
  { id:'stable',     label:'Stable',           icon:'✓' },
  { id:'beta',       label:'Beta',             icon:'🔬' },
];

const INTEGRATIONS = [
  // ═══ TIER 1 — API COMPLÈTES (très utilisés en Afrique) ═══════════════════
  {
    name:'Huawei FusionSolar', slug:'huawei', icon:'🔶', color:'#F97316',
    category:'major', status:'STABLE', africa: true,
    desc:'FusionSolar OpenAPI — cloud push temps réel',
    docs:'https://solar.huawei.com/eu/developers',
    apiType:'REST + Push', authMethod:'AppKey + AppSecret',
    baseUrl:'https://eu5.fusionsolar.huawei.com/thirdData',
    payload:{
      stationCode:'NE=123456789',
      dataValue:{ radiation_intensity:842.3, inverter_state:512, mppt_total_cap:125.5 },
      collectTime:1736951400000,
    },
    authHeader:'Authorization: Basic base64(AppKey:AppSecret)',
    steps:[
      'Créer un compte développeur FusionSolar Developer Portal',
      'Générer AppKey + AppSecret dans les paramètres API',
      'Activer "Third-party data push" dans votre installation',
      'Configurer le webhook URL vers PANGEA CARBON',
      'Renseigner votre stationCode dans PANGEA CARBON',
    ],
    params:['stationCode','collectTime','dataValue.mppt_total_cap'],
    rateLimit:'1 req/5min par station',
  },
  {
    name:'Sungrow iSolarCloud', slug:'sungrow', icon:'🌞', color:'#38BDF8',
    category:'major', status:'STABLE', africa: true,
    desc:'iSolarCloud OpenAPI v2 — monitoring temps réel',
    docs:'https://developer.isolarcloud.com',
    apiType:'REST + Webhook', authMethod:'Token Bearer',
    baseUrl:'https://gateway.isolarcloud.eu',
    payload:{
      ps_key:'1000000_7A_1_1',
      data_point_detail:{ p1:125500, p83:'normal', p58:842 },
      timestamp:'2025-01-15T14:30:00Z',
    },
    authHeader:'token: Bearer VOTRE_TOKEN',
    steps:[
      "S'enregistrer sur iSolarCloud Developer Portal",
      'Créer une application API et obtenir App ID + Secret',
      "Lier vos installations à l'application",
      'Configurer le push de données vers PANGEA CARBON',
      'Mapper ps_key → project_id dans PANGEA CARBON',
    ],
    params:['ps_key','timestamp','data_point_detail.p1 (power W)'],
    rateLimit:'100 req/min',
  },
  {
    name:'Growatt', slug:'growatt', icon:'🟢', color:'#00FF94',
    category:'major', status:'STABLE', africa: true,
    desc:'Growatt OpenAPI — ShineServer & ShinePhone cloud',
    docs:'https://www.ginlong.com/openapi.html',
    apiType:'REST', authMethod:'username + password + token',
    baseUrl:'https://openapi.growatt.com',
    payload:{
      deviceSn:'BDK0000001',
      eToday:125.5,
      pac:48200,
      datalogSn:'ABC123456789',
      time:'2025-01-15 14:30:00',
    },
    authHeader:'token: VOTRE_TOKEN',
    steps:[
      'Créer un compte sur shineserver.growatt.com',
      'Aller dans Compte → API Access → Générer token',
      "Obtenir l'accès développeur (email: api@growatt.com)",
      'Lister vos appareils via GET /device/list',
      'Configurer le push vers PANGEA CARBON ou appel polling',
    ],
    params:['deviceSn','eToday (kWh)','pac (W)','time'],
    rateLimit:'50 req/min',
  },
  {
    name:'GoodWe SEMS', slug:'goodwe', icon:'🟡', color:'#FCD34D',
    category:'major', status:'STABLE', africa: true,
    desc:'SEMS Portal OpenAPI — données inverter cloud',
    docs:'https://www.semsportal.com/developer',
    apiType:'REST', authMethod:'Token SEMS (via login)',
    baseUrl:'https://www.semsportal.com/api',
    payload:{
      inverterSn:'A2009260481',
      power:48200,
      pac:48.2,
      eday:125.5,
      etotal:45820.3,
      temperature:42.1,
    },
    authHeader:'Token: VOTRE_TOKEN_SEMS | User-Agent: SEMS Portal',
    steps:[
      'Créer un compte SEMS Portal (semsportal.com)',
      'Aller dans Account → Developer Access → Request Token',
      'POST /api/v2/Common/CrossLogin pour obtenir token',
      'Appeler /api/v2/Monitoring/GetPowerStationDetail',
      'Configurer polling vers PANGEA CARBON (toutes les 15min)',
    ],
    params:['inverterSn','pac (kW)','eday (kWh)','etotal (kWh)'],
    rateLimit:'30 req/min',
  },
  {
    name:'SMA Solar', slug:'sma', icon:'☀️', color:'#FCD34D',
    category:'api', status:'STABLE', africa: false,
    desc:'SMA Data Manager + Sunny Portal WebConnect API',
    docs:'https://developer.sma.de',
    apiType:'REST + WebSocket', authMethod:'API Key (dans header)',
    baseUrl:'https://ennexos.sunnyportal.com/api',
    payload:{
      livedata:{ 'power.dc':{ val:48200, unit:'W' },'energy.total':{ val:45820.3, unit:'Wh' } },
      timestamp:'2025-01-15T14:30:00Z',
      deviceId:'SN:3012345678',
    },
    authHeader:'Authorization: Bearer VOTRE_TOKEN | X-Application-Key: APP_KEY',
    steps:[
      'Accéder à ennexos.sunnyportal.com → API Documentation',
      'Créer une application dans Developer Portal',
      'Configurer OAuth2 client credentials flow',
      'Récupérer les plant IDs via GET /plants',
      'Souscrire aux webhooks live data ou configurer polling',
    ],
    params:['deviceId','livedata.power.dc (W)','livedata.energy.total (Wh)'],
    rateLimit:'100 req/h (plan gratuit)',
  },
  {
    name:'SolarEdge', slug:'solaredge', icon:'🔷', color:'#38BDF8',
    category:'api', status:'STABLE', africa: false,
    desc:'SolarEdge Monitoring API — API key par site',
    docs:'https://developers.solaredge.com',
    apiType:'REST', authMethod:'api_key query param',
    baseUrl:'https://monitoringapi.solaredge.com',
    payload:{
      sitePower:{ timeUnit:'QUARTER_OF_AN_HOUR', unit:'W', values:[{ date:'2025-01-15 14:30:00', value:48200 }] },
      siteEnergy:{ timeUnit:'DAY', unit:'Wh', values:[{ date:'2025-01-15', value:125500 }] },
    },
    authHeader:'?api_key=VOTRE_API_KEY (query string)',
    steps:[
      'Se connecter sur monitoring.solaredge.com',
      'Admin → Site Access → API Access → Generate API Key',
      "Obtenir Site ID depuis l'URL (ex: /site/1234567/)",
      'GET /site/{siteId}/currentPowerFlow?api_key=...',
      'Configurer polling toutes les 15 minutes vers PANGEA CARBON',
    ],
    params:['siteId','api_key','timeUnit','unit'],
    rateLimit:'300 req/jour par api_key',
  },
  {
    name:'Fronius', slug:'fronius', icon:'⚡', color:'#A78BFA',
    category:'api', status:'STABLE', africa: false,
    desc:'Fronius Solar API v1 — local + Solar.web cloud',
    docs:'https://www.fronius.com/en/solar-energy/solar-api',
    apiType:'REST local + Cloud push', authMethod:'Aucune (local) / Token (cloud)',
    baseUrl:'http://FRONIUS_IP/solar_api/v1',
    payload:{
      Body:{ Data:{ DAY_ENERGY:{ Unit:'Wh', Value:125500 },PAC:{ Unit:'W', Value:48200 },YEAR_ENERGY:{ Unit:'Wh', Value:45820300 } } },
      Head:{ Timestamp:'2025-01-15T14:30:00+00:00', Status:{ Code:0 } },
    },
    authHeader:'Aucun auth requis en local réseau',
    steps:[
      'Inverter Fronius doit être sur le même réseau local',
      'Accéder à http://IP_INVERTER/solar_api/v1/GetInverterRealtimeData.cgi',
      'Pour cloud: activer Solar.web → API → Webhook URL',
      'Configurer push vers PANGEA CARBON depuis Solar.web',
      'Alternative: PANGEA CARBON poll toutes les 5 min en local',
    ],
    params:['PAC (W)','DAY_ENERGY (Wh)','YEAR_ENERGY (Wh)'],
    rateLimit:'Illimité en local',
  },
  {
    name:'Enphase Enlighten', slug:'enphase', icon:'🔵', color:'#38BDF8',
    category:'api', status:'BETA', africa: false,
    desc:'Enphase API v4 — micro-onduleurs, Envoy gateway',
    docs:'https://developer.enphase.com',
    apiType:'REST OAuth2', authMethod:'OAuth2 Authorization Code',
    baseUrl:'https://api.enphaseenergy.com/api/v4',
    payload:{
      system_id:12345,
      production:{ watt_hours_today:125500, watt_hours_lifetime:45820300, watts_now:48200 },
      consumption:{ watt_hours_today:98200 },
      timestamp:'2025-01-15T14:30:00Z',
    },
    authHeader:'Authorization: Bearer ACCESS_TOKEN | key: API_KEY (header)',
    steps:[
      'Créer un compte sur developer.enphase.com',
      'Créer une application → obtenir API Key + Secret',
      'Implémenter OAuth2 Authorization Code flow',
      'GET /systems/{system_id}/summary pour overview',
      'Webhook disponible: Events → Configure webhook URL',
    ],
    params:['system_id','production.watts_now','production.watt_hours_today'],
    rateLimit:'10 req/min, 10K req/mois (plan gratuit)',
  },
  {
    name:'Ginlong (Solis)', slug:'solis', icon:'🌅', color:'#F97316',
    category:'api', status:'BETA', africa: false,
    desc:'Solis Cloud API — monitoring data cloud',
    docs:'https://www.ginlong.com/en/cloud-api/',
    apiType:'REST HMAC', authMethod:'HMAC-MD5 Signature',
    baseUrl:'https://www.soliscloud.com:13333',
    payload:{
      inverterSn:'1234567890',
      pac:48200,
      eday:125.5,
      etotal:45820.3,
      temperature:42.1,
      dataTimestamp:'2025-01-15T14:30:00Z',
    },
    authHeader:'Authorization: API VOTRE_KEY:SIGNATURE_HMAC_MD5 | Content-MD5: BASE64_HASH | Date: UTC_DATE',
    steps:[
      'Créer un compte sur solarmanpv.com (espace distributeur)',
      'Aller dans Account → API Management → Create API',
      'Obtenir KeyId + KeySecret pour signature HMAC',
      'Calculer signature: HMAC-MD5(verb+MD5+Content-Type+Date+path)',
      'Appeler POST /v1/api/inverterList puis /v1/api/inverterDetail',
    ],
    params:['inverterSn','pac (W)','eday (kWh)','etotal (kWh)'],
    rateLimit:'1 req/30sec par inverter',
  },
  {
    name:'Delta Electronics', slug:'delta', icon:'🔺', color:'#F87171',
    category:'api', status:'BETA', africa: false,
    desc:'Delta Solar API — M1000 / M3000 Monitoring',
    docs:'https://www.deltaww.com/en-US/products/Solar-Monitoring',
    apiType:'REST', authMethod:'Basic Auth + API Key',
    baseUrl:'https://delta-cloud.com/api/v2',
    payload:{
      unit_id:'DELTA-001',
      ac_power:48200,
      daily_energy:125.5,
      total_energy:45820.3,
      temperature:38.5,
      status:'Normal',
    },
    authHeader:'Authorization: Basic BASE64 | X-API-Key: VOTRE_KEY',
    steps:[
      'Contacter Delta Electronics pour accès API (support@deltaww.com)',
      'Obtenir credentials API après vérification installation',
      'Enregistrer votre unité Delta dans Delta Cloud Portal',
      'Configurer data push interval (recommandé: 15 min)',
      'Tester avec GET /api/v2/plants/{unit_id}/live',
    ],
    params:['unit_id','ac_power (W)','daily_energy (kWh)'],
    rateLimit:'Sur demande (contrat OEM)',
  },
  {
    name:'FIMER', slug:'fimer', icon:'🔵', color:'#38BDF8',
    category:'api', status:'BETA', africa: false,
    desc:'FIMER PVI-GESTORE + Aurora Vision Cloud API',
    docs:'https://www.fimer.com/en/solutions/photovoltaic',
    apiType:'REST + Local Modbus', authMethod:'API Key (Aurora Vision)',
    baseUrl:'https://auroravision.net/api/rest/v1',
    payload:{
      entityId:123456,
      timezone:'Africa/Abidjan',
      fields:[{ key:'GenerationPower', value:48.2, unit:'kW' },{ key:'GenerationEnergy', value:125.5, unit:'kWh' }],
      datetime:'2025-01-15T14:30:00+00:00',
    },
    authHeader:'X-AuroraVision-ApiKey: VOTRE_KEY | X-AuroraVision-Token: SESSION_TOKEN',
    steps:[
      'Créer un compte Aurora Vision (auroravision.net)',
      'Aller dans Settings → API → Generate API Key',
      'POST /authenticate pour obtenir session token',
      'GET /stats/power/{entityId} pour puissance temps réel',
      'Configurer webhook ou polling 15 min vers PANGEA CARBON',
    ],
    params:['entityId','GenerationPower (kW)','GenerationEnergy (kWh)'],
    rateLimit:'100 req/h',
  },
  // ═══ AGRÉGATEURS MULTI-MARQUES ══════════════════════════════════════════════
  {
    name:'Enode', slug:'enode', icon:'🧩', color:'#A78BFA',
    category:'aggregator', status:'STABLE', africa: false,
    desc:'API unifiée 250+ marques — connecteurs intelligents',
    docs:'https://docs.enode.com',
    apiType:'REST Unified', authMethod:'OAuth2 Client Credentials',
    baseUrl:'https://enode-api.production.enode.io',
    payload:{
      vendor:'huawei',
      systemId:'sys_abc123',
      data:{ 'productionPower':48200,'productionEnergy':125500,'gridExportEnergy':0 },
      lastUpdated:'2025-01-15T14:30:00Z',
    },
    authHeader:'Authorization: Bearer ENODE_ACCESS_TOKEN',
    steps:[
      "S'enregistrer sur docs.enode.com → Obtenir API credentials",
      'POST /auth/token avec client_credentials grant',
      'GET /chargers ou /batteries pour lister les équipements',
      'Connecter marques via le link flow Enode (OAuth par marque)',
      'Configurer webhook Enode → PANGEA CARBON pour données live',
    ],
    params:['systemId','productionPower (W)','productionEnergy (Wh)','vendor'],
    rateLimit:'1000 req/min (plan business)',
    note:'✦ Supporte 250+ intégrations onduleurs — recommandé pour flotte multi-marques',
  },
  {
    name:'Meteocontrol VCOM', slug:'vcom', icon:'🌤️', color:'#38BDF8',
    category:'aggregator', status:'STABLE', africa: false,
    desc:'VCOM Cloud API — monitoring 50+ marques onduleurs',
    docs:'https://www.meteocontrol.com/en/services/vcom-api/',
    apiType:'REST JSON-RPC', authMethod:'API Key (header)',
    baseUrl:'https://api.vcom.meteocontrol.de/systems',
    payload:{
      systemKey:'ABCDE',
      timestamp:'2025-01-15T14:30:00Z',
      measurements:[{ abbreviation:'E_Z_EVU', value:125500.5, unit:'Wh' },{ abbreviation:'P_AC', value:48200, unit:'W' }],
    },
    authHeader:'X-Api-Key: VOTRE_VCOM_KEY',
    steps:[
      'Créer un compte sur VCOM Cloud Portal (meteocontrol.com)',
      'Aller dans API → Keys → Generate Key',
      'Obtenir systemKey de vos installations',
      'GET /systems/{systemKey}/readings/abbreviations pour les mesures dispo',
      'GET /systems/{systemKey}/readings?from=...&to=... pour les données',
    ],
    params:['systemKey','E_Z_EVU (energy Wh)','P_AC (power W)'],
    rateLimit:'150 req/min',
  },
  {
    name:'Solar-Log', slug:'solarlog', icon:'📡', color:'#FCD34D',
    category:'aggregator', status:'BETA', africa: false,
    desc:'Solar-Log WEB Enerest API — 3000+ onduleurs supportés',
    docs:'https://www.solar-log.com/en/products/enerest-platform',
    apiType:'REST', authMethod:'JWT Token',
    baseUrl:'https://api.solar-log.com/v1',
    payload:{
      solarlog_id:'SL12345',
      pac_total:48200,
      day_yield:125.5,
      year_yield:22450.3,
      co2_saving:14580.2,
      timestamp:'2025-01-15T14:30:00Z',
    },
    authHeader:'Authorization: Bearer JWT_TOKEN',
    steps:[
      'Acquérir un Solar-Log WEB Enerest abonnement',
      'Enregistrer votre Solar-Log datalogger sur la plateforme',
      "API → Token → Générer JWT token d'accès",
      'GET /plants/{solarlog_id}/current pour données temps réel',
      'Configurer push vers PANGEA CARBON via Solar-Log webhook',
    ],
    params:['solarlog_id','pac_total (W)','day_yield (kWh)','co2_saving (kg)'],
    rateLimit:'60 req/min',
  },
  // ═══ GENERIC ════════════════════════════════════════════════════════════════
  {
    name:'Generic REST', slug:'generic', icon:'🔌', color:'#8FA3B8',
    category:'api', status:'STABLE', africa: true,
    desc:'Payload REST personnalisé — tout capteur, tout appareil',
    docs:'',
    apiType:'REST flexible', authMethod:'X-API-Key PANGEA CARBON',
    baseUrl:'https://pangea-carbon.com/api/equipment',
    payload:{
      project_id:'cma123abc...',
      energy_mwh:125.5,
      power_kw:48.2,
      timestamp:'2025-01-15T14:30:00Z',
      device_id:'mon_capteur_01',
      metadata:{ temperature:42, irradiance:842 },
    },
    authHeader:'X-API-Key: pgc_votre_cle_pangea',
    steps:[
      'Générer une clé API PANGEA CARBON (onglet Mes Clés)',
      'Configurer votre équipement pour POST sur /api/equipment/reading',
      'Inclure X-API-Key dans le header',
      'Mapper energy_mwh + project_id dans le payload',
      'Optionnel: device_id, power_kw, temperature, irradiance',
    ],
    params:['project_id (requis)','energy_mwh (requis)','timestamp','device_id','power_kw'],
    rateLimit:'Selon votre plan PANGEA CARBON',
    note:'✦ Format le plus simple — compatible tout système embarqué ou IoT',
  },
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
  const [integFilter, setIntegFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchAuth('/admin/apikeys');
      const text = await r.text();
      try {
        const d = JSON.parse(text);
        setKeys(Array.isArray(d) ? d : []);
      } catch { setKeys([]); }
    } catch { setKeys([]); } finally { setLoading(false); }
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
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { throw new Error(lang==='fr'?'Erreur serveur. Reessayez.':'Server error. Please try again.'); }
      if (!res.ok) throw new Error(data.error || (lang==='fr'?'Erreur creation cle.':'Key creation failed.'));
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

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const key = confirmDelete;
    setConfirmDelete(null);
    try {
      await fetchAuth('/admin/apikeys/'+key.id+'?hard=true', { method: 'DELETE' });
      showToast(lang==='fr'?'Cle supprimee':'Key permanently deleted');
      load();
    } catch(e) { showToast(e.message,'error'); }
  };

  const executeRevoke = async () => {
    if (!confirmRevoke) return;
    const id = confirmRevoke;
    setConfirmRevoke(null);
    try {
      await fetchAuth('/admin/apikeys/'+id, { method: 'DELETE' });
      showToast(lang==='fr'?'Cle revoquee':'Key revoked');
      load();
    } catch(e: any) { showToast(e.message,'error'); }
  };

  const copyKey = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast(lang==='fr'?'Copie !':'Copied!');
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
                          <div style={{ display:'flex',gap:10,alignItems:'center',marginTop:3 }}>
                            <code style={{ fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{key.keyPrefix || 'pgc_'}••••••••••••••••</code>
                            {key.lastUsedAt && <span style={{ fontSize:9,color:C.muted }}>Dernier usage: {new Date(key.lastUsedAt).toLocaleDateString('fr-FR')}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize:9,color:C.red,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:4,padding:'2px 7px',fontFamily:'JetBrains Mono, monospace',flexShrink:0 }}>RÉVOQUÉE</span>
                        <button onClick={() => setConfirmDelete(key)}
                          style={{ background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:8,color:C.red,padding:'7px 12px',cursor:'pointer',fontSize:11,fontWeight:600,flexShrink:0 }}>
                          🗑 Supprimer
                        </button>
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
          {/* Header stats */}
          <div style={{ display:'flex',gap:12,marginBottom:20,flexWrap:'wrap' }}>
            {[
              { v:INTEGRATIONS.filter(i=>i.status==='STABLE').length, l:'Intégrations stables', c:C.green },
              { v:INTEGRATIONS.filter(i=>i.status==='BETA').length,   l:'En bêta',             c:C.yellow },
              { v:INTEGRATIONS.filter(i=>i.africa).length,            l:'Utilisés en Afrique', c:C.orange },
              { v:INTEGRATIONS.filter(i=>i.category==='aggregator').length, l:'Agrégateurs multi-marques', c:C.purple },
            ].map(s => (
              <div key={s.l} style={{ background:C.card,border:`1px solid ${s.c}20`,borderRadius:10,padding:'12px 16px',flex:1,minWidth:120 }}>
                <div style={{ fontSize:18,fontWeight:800,color:s.c,fontFamily:'JetBrains Mono, monospace' }}>{s.v}</div>
                <div style={{ fontSize:10,color:C.muted,marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Category filter */}
          <div style={{ display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' }}>
            {INTEG_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setIntegFilter(cat.id)}
                style={{ padding:'6px 14px',borderRadius:20,border:`1px solid ${integFilter===cat.id?C.blue:C.border}`,background:integFilter===cat.id?'rgba(56,189,248,0.1)':C.card,color:integFilter===cat.id?C.blue:C.muted,cursor:'pointer',fontSize:11,fontFamily:'JetBrains Mono, monospace',transition:'all .15s' }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Africa tip */}
          <div style={{ padding:'12px 16px',background:'rgba(249,115,22,0.06)',border:'1px solid rgba(249,115,22,0.2)',borderRadius:10,marginBottom:20,fontSize:12,color:'#F97316',lineHeight:1.7 }}>
            🌍 <strong>Top 4 onduleurs en Afrique :</strong> Huawei FusionSolar · Sungrow · Growatt · GoodWe — tous intégrés avec API complète.<br/>
            🧩 <strong>Conseil :</strong> Utilisez Enode ou VCOM pour une flotte multi-marques — une seule API pour 250+ onduleurs.
          </div>

          {/* Integration grid */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:24 }}>
            {INTEGRATIONS.filter(integ => {
              if(integFilter==='all') return true;
              if(integFilter==='major') return integ.africa;
              if(integFilter==='aggregator') return integ.category==='aggregator';
              if(integFilter==='api') return integ.category==='api';
              if(integFilter==='stable') return integ.status==='STABLE';
              if(integFilter==='beta') return integ.status==='BETA';
              return true;
            }).map(integ => (
              <div key={integ.slug} onClick={() => setSelectedIntegration(selectedIntegration?.slug===integ.slug?null:integ)}
                style={{ background:C.card,border:`1px solid ${selectedIntegration?.slug===integ.slug?integ.color:C.border}`,borderRadius:12,padding:16,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:selectedIntegration?.slug===integ.slug?integ.color:'transparent',transition:'background .2s' }}/>
                <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:10 }}>
                  <span style={{ fontSize:22,flexShrink:0 }}>{integ.icon}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:selectedIntegration?.slug===integ.slug?integ.color:C.text,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{integ.name}</div>
                    <div style={{ fontSize:9,color:C.muted,lineHeight:1.5 }}>{integ.desc}</div>
                  </div>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:4 }}>
                  <div style={{ display:'flex',gap:4 }}>
                    <span style={{ fontSize:8,padding:'2px 5px',borderRadius:4,fontFamily:'JetBrains Mono, monospace',fontWeight:700,
                      background:integ.status==='STABLE'?'rgba(0,255,148,0.1)':integ.status==='BETA'?'rgba(252,211,77,0.1)':'rgba(74,98,120,0.1)',
                      color:integ.status==='STABLE'?C.green:integ.status==='BETA'?C.yellow:C.muted }}>
                      {integ.status}
                    </span>
                    {integ.africa && <span style={{ fontSize:8,padding:'2px 5px',borderRadius:4,background:'rgba(249,115,22,0.1)',color:'#F97316',fontFamily:'JetBrains Mono, monospace' }}>🌍 AFR</span>}
                    {integ.category==='aggregator' && <span style={{ fontSize:8,padding:'2px 5px',borderRadius:4,background:'rgba(167,139,250,0.1)',color:C.purple,fontFamily:'JetBrains Mono, monospace' }}>AGG</span>}
                  </div>
                  <code style={{ fontSize:8,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{integ.apiType?.split(' ')[0]}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Détail intégration sélectionnée */}
          {selectedIntegration && (
            <div style={{ background:C.card,border:`1px solid ${selectedIntegration.color}30`,borderRadius:16,padding:28 }}>
              {/* Header */}
              <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:20 }}>
                <div style={{ width:52,height:52,borderRadius:14,background:selectedIntegration.color+'15',border:`1px solid ${selectedIntegration.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0 }}>{selectedIntegration.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9,color:selectedIntegration.color,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>
                    {selectedIntegration.category==='aggregator'?'AGRÉGATEUR MULTI-MARQUES':'CONFIGURATION INTÉGRATION'} · {selectedIntegration.apiType}
                  </div>
                  <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:20,fontWeight:800,color:C.text,margin:0 }}>{selectedIntegration.name}</h2>
                  <div style={{ fontSize:12,color:C.muted,marginTop:3 }}>{selectedIntegration.desc}</div>
                </div>
                {selectedIntegration.docs && (
                  <a href={selectedIntegration.docs} target="_blank" rel="noreferrer"
                    style={{ fontSize:11,color:selectedIntegration.color,textDecoration:'none',background:selectedIntegration.color+'10',border:`1px solid ${selectedIntegration.color}30`,borderRadius:8,padding:'8px 14px',flexShrink:0 }}>
                    📖 Docs officielles →
                  </a>
                )}
              </div>
              <div style={{ height:1,background:'linear-gradient(90deg,'+selectedIntegration.color+'30 0%,transparent 100%)',marginBottom:24 }}/>

              {selectedIntegration.note && (
                <div style={{ padding:'10px 14px',background:selectedIntegration.color+'08',border:`1px solid ${selectedIntegration.color}20`,borderRadius:9,marginBottom:20,fontSize:12,color:selectedIntegration.color }}>
                  {selectedIntegration.note}
                </div>
              )}

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>BASE URL</div>
                  <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px',display:'flex',gap:8,alignItems:'center' }}>
                    <code style={{ flex:1,fontSize:11,color:C.blue,fontFamily:'JetBrains Mono, monospace',wordBreak:'break-all' }}>{selectedIntegration.baseUrl}</code>
                    <button onClick={() => copyKey(selectedIntegration.baseUrl)} style={{ background:'transparent',border:`1px solid ${C.border}`,borderRadius:5,color:C.muted,cursor:'pointer',padding:'3px 7px',fontSize:9,flexShrink:0 }}>📋</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>AUTHENTIFICATION</div>
                  <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px' }}>
                    <code style={{ fontSize:11,color:C.green,fontFamily:'JetBrains Mono, monospace',display:'block',whiteSpace:'pre-wrap',lineHeight:1.7 }}>{selectedIntegration.authHeader}</code>
                  </div>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
                {/* Étapes d'intégration */}
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:10 }}>ÉTAPES D'INTÉGRATION</div>
                  {selectedIntegration.steps?.map((step, i) => (
                    <div key={i} style={{ display:'flex',gap:10,marginBottom:8,alignItems:'flex-start' }}>
                      <div style={{ width:20,height:20,borderRadius:'50%',background:selectedIntegration.color+'20',border:`1px solid ${selectedIntegration.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:selectedIntegration.color,flexShrink:0 }}>{i+1}</div>
                      <span style={{ fontSize:12,color:C.text2,lineHeight:1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Payload + Params */}
                <div>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:8 }}>PAYLOAD EXEMPLE</div>
                  <pre style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:9,padding:'12px 14px',margin:'0 0 12px',fontSize:10,color:C.text2,fontFamily:'JetBrains Mono, monospace',lineHeight:1.7,overflowX:'auto',maxHeight:200 }}>
                    {JSON.stringify(selectedIntegration.payload||{}, null, 2)}
                  </pre>
                  <div style={{ fontSize:9,color:C.muted,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>CHAMPS CLÉS À MAPPER</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                    {selectedIntegration.params?.map(p => (
                      <span key={p} style={{ fontSize:9,padding:'3px 8px',background:selectedIntegration.color+'10',border:`1px solid ${selectedIntegration.color}25`,borderRadius:5,color:selectedIntegration.color,fontFamily:'JetBrains Mono, monospace' }}>{p}</span>
                    ))}
                  </div>
                  {selectedIntegration.rateLimit && (
                    <div style={{ marginTop:10,fontSize:10,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>
                      ⏱ Rate limit: {selectedIntegration.rateLimit}
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook URL PANGEA */}
              <div style={{ padding:'14px 18px',background:'rgba(0,255,148,0.05)',border:'1px solid rgba(0,255,148,0.15)',borderRadius:10 }}>
                <div style={{ fontSize:9,color:C.green,fontFamily:'JetBrains Mono, monospace',marginBottom:6 }}>WEBHOOK PANGEA CARBON À CONFIGURER DANS {selectedIntegration.name.toUpperCase()}</div>
                <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                  <code style={{ flex:1,fontSize:12,color:C.green,fontFamily:'JetBrains Mono, monospace' }}>
                    https://pangea-carbon.com/api/equipment/webhook/{selectedIntegration.slug}
                  </code>
                  <button onClick={() => copyKey('https://pangea-carbon.com/api/equipment/webhook/'+selectedIntegration.slug)}
                    style={{ background:'rgba(0,255,148,0.1)',border:'1px solid rgba(0,255,148,0.25)',borderRadius:7,color:C.green,cursor:'pointer',padding:'6px 12px',fontSize:10 }}>
                    📋 Copier
                  </button>
                </div>
              </div>
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

      {/* ── MODALE SUPPRESSION DÉFINITIVE ──────────────────────────────────── */}
      {confirmDelete && (
        <div onClick={e => { if(e.target===e.currentTarget) setConfirmDelete(null); }}
          style={{ position:'fixed',inset:0,background:'rgba(8,11,15,0.88)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10002,padding:16 }}>
          <div style={{ background:C.card,border:'1px solid rgba(248,113,113,0.35)',borderRadius:16,padding:28,maxWidth:460,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',position:'relative',overflow:'hidden' }}>
            {/* Barre accent top */}
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#F87171 0%,rgba(248,113,113,0.2) 100%)' }}/>
            {/* Header */}
            <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:12,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:9,color:C.red,fontFamily:'JetBrains Mono, monospace',letterSpacing:'0.12em',marginBottom:4 }}>API KEYS · SUPPRESSION DÉFINITIVE</div>
                <h2 style={{ fontFamily:'Syne, sans-serif',fontSize:17,fontWeight:800,color:C.red,margin:0 }}>Supprimer cette clé ?</h2>
              </div>
            </div>
            <div style={{ height:1,background:'linear-gradient(90deg,rgba(248,113,113,0.25) 0%,transparent 100%)',marginBottom:18 }}/>
            {/* Clé concernée */}
            <div style={{ background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:10,padding:'14px 16px',marginBottom:20 }}>
              <div style={{ fontSize:13,color:C.text,fontWeight:700,marginBottom:6 }}>{confirmDelete.name}</div>
              <code style={{ fontSize:11,color:C.muted,fontFamily:'JetBrains Mono, monospace' }}>{confirmDelete.keyPrefix || 'pgc_'}••••••••••••••••</code>
              <p style={{ fontSize:12,color:C.text2,margin:'12px 0 0',lineHeight:1.7 }}>
                Cette clé <strong style={{ color:C.red }}>sera supprimée définitivement</strong> de la base de données.
                Elle est déjà révoquée et ne peut plus être utilisée. Cette action est <strong style={{ color:C.red }}>irréversible</strong>.
              </p>
            </div>
            {/* Actions */}
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1,background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,padding:12,cursor:'pointer',fontSize:13 }}>
                Annuler
              </button>
              <button onClick={executeDelete}
                style={{ flex:1,background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:9,color:C.red,padding:12,fontWeight:800,cursor:'pointer',fontSize:13,fontFamily:'Syne, sans-serif' }}>
                🗑 Supprimer définitivement
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