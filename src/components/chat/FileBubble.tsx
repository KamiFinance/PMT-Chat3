// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getIpfsUrl } from '../../lib/pinata';
import ProfilePic from '../ui/ProfilePic';

import Avatar from '../ui/Avatar';
export default function FileBubble({msg,isOut,contact}){
  const ext=(msg.fileName||'').split('.').pop().toUpperCase().slice(0,4)||'FILE';
  // Reconstruct fileUrl from IPFS CID or stored data (survives logout)
  const [fileUrl,setFileUrl]=useState(msg.fileUrl||null);
  useEffect(()=>{
    if(fileUrl)return;
    if(msg.ipfsCid){setFileUrl(getIpfsUrl(msg.ipfsCid)||('https://gateway.pinata.cloud/ipfs/'+msg.ipfsCid));return;}
    if(msg.b64Data){setFileUrl(msg.b64Data);return;}
    if(msg.b64Fallback){setFileUrl(msg.b64Fallback);return;}
    if(msg.imgData){setFileUrl(msg.imgData);return;}
    const sk=msg.mediaMsgId?'pmt_media_'+msg.mediaMsgId:msg.imgMsgId?'pmt_media_'+msg.imgMsgId:null;
    if(sk){try{const s=localStorage.getItem(sk)||localStorage.getItem(sk.replace('pmt_media_','pmt_img_'));if(s){try{const p=JSON.parse(s);setFileUrl(p.ipfsUrl||(p.cid?getIpfsUrl(p.cid):null)||s);}catch{setFileUrl(s);}}}catch{}}
  },[msg.mediaMsgId,msg.imgMsgId,msg.ipfsCid,msg.b64Data,msg.b64Fallback]);
  const extColors={
    PDF:'#f87171',DOC:'#60a5fa',DOCX:'#60a5fa',XLS:'#34d399',XLSX:'#34d399',
    ZIP:'#f59e0b',RAR:'#f59e0b',MP4:'#a78bfa',MP3:'#a78bfa',TXT:'#9ca3af',
  };
  const color=extColors[ext]||'var(--accent)';
  const bubbleStyle=isOut
    ?{background:'#1a2a4a',border:'1px solid rgba(99,210,255,.15)',borderBottomRightRadius:4}
    :{background:'var(--surface2)',border:'1px solid var(--border)',borderBottomLeftRadius:4};
  const download=()=>{
    if(!fileUrl){alert('File still uploading or not available');return;}
    const a=document.createElement('a');
    a.href=fileUrl;a.download=msg.fileName||'file';a.click();
  };
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:3,
      flexDirection:isOut?'row-reverse':'row',animation:'fadeIn .2s ease'}}>
      {!isOut&&<ProfilePic initials={contact?.avatar} avatarUrl={contact?.avatarUrl}
        color={contact?.color} bg={contact?.bg} size={26} fs={10}/>}
      <div style={{maxWidth:'72%'}}>
        <div style={{...bubbleStyle,borderRadius:14,padding:'10px 14px',
          display:'flex',alignItems:'center',gap:12,cursor:'pointer',minWidth:200}}
          onClick={download}>
          {/* File icon */}
          <div style={{width:42,height:42,borderRadius:10,background:`${color}20`,
            border:`1px solid ${color}40`,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',flexShrink:0,gap:1}}>
            <span style={{fontSize:9,fontFamily:'var(--mono)',color,fontWeight:700,letterSpacing:.5}}>{ext}</span>
            <span style={{fontSize:16}}>📄</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',
              textOverflow:'ellipsis',color:'var(--text)'}}>{msg.fileName||'file'}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{msg.fileSize} · tap to download</div>
          </div>
          <div style={{fontSize:18,color:'var(--muted)',flexShrink:0}}>↓</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,flexWrap:'wrap',paddingLeft:4}}>
          <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)'}}>{msg.time}</span>
          <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--accent2)',opacity:.7}}>{msg.hash?msg.hash.slice(0,8)+'...'+msg.hash.slice(-4):''}</span>
          <span style={{fontFamily:'var(--mono)',fontSize:9,
            color:msg.confirms===0?'var(--muted)':msg.confirms<6?'var(--accent)':'var(--accent3)'}}>
            {msg.pending?'⏳':('✓'+(msg.confirms||0))}
          </span>
        </div>
      </div>
    </div>
  );
}
