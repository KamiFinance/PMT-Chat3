// @ts-nocheck
import { currentBlock } from '../../lib/utils';
import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function BlockStrip({blockNum,className}){
  const [blocks,setBlocks]=useState(()=>
    Array.from({length:5},(_,i)=>({num:(blockNum||currentBlock())-i,txs:Math.floor(Math.random()*200)+50}))
  );
  useEffect(()=>{
    const id=setInterval(()=>setBlocks(p=>{
      const b={num:p[0].num+1,txs:Math.floor(Math.random()*200)+50};
      return[b,...p.slice(0,4)];
    }),12000);
    return()=>clearInterval(id);
  },[]);
  return(
    <div className={className} style={{background:'var(--panel)',borderTop:'1px solid var(--border)',padding:'5px 18px',
      display:'flex',alignItems:'center',gap:16,overflowX:'auto',flexShrink:0}}>
      {blocks.map((b,i)=>(
        <div key={b.num} style={{display:'flex',alignItems:'center',gap:5,fontFamily:'var(--mono)',fontSize:10,
          color:'var(--muted)',whiteSpace:'nowrap',flexShrink:0,opacity:i===0?1:Math.max(0.2,0.7-i*.15)}}>
          <span style={{color:'var(--accent)'}}>#{b.num.toLocaleString()}</span>
          <span style={{opacity:.4}}>·</span>
          <span>{b.txs} txs</span>
          {i===0&&<><span style={{opacity:.4}}>·</span><span>{(Math.random()*20+5).toFixed(1)} gwei</span></>}
        </div>
      ))}
    </div>
  );
}
