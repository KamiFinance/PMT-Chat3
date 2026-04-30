// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PMTAuth } from '../../lib/auth';
import { loadCloudBackup } from '../../lib/cloudBackup';


export default function LoginScreen({onLogin,onBack}){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(false);

  // Check if there are saved accounts
  const savedAccounts=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith('pmt_account_')){
      try{const a=JSON.parse(localStorage.getItem(k));if(a.username)savedAccounts.push(a);}catch{}
    }
  }

  const login=async()=>{
    if(!username.trim())return setErr('Enter your username');
    if(!password)return setErr('Enter your password');
    setLoading(true);setErr(null);
    try{
      const key='pmt_account_'+username.trim().toLowerCase();
      const stored=localStorage.getItem(key);

      if(stored){
        // Fast path: local account exists
        const account=JSON.parse(stored);
        const ok=await PMTAuth.verifyPassword(password,account.passwordHash,account.passwordSalt);
        if(!ok)return setErr('Incorrect password. Please try again.');
        const walletData=await PMTAuth.decryptWallet(account.encryptedWallet,password);
        localStorage.setItem('pmt_session',JSON.stringify({username:account.username,address:account.address}));
        onLogin({address:walletData.address,privateKey:walletData.privateKey,
          balance:'0.0000',network:'PMT Chain',username:account.username,sessionPassword:password});
      } else {
        // Cloud restore: account not on this device — try IPFS backup
        setErr('Checking cloud backup…');
        const backup = await loadCloudBackup(username.trim(), password);
        if(!backup) return setErr('Account not found. Check your username or create a new wallet.');
        const { wallet: w, contacts, messages, profile } = backup;
        // Use the canonical salt from Redis so future backups produce the same passwordHash
        const canonicalSalt = (backup as any)._canonicalSalt;
        const canonicalHash = (backup as any)._passwordHash;
        const { hash: passwordHash, salt: passwordSalt } = canonicalSalt
          ? { hash: canonicalHash, salt: canonicalSalt }
          : await PMTAuth.hashPassword(password);
        const encryptedWallet = await PMTAuth.encryptWallet({ address: w.address, privateKey: w.privateKey ?? '' }, password);
        // Store under BOTH username key and address key for reliable lookup
        const acctData = { username: username.trim().toLowerCase(), address: w.address, passwordHash, passwordSalt, encryptedWallet };
        localStorage.setItem('pmt_account_'+username.trim().toLowerCase(), JSON.stringify(acctData));
        localStorage.setItem('pmt_account_'+w.address.toLowerCase(), JSON.stringify(acctData));
        localStorage.setItem('pmt_session', JSON.stringify({username: username.trim().toLowerCase(), address: w.address}));
        onLogin({ address: w.address, privateKey: w.privateKey ?? '', balance:'0.0000',
          network:'PMT Chain', username: username.trim().toLowerCase(),
          sessionPassword: password,
          restoredContacts: contacts ?? [],
          restoredMessages: messages ?? {},
          restoredProfile: profile ?? {} });
      }
    }catch(e){
      if(e.message==='WRONG_PASSWORD'||e.message?.includes('decrypt')||e.name==='OperationError')
        setErr('Incorrect password.');
      else setErr('Login failed: '+e.message);
    }finally{setLoading(false);}
  };

  return(
    <div style={{height:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',
      background:'var(--bg)',padding:'16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:400,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,padding:'24px 20px',display:'flex',flexDirection:'column',gap:18,
        marginTop:'auto',marginBottom:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={onBack}
            style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,
              width:32,height:32,color:'var(--muted)',cursor:'pointer',fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center'}}>Back</button>
          <div style={{fontSize:18,fontWeight:600}}>Welcome back</div>
        </div>

        <button onClick={onBack}
          style={{padding:'11px',background:'#faff63',border:'none',borderRadius:9,
            color:'#000000',fontWeight:600,fontSize:13.5,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h2a2 2 0 0 1 0 4h-2v-4z"/><path d="M2 10h20"/></svg>
          Connect Wallet Instead
        </button>

        {savedAccounts.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px'}}>YOUR ACCOUNTS</div>
            {savedAccounts.map(a=>(
              <button key={a.username} onClick={()=>setUsername(a.username)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                  background:username.toLowerCase()===a.username.toLowerCase()?'var(--surface2)':'var(--surface)',
                  border:'1px solid '+(username.toLowerCase()===a.username.toLowerCase()?'var(--accent)':'var(--border)'),
                  borderRadius:9,cursor:'pointer',textAlign:'left'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#0a0c14',fontWeight:700,fontSize:12,flexShrink:0}}>
                  {a.username.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{a.username}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)'}}>
                    {a.address.slice(0,8)}...{a.address.slice(-6)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:5}}>USERNAME</div>
          <input placeholder="Your username" value={username}
            onChange={e=>{setUsername(e.target.value);setErr(null);}}
            onKeyDown={e=>e.key==='Enter'&&login()}
            style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:9,padding:'10px 13px',color:'var(--text)',fontFamily:'var(--sans)',fontSize:14,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',letterSpacing:'1px',marginBottom:5}}>PASSWORD</div>
          <input type="password" placeholder="password" value={password}
            onChange={e=>{setPassword(e.target.value);setErr(null);}}
            onKeyDown={e=>e.key==='Enter'&&login()}
            style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:9,padding:'10px 13px',color:'var(--text)',fontFamily:'var(--sans)',fontSize:14,outline:'none'}}/>
        </div>
        {err&&(
          <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--danger)'}}>{err}</div>
        )}
        <button onClick={login} disabled={loading||!username||!password}
          style={{padding:'13px',background:'var(--accent)',border:'none',borderRadius:10,
            color:'#0a0c14',fontWeight:600,fontSize:14,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            opacity:loading||!username||!password?0.7:1}}>
          {loading
            ?<><span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0a0c14',
                borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>Unlocking...</>
            :'Log In'}
        </button>
        <div style={{textAlign:'center',fontSize:11,color:'var(--muted)',lineHeight:1.6}}>
          Forgot your password? Import your wallet using your seed phrase.
        </div>
      </div>
    </div>
  );
}
