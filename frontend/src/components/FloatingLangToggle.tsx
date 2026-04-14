'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useEffect } from 'react';

export default function FloatingLangToggle() {
  const { lang, setLang } = useLang();
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    // Show after 500ms to avoid flash
    setTimeout(() => setVisible(true), 500);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Only show on mobile (sidebar hidden)
  if (!visible || !isMobile) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'rgba(8,11,15,0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(0,255,148,0.3)',
      borderRadius: 10,
      padding: '5px 6px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      <span style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginRight: 4, letterSpacing: '0.06em' }}>LANG</span>
      {(['en', 'fr'] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
            fontWeight: lang === l ? 700 : 400,
            background: lang === l ? '#00FF94' : 'transparent',
            color: lang === l ? '#080B0F' : '#4A6278',
            transition: 'all 0.15s', letterSpacing: '0.08em',
          }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
