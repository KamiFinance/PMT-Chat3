// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function AttachMenu({ onImage, onFile, onClose, anchorRect }) {
  // Render into document.body via portal — escapes overflow:hidden on ChatPanel
  const style = anchorRect ? {
    position: 'fixed',
    bottom: window.innerHeight - anchorRect.top + 6,
    left: anchorRect.left,
  } : {
    position: 'fixed',
    bottom: 120,
    left: 60,
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-attach-menu]')) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btn = (icon, label, accept, cb) => (
    <button key={label}
      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); cb(accept); onClose(); }}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
        background:'transparent', border:'none', borderRadius:8, width:'100%',
        color:'var(--text)', fontSize:14, cursor:'pointer', textAlign:'left' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span style={{ fontSize:18, width:24, textAlign:'center' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return createPortal(
    <div data-attach-menu="true" style={{
      ...style,
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
      zIndex: 99999, boxShadow: '0 8px 32px rgba(0,0,0,.4)', minWidth: 180,
    }}>
      <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--mono)',
        letterSpacing:'1px', padding:'4px 8px 6px' }}>ATTACH</div>
      {btn('🖼', 'Image / Photo', 'image/*', onImage)}
      {btn('📄', 'Document', '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar', onFile)}
      {btn('🎬', 'Video', 'video/*', onFile)}
      {btn('🎵', 'Audio File', 'audio/*', onFile)}
    </div>,
    document.body
  );
}
