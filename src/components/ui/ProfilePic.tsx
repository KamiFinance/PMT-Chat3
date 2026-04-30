// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function ProfilePic({avatarUrl,initials,color,bg,size=38,fs=13,online=false,onClick=undefined,style={}}){
  return(
    <div onClick={onClick} style={{width:size,height:size,borderRadius:'50%',background:bg||'#1e2438',...(style||{}),
      display:'flex',alignItems:'center',justifyContent:'center',
      fontWeight:600,fontSize:fs,flexShrink:0,position:'relative',overflow:'hidden'}}>
      {avatarUrl
        ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
        : <span style={{color:color||'var(--accent)'}}>{initials}</span>
      }
      {online&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent3)',
        border:'2px solid var(--panel)',position:'absolute',bottom:0,right:0}}/>}
    </div>
  );
}
