'use client';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: string; message: string; type: ToastType; }

let _listeners: Function[] = [];
let _queue: ToastItem[] = [];

export function toast(message: string, type: ToastType = 'success', duration = 4000) {
  const id = Math.random().toString(36).slice(2);
  _queue = [..._queue, { id, message, type }];
  _listeners.forEach(l => l([..._queue]));
  setTimeout(() => {
    _queue = _queue.filter(t => t.id !== id);
    _listeners.forEach(l => l([..._queue]));
  }, duration);
}
toast.success = (m: string) => toast(m, 'success');
toast.error   = (m: string) => toast(m, 'error');
toast.warning = (m: string) => toast(m, 'warning');
toast.info    = (m: string) => toast(m, 'info');

const CFG = {
  success: { bg:'rgba(0,255,148,0.08)',   bd:'rgba(0,255,148,0.3)',   fg:'#00FF94', icon:'✓', bar:'#00FF94' },
  error:   { bg:'rgba(248,113,113,0.08)', bd:'rgba(248,113,113,0.3)', fg:'#F87171', icon:'✗', bar:'#F87171' },
  warning: { bg:'rgba(252,211,77,0.08)',  bd:'rgba(252,211,77,0.3)',  fg:'#FCD34D', icon:'⚠', bar:'#FCD34D' },
  info:    { bg:'rgba(56,189,248,0.08)',  bd:'rgba(56,189,248,0.3)',  fg:'#38BDF8', icon:'ℹ', bar:'#38BDF8' },
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    _listeners.push(setToasts);
    return () => { _listeners = _listeners.filter(l => l !== setToasts); };
  }, []);
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:99999, display:'flex', flexDirection:'column', gap:10, maxWidth:420, pointerEvents:'none' }}>
      {toasts.map(t => {
        const c = CFG[t.type];
        return (
          <div key={t.id} style={{ background:c.bg, border:`1px solid ${c.bd}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'pgToastIn 0.25s ease', overflow:'hidden', position:'relative', pointerEvents:'auto' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:c.bar, borderRadius:'12px 0 0 12px' }}/>
            <div style={{ width:22, height:22, borderRadius:'50%', background:c.fg+'20', border:`1px solid ${c.bd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:c.fg, fontWeight:800, flexShrink:0, fontFamily:'JetBrains Mono, monospace', marginLeft:6 }}>{c.icon}</div>
            <div style={{ fontSize:13, color:'#E8EFF6', lineHeight:1.6, flex:1, fontFamily:'Inter, sans-serif' }}>{t.message}</div>
          </div>
        );
      })}
      <style>{`@keyframes pgToastIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
