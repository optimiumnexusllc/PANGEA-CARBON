'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';
import { api } from '@/lib/api';

const TOKEN_TYPES = [
  { id: 'vvb', label: 'VVB Token', full: 'Validation & Verification Body', color: '#38BDF8', icon: '🏛️', desc: 'Certifies a third-party auditor validated your project methodology' },
  { id: 'pdd', label: 'PDD Token', full: 'Project Design Document', color: '#A78BFA', icon: '📄', desc: 'Unique token for your project design document — methodology, baseline, additionality' },
  { id: 'vcu', label: 'VCU Token', full: 'Verified Carbon Unit', color: '#00FF94', icon: '🌿', desc: 'One token per issuance batch — links physical tCO2e to unique serial numbers' },
  { id: 'broker-sale', label: 'Broker Sale', full: 'Brokered Carbon Sale', color: '#FCD34D', icon: '🤝', desc: 'Token for brokered carbon credit transactions with commission tracking' },
  { id: 'direct-sale', label: 'Direct Sale', full: 'Direct Corporate Purchase', color: '#EF9F27', icon: '🏢', desc: 'Token for direct corporate buyer purchases and retirement records' },
  { id: 'itmo', label: 'ITMO Token', full: 'Article 6 ITMO', color: '#F87171', icon: '🌐', desc: 'Internationally Transferred Mitigation Outcome — Paris Agreement Article 6.4 premium' },
];

const COUNTRIES = ['CI','GH','NG','KE','SN','TZ','RW','ET','ZA','BF','CH','JP','SE','NO','DE','FR','GB'];

