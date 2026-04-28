// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function NewChatModal({onClose,onAdd}){
  const [addr,setAddr]=useState('');const[name,setName]=useState('');const[err,setErr]=useState(null);
  const go=()=>{
    const t=addr.trim();
    if(!t)return setErr('Enter an address or ENS name');
    onAdd({address:t,name:name.trim()||t});onClose();
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}
      onClick={onClose}>
      <div className="modal-inner" style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:16,padding:28,width:360,
        display:'flex',flexDirection:'column',gap:10}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:600}}>New Chat</div>
        <p style={{fontSize:12.5,color:'var(--text2)'}}>Start an encrypted conversation on PMT Chain</p>
        {[['Wallet address or ENS','0x... or vitalik.eth',addr,setAddr,true],
          ['Nickname (optional)','e.g. Alice',name,setName,false]].map(([lbl,ph,val,set,af])=>(
          <div key={lbl}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:4}}>{lbl}</div>
            <input placeholder={ph} value={val} onChange={e=>{set(e.target.value);setErr(null)}}
              autoFocus={af} onKeyDown={e=>e.key==='Enter'&&go()}
              style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 13px',
                color:'var(--text)',fontFamily:'var(--mono)',fontSize:12.5,outline:'none',width:'100%'}}/>
          </div>
        ))}
        {err&&<div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:8,
          padding:'8px 12px',fontSize:12,color:'var(--danger)'}}>{err}</div>}
        <div style={{display:'flex',gap:10,marginTop:6}}>
          <button onClick={onClose} style={{flex:1,padding:10,background:'transparent',border:'1px solid var(--border)',
            borderRadius:9,color:'var(--text2)',fontSize:13.5,cursor:'pointer'}}>Cancel</button>
          <button onClick={go} style={{flex:2,padding:10,background:'var(--accent)',border:'none',borderRadius:9,
            color:'#0a0c14',fontWeight:600,fontSize:13.5,cursor:'pointer'}}>Start Chat</button>
        </div>
      </div>
    </div>
  );
}