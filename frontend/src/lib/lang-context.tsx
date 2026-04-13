'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './i18n';

const LangContext = createContext({ lang: 'fr', setLang: (l) => {}, t: (key) => key });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState('fr');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('pgc_lang');
    if (stored === 'en' || stored === 'fr') setLangState(stored);
  }, []);

  function setLang(l) {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('pgc_lang', l);
  }

  function t(key) {
    return (translations[lang] && translations[lang][key]) || (translations.fr && translations.fr[key]) || key;
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
