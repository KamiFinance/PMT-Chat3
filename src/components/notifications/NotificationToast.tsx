// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function NotificationToast({notifs,onDismiss,onSelect}){
  return(
    <div className="notif-wrap" style={{position:'fixed',top:16,right:16,zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
      {notifs.map(n=>(
        <div key={n.id} className="notif-item" style={{background:'var(--panel)',border:'1px solid var(--border)',
          borderRadius:12,padding:'12px 16px',minWidth:260,maxWidth:320,
          boxShadow:'0 8px 32px rgba(0,0,0,.5)',pointerEvents:'all',
          animation:`${n.leaving?'notifOut':'notifSlide'} .3s ease forwards`,
          display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer'}}
          onClick={()=>{onDismiss(n.id);if(n.contact&&onSelect)onSelect(n.contact);}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:n.contact?.bg||'#1e2438',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:600,fontSize:12,color:n.contact?.color||'var(--accent)',flexShrink:0}}>
            {n.contact?.avatar||'?'}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:2}}>{n.contact?.name||'New Message'}</div>
            <div style={{fontSize:11,color:'var(--text2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.preview}</div>
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',flexShrink:0}}>{n.time}</div>
        </div>
      ))}
    </div>
  );
}