export default function TokensPage() {
  const { lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [selectedType, setSelectedType] = useState('vcu');
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [projectTokens, setProjectTokens] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    api.getProjects().then(d => {
      const p = d.projects || d || [];
      setProjects(p);
      if (p[0]) setSelectedProject(p[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    fetchAuthJson('/registry/issuances?projectId=' + selectedProject)
      .then(d => setIssuances(d.issuances || d || []))
      .catch(() => {});
    fetchAuthJson('/tokens/project/' + selectedProject)
      .then(d => setProjectTokens(d.tokens || []))
      .catch(() => {});
  }, [selectedProject]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function generate() {
    setLoading(true); setErr(''); setResult(null);
    try {
      const payload = { ...form, projectId: selectedProject };
      const data = await fetchAuthJson('/tokens/' + selectedType, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(data);
      fetchAuthJson('/tokens/project/' + selectedProject)
        .then(d => setProjectTokens(d.tokens || []))
        .catch(() => {});
    } catch(e) {
      setErr(e.message || 'Generation failed');
    } finally { setLoading(false); }
  }

  const typeInfo = TOKEN_TYPES.find(t => t.id === selectedType) || TOKEN_TYPES[0];
  const inp = {
    background: '#121920', border: '1px solid #1E2D3D', borderRadius: 7,
    color: '#E8EFF6', padding: '10px 12px', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>CARBON ASSET REGISTRY</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EFF6', margin: 0 }}>Carbon Token Generator</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 6 }}>
          Generate unique SHA-256 tokens + QR codes for VVB, PDD, VCU, ITMO, and sale records.
          Each token is publicly verifiable at <span style={{ color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>pangea-carbon.com/verify/[hash]</span>
        </p>
      </div>

      {/* Token type cards overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 24 }}>
        {TOKEN_TYPES.map(type => (
          <div key={type.id} onClick={() => { setSelectedType(type.id); setResult(null); setForm({}); }}
            style={{ padding: '12px', borderRadius: 10, border: '1px solid ' + (selectedType === type.id ? type.color + '60' : '#1E2D3D'), cursor: 'pointer', background: selectedType === type.id ? type.color + '08' : '#0D1117', transition: 'all 0.15s', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{type.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: selectedType === type.id ? type.color : '#E8EFF6' }}>{type.label}</div>
            <div style={{ fontSize: 9, color: '#4A6278', marginTop: 2, lineHeight: 1.3 }}>{type.full}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

        {/* Left: Form */}
        <div>
          {/* Project selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>SELECT PROJECT</div>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ ...inp }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.countryCode}</option>)}
            </select>
          </div>

          <div style={{ background: '#0D1117', border: '1px solid ' + typeInfo.color) + '25', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, color: typeInfo.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, letterSpacing: '0.08em' }}>{typeInfo.label.toUpperCase()} PARAMETERS</div>
            <div style={{ fontSize: 12, color: '#4A6278', marginBottom: 16, lineHeight: 1.6 }}>{typeInfo.desc}</div>

            {selectedType === 'vvb' && (
              <>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>VVB NAME *</div><input placeholder="e.g. Bureau Veritas, Carbon Check India, SGS" style={inp} onChange={e => set('vvbName', e.target.value)}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>VVB COUNTRY</div><input placeholder="e.g. South Africa, India" style={inp} onChange={e => set('vvbCountry', e.target.value)}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>AUDIT DATE</div><input type="date" style={inp} onChange={e => set('auditDate', e.target.value)}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>AUDIT TYPE</div>
                  <select style={inp} onChange={e => set('auditType', e.target.value)}><option value="VALIDATION">Validation</option><option value="VERIFICATION">Verification</option><option value="VALIDATION_VERIFICATION">Validation + Verification</option></select>
                </div>
              </>
            )}

            {selectedType === 'pdd' && (
              <>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>METHODOLOGY</div>
                  <select style={inp} onChange={e => set('methodology', e.target.value)}><option>ACM0002 v22.0</option><option>AMS-I.D v18.0</option><option>VM0042</option><option>Gold Standard TPDDTEC</option></select>
                </div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>BASELINE EMISSION FACTOR (tCO2/MWh)</div><input type="number" step="0.001" placeholder="e.g. 0.851" style={inp} onChange={e => set('baselineEF', parseFloat(e.target.value))}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>CREDITING PERIOD (years)</div><input type="number" defaultValue="10" style={inp} onChange={e => set('creditingPeriod', parseInt(e.target.value))}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>ADDITIONALITY</div>
                  <select style={inp} onChange={e => set('additionality', e.target.value)}><option value="INVESTMENT_BARRIER">Investment Barrier</option><option value="REGULATORY_BARRIER">Regulatory Barrier</option><option value="TECHNOLOGICAL_BARRIER">Technological Barrier</option></select>
                </div>
              </>
            )}

            {selectedType === 'vcu' && (
              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>CREDIT ISSUANCE *</div>
                <select style={inp} onChange={e => set('issuanceId', e.target.value)}>
                  <option value="">Select issuance...</option>
                  {issuances.map(iss => <option key={iss.id} value={iss.id}>{iss.vintage} — {iss.quantity?.toLocaleString()} tCO2e — {iss.standard}</option>)}
                </select>
              </div>
            )}

            {(selectedType === 'broker-sale' || selectedType === 'direct-sale') && (
              <>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>CREDIT BATCH *</div>
                  <select style={inp} onChange={e => set('issuanceId', e.target.value)}>
                    <option value="">Select issuance...</option>
                    {issuances.map(iss => <option key={iss.id} value={iss.id}>{iss.vintage} — {iss.quantity?.toLocaleString()} tCO2e — {iss.standard}</option>)}
                  </select>
                </div>
                {selectedType === 'broker-sale' ? (
                  <>
                    <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>BROKER NAME *</div><input placeholder="e.g. South Pole, EcoAct, Carbonfund" style={inp} onChange={e => set('brokerName', e.target.value)}/></div>
                    <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>COMMISSION %</div><input type="number" defaultValue="2.5" step="0.1" style={inp} onChange={e => set('commission', parseFloat(e.target.value))}/></div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>BUYER ENTITY *</div><input placeholder="e.g. MTN Group, Ecobank, Total Energies" style={inp} onChange={e => set('buyerEntity', e.target.value)}/></div>
                    <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>RETIREMENT REASON</div>
                      <select style={inp} onChange={e => set('retirementReason', e.target.value)}>
                        <option value="CARBON_NEUTRALITY_CLAIM">Carbon Neutrality Claim</option>
                        <option value="SCOPE_3_OFFSET">Scope 3 Offset</option>
                        <option value="NET_ZERO_COMMITMENT">Net Zero Commitment</option>
                        <option value="REGULATORY_COMPLIANCE">Regulatory Compliance</option>
                      </select>
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>PRICE PER TONNE ($/tCO2e)</div><input type="number" placeholder="e.g. 12.50" step="0.01" style={inp} onChange={e => set('pricePerTonne', parseFloat(e.target.value))}/></div>
              </>
            )}

            {selectedType === 'itmo' && (
              <>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>HOST COUNTRY *</div>
                  <select style={inp} onChange={e => set('hostCountry', e.target.value)}><option value="">Select host...</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>ACQUIRING COUNTRY *</div>
                  <select style={inp} onChange={e => set('acquiringCountry', e.target.value)}><option value="">Select buyer...</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>QUANTITY (tCO2e)</div><input type="number" placeholder="e.g. 28000" style={inp} onChange={e => set('quantity', parseFloat(e.target.value))}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>PRICE PER TONNE — Article 6 premium</div><input type="number" defaultValue="45" step="0.01" style={inp} onChange={e => set('pricePerTonne', parseFloat(e.target.value))}/></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>AUTHORIZATION REF</div><input placeholder="e.g. AUTH-CI-2025-001" style={inp} onChange={e => set('authorizationRef', e.target.value)}/></div>
              </>
            )}

            {err && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 10, padding: '8px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>{err}</div>}

            <button onClick={generate} disabled={loading} style={{ width: '100%', background: loading ? '#1E2D3D' : typeInfo.color, color: '#080B0F', border: 'none', borderRadius: 8, padding: 13, fontWeight: 800, fontSize: 13, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif', marginTop: 8 }}>
              {loading ? 'Generating...' : `Generate ${typeInfo.label} →`}
            </button>
          </div>
        </div>

        {/* Right: Result + token list */}
        <div>
          {result && (
            <div style={{ background: '#0D1117', border: `2px solid ${typeInfo.color}40`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
                    <span style={{ fontSize: 10, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace' }}>{(result as any).type} TOKEN GENERATED</span>
                  </div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, color: '#E8EFF6', margin: 0 }}>{(result as any).label}</h2>
                </div>
                {(result as any).qrCode && (
                  <div style={{ padding: 6, background: '#fff', borderRadius: 8 }}>
                    <img src={(result as any).qrCode} alt="QR Code" style={{ width: 88, height: 88, display: 'block' }}/>
                  </div>
                )}
              </div>

              <div style={{ background: '#121920', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>TOKEN ID</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: typeInfo.color, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{(result as any).token}</div>
              </div>

              <div style={{ background: '#121920', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>SHA-256 HASH (immutable)</div>
                <div style={{ fontSize: 11, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>{(result as any).hash}</div>
              </div>

              <div style={{ background: '#121920', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>PUBLIC VERIFICATION URL</div>
                <a href={(result as any).verifyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: typeInfo.color, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all', textDecoration: 'none' }}>
                  {(result as any).verifyUrl}
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {Object.entries(result as any)
                  .filter(([k]) => !['type','label','token','hash','verifyUrl','qrCode','createdAt','payload'].includes(k))
                  .slice(0, 9)
                  .map(([k, v]) => (
                  <div key={k} style={{ background: '#121920', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>{k.toUpperCase().replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 12, color: '#E8EFF6', fontWeight: 600, wordBreak: 'break-word' }}>
                      {typeof v === 'number' ? v.toLocaleString() : typeof v === 'boolean' ? String(v) : String(v).slice(0, 40)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {(result as any).qrCode && (
                  <a href={(result as any).qrCode} download={`${(result as any).token}.png`} style={{ flex: 1, textAlign: 'center', background: typeInfo.color + '15', border: '1px solid ' + typeInfo.color + '40', borderRadius: 8, padding: '11px', color: typeInfo.color, textDecoration: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Download QR Code
                  </a>
                )}
                <button onClick={() => navigator.clipboard?.writeText((result as any).verifyUrl)} style={{ flex: 1, background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 8, padding: '11px', color: '#4A6278', cursor: 'pointer', fontSize: 12 }}>
                  Copy Verify URL
                </button>
              </div>
            </div>
          )}

          {/* Existing tokens */}
          <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
              PROJECT TOKENS ({projectTokens.length})
            </div>
            {projectTokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4A6278', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔐</div>
                No tokens generated yet for this project
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projectTokens.map((tok, i) => {
                  const tColor = TOKEN_TYPES.find(t => t.id.replace('-','_').toUpperCase() === tok.type)?.color || '#4A6278';
                  return (
                    <div key={i} style={{ background: '#121920', borderRadius: 9, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, background: tColor + '20', color: tColor, border: '1px solid ' + tColor + '40', borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace' }}>{tok.type}</span>
                          {tok.status && <span style={{ fontSize: 10, color: tok.status === 'ACTIVE' ? '#00FF94' : '#FCD34D' }}>{tok.status}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                          {tok.token || (tok.hash?.slice(0, 32) + '...')}
                        </div>
                      </div>
                      {tok.verifyUrl && (
                        <a href={tok.verifyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#4A6278', textDecoration: 'none', padding: '5px 12px', border: '1px solid #1E2D3D', borderRadius: 5 }}>Verify →</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}