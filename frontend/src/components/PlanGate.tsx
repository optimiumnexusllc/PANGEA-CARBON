'use client';
import { useFeatureFlags, usePlanLimit, useUserContext, PLAN_METADATA } from '@/lib/features';

const PLAN_ORDER = { TRIAL:0, STARTER:1, GROWTH:2, ENTERPRISE:3 };

interface PlanGateProps {
  feature: string;
  requiredPlan?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PlanGate({ feature, requiredPlan = 'STARTER', children, fallback }: PlanGateProps) {
  const flags = useFeatureFlags();
  const { plan } = useUserContext();
  
  if (flags[feature]) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const meta = PLAN_METADATA[requiredPlan];
  
  return (
    <div style={{ padding:'40px 24px', textAlign:'center', background:'#0D1117', borderRadius:12, border:'1px solid #1E2D3D' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:9, color:meta.color, fontFamily:'JetBrains Mono, monospace', marginBottom:8 }}>
        {requiredPlan} PLAN REQUIRED
      </div>
      <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:18, color:'#E8EFF6', marginBottom:8 }}>
        Upgrade to {meta.name} to access this feature
      </h3>
      <p style={{ fontSize:13, color:'#4A6278', marginBottom:20, maxWidth:380, margin:'0 auto 20px' }}>
        {meta.description}
        <br/>
        <span style={{ color:meta.color }}>{meta.limits}</span>
      </p>
      <a href="/dashboard/settings"
        style={{ display:'inline-block', background:meta.color, color:'#080B0F', borderRadius:9, padding:'11px 24px', fontWeight:800, textDecoration:'none', fontFamily:'Syne, sans-serif', fontSize:14 }}>
        Upgrade to {meta.name} — {meta.price} →
      </a>
    </div>
  );
}

// Badge "Plan requis" pour la sidebar
export function PlanBadge({ plan }: { plan: string }) {
  const meta = PLAN_METADATA[plan] || PLAN_METADATA.STARTER;
  return (
    <span style={{ fontSize:8, padding:'1px 5px', borderRadius:3, background:`${meta.color}20`, color:meta.color, border:`1px solid ${meta.color}40`, fontFamily:'JetBrains Mono, monospace', marginLeft:4 }}>
      {plan}
    </span>
  );
}
