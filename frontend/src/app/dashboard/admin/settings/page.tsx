'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useCallback } from 'react';
import { fetchAuth } from '@/lib/fetch-auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const CATEGORIES = [
  {
    id: 'smtp', label: 'Email SMTP', icon: '📧', color: '#38BDF8',
    guide: [
      ['Hostinger', 'smtp.hostinger.com · Port 465 (SSL)'],
      ['Gmail', 'smtp.gmail.com · Port 587 · Password app requis'],
      ['SendGrid', 'smtp.sendgrid.net · Port 587 · API key comme password'],
    ],
    settings: [
      { key: 'smtp_host',     label: 'SMTP Server',  placeholder: 'smtp.hostinger.com', encrypted: false },
      { key: 'smtp_port',     label: 'Port',          placeholder: '465',                encrypted: false },
      { key: 'smtp_user',     label: 'Email (login)', placeholder: 'contact@pangea-carbon.com', encrypted: false },
      { key: 'smtp_password', label: 'Password',  placeholder: '••••••••',           encrypted: true },
    ],
  },
  {
    id: 'stripe', label: 'Stripe Payments', icon: '💳', color: '#635BFF',
    guide: [
      ['1. Dashboard Stripe', 'dashboard.stripe.com → Developers → API keys'],
      ['2. Secret Key', '→ Reveal live key → Copy sk_live_...'],
      ['3. Webhook', '→ Webhooks → Add endpoint → /api/billing/webhook → Copy whsec_...'],
    ],
    settings: [
      { key: 'stripe_secret_key',      label: 'Stripe Secret Key', placeholder: 'sk_live_...', encrypted: true },
      { key: 'stripe_webhook_secret',  label: 'Webhook Secret',    placeholder: 'whsec_...',   encrypted: true },
      { key: 'stripe_publishable_key',   label: 'Publishable Key',        placeholder: 'pk_live_...', encrypted: false },
      { key: 'stripe_connect_client_id', label: 'Connect Client ID',      placeholder: 'ca_...',      encrypted: false },
      { key: 'stripe_connect_secret',    label: 'Connect Secret Key',     placeholder: 'sk_live_...', encrypted: true },
    ],
  },
  {
    id: 'integrations', label: 'Intégrations API', icon: '🔌', color: '#A78BFA',
    guide: [
      ['Claude AI', 'console.anthropic.com → API Keys → Create Key → sk-ant-...'],
      ['Mapbox',    'account.mapbox.com → Tokens → Default public token pk.eyJ1...'],
    ],
    settings: [
      { key: 'anthropic_api_key',    label: 'Claude AI API Key',   placeholder: 'sk-ant-api03-...', encrypted: true },
      { key: 'contact_email',         label: 'Email contact Enterprise', placeholder: 'contact@pangea-carbon.com', encrypted: false },
      { key: 'mapbox_token',         label: 'Mapbox Token',        placeholder: 'pk.eyJ1...',       encrypted: false },
      { key: 'xpansiv_api_key', label: 'Xpansiv CBL Price Feed', placeholder: 'xpansiv_...', encrypted: true },
    ],
  },
  {
    id: 'cinetpay',
    label: 'CinetPay — West Africa',
    icon: '🌍',
    color: '#F59E0B',
    guide: [
      ['1. Créer un compte', 'cinetpay.com → Inscription → Accès marchand'],
      ['2. API Keys', 'Dashboard → Mon compte → Mes API → apikey + site_id'],
      ['3. Webhook', 'Dashboard → Configuration → Notify URL → /api/marketplace/webhook/cinetpay'],
      ['4. Pays couverts', 'CI · SN · BF · ML · TG · GN · CM · CG · GA · CD'],
      ['5. Devises', 'XOF (CEDEAO) · XAF (CEMAC) · USD · EUR'],
    ],
    settings: [
      { key: 'cinetpay_api_key',  label: 'CinetPay API Key',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', encrypted: true },
      { key: 'cinetpay_site_id',  label: 'CinetPay Site ID',  placeholder: '123456789',                encrypted: false },
      { key: 'cinetpay_secret',   label: 'CinetPay Secret',   placeholder: '••••••••',                 encrypted: true },
    ],
  },
  {
    id: 'flutterwave',
    label: 'Flutterwave — Pan-Africa',
    icon: '🦋',
    color: '#F5A623',
    guide: [
      ['1. Compte Flutterwave', 'dashboard.flutterwave.com → Settings → API'],
      ['2. Secret Key',         'API → Copy Secret Key (FLWSECK_TEST / FLWSECK)'],
      ['3. Webhook',            'Settings → Webhooks → /api/marketplace/webhook/flutterwave'],
      ['4. Mobile Money',       'Paiements: MTN MoMo · Orange Money · Airtel · Vodafone'],
      ['5. Pays couverts',      'NG · GH · KE · ZA · TZ · UG · RW + 15 pays africains'],
    ],
    settings: [
      { key: 'flutterwave_secret_key',  label: 'Flutterwave Secret Key', placeholder: 'FLWSECK_PROD-...', encrypted: true },
      { key: 'flutterwave_public_key',  label: 'Flutterwave Public Key', placeholder: 'FLWPUBK_PROD-...', encrypted: false },
      { key: 'flutterwave_webhook_hash',label: 'Webhook Hash Secret',    placeholder: '••••••••',           encrypted: true },
    ],
  },
  {
    id: 'carbon_marketplace',
    label: 'Carbon Marketplace',
    icon: '🌱',
    color: '#00FF94',
    guide: [
      ['Marge PANGEA',       '3.5% est le standard marché (range: 2.5–5%)'],
      ['Split automatique',  'PANGEA fee → Stripe compte PANGEA'],
      ['Payout vendeur',     '96.5% → gateway africaine préférée du vendeur'],
      ['Stripe webhook',     'dashboard.stripe.com → Webhooks → /api/marketplace/webhook/stripe'],
      ['Stripe Connect',     'Pour split Stripe natif: Stripe Connect Marketplace (optionnel)'],
    ],
    settings: [
      { key: 'pangea_fee_pct',           label: 'PANGEA Carbon Fee %',      placeholder: '3.5',                            encrypted: false },
      { key: 'marketplace_stripe_key',   label: 'Stripe Key (Carbon)',       placeholder: 'sk_live_... (peut ≠ SaaS key)', encrypted: true },
      { key: 'marketplace_webhook_secret',label: 'Stripe Webhook Secret',   placeholder: 'whsec_...',                      encrypted: true },
      { key: 'seller_default_gateway',   label: 'Default Seller Gateway',   placeholder: 'FLUTTERWAVE | CINETPAY | WIRE',  encrypted: false },
      { key: 'xpansiv_api_key',          label: 'Xpansiv CBL API Key',      placeholder: 'xpansiv_...',                   encrypted: true },
    ],
  },
  {
    id: 'mobile_money',
    label: 'Mobile Money Direct',
    icon: '📱',
    color: '#F59E0B',
    guide: [
      ['MTN MoMo', 'momodeveloper.mtn.com → Sandbox → Create API user → Primary Key'],
      ['Orange Money', 'developer.orange.com/apis/om → Register → Client ID + Secret'],
      ['Wave', 'wave.com/en/business/api → API Keys → Create'],
      ['Couverture MTN', 'CI · GH · NG · CM · ZM · UG · RW · BJ · BF · GUI'],
      ['Couverture Orange', 'CI · SN · ML · GN · BF · CM · NE · MG'],
    ],
    settings: [
      { key: 'mtn_momo_api_key',           label: 'MTN MoMo API Key',          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', encrypted: true },
      { key: 'mtn_momo_user_id',           label: 'MTN MoMo User ID',          placeholder: 'UUID v4',                                encrypted: false },
      { key: 'mtn_momo_subscription_key',  label: 'MTN Primary Subscription Key', placeholder: '••••••••',                           encrypted: true },
      { key: 'orange_money_client_id',     label: 'Orange Money Client ID',    placeholder: 'client_id',                              encrypted: false },
      { key: 'orange_money_client_secret', label: 'Orange Money Secret',       placeholder: '••••••••',                               encrypted: true },
      { key: 'wave_api_key',               label: 'Wave API Key',              placeholder: 'wave_sn_prod_...',                        encrypted: true },
    ],
  },
  {
    id: 'registries',
    label: 'Verra · Gold Standard · Xpansiv',
    icon: '📋',
    color: '#34D399',
    guide: [
      ['Verra Registry', 'registry.verra.org → My Account → API Access → Generate Token'],
      ['Gold Standard', 'registry.goldstandard.org → Developer API → Request Access'],
      ['Xpansiv CBL', 'xpansiv.com → Contact sales → API credentials'],
      ['ICVCM', 'icvcm.org → Core Carbon Principles → API (2025)'],
      ['Usage', 'Pour synchroniser automatiquement les issuances et prix de marché'],
    ],
    settings: [
      { key: 'verra_api_token',   label: 'Verra Registry API Token',    placeholder: 'Bearer token...', encrypted: true },
      { key: 'gold_standard_api_key', label: 'Gold Standard API Key',   placeholder: 'gs_api_...',     encrypted: true },
      { key: 'xpansiv_api_key',   label: 'Xpansiv CBL API Key',         placeholder: 'xpansiv_...',    encrypted: true },
      { key: 'icvcm_api_key',     label: 'ICVCM API Key',               placeholder: 'icvcm_...',      encrypted: true },
    ],
  },
  {
    id: 'storage', label: 'Stockage & Ops', icon: '🗄️', color: '#EF9F27',
    guide: [
      ['AWS S3',  'console.aws.amazon.com → S3 → Create bucket → IAM → Access Keys'],
      ['MinIO',   'Hébergé sur votre VPS: docker run minio/minio server /data'],
      ['R2',      'dash.cloudflare.com → R2 → Create bucket → API tokens'],
      ['Sentry',  'sentry.io → New Project → Node.js → Copy le DSN'],
    ],
    settings: [
      { key: 'sentry_dsn',   label: 'Sentry DSN (monitoring)',  placeholder: 'https://xxx@sentry.io/yyy', encrypted: false },
      { key: 's3_bucket',    label: 'Bucket S3/MinIO',          placeholder: 'pangea-carbon-files',       encrypted: false },
      { key: 's3_endpoint',  label: 'Endpoint (MinIO/R2)',       placeholder: 'https://minio.example.com', encrypted: false },
      { key: 's3_region',    label: 'Région',                   placeholder: 'us-east-1',                 encrypted: false },
      { key: 's3_access_key',label: 'Access Key ID',            placeholder: 'AKIA...',                   encrypted: true },
      { key: 's3_secret_key',label: 'Secret Access Key',        placeholder: '••••••••',                  encrypted: true },
    ],
  },
  {
    id: 'general', label: 'Général', icon: '⚙️', color: '#8FA3B8',
    guide: null,
    settings: [
      { key: 'platform_name',   label: 'Nom plateforme',          placeholder: 'PANGEA CARBON',            encrypted: false },
      { key: 'support_email',   label: 'Email support',           placeholder: 'contact@pangea-carbon.com', encrypted: false },
      { key: 'carbon_price_usd',label: 'Carbon price ($/tCO₂e)', placeholder: '12',                       encrypted: false },
    ],
  },
];

/* ─── Single setting row ─────────────────────── */
function SettingRow({ def, hasValue, displayValue, onSave, onSuccess }: {
  def: any;
  hasValue: any;
  displayValue: any;
  onSave: any;
  onSuccess: any;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const save = async () => {
    if (!value.trim()) { setFeedback({ msg: 'Valeur requise', ok: false }); return; }
    setSaving(true);
    setFeedback(null);
    try {
      const result = await onSave(def.key, value);
      if (result.success) {
        setEditing(false);
        setValue('');
        setShow(false);
        setFeedback({ msg: '✓ Sauvegardé', ok: true });
        onSuccess(def.key, result.masked || '••••••••••••');
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ msg: result.error || 'Erreur de sauvegarde', ok: false });
      }
    } catch(e) {
      setFeedback({ msg: e.message || 'Erreur réseau', ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{def.label}</span>
            {def.encrypted && (
              <span style={{ fontSize: 9, background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace' }}>AES-256</span>
            )}
            {feedback && (
              <span style={{ fontSize: 11, color: feedback.ok ? '#00FF94' : '#F87171', fontWeight: 600 }}>{feedback.msg}</span>
            )}
          </div>

          {/* Key name */}
          <div style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{def.key}</div>

          {/* Value or edit form */}
          {!editing ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, padding: '5px 10px', background: hasValue ? 'rgba(0,255,148,0.06)' : '#0D1117', borderRadius: 6, border: `1px solid ${hasValue ? 'rgba(0,255,148,0.15)' : '#1E2D3D'}`, maxWidth: '100%', overflow: 'hidden' }}>
              {hasValue ? (
                <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', flexShrink: 0 }}/><span style={{ color: '#8FA3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayValue || '••••••••••••••••'}</span></>
              ) : (
                <span style={{ color: '#2A3F55', fontStyle: 'italic' }}>— non configuré —</span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                <input
                  type={def.encrypted && !show ? 'password' : 'text'}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={def.placeholder}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(''); } }}
                  style={{ width: '100%', background: '#0D1117', border: '1px solid rgba(0,255,148,0.4)', borderRadius: 7, color: '#E8EFF6', padding: def.encrypted ? '9px 36px 9px 12px' : '9px 12px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
                />
                {def.encrypted && (
                  <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                    {show ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={save} disabled={saving || !value.trim()}
                  style={{ background: saving ? '#1E2D3D' : '#00FF94', color: saving ? '#4A6278' : '#080B0F', border: 'none', borderRadius: 7, padding: '9px 16px', fontWeight: 700, fontSize: 12, cursor: saving ? 'wait' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {saving ? '⏳ Sauvegarde...' : '✓ Sauver'}
                </button>
                <button onClick={() => { setEditing(false); setValue(''); setFeedback(null); }}
                  style={{ background: 'transparent', color: '#4A6278', border: '1px solid #1E2D3D', borderRadius: 7, padding: '9px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        {!editing && (
          <button onClick={() => { setEditing(true); setFeedback(null); }}
            style={{ background: 'transparent', border: `1px solid ${hasValue ? '#1E2D3D' : 'rgba(0,255,148,0.25)'}`, borderRadius: 7, color: hasValue ? '#4A6278' : '#00CC77', padding: '7px 13px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#4A6278')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = hasValue ? '#1E2D3D' : 'rgba(0,255,148,0.25)')}>
            {hasValue ? '✏️ Edit' : '+ Configurer'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────── */
export default function AdminSettingsPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [settingsState, setSettingsState] = useState({});
  const [activeTab, setActiveTab] = useState('smtp');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetchAuth('/admin/settings');
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(_) {
        throw new Error('Erreur ' + res.status + ' — Le backend redémarre, patientez 15s puis rechargez.');
      }
      if (!res.ok) throw new Error(data.error || 'Erreur ' + res.status);
      const map = {};
      if (Array.isArray(data.settings)) {
        data.settings.forEach((s) => {
          map[s.key] = { hasValue: !!s.hasValue, displayValue: s.value || '' };
        });
      }
      setSettingsState(map);
    } catch(e) {
      setLoadError((e.message || 'Impossible de charger les parametres') + ' — Si le problème persiste, vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key, value) => {
    try {
      const res = await fetchAuth(`/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || `Erreur ${res.status}` };
      return { success: true, masked: data.masked };
    } catch(e) {
      return { success: false, error: e.message || 'Erreur réseau — vérifiez votre connexion' };
    }
  };

  // Called by SettingRow after a successful save — update local state immediately
  const handleSuccess = (key, masked) => {
    setSettingsState(prev => ({
      ...prev,
      [key]: { hasValue: true, displayValue: masked },
    }));
  };

  const testSmtp = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetchAuth(`/admin/settings/test-smtp`, { method: 'POST',  });
      const data = await res.json();
      if (res.ok) setTestResult({ msg: `✓ ${data.message || 'Email de test envoyé'}`, ok: true });
      else setTestResult({ msg: `✗ ${data.error || 'Erreur SMTP'}`, ok: false });
    } catch(_e) {
      setTestResult({ msg: '✗ Erreur réseau', ok: false });
    } finally { setTestLoading(false); }
  };

  const activeCategory = CATEGORIES.find(c => c.id === activeTab)!;
  const totalConfigured = CATEGORIES.reduce((n, cat) => n + cat.settings.filter(s => settingsState[s.key]?.hasValue).length, 0);
  const totalSettings = CATEGORIES.reduce((n, cat) => n + cat.settings.length, 0);

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#F87171', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>ADMIN · SECRETS & CONFIGURATION</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: '0 0 4px' }}>Secrets & Configuration</h1>
        <p style={{ fontSize: 12, color: '#4A6278', margin: 0 }}>
          AES-256-GCM encrypted secrets in database. Never exposés dans les logs.
          <span style={{ marginLeft: 10, fontFamily: 'JetBrains Mono, monospace', color: totalConfigured === totalSettings ? '#00FF94' : '#FCD34D' }}>
            {totalConfigured}/{totalSettings} configured
          </span>
        </p>
      </div>

      {/* Security banner */}
      <div style={{ background: 'rgba(0,255,148,0.04)', border: '1px solid rgba(0,255,148,0.12)', borderRadius: 9, padding: '10px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔐</span>
        <div style={{ fontSize: 12, color: '#8FA3B8' }}>
          <span style={{ color: '#00FF94', fontWeight: 600 }}>AES-256-GCM encryption enabled</span>
          {' · '}Key derived via PBKDF2 from JWT_SECRET
          {' · '}Full audit trail of every change
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {loadError}</span>
          <button onClick={load} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 5, color: '#F87171', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Réessayer</button>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
        {CATEGORIES.map(cat => {
          const configured = cat.settings.filter(s => settingsState[s.key]?.hasValue).length;
          const total = cat.settings.length;
          const active = activeTab === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)}
              style={{ padding: '11px 8px', borderRadius: 9, border: `1px solid ${active ? cat.color + '40' : '#1E2D3D'}`, background: active ? `${cat.color}08` : '#0D1117', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.icon}</div>
              <div style={{ fontSize: 11, color: active ? '#E8EFF6' : '#4A6278', fontWeight: active ? 600 : 400, marginBottom: 4 }}>{cat.label}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: configured === total ? '#00FF94' : configured > 0 ? '#FCD34D' : '#2A3F55' }}>
                {configured}/{total}
              </div>
            </button>
          );
        })}
      </div>

      {/* Settings panel */}
      <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {/* Panel header */}
        <div style={{ padding: '11px 20px', background: '#121920', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{activeCategory.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E8EFF6' }}>{activeCategory.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeTab === 'smtp' && testResult && (
              <span style={{ fontSize: 11, color: testResult.ok ? '#00FF94' : '#F87171' }}>{testResult.msg}</span>
            )}
            {activeTab === 'smtp' && (
              <button onClick={testSmtp} disabled={testLoading}
                style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 6, color: '#4A6278', padding: '5px 11px', cursor: testLoading ? 'wait' : 'pointer', fontSize: 11 }}>
                {testLoading ? '⏳ Test...' : '🔍 Tester SMTP'}
              </button>
            )}
          </div>
        </div>

        {/* Settings list */}
        <div style={{ padding: '4px 20px 12px' }}>
          {loading ? (
            <div style={{ padding: '24px 0', color: '#4A6278', fontSize: 13, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,148,0.2)', borderTopColor: '#00FF94', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
              Loading...
            </div>
          ) : (
            activeCategory.settings.map(def => {
              const state = settingsState[def.key] || { hasValue: false, displayValue: '' };
              return (
                <SettingRow
                  key={def.key}
                  def={def}
                  hasValue={state.hasValue}
                  displayValue={state.displayValue}
                  onSave={saveSetting}
                  onSuccess={handleSuccess}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Guide */}
      {activeCategory.guide && (
        <div style={{ background: `${activeCategory.color}08`, border: `1px solid ${activeCategory.color}20`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 10, color: activeCategory.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 10, letterSpacing: '0.08em' }}>
            GUIDE · {activeCategory.label.toUpperCase()}
          </div>
          {activeCategory.guide.map(([step, action]) => (
            <div key={step} style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: activeCategory.color, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, minWidth: 120, fontWeight: 600 }}>{step}</span>
              <span style={{ fontSize: 12, color: '#8FA3B8' }}>{action}</span>
            </div>
          ))}

          {activeTab === 'smtp' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#0D1117', borderRadius: 8, border: '1px solid #1E2D3D' }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>CONFIG HOSTINGER (votre serveur)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[['smtp_host','smtp.hostinger.com'],['smtp_port','465'],['smtp_user','contact@pangea-carbon.com'],['smtp_password','Password Hostinger']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{k}:</span>
                    <span style={{ fontSize: 10, color: '#00FF94' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#0D1117', borderRadius: 8, border: '1px solid #1E2D3D', fontSize: 12, color: '#4A6278', lineHeight: 1.6 }}>
              💡 <strong style={{ color: '#A78BFA' }}>Priorite :</strong> Configurez Claude AI en premier pour activer AI Assistant et AI Baseline. Mapbox est optionnel.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
