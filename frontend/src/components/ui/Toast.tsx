'use client';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: string; msg: string; type: ToastType; }

let _L: Function[] = [];
let _Q: ToastItem[] = [];

export function showToast(msg: string, type: ToastType = 'success', ms = 4000) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  _Q = [..._Q, { id, msg, type }];
  _L.forEach(l => l([..._Q]));
  setTimeout(() => { _Q = _Q.filter(t => t.id !== id); _L.forEach(l => l([..._Q])); }, ms);
}

const CFG: Record<ToastType, { bg: string; bd: string; fg: string; bar: string; icon: string }> = {
  success: { bg:'rgba(0,255,148,0.08)',   bd:'rgba(0,255,148,0.3)',   fg:'#00FF94', bar:'#00FF94', icon:'✓' },
  error:   { bg:'rgba(248,113,113,0.08)', bd:'rgba(248,113,113,0.3)', fg:'#F87171', bar:'#F87171', icon:'✗' },
  warning: { bg:'rgba(252,211,77,0.08)',  bd:'rgba(252,211,77,0.3)',  fg:'#FCD34D', bar:'#FCD34D', icon:'⚠' },
  info:    { bg:'rgba(56,189,248,0.08)',  bd:'rgba(56,189,248,0.3)',  fg:'#38BDF8', bar:'#38BDF8', icon:'ℹ' },
};

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => { _L.push(setItems); return () => { _L = _L.filter(l => l !== setItems); }; }, []);
  if (!items.length) return null;
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:99999, display:'flex', flexDirection:'column', gap:10, maxWidth:420, pointerEvents:'none' }}>
      {items.map(t => {
        const c = CFG[t.type];
        return (
          <div key={t.id} style={{ background:c.bg, border:`1px solid ${c.bd}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden', animation:'pgIn .25s ease', pointerEvents:'auto' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:c.bar, borderRadius:'12px 0 0 12px' }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:c.fg+'20', border:`1px solid ${c.bd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:c.fg, fontWeight:800, flexShrink:0, marginLeft:8, fontFamily:'JetBrains Mono, monospace' }}>{c.icon}</div>
            <span style={{ fontSize:13, color:'#E8EFF6', flex:1, lineHeight:1.5 }}>{t.msg}</span>
          </div>
        );
      })}
      <style>{`@keyframes pgIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
