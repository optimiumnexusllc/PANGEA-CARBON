'use client';
import { useEffect } from 'react';

type Variant = 'default' | 'danger' | 'warning' | 'success';
const V: Record<Variant, { bd: string; title: string; icon_bg: string }> = {
  default: { bd:'rgba(0,255,148,0.2)',  title:'#00FF94', icon_bg:'rgba(0,255,148,0.1)' },
  danger:  { bd:'rgba(248,113,113,0.3)',title:'#F87171', icon_bg:'rgba(248,113,113,0.1)' },
  warning: { bd:'rgba(252,211,77,0.25)',title:'#FCD34D', icon_bg:'rgba(252,211,77,0.1)' },
  success: { bd:'rgba(0,255,148,0.3)',  title:'#00FF94', icon_bg:'rgba(0,255,148,0.1)' },
};

interface DialogProps { open: boolean; onClose: () => void; title: string; subtitle?: string; icon?: string; variant?: Variant; children: React.ReactNode; maxWidth?: number; }

export function Dialog({ open, onClose, title, subtitle, icon, variant = 'default', children, maxWidth = 480 }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const v = V[variant];
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000, padding:16, backdropFilter:'blur(10px)' }}>
      <div style={{ background:'#0D1117', border:'1px solid ' + (v.bd), borderRadius:16, padding:28, width:'100%', maxWidth, boxShadow:'0 24px 80px rgba(0,0,0,0.7)', animation:'pgDlg .2s ease', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {icon && <div style={{ width:44, height:44, borderRadius:12, background:v.icon_bg, border:'1px solid ' + (v.bd), display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{icon}</div>}
            <div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:v.title, margin:0 }}>{title}</h2>
              {subtitle && <p style={{ fontSize:11, color:'#4A6278', margin:'4px 0 0', fontFamily:'JetBrains Mono, monospace' }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', cursor:'pointer', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>✕</button>
        </div>
        <div style={{ height:1, background:'linear-gradient(90deg,' + (v.bd) + ' 0%,transparent 100%)', marginBottom:20 }}/>
        {children}
      </div>
      <style>{`@keyframes pgDlg{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'warning'; loading?: boolean; }

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', variant = 'danger', loading = false }: ConfirmProps) {
  const fg = variant === 'danger' ? '#F87171' : '#FCD34D';
  const icon = variant === 'danger' ? '🗑' : '⚠';
  return (
    <Dialog open={open} onClose={onClose} title={title} variant={variant} icon={icon}>
      <p style={{ fontSize:14, color:'#8FA3B8', lineHeight:1.7, margin:'0 0 24px' }}>{message}</p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:11, cursor:'pointer', fontSize:13 }}>{cancelLabel}</button>
        <button onClick={onConfirm} disabled={loading}
          style={{ flex:1, background:loading?'#1E2D3D':fg+'15', border:`1px solid ${fg}40`, borderRadius:9, color:loading?'#4A6278':fg, padding:11, fontWeight:700, cursor:loading?'wait':'pointer', fontSize:13, fontFamily:'Syne, sans-serif' }}>
          {loading ? '⟳' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}