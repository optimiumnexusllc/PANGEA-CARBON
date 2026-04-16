'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/auth/login'); }, [router]);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#080B0F', color:'#4A6278', fontFamily:'JetBrains Mono, monospace', fontSize:13 }}>
      Redirecting...
    </div>
  );
}
