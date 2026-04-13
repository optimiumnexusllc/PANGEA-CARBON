'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /landing redirige vers la page d'accueil principale
export default function LandingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return null;
}
