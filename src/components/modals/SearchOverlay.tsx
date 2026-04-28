// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProfilePic from '../ui/ProfilePic';
import HighlightText from '../ui/HighlightText';

export default function SearchOverlay({contacts,msgs,onClose,onNavigate}){
  const [q,setQ]=useState('');
  const inputRef=useRef(null);
  useEffect(()=>inputRef.current?.focus(),[]);

  const results=q.trim().length<2?[]:(()=>{
    const out=[];
    const qLow=q.toLowerCase();
    contacts.forEach(c=>{
      (msgs[c.address]||[]).forEach(m=>{
        if(m.text&&m.text.toLowerCase().includes(qLow)){
          out.push({contact:c,msg:m});
        }
      });
    });
    return out.slice(0,50);
  })();

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',
      alignItems:'flex-start',justifyContent:'center',zIndex:300,paddingTop:40}}
      onClick={onClose}>
      <div className="modal-inner" style={{width:'100%',maxWidth:560,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,overflow:'hidden',animation:'slideUp .2s ease'}} onClick={e=>e.stopPropagation()}>
        {/* Search input */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 18px',
          borderBottom:'1px solid var(--border)'}}>
          <span style={{fontSize:16,color:'var(--muted)'}}>⌕</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search all messages..."
            style={{flex:1,background:'transparent',border:'none',outline:'none',
              color:'var(--text)',fontSize:14,fontFamily:'var(--sans)'}}
            onKeyDown={e=>e.key==='Escape'&&onClose()}/>
          <button onClick={onClose}
            style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,
              padding:'4px 10px',color:'var(--muted)',fontSize:11,cursor:'pointer',fontFamily:'var(--mono)'}}>
            ESC
          </button>
        </div>
        {/* Results */}
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {q.trim().length<2
            ? <div style={{padding:'28px',textAlign:'center',color:'var(--muted)',fontSize:12,fontFamily:'var(--mono)'}}>
                Type at least 2 characters to search
              </div>
            : results.length===0
            ? <div style={{padding:'28px',textAlign:'center',color:'var(--muted)',fontSize:12}}>
                No messages found for "{q}"
              </div>
            : results.map(({contact,msg},i)=>(
              <button key={msg.id} onClick={()=>{onNavigate(contact,msg.id,q);onClose();}}
                style={{width:'100%',display:'flex',alignItems:'flex-start',gap:10,padding:'12px 18px',
                  background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,.04)',
                  cursor:'pointer',textAlign:'left',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <ProfilePic initials={contact.avatar} avatarUrl={contact.avatarUrl}
                  color={contact.color} bg={contact.bg} size={32} fs={11}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{contact.name}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)'}}>{msg.time}</span>
                    {msg.out&&<span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--accent)',opacity:.7}}>you</span>}
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <HighlightText text={msg.text} query={q}/>
                  </div>
                </div>
              </button>
            ))
          }
        </div>
        {results.length>0&&(
          <div style={{padding:'8px 18px',borderTop:'1px solid var(--border)',
            fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)'}}>
            {results.length} result{results.length!==1?'s':''} found
          </div>
        )}
      </div>
    </div>
  );
}