// @ts-nocheck
import React, { useState } from 'react';
import { useApp } from '../../lib/context';

export default function SendModal({contact, onClose, onSend, isDemo}) {
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const send = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return setErr('Enter a valid amount');
    if (isDemo) {
      setSending(true);
      await new Promise(r => setTimeout(r, 800));
      setSending(false);
      setDone(true);
      setTimeout(() => { onSend(amount); onClose(); }, 1200);
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      onSend(amount);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch(e) {
      setErr(e.message || 'Transaction failed');
      setSending(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,
        padding:'24px 22px',width:320,display:'flex',flexDirection:'column',gap:16,
        animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:16,fontWeight:700}}>Send PMT</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',
            fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,
          padding:'10px 14px',fontSize:12,color:'var(--text2)'}}>
          To: <span style={{color:'var(--accent)',fontFamily:'var(--mono)'}}>{contact.name}</span>
        </div>
        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',
            letterSpacing:'1px',marginBottom:6}}>AMOUNT (PMT)</div>
          <input type="number" min="0" step="0.001" placeholder="0.000"
            value={amount} onChange={e=>{setAmount(e.target.value);setErr(null);}}
            style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:9,padding:'11px 14px',color:'var(--text)',fontSize:16,
              fontFamily:'var(--mono)',outline:'none'}}/>
        </div>
        {err && <div style={{fontSize:12,color:'var(--danger)'}}>{err}</div>}
        <button onClick={send} disabled={sending||done||!amount}
          style={{padding:'13px',background:done?'var(--accent3)':sending?'rgba(250,255,99,.5)':'var(--accent)',
            border:'none',borderRadius:10,color:'#000',fontWeight:700,fontSize:14,
            cursor:sending||done?'default':'pointer',display:'flex',
            alignItems:'center',justifyContent:'center',gap:8}}>
          {done ? '✓ Sent!' : sending
            ? <><span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',
                borderTopColor:'#0a0c14',borderRadius:'50%',display:'inline-block',
                animation:'spin .7s linear infinite'}}/>Sending...</>
            : '↑ Send PMT'}
        </button>
      </div>
    </div>
  );
}
