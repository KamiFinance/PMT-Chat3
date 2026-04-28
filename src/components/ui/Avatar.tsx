// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function Avatar({name,color,bg,online,size=38,fs=13}){
  return(
    <div style={{width:size,height:size,borderRadius:'50%',background:bg||'#1e2438',color:color||'var(--accent)',
      display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:fs,flexShrink:0,position:'relative'}}>
      {name}
      {online&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent3)',border:'2px solid var(--panel)',
        position:'absolute',bottom:0,right:0}}/>}
    </div>
  );
}