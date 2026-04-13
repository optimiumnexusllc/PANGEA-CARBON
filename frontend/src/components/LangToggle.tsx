'use client';
import { useLang } from '@/lib/lang-context';

export default function LangToggle({ style }) {
  const { lang, setLang } = useLang();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(30,45,61,0.6)', borderRadius: 6, padding: '3px 4px', border: '1px solid #1E2D3D', ...style }}>
      {['fr', 'en'].map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{ padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: lang === l ? 700 : 400, background: lang === l ? '#00FF94' : 'transparent', color: lang === l ? '#080B0F' : '#4A6278', transition: 'all 0.15s', letterSpacing: '0.05em' }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
