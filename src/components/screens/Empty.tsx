// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function Empty({onNew, onOpenSidebar}){
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:14,padding:40,background:'var(--bg)'}}>
      <img src={'/pmt-logo.png'} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover'}} alt="PMT"/>
      <div style={{fontSize:20,fontWeight:600}}>Select a conversation</div>
      <div style={{fontSize:13.5,color:'var(--text2)',textAlign:'center'}}>All messages are end-to-end encrypted on PMT Chain</div>
      <button onClick={onNew}
        style={{marginTop:8,padding:'12px 28px',background:'var(--accent)',border:'none',borderRadius:10,
          color:'#0a0c14',fontWeight:600,fontSize:14,cursor:'pointer'}}>
        + New Chat
      </button>
    </div>
  );
}
