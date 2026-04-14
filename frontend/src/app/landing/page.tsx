'use client';
import { useLang } from '@/lib/lang-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /landing redirige vers la page d'accueil principale
export default function LandingRedirect() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return null;
}
