// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function SettingsModal({onClose,darkMode,onToggleTheme}){
  const [pinataJwt,setPinataJwt]=useState(''||'');
  const [aiKey,setAiKey]=useState(localStorage.getItem('pmt_anthropic_key')||'');
  const [saved,setSaved]=useState(false);

  const save=()=>{
    if(pinataJwt.trim()) localStorage.setItem('pmt_pinata_jwt',pinataJwt.trim());
    if(aiKey.trim()) localStorage.setItem('pmt_anthropic_key',aiKey.trim());
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const Section=({icon,title,badge,children})=>(
    <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--accent)',fontWeight:700,letterSpacing:'1px'}}>{title}</span>
        {badge&&<span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--accent3)',background:'rgba(52,211,153,.12)',border:'1px solid rgba(52,211,153,.3)',borderRadius:4,padding:'1px 7px'}}>{badge}</span>}
      </div>
      {children}
    </div>
  );

  const Field=({label,value,onChange,placeholder,type='text'})=>(
    <div>
      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:5}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,
          padding:'9px 12px',color:'var(--text)',fontFamily:'var(--mono)',fontSize:11,outline:'none',
          boxSizing:'border-box'}}/>
    </div>
  );

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,
        padding:'24px 22px',width:340,maxHeight:'85vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16,
        animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>⚙️</span>
            <span style={{fontSize:17,fontWeight:700,color:'var(--text)'}}>Settings</span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
        </div>

        {/* Theme */}
        <Section icon={darkMode?'🌙':'☀️'} title="APPEARANCE">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:13,color:'var(--text)',fontWeight:500}}>{darkMode?'Dark Mode':'Light Mode'}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Switch between dark and light theme</div>
            </div>
            <button onClick={onToggleTheme}
              style={{width:52,height:28,borderRadius:14,border:'none',cursor:'pointer',position:'relative',
                background:darkMode?'var(--accent)':'var(--muted)',transition:'background .2s',flexShrink:0}}>
              <div style={{position:'absolute',top:3,left:darkMode?26:3,width:22,height:22,borderRadius:'50%',
                background:darkMode?'#000':'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            </button>
          </div>
        </Section>

        {/* AI Assistant */}
        <Section icon="🤖" title="AI ASSISTANT" badge="ACTIVE">
          <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.5}}>
            PMT AI Assistant is built-in. Add your own Anthropic API key to use your personal quota.
          </div>
          <Field label="ANTHROPIC API KEY (OPTIONAL)" value={aiKey} onChange={setAiKey}
            placeholder="sk-ant-api03-..." type="password"/>
          <div style={{fontSize:11,color:'var(--muted)'}}>
            Get a key at <a href="https://console.anthropic.com" target="_blank"
              style={{color:'var(--accent)',textDecoration:'none'}}>console.anthropic.com</a>
          </div>
        </Section>

        {/* Pinata */}
        <Section icon="📌" title="PINATA IPFS STORAGE" badge={true?'CONNECTED':null}>
          <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.5}}>
            Images, files and voice messages are stored on IPFS via Pinata — accessible from any device.
          </div>
          <Field label="PINATA JWT TOKEN (OPTIONAL)" value={pinataJwt} onChange={setPinataJwt}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." type="password"/>
          <div style={{fontSize:11,color:'var(--muted)'}}>
            Get your JWT at <a href="https://app.pinata.cloud" target="_blank"
              style={{color:'var(--accent)',textDecoration:'none'}}>app.pinata.cloud</a> → API Keys
          </div>
        </Section>

        {/* Save */}
        <button onClick={save}
          style={{width:'100%',padding:'12px',background:saved?'var(--accent3)':'var(--accent)',border:'none',
            borderRadius:10,color:saved?'#fff':'#000',fontWeight:700,fontSize:14,cursor:'pointer',
            transition:'background .2s',fontFamily:'var(--sans)'}}>
          {saved?'✓ Saved!':'Save Settings'}
        </button>
      </div>
    </div>
  );
}