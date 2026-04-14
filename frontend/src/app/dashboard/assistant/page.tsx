'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });

type Message = { role: 'user' | 'assistant'; content: string; };

export default function AssistantPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const welcomeMsg = lang === 'fr'
    ? '🌍 Bonjour ! Je suis l\'Assistant MRV PANGEA CARBON, propulsé par Claude (Anthropic).\n\nJe peux analyser vos données carbone, expliquer la méthodologie ACM0002, optimiser votre portfolio, ou répondre à toute question sur les marchés carbone africains.\n\nQue puis-je faire pour vous ?'
    : '🌍 Hello! I am the PANGEA CARBON MRV Assistant, powered by Claude (Anthropic).\n\nI can analyze your carbon data, explain the ACM0002 methodology, optimize your portfolio, or answer any question about African carbon markets.\n\nHow can I help you?';
  const [messages, setMessages] = useState([
    { role: 'assistant', content: welcomeMsg }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/assistant/suggestions`, { headers: h() })
      .then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {});
    api.getProjects().then(d => setProjects(d.projects || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMessage: Message = { role: 'user', content: msg };
    const history = [...messages, userMessage];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch(`${API}/assistant/chat`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({
          message: msg,
          projectId: selectedProject || undefined,
          conversationHistory: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages([...history, { role: 'assistant', content: data.reply || 'Désolé, une erreur est survenue.' }]);
    } catch(_e) {
      setMessages([...history, { role: 'assistant', content: 'Erreur de connexion. Vérifiez votre connexion et réessayez.' }]);
    } finally { setLoading(false); }
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ fontWeight: 600, color: '#E8EFF6', marginTop: 8 }}>{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={i} style={{ display: 'flex', gap: 6, marginTop: 3 }}><span style={{ color: '#00FF94', flexShrink: 0 }}>·</span><span>{line.slice(2)}</span></div>;
      }
      return <div key={i} style={{ marginTop: line ? 4 : 8 }}>{line || ''}</div>;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1E2D3D', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(252,211,77,0.15)', border: '1px solid rgba(252,211,77,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EFF6', fontFamily: 'Syne, sans-serif' }}>Assistant MRV IA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00FF94', animation: 'pulse 2s infinite' }}/>
              <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>Claude by Anthropic · Verra ACM0002</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 10 }}>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, color: '#8FA3B8', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            <option value="">Portfolio global</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setMessages([{ role: 'assistant', content: '🌍 Nouvelle conversation démarrée. Comment puis-je vous aider ?' }])}
            style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 6, color: '#4A6278', padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>
            Effacer
          </button>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              background: msg.role === 'user' ? 'rgba(0,255,148,0.15)' : 'rgba(252,211,77,0.15)',
              border: msg.role === 'user' ? '1px solid rgba(0,255,148,0.3)' : '1px solid rgba(252,211,77,0.3)' }}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div style={{ maxWidth: '75%', padding: '12px 14px', borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
              background: msg.role === 'user' ? 'rgba(0,255,148,0.08)' : '#121920',
              border: msg.role === 'user' ? '1px solid rgba(0,255,148,0.15)' : '1px solid #1E2D3D',
              fontSize: 13, color: '#8FA3B8', lineHeight: 1.7 }}>
              {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(252,211,77,0.15)', border: '1px solid rgba(252,211,77,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🤖</div>
            <div style={{ padding: '14px', background: '#121920', border: '1px solid #1E2D3D', borderRadius: '2px 12px 12px 12px', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#FCD34D', animation: `bounce 1s ${d * 0.15}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length < 3 && (
        <div style={{ padding: '0 24px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {suggestions.slice(0, 4).map((s: any) => (
            <button key={s.text} onClick={() => send(s.text)}
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 16, padding: '5px 12px', color: '#8FA3B8', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {s.text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 24px 16px', borderTop: '1px solid #1E2D3D', background: '#0D1117', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, background: '#121920', border: '1px solid #1E2D3D', borderRadius: 10, padding: '8px 12px',
          outline: 'none', transition: 'border-color 0.2s' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,255,148,0.3)')}
          onBlur={e => (e.currentTarget.style.borderColor = '#1E2D3D')}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Posez votre question sur le MRV, vos crédits carbone, la méthodologie ACM0002..."
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#E8EFF6', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}/>
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end',
              background: input.trim() && !loading ? '#00FF94' : '#1E2D3D',
              color: input.trim() && !loading ? '#080B0F' : '#4A6278', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#2A3F55', textAlign: 'center', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
          Claude by Anthropic · {L('Your data stays private', 'Vos données restent privées')} · {L('Shift+Enter for new line', 'Shift+Entrée pour saut de ligne')}
        </div>
      </div>
    </div>
  );
}
