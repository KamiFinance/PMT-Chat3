// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function QRCodeModal({address,name,onClose}){
  const qrRef=useRef(null);
  useEffect(()=>{
    if(!qrRef.current||!address)return;
    // Clear previous
    qrRef.current.innerHTML='';
    const generate=()=>{
      if(!window.QRCode)return;
      new window.QRCode(qrRef.current,{
        text:address,
        width:200,
        height:200,
        colorDark:'#000000',
        colorLight:'#ffffff',
        correctLevel:window.QRCode.CorrectLevel.M,
      });
    };
    if(window.QRCode) generate();
    else{
      // Library not yet loaded — wait and retry
      const t=setInterval(()=>{if(window.QRCode){clearInterval(t);generate();}},100);
      return()=>clearInterval(t);
    }
  },[address]);

  const copy=()=>navigator.clipboard.writeText(address).catch(()=>{});

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div className="modal-inner" style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,
        padding:'28px 24px',width:300,display:'flex',flexDirection:'column',gap:16,alignItems:'center',
        animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
          <div style={{fontSize:16,fontWeight:600}}>My QR Code</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:20,cursor:'pointer'}}>×</button>
        </div>
        <div style={{background:'#fff',borderRadius:12,padding:12,display:'inline-block'}}>
          <div ref={qrRef}/>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{name||'My Wallet'}</div>
          <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',wordBreak:'break-all',
            background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px'}}>
            {address}
          </div>
        </div>
        <button onClick={copy}
          style={{width:'100%',padding:'10px',background:'var(--accent)',border:'none',borderRadius:9,
            color:'#0a0c14',fontWeight:600,fontSize:13,cursor:'pointer'}}>
          Copy Address
        </button>
      </div>
    </div>
  );
}
