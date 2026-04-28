// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function TxCard({msg,isOut}){
  return(
    <div style={{animation:'fadeIn .2s ease',background:'var(--surface)',border:'1px solid rgba(167,139,250,.25)',
      borderRadius:12,padding:'12px 16px',maxWidth:240,margin:'2px 0'}}>
      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1.5px',marginBottom:6}}>
        {isOut?'SENT':'RECEIVED'}
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:6}}>
        <span style={{fontFamily:'var(--mono)',fontSize:24,fontWeight:700,color:'var(--accent3)'}}>{msg.amount}</span>
        <span style={{fontSize:12,color:'var(--muted)'}}>{msg.coin||'PMT'}</span>
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',marginTop:6,display:'flex',gap:8,flexWrap:'wrap'}}>
        <span>{msg.time}</span>
        <span style={{color:'var(--accent2)'}}>{msg.hash?msg.hash.slice(0,8)+'...'+msg.hash.slice(-4):''}</span>
        <span style={{color:'var(--accent3)'}}>✓{msg.confirms}</span>
      </div>
    </div>
  );
}
