'use client';
import { useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  children: React.ReactNode;
  maxWidth?: number;
}

const VARIANTS = {
  default: { border:'rgba(0,255,148,0.2)',  title:'#00FF94', iconBg:'rgba(0,255,148,0.1)' },
  danger:  { border:'rgba(248,113,113,0.3)',title:'#F87171', iconBg:'rgba(248,113,113,0.1)' },
  warning: { border:'rgba(252,211,77,0.25)',title:'#FCD34D', iconBg:'rgba(252,211,77,0.1)' },
  success: { border:'rgba(0,255,148,0.3)',  title:'#00FF94', iconBg:'rgba(0,255,148,0.1)' },
};

export function Dialog({ open, onClose, title, subtitle, icon, variant='default', children, maxWidth=480 }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const v = VARIANTS[variant];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(8,11,15,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000, padding:16, backdropFilter:'blur(8px)' }}>
      <div ref={ref} style={{ background:'#0D1117', border:`1px solid ${v.border}`, borderRadius:16, padding:28, width:'100%', maxWidth, boxShadow:'0 24px 80px rgba(0,0,0,0.6)', animation:'pgDialogIn 0.2s ease', maxHeight:'90vh', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {icon && (
              <div style={{ width:44, height:44, borderRadius:12, background:v.iconBg, border:`1px solid ${v.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {icon}
              </div>
            )}
            <div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:v.title, margin:0, lineHeight:1.3 }}>{title}</h2>
              {subtitle && <p style={{ fontSize:12, color:'#4A6278', margin:'4px 0 0', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.04em' }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid #1E2D3D', borderRadius:8, color:'#4A6278', cursor:'pointer', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, transition:'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#4A6278')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2D3D')}>
            ✕
          </button>
        </div>
        {/* Separator */}
        <div style={{ height:1, background:'linear-gradient(90deg, #1E2D3D 0%, transparent 100%)', marginBottom:20 }}/>
        {children}
      </div>
      <style>{`@keyframes pgDialogIn{from{opacity:0;transform:scale(0.96)translateY(8px)}to{opacity:1;transform:scale(1)translateY(0)}}`}</style>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel='Confirmer', cancelLabel='Annuler', variant='danger', loading=false }: ConfirmDialogProps) {
  const colors = { danger: { btn:'#F87171', hover:'#ef4444' }, warning: { btn:'#FCD34D', hover:'#f59e0b' } };
  const c = colors[variant];
  return (
    <Dialog open={open} onClose={onClose} title={title} variant={variant}
      icon={variant==='danger' ? '🗑' : '⚠'}>
      <p style={{ fontSize:14, color:'#8FA3B8', lineHeight:1.7, margin:'0 0 24px' }}>{message}</p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, background:'transparent', border:'1px solid #1E2D3D', borderRadius:9, color:'#4A6278', padding:'11px', cursor:'pointer', fontSize:13, fontFamily:'Inter, sans-serif', transition:'all 0.15s' }}>
          {cancelLabel}
        </button>
        <button onClick={onConfirm} disabled={loading}
          style={{ flex:1, background:loading?'#1E2D3D':c.btn+'20', border:`1px solid ${c.btn}50`, borderRadius:9, color:loading?'#4A6278':c.btn, padding:'11px', cursor:loading?'wait':'pointer', fontSize:13, fontWeight:700, fontFamily:'Syne, sans-serif', transition:'all 0.15s' }}>
          {loading ? '⟳ ...' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
