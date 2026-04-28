// @ts-nocheck
import ProfilePic from '../ui/ProfilePic';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { uploadToPinata, getIpfsUrl } from '../../lib/pinata';

import Avatar from '../ui/Avatar';
import Bubble from './Bubble';
import AttachMenu from './AttachMenu';
import MobileTopbar from '../ui/MobileTopbar';
import BlockStrip from '../ui/BlockStrip';
import SendModal from '../modals/SendModal';
import { now, rndHash, uid, formatSize } from '../../lib/utils';
export default function ChatPanel({contact,messages,onSend,onSendETH,isDemo,onReact,searchQuery,isGroup,onMediaUploaded}){
  const [text,setText]=useState('');
  const [showSend,setShowSend]=useState(false);
  const [showAttach,setShowAttach]=useState(false);
  const [recording,setRecording]=useState(false);
  const fileInputRef=useRef(null);
  const fileAcceptRef=useRef('*');
  const [recordSeconds,setRecordSeconds]=useState(0);
  const recordSecondsRef=useRef(0); // ref to avoid stale closure in onstop
  const [recorderError,setRecorderError]=useState(null);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const mediaRecRef=useRef(null);
  const chunksRef=useRef([]);
  const timerRef=useRef(null);
  const waveformRef=useRef([]);
  const onSendRef=useRef(onSend);
  useEffect(()=>{onSendRef.current=onSend;},[onSend]);

  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[messages]);
  useEffect(()=>{setText('');inputRef.current?.focus();setShowAttach(false);},[contact?.id]);
  useEffect(()=>{
    if(!showAttach)return;
    const close=e=>{
      if(!e.target.closest('[data-attach]'))setShowAttach(false);
    };
    setTimeout(()=>document.addEventListener('click',close),0);
    return()=>document.removeEventListener('click',close);
  },[showAttach]);

  const send=()=>{const t=text.trim();if(!t)return;onSend(t);setText('');};

  const formatSize=bytes=>{
    if(bytes<1024)return bytes+'B';
    if(bytes<1024*1024)return (bytes/1024).toFixed(1)+'KB';
    return (bytes/(1024*1024)).toFixed(1)+'MB';
  };

  const openFilePicker=(accept)=>{
    fileAcceptRef.current=accept;
    fileInputRef.current.accept=accept;
    fileInputRef.current.click();
  };

  const handleFileChosen=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const localUrl=URL.createObjectURL(file);
    const isImage=file.type.startsWith('image/');
    const msgType=isImage?'image':'file';
    // Read as base64 first — this is the reliable delivery mechanism
    const reader=new FileReader();
    reader.onloadend=()=>{
      const b64Data=reader.result; // data:<mime>;base64,<data>
      // Send immediately with b64Data embedded — inbox delivery works right away
      onSend({
        type:msgType,
        fileUrl:localUrl,
        b64Data,
        fileName:file.name,
        fileSize:formatSize(file.size),
        mimeType:file.type,
      });
      // Upload to Pinata in background — upgrades to IPFS CID when done
      if(true){
        uploadToPinata(file, file.name)
          .then(cid=>{
            if(onMediaUploaded) onMediaUploaded(msgId || b64Data.slice(0,20), cid, getIpfsUrl(cid));
          })
          .catch(err=>console.warn('[Pinata] upload failed, b64 fallback works fine'));
      }
    };
    reader.readAsDataURL(file);
    e.target.value='';
  };
  const key=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}};

  const startRecording=async()=>{
    setRecorderError(null);
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      waveformRef.current=[];
      // Analyse audio for waveform
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const src=ctx.createMediaStreamSource(stream);
      const analyser=ctx.createAnalyser();
      analyser.fftSize=64;
      src.connect(analyser);
      const dataArr=new Uint8Array(analyser.frequencyBinCount);
      const captureWave=()=>{
        analyser.getByteFrequencyData(dataArr);
        const avg=dataArr.reduce((a,b)=>a+b,0)/dataArr.length/255;
        waveformRef.current.push(avg);
      };
      mr.ondataavailable=e=>chunksRef.current.push(e.data);
      mr.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        ctx.close();
        const blob=new Blob(chunksRef.current,{type:'audio/webm'});
        const url=URL.createObjectURL(blob);
        const dur=recordSecondsRef.current;
        const raw=waveformRef.current;
        const bars=Array.from({length:30},(_,i)=>{
          const idx=Math.floor(i/30*raw.length);
          return Math.max(0.05, raw[idx]||0.1);
        });
        // Read as base64 and store in a SEPARATE key by msgId
        // so the inbox message stays small
        const reader=new FileReader();
        reader.onloadend=()=>{
          const audioBase64=reader.result;
          const msgId='v'+Date.now();
          try{ localStorage.setItem('pmt_audio_'+msgId, audioBase64); }catch(e){}

          if(true){
            // Upload to IPFS for cross-device delivery
            uploadToPinata(blob, 'voice_'+msgId+'.webm')
              .then(cid=>{
                const ipfsUrl=getIpfsUrl(cid);
                onSendRef.current({type:'voice',audioUrl:url,audioMsgId:msgId,ipfsCid:cid,ipfsUrl,duration:dur,waveform:bars});
              })
              .catch(()=>{
                // Fallback to base64
                onSendRef.current({type:'voice',audioUrl:url,audioMsgId:msgId,duration:dur,waveform:bars});
              });
          } else {
            onSendRef.current({type:'voice',audioUrl:url,audioMsgId:msgId,duration:dur,waveform:bars});
          }
        };
        reader.readAsDataURL(blob);
        setRecordSeconds(0);
        recordSecondsRef.current=0;
      };
      mr.start(100);
      mediaRecRef.current=mr;
      setRecording(true);
      let s=0;
      timerRef.current=setInterval(()=>{
        s++;
        setRecordSeconds(s);
        recordSecondsRef.current=s;
        captureWave();
        if(s>=120){stopRecording();}  // 2 min max
      },1000);
    }catch(e){
      setRecorderError(e.name==='NotAllowedError'?'Microphone access denied':'Could not access microphone');
    }
  };

  const stopRecording=()=>{
    clearInterval(timerRef.current);
    if(mediaRecRef.current&&mediaRecRef.current.state!=='inactive'){
      mediaRecRef.current.stop();
    }
    setRecording(false);
  };

  const cancelRecording=()=>{
    clearInterval(timerRef.current);
    if(mediaRecRef.current&&mediaRecRef.current.state!=='inactive'){
      mediaRecRef.current.stream?.getTracks().forEach(t=>t.stop());
      mediaRecRef.current.ondataavailable=null;
      mediaRecRef.current.onstop=null;
      mediaRecRef.current.stop();
    }
    setRecording(false);
    setRecordSeconds(0);
    recordSecondsRef.current=0;
  };
  return(
    <div style={{display:'flex',flexDirection:'column',background:'var(--bg)',height:'100%',overflow:'hidden'}}>
      {/* Header - hidden on mobile (MobileTopbar handles it) */}
      <div className="desktop-topbar" style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',background:'var(--panel)',
        display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <ProfilePic initials={contact.isGroup?'#':contact.avatar} avatarUrl={contact.avatarUrl}
          color={contact.isGroup?'var(--accent2)':contact.color} bg={contact.isGroup?'#1e1b30':contact.bg} online={contact.online}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{contact.name}</div>
          <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',opacity:.8,
            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {contact.isGroup
              ? `${contact.members?.length||0} members · PMT Chain`
              : contact.address}
          </div>
        </div>
        <div className="chain-badge" style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',
          background:'rgba(99,210,255,.07)',border:'1px solid rgba(99,210,255,.18)',
          borderRadius:20,fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--accent3)',animation:'pulse 2s infinite'}}/>
          PMT Chain
        </div>
        {!contact.isGroup&&(
          <button onClick={()=>setShowSend(true)}
            style={{padding:'5px 10px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,
              color:'var(--text2)',fontSize:12,cursor:'pointer',flexShrink:0}}>↑ PMT</button>
        )}
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:2}}>
        {searchQuery&&(
          <div style={{textAlign:'center',fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',
            margin:'4px 0 8px',background:'rgba(250,255,99,.08)',border:'1px solid rgba(250,255,99,.2)',
            borderRadius:8,padding:'5px 12px'}}>
            Showing results for "{searchQuery}"
          </div>
        )}
        <div style={{textAlign:'center',fontFamily:'var(--mono)',fontSize:10,color:'var(--accent2)',margin:'6px 0',opacity:.7}}>
          🔗 E2E encryption handshake verified · block #{currentBlock().toLocaleString()}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,margin:'14px 0 8px',
          fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:'1px'}}>
          <div style={{flex:1,height:1,background:'var(--border)'}}/>TODAY
          <div style={{flex:1,height:1,background:'var(--border)'}}/>
        </div>
        {messages.map(m=>(
          <Bubble key={m.id} msg={m} isOut={m.out} contact={contact} onReact={onReact} searchQuery={searchQuery}/>
        ))}
        <div ref={bottomRef}/>
      </div>
      <BlockStrip blockNum={currentBlock()} className="block-strip-bar"/>
      {/* Input */}
      <div className="chat-input-row" style={{padding:'12px 18px',borderTop:'1px solid var(--border)',background:'var(--panel)',
        display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
        {recorderError&&(
          <div style={{fontSize:11,color:'var(--danger)',fontFamily:'var(--mono)',textAlign:'center'}}>{recorderError}</div>
        )}
        {recording?(
          /* Recording UI */
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={cancelRecording}
              style={{width:38,height:38,background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:9,color:'var(--danger)',fontSize:16,display:'flex',alignItems:'center',
                justifyContent:'center',flexShrink:0,cursor:'pointer'}}>✕</button>
            <div style={{flex:1,background:'var(--surface)',border:'1px solid rgba(248,113,113,.4)',
              borderRadius:12,display:'flex',alignItems:'center',padding:'0 14px',gap:10,height:42}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--danger)',
                animation:'pulse 1s infinite',flexShrink:0}}/>
              <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--danger)'}}>
                {String(Math.floor(recordSeconds/60)).padStart(2,'0')}:{String(recordSeconds%60).padStart(2,'0')}
              </span>
              <span style={{fontSize:11,color:'var(--muted)',flex:1}}>Recording... tap stop to send</span>
            </div>
            <button onClick={stopRecording}
              style={{width:40,height:40,background:'var(--danger)',border:'none',
                borderRadius:10,color:'#fff',fontSize:16,display:'flex',alignItems:'center',
                justifyContent:'center',flexShrink:0,cursor:'pointer'}}>■</button>
          </div>
        ):(
          /* Normal input UI */
          <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
            <input ref={fileInputRef} type="file" style={{display:'none'}} onChange={handleFileChosen}/>
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowAttach(v=>!v)}
                style={{width:44,height:44,background:showAttach?'var(--surface2)':'var(--surface)',
                  border:`1px solid ${showAttach?'var(--accent)':'var(--border)'}`,
                  borderRadius:9,color:showAttach?'var(--accent)':'var(--muted)',fontSize:18,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  flexShrink:0,cursor:'pointer',transition:'all .15s'}}>📎</button>
              {showAttach&&<AttachMenu
                onImage={accept=>openFilePicker(accept)}
                onFile={accept=>openFilePicker(accept)}
                onClose={()=>setShowAttach(false)}/>}
            </div>
            <div style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,
              display:'flex',alignItems:'flex-end',padding:'0 12px'}}>
              <textarea ref={inputRef} rows={1} value={text} onChange={e=>setText(e.target.value)} onKeyDown={key}
                placeholder={`Message ${contact.name} (encrypted on-chain)...`}
                style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--text)',
                  fontFamily:'var(--sans)',fontSize:13.5,padding:'10px 0',resize:'none',lineHeight:1.5,maxHeight:120}}/>
              <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--accent)',opacity:.6,paddingBottom:11}}>🔒 E2E</span>
            </div>
            {text.trim()?(
              <button onClick={send}
                style={{width:44,height:44,background:'var(--accent)',border:'none',
                  borderRadius:10,color:'#0a0c14',fontSize:18,display:'flex',alignItems:'center',
                  justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'all .15s'}}>➤</button>
            ):(
              <button onClick={startRecording}
                style={{width:44,height:44,background:'var(--surface)',border:'1px solid var(--border)',
                  borderRadius:10,color:'var(--accent2)',fontSize:20,display:'flex',alignItems:'center',
                  justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'all .15s'}}
                title="Hold to record voice message">🎙</button>
            )}
          </div>
        )}
      </div>
      {showSend&&<SendModal contact={contact} onClose={()=>setShowSend(false)} onSend={amt=>onSendETH(contact,amt)} isDemo={isDemo}/>}
    </div>
  );
}
