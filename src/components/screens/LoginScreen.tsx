// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PMTAuth } from '../../lib/auth';
import { loadCloudBackup } from '../../lib/cloudBackup';
import { getWCProvider, resetWCProvider } from '../../lib/walletconnect';
import QRCode from 'qrcode';


// Inline QR canvas for WalletConnect URI
function WCQRCanvas({uri}){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    if(!uri||!ref.current)return;
    QRCode.toCanvas(ref.current,uri,{width:200,margin:2,color:{dark:'#000',light:'#fff'}}).catch(()=>{});
  },[uri]);
  return <div style={{background:'#fff',borderRadius:12,padding:10,display:'inline-block'}}><canvas ref={ref} style={{display:'block'}}/></div>;
}

export default function LoginScreen({onLogin,onBack}){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(false);
  // After password verified, hold wallet data here until wallet ownership confirmed
  const [pendingLogin,setPendingLogin]=useState(null);
  const [verifyStep,setVerifyStep]=useState(false);
  const [verifyErr,setVerifyErr]=useState(null);
  const [verifying,setVerifying]=useState(false);
  const [wcUri,setWcUri]=useState(null);

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
        // Password verified — now require wallet ownership confirmation
        setPendingLogin({address:walletData.address,privateKey:walletData.privateKey,
          balance:'0.0000',network:'PMT Chain',username:account.username,sessionPassword:password});
        setVerifyStep(true);
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
        setPendingLogin({ address: w.address, privateKey: w.privateKey ?? '', balance:'0.0000',
          network:'PMT Chain', username: username.trim().toLowerCase(),
          sessionPassword: password,
          restoredContacts: contacts ?? [],
          restoredMessages: messages ?? {},
          restoredProfile: profile ?? {} });
        setVerifyStep(true);
      }
    }catch(e){
      if(e.message==='WRONG_PASSWORD'||e.message?.includes('decrypt')||e.name==='OperationError')
        setErr('Incorrect password. Please try again.');
      else if(e.message==='NO_BACKUP')
        setErr('Account found but no backup saved yet. Log in on your other device first, then try here again.');
      else setErr('Login failed: '+e.message);
    }finally{setLoading(false);}
  };

  const connectAndVerify=async(provider,walletName)=>{
    setVerifying(true);setVerifyErr(null);
    try{
      // Get account silently first, prompt if needed
      let accounts=[];
      try{ accounts=await provider.request({method:'eth_accounts'}); }catch{}
      if(!accounts?.length) accounts=await provider.request({method:'eth_requestAccounts'});
      if(!accounts?.length) throw new Error('No accounts returned from wallet');
      const connected=(accounts[0]||'').toLowerCase();
      const expected=(pendingLogin.address||'').toLowerCase();
      if(connected!==expected){
        setVerifyErr(`Wrong wallet.\nExpected:  ${expected.slice(0,8)}...${expected.slice(-6)}\nConnected: ${connected.slice(0,8)}...${connected.slice(-6)}\n\nSwitch to the correct account.`);
        return;
      }
      // personal_sign ALWAYS opens wallet — proves private key ownership
      const msg=`PMT-Chat ownership verification\nAddress: ${connected}\nTime: ${Date.now()}`;
      const hex='0x'+Array.from(new TextEncoder().encode(msg)).map(b=>b.toString(16).padStart(2,'0')).join('');
      await provider.request({method:'personal_sign',params:[hex,connected]});
      onLogin(pendingLogin);
    }catch(e){
      if(e.code===4001||e.code==='ACTION_REJECTED') setVerifyErr('Signature rejected — please approve in your wallet.');
      else if(e.code===-32002) setVerifyErr('Wallet has a pending request — open your wallet and approve it.');
      else setVerifyErr('Verification failed: '+(e.message||String(e)));
    }finally{setVerifying(false);}
  };

  // Detect available wallets (EIP-6963 + legacy window.ethereum)
  const [detectedWallets,setDetectedWallets]=React.useState([]);
  React.useEffect(()=>{
    if(!verifyStep) return;
    const found=[];
    const onAnnounce=e=>{
      const{info,provider}=e.detail;
      if(!found.find(w=>w.uuid===info.uuid)){found.push({...info,provider});setDetectedWallets([...found]);}
    };
    window.addEventListener('eip6963:announceProvider',onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(()=>window.dispatchEvent(new Event('eip6963:requestProvider')),400);
    // Also add legacy window.ethereum if no EIP-6963 wallets found
    setTimeout(()=>{
      if(found.length===0&&window.ethereum){
        const name=window.ethereum.isMetaMask?'MetaMask':window.ethereum.isTrust?'Trust Wallet':'Wallet';
        setDetectedWallets([{uuid:'legacy',name,icon:null,provider:window.ethereum}]);
      }
    },600);
    return()=>window.removeEventListener('eip6963:announceProvider',onAnnounce);
  },[verifyStep]);

  // WalletConnect verify — shows QR code then checks address on connect
  const connectWCAndVerify=async()=>{
    setVerifying(true);setVerifyErr(null);setWcUri(null);
    try{
      resetWCProvider();
      const provider=await getWCProvider();
      provider.once('display_uri',(uri)=>{
        setWcUri(uri);   // shows QR modal
        setVerifying(false);
      });
      provider.connect().then(async()=>{
        setWcUri(null);
        const accounts=provider.accounts||[];
        if(!accounts.length){setVerifyErr('No accounts found.');resetWCProvider();return;}
        const connected=accounts[0].toLowerCase();
        const expected=(pendingLogin.address||'').toLowerCase();
        if(connected!==expected){
          setVerifyErr(`Wrong wallet.
Expected:  ${expected.slice(0,8)}...${expected.slice(-6)}
Connected: ${connected.slice(0,8)}...${connected.slice(-6)}

Switch to the correct account.`);
          resetWCProvider();return;
        }
        onLogin(pendingLogin);
      }).catch(e=>{
        setWcUri(null);setVerifying(false);resetWCProvider();
        const msg=e.message||String(e);
        if(!msg.includes('reset')&&!msg.includes('closed')&&!msg.includes('User rejected')){
          setVerifyErr('WalletConnect: '+msg);
        }
      });
    }catch(e){
      setVerifying(false);resetWCProvider();
      setVerifyErr('WalletConnect: '+(e.message||String(e)));
    }
  };

  // Wallet verification step
  if(verifyStep&&pendingLogin) return(
    <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
      background:'var(--bg)',padding:'16px'}}>
      <div style={{width:'100%',maxWidth:400,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,padding:'24px 20px',display:'flex',flexDirection:'column',gap:18}}>
        <div style={{fontSize:18,fontWeight:600}}>Confirm your wallet</div>
        <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
          Connect the wallet associated with this account to confirm ownership before logging in.
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,
          padding:'12px 14px',display:'flex',flexDirection:'column',gap:4}}>
          <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)',letterSpacing:'1px'}}>EXPECTED WALLET</div>
          <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--accent)',wordBreak:'break-all'}}>
            {pendingLogin.address}
          </div>
        </div>
        {verifyErr&&(
          <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--danger)',whiteSpace:'pre-line'}}>
            {verifyErr}
          </div>
        )}
        {/* Show detected wallet buttons */}
        {detectedWallets.length>0
          ? detectedWallets.map(w=>(
              <button key={w.uuid} onClick={()=>connectAndVerify(w.provider,w.name)} disabled={verifying}
                style={{padding:'13px',background:'var(--accent)',border:'none',borderRadius:10,
                  color:'#0a0c14',fontWeight:600,fontSize:14,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  opacity:verifying?0.7:1}}>
                {verifying
                  ?<><span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0a0c14',
                      borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>Connecting...</>
                  :<>🔐 Connect with {w.name}</>}
              </button>
            ))
          : <div style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'8px 0'}}>
              Waiting for wallet... Make sure MetaMask or another wallet is installed.
            </div>
        }
        <button onClick={connectWCAndVerify} disabled={verifying}
          style={{padding:'11px',background:'#2563eb',border:'1px solid #3b82f6',borderRadius:9,
            color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            opacity:verifying?0.7:1}}>
          <svg width="14" height="9" viewBox="0 0 40 25" fill="white"><path d="M8.19 4.78C14.72-1.59 25.28-1.59 31.81 4.78L32.6 5.55a.83.83 0 0 1 0 1.19l-2.85 2.77a.44.44 0 0 1-.61 0l-1.1-1.06c-4.5-4.35-11.78-4.35-16.28 0l-1.18 1.14a.44.44 0 0 1-.61 0L7.12 6.82a.83.83 0 0 1 0-1.19l1.07-.85zm29.32 5.47 2.54 2.46a.83.83 0 0 1 0 1.19L27.42 25.4a.87.87 0 0 1-1.22 0L17.7 17.2a.22.22 0 0 0-.31 0l-8.5 8.21a.87.87 0 0 1-1.22 0L.08 13.9a.83.83 0 0 1 0-1.19l2.54-2.46a.87.87 0 0 1 1.22 0l8.5 8.21a.22.22 0 0 0 .31 0l8.5-8.21a.87.87 0 0 1 1.22 0l8.5 8.21a.22.22 0 0 0 .31 0l8.5-8.21a.87.87 0 0 1 1.22 0z"/></svg>
          Verify with WalletConnect
        </button>
        <button onClick={()=>{setVerifyStep(false);setPendingLogin(null);setVerifyErr(null);setWcUri(null);}}
          style={{padding:'10px',background:'transparent',border:'1px solid var(--border)',
            borderRadius:9,color:'var(--muted)',cursor:'pointer',fontSize:13}}>
          ← Back to Login
        </button>
      </div>
      {/* WC QR modal */}
      {wcUri&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',
          justifyContent:'center',zIndex:400,padding:16}} onClick={()=>setWcUri(null)}>
          <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,
            padding:'24px 20px',width:'100%',maxWidth:340,display:'flex',flexDirection:'column',gap:14}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#3B99FC'}}/>
                <span style={{fontSize:15,fontWeight:600}}>WalletConnect</span>
              </div>
              <button onClick={()=>{setWcUri(null);resetWCProvider();}}
                style={{background:'none',border:'none',color:'var(--muted)',fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
              <WCQRCanvas uri={wcUri}/>
              <p style={{fontSize:12,color:'var(--text2)',textAlign:'center',lineHeight:1.5,margin:0}}>
                Scan with MetaMask, Trust, Coinbase or any WalletConnect wallet
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
