'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useEffect } from 'react';

export default function FloatingLangToggle() {
  const { lang, setLang } = useLang();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted || !isMobile) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'rgba(8,11,15,0.97)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,255,148,0.4)',
      borderRadius: 10,
      padding: '6px 8px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,255,148,0.1)',
    }}>
      <span style={{
        fontSize: 9, color: '#4A6278',
        fontFamily: 'JetBrains Mono, monospace',
        marginRight: 4, letterSpacing: '0.08em',
      }}>
        LANG
      </span>
      {(['en', 'fr'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            cursor: 'pointer', fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: lang === l ? 700 : 400,
            background: lang === l ? '#00FF94' : 'transparent',
            color: lang === l ? '#080B0F' : '#4A6278',
            transition: 'all 0.15s',
            letterSpacing: '0.05em',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
