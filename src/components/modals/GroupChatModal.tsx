// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

import Avatar from '../ui/Avatar';
export default function GroupChatModal({contacts,onClose,onCreate}){
  const [name,setName]=useState('');
  const [selected,setSelected]=useState([]);
  const toggle=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div className="modal-inner" style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,padding:28,
        width:400,display:'flex',flexDirection:'column',gap:14,maxHeight:'80vh',animation:'slideUp .25s ease'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:17,fontWeight:600}}>New Group Chat</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:20,cursor:'pointer'}}>×</button>
        </div>
        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:5}}>GROUP NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. DeFi Team"
            style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:9,
              padding:'10px 13px',color:'var(--text)',fontFamily:'var(--sans)',fontSize:13.5,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:8}}>
            ADD MEMBERS ({selected.length} selected)
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,overflowY:'auto',maxHeight:220}}>
            {contacts.map(c=>(
              <button key={c.id} onClick={()=>toggle(c.id)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',
                  background:selected.includes(c.id)?'var(--surface2)':'var(--surface)',
                  border:`1px solid ${selected.includes(c.id)?'var(--accent)':'var(--border)'}`,
                  borderRadius:10,cursor:'pointer',textAlign:'left',transition:'all .15s'}}>
                <ProfilePic initials={c.avatar} avatarUrl={c.avatarUrl} color={c.color} bg={c.bg} size={32} fs={11}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{c.name}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)'}}>{c.address.slice(0,10)}...</div>
                </div>
                <div style={{width:18,height:18,borderRadius:'50%',
                  background:selected.includes(c.id)?'var(--accent)':'transparent',
                  border:`2px solid ${selected.includes(c.id)?'var(--accent)':'var(--border)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,color:'#0a0c14',fontWeight:700,flexShrink:0}}>
                  {selected.includes(c.id)?'✓':''}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button onClick={onClose}
            style={{flex:1,padding:10,background:'transparent',border:'1px solid var(--border)',
              borderRadius:9,color:'var(--text2)',fontSize:13.5,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>{
            if(!name.trim()||selected.length<2)return;
            const n=name.trim();
            onCreate({
              id:'g'+Date.now(),
              address:'group_'+Date.now(),
              name:n,
              avatar:n.slice(0,2).toUpperCase(),
              color:'#a78bfa',
              bg:'#1e1b30',
              online:false,
              isGroup:true,
              members:selected,
              preview:'Group created',
              unread:0,
            });
            onClose();
          }}
            disabled={!name.trim()||selected.length<2}
            style={{flex:2,padding:10,background:'var(--accent)',border:'none',borderRadius:9,
              color:'#0a0c14',fontWeight:600,fontSize:13.5,
              cursor:!name.trim()||selected.length<2?'default':'pointer',
              opacity:!name.trim()||selected.length<2?0.5:1}}>
            Create Group ({selected.length} members)
          </button>
        </div>
      </div>
    </div>
  );
}
