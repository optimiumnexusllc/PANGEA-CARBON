'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './i18n';

const LangContext = createContext({
  lang: 'en',
  setLang: (l) => {},
  t: (key) => key,
});

export function LangProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Lire la langue depuis localStorage au chargement
    const stored = localStorage.getItem('pgc_lang');
    if (stored === 'fr') setLangState('fr');
    else setLangState('en');

    // Écouter les changements depuis d'autres composants
    const handler = (e) => {
      if (e.key === 'pgc_lang' && (e.newValue === 'fr' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    const customHandler = (e) => {
      if (e.detail === 'fr' || e.detail === 'en') setLangState(e.detail);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('pgc-lang-change', customHandler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('pgc-lang-change', customHandler);
    };
  }, []);

  function setLang(l) {
    const safe = l === 'fr' ? 'fr' : 'en';
    setLangState(safe);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pgc_lang', safe);
      // Déclencher un event custom pour tous les composants sur la page
      window.dispatchEvent(new CustomEvent('pgc-lang-change', { detail: safe }));
      // Aussi l'event storage pour les autres onglets
      window.dispatchEvent(new StorageEvent('storage', { key: 'pgc_lang', newValue: safe }));
    }
  }

  function t(key) {
    return translations[lang]?.[key]
        || translations.en?.[key]
        || key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }
