'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect, useState, useRef } from 'react';
import { fetchAuthJson } from '@/lib/fetch-auth';

const ACCENT = '#00FF94';
const BG = '#080B0F';
const CARD = '#0D1117';
const BORDER = '#1E2D3D';
const DIM = '#4A6278';
const TEXT = '#E8EFF6';

const FONT_MONO = 'JetBrains Mono, monospace';
const FONT_DISPLAY = 'Syne, sans-serif';

const TEMPLATE_COLORS = {
  mrv_report:      '#38BDF8',
  credit_issuance: '#00FF94',
  investor_update: '#A78BFA',
  welcome:         '#FCD34D',
  custom:          '#8FA3B8',
};

const FORMAT_ACTIONS = [
  { label: 'G', title: 'Gras', tag: '**', style: { fontWeight: 800 } },
  { label: 'I', title: 'Italique', tag: '_', style: { fontStyle: 'italic' } },
];

function EmailComposerPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [variables, setVariables] = useState({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('compose');
  const bodyRef = useRef(null);

  useEffect(() => {
    fetchAuthJson('/email-composer/templates').then(d => setTemplates(d.templates || [])).catch(() => {});
    fetchAuthJson('/email-composer/history').then(d => setHistory(d.history || [])).catch(() => {});
  }, []);

  function selectTemplate(tpl) {
    setSelectedTemplate(tpl);
    setSubject(tpl.subject || '');
    setBody('');
    setVariables({});
    setPreviewHtml('');
    setPreviewMode(false);
  }

  async function loadPreview() {
    if (!subject) return;
    setLoadingPreview(true);
    try {
      const d = await fetchAuthJson('/email-composer/preview', {
        method: 'POST',
        body: JSON.stringify({ templateId: selectedTemplate?.id || 'custom', subject, body, variables }),
      });
      setPreviewHtml(d.html || '');
      setPreviewMode(true);
    } catch (e) { flash(e.message, false); }
    finally { setLoadingPreview(false); }
  }

  async function sendEmail() {
    if (!to || !subject) { flash('Destinataire et sujet requis', false); return; }
    setSending(true);
    try {
      const d = await fetchAuthJson('/email-composer/send', {
        method: 'POST',
        body: JSON.stringify({ to, cc: cc || undefined, subject, body, variables, templateId: selectedTemplate?.id || 'custom' }),
      });
      flash('Email envoye a ' + d.to);
      setHistory(prev => [{ id: Date.now(), to, subject, sentAt: new Date() }, ...prev]);
    } catch (e) { flash(e.message, false); }
    finally { setSending(false); }
  }

  function flash(text, ok) {
    setMsg({ text, ok: ok !== false });
    setTimeout(() => setMsg(null), 5000);
  }

  function insertVar(varName) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = body.slice(0, start) + '{{' + varName + '}}' + body.slice(end);
    setBody(newBody);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + varName.length + 4, start + varName.length + 4); }, 10);
  }

  function updateVar(key, value) {
    setVariables(prev => ({ ...prev, [key]: value }));
  }

  const tplColor = selectedTemplate ? (TEMPLATE_COLORS[selectedTemplate.id] || DIM) : DIM;

  const labelStyle = { fontSize: 10, color: DIM, fontFamily: FONT_MONO, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' };
  const inputStyle = { width: '100%', background: '#121920', border: '1px solid ' + BORDER, borderRadius: 7, color: TEXT, padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: ACCENT, fontFamily: FONT_MONO, marginBottom: 4 }}>EMAIL COMPOSER · PANGEA CARBON BRANDED</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>Email Composer</h1>
        <p style={{ fontSize: 13, color: DIM, marginTop: 4 }}>Compose and send professional emails with PANGEA CARBON branding</p>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,255,148,0.08)' : 'rgba(248,113,113,0.08)', border: '1px solid', borderColor: msg.ok ? 'rgba(0,255,148,0.25)' : 'rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: msg.ok ? ACCENT : '#F87171' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {[['compose', 'Composer'], ['history', 'Historique (' + history.length + ')']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, background: tab === id ? '#1E2D3D' : 'transparent', color: tab === id ? TEXT : DIM, fontWeight: tab === id ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 18px', background: '#121920', borderBottom: '1px solid ' + BORDER, fontSize: 10, color: DIM, fontFamily: FONT_MONO }}>
            EMAILS ENVOYES
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: DIM }}>Aucun email envoy&eacute;</div>
          ) : history.map((h, i) => (
            <div key={h.id || i} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(30,45,61,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 500, marginBottom: 2 }}>{h.subject || '(sans objet)'}</div>
                <div style={{ fontSize: 11, color: DIM, fontFamily: FONT_MONO }}>To: {h.to}</div>
              </div>
              <div style={{ fontSize: 11, color: DIM }}>{h.sentAt ? new Date(h.sentAt).toLocaleString('en-US') : ''}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Templates panel */}
          <div>
            <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO, marginBottom: 10 }}>L('TEMPLATES', 'TEMPLATES')</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(tpl => {
                const color = TEMPLATE_COLORS[tpl.id] || DIM;
                const active = selectedTemplate?.id === tpl.id;
                return (
                  <div key={tpl.id} onClick={() => selectTemplate(tpl)}
                    style={{ background: active ? `${color}0D` : CARD, border: `1px solid ${active ? color + '40' : BORDER), borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: active ? color : TEXT, marginBottom: 4 }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: DIM, lineHeight: 1.5 }}>{tpl.description}</div>
                    {active && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(tpl.variables || []).map(v => (
                          <span key={v} style={{ fontSize: 9, background: `${color) + '15', color, border: `1px solid ${color) + '25', borderRadius: 3, padding: '2px 5px', fontFamily: FONT_MONO, cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); insertVar(v); }}>
                            {'{{'}{v}{'}}'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Variables panel */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO, marginBottom: 10 }}>VARIABLES</div>
                <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, padding: 14 }}>
                  {selectedTemplate.variables.map(v => (
                    <div key={v} style={{ marginBottom: 10 }}>
                      <label style={{ ...labelStyle, color: tplColor }}>{v}</label>
                      <input value={variables[v] || ''} onChange={e => updateVar(v, e.target.value)}
                        placeholder={`{{${v}})}
                        style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer main */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Recipients */}
            <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO, marginBottom: 14 }}>L('RECIPIENTS', 'DESTINATAIRES')</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>To *</label>
                  <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@client.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CC</label>
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="optionnel" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Subject + Body */}
            <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO }}>L('CONTENT', 'CONTENU')</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPreviewMode(false)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + BORDER, background: !previewMode ? '#1E2D3D' : 'transparent', color: !previewMode ? TEXT : DIM, cursor: 'pointer', fontSize: 12 }}>
                    Editer
                  </button>
                  <button onClick={loadPreview} disabled={loadingPreview || !subject}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + BORDER, background: previewMode ? '#1E2D3D' : 'transparent', color: previewMode ? TEXT : DIM, cursor: 'pointer', fontSize: 12 }}>
                    {loadingPreview ? '...' : 'Apercu'}
                  </button>
                </div>
              </div>

              {!previewMode ? (
                <div>
                  <label style={labelStyle}>L('SUBJECT', 'OBJET')</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Objet de l'email..."
                    style={{ ...inputStyle, marginBottom: 14, fontSize: 15, fontWeight: 500 }} />

                  <label style={labelStyle}>L('MESSAGE BODY', 'CORPS DU MESSAGE')</label>
                  <div style={{ position: 'relative' }}>
                    <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
                      placeholder={selectedTemplate?.id && selectedTemplate.id !== 'custom'
                        ? 'Laissez vide pour utiliser le template par defaut, ou personnalisez...'
                        : 'Redigez votre message ici...\n\nUtilisez {{variable}} pour les champs dynamiques.'}
                      rows={14}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8, fontFamily: 'inherit' }} />
                  </div>

                  {/* Variable chip bar */}
                  {selectedTemplate && selectedTemplate.variables.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO }}>INSERER:</span>
                      {selectedTemplate.variables.map(v => (
                        <span key={v} onClick={() => insertVar(v)}
                          style={{ fontSize: 10, background: `${tplColor) + '12', color: tplColor, border: `1px solid ${tplColor) + '25', borderRadius: 4, padding: '3px 8px', fontFamily: FONT_MONO, cursor: 'pointer' }}>
                          {'{{'}{v}{'}}'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 12, fontFamily: FONT_MONO }}>
                    APERCU — Rendu final avec les variables interpolees
                  </div>
                  <div style={{ border: '1px solid ' + BORDER, borderRadius: 8, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
                    <iframe
                      srcDoc={previewHtml}
                      style={{ width: '100%', height: 480, border: 'none', background: '#0D1117' }}
                      title="Apercu email"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Brand preview strip */}
            <div style={{ background: 'linear-gradient(135deg, #080B0F, #121920)', border: '1px solid rgba(0,255,148,0.2)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontFamily: FONT_MONO, marginBottom: 6 }}>BRANDING APPLIED</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,255,148,0.15)', border: '1px solid rgba(0,255,148,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    &#x2B21;
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>PANGEA CARBON Africa</div>
                    <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_MONO }}>contact@pangea-carbon.com</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['VERRA VCS', 'GOLD STANDARD', 'ARTICLE 6', 'CORSIA'].map(s => (
                  <span key={s} style={{ fontSize: 9, background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.25)', color: '#FCD34D', borderRadius: 3, padding: '2px 7px', fontFamily: FONT_MONO }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Send button */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={loadPreview} disabled={!subject || loadingPreview}
                style={{ background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 8, color: DIM, padding: '11px 20px', cursor: 'pointer', fontSize: 13 }}>
                {loadingPreview ? 'Loading...' : 'Apercu'}
              </button>
              <button onClick={sendEmail} disabled={sending || !to || !subject}
                style={{ background: (sending || !to || !subject) ? '#1E2D3D' : ACCENT, color: (sending || !to || !subject) ? DIM : BG, border: 'none', borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14, cursor: (sending || !to || !subject) ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                {sending ? 'Envoi...' : 'Envoyer l\'email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailComposerPage;
