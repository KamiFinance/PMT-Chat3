// @ts-nocheck
import { REACTION_EMOJIS } from '../../constants/ai';
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function ReactionPicker({onPick,onClose,isOut}){
  return(
    <div style={{position:'absolute',bottom:'calc(100% + 6px)',
      ...(isOut?{right:0}:{left:0}),
      background:'var(--panel)',border:'1px solid var(--border)',borderRadius:24,
      padding:'6px 10px',display:'flex',gap:6,zIndex:200,
      boxShadow:'0 8px 24px rgba(0,0,0,.5)',animation:'fadeIn .12s ease'}}>
      {REACTION_EMOJIS.map(e=>(
        <button key={e} onClick={(ev)=>{ev.stopPropagation();onPick(e);onClose();}}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:22,
            padding:'4px 5px',borderRadius:8,transition:'transform .1s',
            minWidth:36,minHeight:36,display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseEnter={ev=>ev.currentTarget.style.transform='scale(1.3)'}
          onMouseLeave={ev=>ev.currentTarget.style.transform='scale(1)'}>
          {e}
        </button>
      ))}
    </div>
  );
}
