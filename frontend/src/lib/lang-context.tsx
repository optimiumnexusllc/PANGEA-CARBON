'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Lang } from './i18n';
import { t as translate, TranslationKey } from './i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangCtx>({ lang: 'fr', setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('pgc_lang') as Lang : null;
    if (stored === 'en' || stored === 'fr') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('pgc_lang', l);
  };

  const t = (key: TranslationKey) => translate(lang, key);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
