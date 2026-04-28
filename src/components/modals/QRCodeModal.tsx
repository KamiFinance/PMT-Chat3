// @ts-nocheck
import React from 'react';
import QRInline from '../ui/QRInline';

export default function QRCodeModal({address, name, onClose}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,
        padding:'28px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:16,
        animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',letterSpacing:'1.5px'}}>
          RECEIVE PMT
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,boxShadow:'0 4px 24px rgba(0,0,0,.3)'}}>
          <QRInline address={address}/>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:6}}>{name}</div>
          <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',wordBreak:'break-all',
            maxWidth:260}}>{address}</div>
        </div>
        <button onClick={onClose} style={{padding:'10px 28px',background:'var(--surface)',
          border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',cursor:'pointer',fontSize:13}}>
          Close
        </button>
      </div>
    </div>
  );
}
