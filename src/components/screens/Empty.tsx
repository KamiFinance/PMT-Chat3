// @ts-nocheck
import React from 'react';

export default function Empty({onNew, onOpenSidebar}) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {/* Mobile topbar — only visible on mobile via CSS */}
      <div className="mobile-topbar" style={{display:'none',alignItems:'center',gap:10,
        padding:'10px 14px',background:'var(--panel)',borderBottom:'1px solid var(--border)',
        flexShrink:0,minHeight:54,zIndex:10}}>
        <button onClick={onOpenSidebar}
          style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,
            color:'var(--text)',fontSize:20,cursor:'pointer',padding:'6px 11px',
            lineHeight:1,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          ☰
        </button>
        <img src="/pmt-logo.png" style={{width:30,height:30,borderRadius:8,objectFit:'cover'}} alt="PM"/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>PMT-Chat</div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--accent)'}}>SELECT A CHAT</div>
        </div>
        <button onClick={onNew}
          style={{background:'var(--accent)',border:'none',borderRadius:8,color:'#000',
            fontWeight:700,fontSize:14,cursor:'pointer',padding:'7px 14px',whiteSpace:'nowrap'}}>
          + New
        </button>
      </div>

      {/* Center content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
        justifyContent:'center',gap:14,padding:40}}>
        <img src="/pmt-logo.png" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover'}} alt="PM"/>
        <div style={{fontSize:20,fontWeight:600}}>Select a conversation</div>
        <div style={{fontSize:13.5,color:'var(--text2)',textAlign:'center'}}>
          All messages are end-to-end encrypted on PMT Chain
        </div>

        {/* Desktop: New Chat button */}
        <button onClick={onNew} className="desktop-only-btn"
          style={{marginTop:8,padding:'12px 28px',background:'var(--accent)',border:'none',
            borderRadius:10,color:'#0a0c14',fontWeight:600,fontSize:14,cursor:'pointer'}}>
          + New Chat
        </button>

        {/* Mobile: Open contacts button */}
        <button onClick={onOpenSidebar} className="mobile-only-btn"
          style={{marginTop:8,padding:'12px 28px',background:'var(--surface)',
            border:'1px solid var(--border)',borderRadius:10,color:'var(--text)',
            fontWeight:600,fontSize:14,cursor:'pointer',display:'none'}}>
          ☰ Open Contacts
        </button>
      </div>
    </div>
  );
}
