// @ts-nocheck
import React from 'react';

export default function AttachMenu({onImage, onFile, onClose}) {
  const btn = (icon, label, accept, cb) => (
    <button key={label} data-attach="true"
      onClick={e=>{e.stopPropagation();cb(accept);onClose();}}
      style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
        background:'transparent',border:'none',borderRadius:8,width:'100%',
        color:'var(--text)',fontSize:14,cursor:'pointer',textAlign:'left',
        transition:'background .12s'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <span style={{fontSize:18,width:24,textAlign:'center'}}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div data-attach="true" style={{position:'absolute',bottom:'100%',left:0,marginBottom:6,
      background:'var(--panel)',border:'1px solid var(--border)',
      borderRadius:12,padding:8,display:'flex',flexDirection:'column',gap:4,
      zIndex:200,boxShadow:'0 8px 32px rgba(0,0,0,.4)',minWidth:180}}>
      <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)',
        letterSpacing:'1px',padding:'4px 8px 6px'}}>ATTACH</div>
      {btn('🖼','Image / Photo','image/*',onImage)}
      {btn('📄','Document','.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar',onFile)}
      {btn('🎬','Video','video/*',onFile)}
      {btn('🎵','Audio File','audio/*',onFile)}
    </div>
  );
}
