// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function HighlightText({text,query}){
  if(!query||!text)return text||null;
  const parts=text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'));
  return parts.map((p,i)=>
    p.toLowerCase()===query.toLowerCase()
      ? <mark key={i} style={{background:'var(--accent)',color:'#0a0c14',borderRadius:2,padding:'0 1px'}}>{p}</mark>
      : p
  );
}