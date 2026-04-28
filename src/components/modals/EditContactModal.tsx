// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

import Avatar from '../ui/Avatar';
export default function EditContactModal({contact,onClose,onSave,onDelete}){
  const [name,setName]=useState(contact.name||'');
  const [address,setAddress]=useState(contact.address||'');
  const [confirmDel,setConfirmDel]=useState(false);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div className="modal-inner" style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,padding:28,
        width:380,display:'flex',flexDirection:'column',gap:16,animation:'slideUp .25s ease'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:17,fontWeight:600}}>Edit Contact</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:20,cursor:'pointer'}}>×</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <div style={{width:68,height:68,borderRadius:'50%',background:contact.bg||'#1e2438',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:22,fontWeight:700,color:contact.color||'var(--accent)'}}>
            {(name||contact.avatar||'?').slice(0,2).toUpperCase()}
          </div>
        </div>
        {[['DISPLAY NAME',name,setName,'e.g. Alice or alice.eth'],
          ['WALLET ADDRESS',address,setAddress,'0x...']].map(([lbl,val,set,ph])=>(
          <div key={lbl}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:5}}>{lbl}</div>
            <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
              style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:9,
                padding:'10px 13px',color:'var(--text)',fontFamily:'var(--sans)',fontSize:13.5,outline:'none'}}/>
          </div>
        ))}
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button onClick={onClose}
            style={{flex:1,padding:10,background:'transparent',border:'1px solid var(--border)',
              borderRadius:9,color:'var(--text2)',fontSize:13.5,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onSave({name:name.trim()||contact.name,address:address.trim()||contact.address})}
            style={{flex:2,padding:10,background:'var(--accent)',border:'none',
              borderRadius:9,color:'#0a0c14',fontWeight:600,fontSize:13.5,cursor:'pointer'}}>Save</button>
        </div>
        {!confirmDel
          ? <button onClick={()=>setConfirmDel(true)}
              style={{padding:9,background:'transparent',border:'1px solid rgba(248,113,113,.3)',
                borderRadius:9,color:'var(--danger)',fontSize:12.5,cursor:'pointer'}}>
              Delete Contact
            </button>
          : <div style={{display:'flex',gap:8}}>
              <span style={{flex:1,fontSize:12,color:'var(--text2)',alignSelf:'center'}}>Remove {contact.name}?</span>
              <button onClick={()=>setConfirmDel(false)}
                style={{padding:'7px 14px',background:'var(--surface)',border:'1px solid var(--border)',
                  borderRadius:8,color:'var(--text2)',fontSize:12,cursor:'pointer'}}>No</button>
              <button onClick={()=>{onDelete(contact.id);onClose();}}
                style={{padding:'7px 14px',background:'var(--danger)',border:'none',
                  borderRadius:8,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>Yes, Delete</button>
            </div>
        }
      </div>
    </div>
  );
}
