'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';

const TIER_CONFIG = {
  VERIFIED:     { color: '#38BDF8', glow: 'rgba(56,189,248,0.12)',  label: 'PANGEA VERIFIED',      rank: 1 },
  CERTIFIED:    { color: '#00FF94', glow: 'rgba(0,255,148,0.12)',   label: 'PANGEA CERTIFIED',     rank: 2 },
  ELITE:        { color: '#A78BFA', glow: 'rgba(167,139,250,0.12)', label: 'PANGEA ELITE',         rank: 3 },
  ELITE_CORSIA: { color: '#FCD34D', glow: 'rgba(252,211,77,0.12)',  label: 'PANGEA ELITE + CORSIA',rank: 4 },
};

export default function VerifyPage({ params }: { params: { hash: string } }) {
  const { t, lang } = useLang();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://pangea-carbon.com/api';
    fetch(`${API}/certification/verify/${params.hash}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setCert(d); })
      .catch(() => setError('Erreur de connexion au serveur PANGEA CARBON'))
      .finally(() => setLoading(false));
  }, [params.hash]);

  const cfg = cert ? (TIER_CONFIG[cert.tier] || TIER_CONFIG.VERIFIED) : null;

  const copyHash = () => {
    navigator.clipboard.writeText(params.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>

      {/* Background pattern */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300FF94' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")", pointerEvents: 'none' }} />

      <div style={{ maxWidth: 680, width: '100%', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(0,255,148,0.06)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 12, padding: '8px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>&#x2B21;</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#E8EFF6' }}>PANGEA CARBON</div>
              <div style={{ fontSize: 9, color: '#4A6278', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono, monospace' }}>CARBON CREDIT INTELLIGENCE · AFRICA</div>
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0, marginBottom: 6 }}>
            Verification de certification
          </h1>
          <p style={{ fontSize: 13, color: '#4A6278', margin: 0 }}>
            Verification cryptographique independante · SHA256
          </p>
        </div>

        {loading && (
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#4A6278' }}>Verification en cours...</div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F87171', marginBottom: 8 }}>Certification introuvable</div>
            <div style={{ fontSize: 13, color: '#8FA3B8' }}>{error}</div>
          </div>
        )}

        {cert && (
          <div>
            {/* Status banner */}
            <div style={{
              background: cert.status === 'VALID' ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)',
              border: `2px solid ${cert.status === 'VALID' ? 'rgba(0,255,148,0.3)' : 'rgba(248,113,113,0.3)'}`,
              borderRadius: 14, padding: '16px 24px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{ fontSize: 32 }}>{cert.status === 'VALID' ? '✅' : cert.status === 'REVOKED' ? '🚫' : '⏰'}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cert.status === 'VALID' ? '#00FF94' : '#F87171', fontFamily: 'Syne, sans-serif' }}>
                  {cert.status === 'VALID' ? 'Certification VALIDE' : cert.status === 'REVOKED' ? 'Certification REVOQUEE' : 'Certification EXPIREE'}
                </div>
                <div style={{ fontSize: 12, color: '#8FA3B8', marginTop: 3 }}>
                  {cert.status === 'VALID'
                    ? `Certifie jusqu au ${new Date(cert.expiresAt).toLocaleDateString('fr-FR')}`
                    : cert.status === 'REVOKED'
                    ? `Revoquee le ${new Date(cert.revokedAt).toLocaleDateString('fr-FR')}`
                    : `Expiree le ${new Date(cert.expiresAt).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
            </div>

            {/* Tier badge */}
            <div style={{
              background: `linear-gradient(135deg, ${cfg!.glow} 0%, rgba(13,17,23,0.95) 100%)`,
              border: `1px solid ${cfg!.color}40`, borderRadius: 14, padding: 28, marginBottom: 16,
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Decorative hexagon */}
              <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, background: `${cfg!.color}06`, borderRadius: '50%' }} />
              <div style={{ position: 'absolute', right: 20, top: 20, width: 60, height: 60, background: `${cfg!.color}08`, borderRadius: '50%' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
                {/* Big hexagon badge */}
                <div style={{ width: 80, height: 80, background: `${cfg!.color}15`, border: `2px solid ${cfg!.color}50`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 36, color: cfg!.color }}>&#x2B21;</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: cfg!.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6, letterSpacing: '0.15em' }}>
                    CERTIFICATION OFFICIELLE
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: cfg!.color, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>
                    {cfg!.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#8FA3B8', lineHeight: 1.6 }}>
                    {cert.tierInfo?.badge}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {cert.acmiCompliant && (
                      <span style={{ fontSize: 10, background: 'rgba(0,255,148,0.12)', color: '#00FF94', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 4, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        ACMI COMPLIANT
                      </span>
                    )}
                    {cert.corsiaEligible && (
                      <span style={{ fontSize: 10, background: 'rgba(252,211,77,0.1)', color: '#FCD34D', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 4, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        CORSIA ELIGIBLE
                      </span>
                    )}
                    {cert.standards?.map((s: string) => (
                      <span key={s} style={{ fontSize: 10, background: 'rgba(30,45,61,0.8)', color: '#8FA3B8', border: '1px solid #1E2D3D', borderRadius: 4, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Project details */}
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14, letterSpacing: '0.1em' }}>DETAILS DU PROJET</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {[
                  { label: 'Projet', value: cert.project?.name },
                  { label: 'Pays', value: cert.project?.country },
                  { label: 'Type', value: cert.project?.type },
                  { label: 'Puissance', value: cert.project?.installedMW + ' MW' },
                  { label: 'Emis le', value: new Date(cert.issuedAt).toLocaleDateString('fr-FR') },
                  { label: 'Score ODD', value: cert.oddScore + '/100' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 9, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3, letterSpacing: '0.1em' }}>{item.label.toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#E8EFF6', fontWeight: 500 }}>{item.value || '—'}</div>
                  </div>
                ))}
              </div>
              {cert.auditorName && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>AUDITEUR TIERS INDEPENDANT</div>
                  <div style={{ fontSize: 13, color: '#E8EFF6' }}>{cert.auditorName}</div>
                  {cert.auditorUrl && (
                    <a href={cert.auditorUrl} target="_blank" style={{ fontSize: 11, color: '#38BDF8', textDecoration: 'none' }}>{cert.auditorUrl}</a>
                  )}
                </div>
              )}
            </div>

            {/* Hash verification */}
            <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.1em' }}>EMPREINTE CRYPTOGRAPHIQUE · SHA256</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: '#121920', borderRadius: 7, padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4A6278', wordBreak: 'break-all', lineHeight: 1.6 }}>
                  {params.hash}
                </div>
                <button onClick={copyHash} style={{ background: copied ? 'rgba(0,255,148,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`, borderRadius: 7, color: copied ? '#00FF94' : '#4A6278', padding: '10px 14px', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {copied ? '✓ Copie' : 'Copier'}
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#2A3F55', lineHeight: 1.7 }}>
                Cette certification est enregistree de maniere permanente sur la plateforme PANGEA CARBON.
                Le hash SHA256 ci-dessus permet de verifier l authenticite de ce document a tout moment.
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #1E2D3D' }}>
              <div style={{ fontSize: 11, color: '#4A6278', marginBottom: 4 }}>
                Verifie par <strong style={{ color: '#8FA3B8' }}>PANGEA CARBON Africa</strong> · {new Date(cert.verifiedAt).toLocaleString('fr-FR')}
              </div>
              <div style={{ fontSize: 10, color: '#2A3F55', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
                pangea-carbon.com · contact@pangea-carbon.com
              </div>
              <a href="/" style={{ fontSize: 12, background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 8, color: '#00FF94', padding: '8px 20px', textDecoration: 'none', fontWeight: 600 }}>
                Acceder a la plateforme
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
