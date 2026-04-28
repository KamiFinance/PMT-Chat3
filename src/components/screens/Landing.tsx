// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
declare global { interface Window { __eip6963Providers?: any[]; ethereum?: any; } }

export default function Landing({onDemo,onMetaMask,onCreateWallet,onImportWallet,onLogin}){
  const [connecting,setConnecting]=useState(false);
  const [err,setErr]=useState(null);
  const [hasProvider,setHasProvider]=useState(!!window.ethereum);

  useEffect(()=>{
    if(window.ethereum){setHasProvider(true);return;}
    const onInit=()=>setHasProvider(true);
    window.addEventListener('ethereum#initialized',onInit,{once:true});
    const check=setInterval(()=>{if(window.ethereum){setHasProvider(true);clearInterval(check);}},200);
    const timeout=setTimeout(()=>clearInterval(check),3000);
    return()=>{window.removeEventListener('ethereum#initialized',onInit);clearInterval(check);clearTimeout(timeout);};
  },[]);

  const getProvider=()=>{
    // EIP-6963: use announced providers (most reliable, bypasses TronLink hijack)
    if(window.__eip6963Providers?.length){
      const mm=window.__eip6963Providers.find(p=>p.info?.name?.toLowerCase().includes('metamask'));
      if(mm)return mm.provider;
      return window.__eip6963Providers[0].provider;
    }
    // Fallback: providers array (MetaMask + TronLink coexistence)
    if(window.ethereum?.providers?.length){
      const mm=window.ethereum.providers.find(p=>p.isMetaMask&&!p.isTronLink);
      if(mm)return mm;
      const other=window.ethereum.providers.find(p=>!p.isTronLink);
      if(other)return other;
    }
    // Single provider - skip TronLink
    if(window.ethereum&&!window.ethereum.isTronLink)return window.ethereum;
    return null;
  };

  const connectMM=async()=>{
    setErr(null);
    const provider=getProvider();
    if(!provider){
      if(window.ethereum?.isTronLink&&!window.ethereum?.providers?.find(p=>!p.isTronLink)){
        setErr('TronLink is blocking MetaMask. Please disable TronLink in chrome://extensions, then refresh.');
      } else {
        setErr('No Ethereum wallet detected. Please install MetaMask from metamask.io, then refresh.');
      }
      setHasProvider(false);
      return;
    }

    setConnecting(true);
    try{
      // Check if already authorized first (no popup), then request if needed
      let accounts=[];
      try{ accounts=await provider.request({method:'eth_accounts'}); }catch{}
      if(!accounts||!accounts.length){
        accounts=await provider.request({method:'eth_requestAccounts'});
      }

      if(!accounts||accounts.length===0)throw new Error('No accounts returned');
      const chainId=await provider.request({method:'eth_chainId'});
      const balHex=await provider.request({method:'eth_getBalance',params:[accounts[0],'latest']}).catch(()=>'0x0');
      const balEth=(parseInt(balHex,16)/1e18).toFixed(4);
      const netNames={'0x1':'Ethereum','0x5':'Goerli','0xaa36a7':'Sepolia','0x89':'Polygon','0xa':'Optimism','0xa4b1':'Arbitrum','0x46c52':'PMT Chain'};
      const netName=netNames[chainId]||('Chain '+parseInt(chainId,16));
      onMetaMask({address:accounts[0],balance:balEth,network:netName,chainId,isMetaMask:true});
    }catch(e){
      const code=e.code;
      if(code===4001){
        setErr('Connection rejected. Please approve the connection in MetaMask.');
      } else if(code===-32002){
        setErr('MetaMask has a pending request. Click the MetaMask icon in your toolbar to approve it.');
      } else if(code===-32603||e.message==='Unexpected error'){
        // Internal error - usually means MetaMask needs to be reopened
        setErr('MetaMask encountered an error. Please open MetaMask, check for any pending requests, then try again.');
      } else {
        setErr('Connection failed: '+(e.message||String(e)));
      }
    }finally{setConnecting(false);}
  };



  // Listen for MetaMask account changes
  useEffect(()=>{
    if(!window.ethereum)return;
    const onAccounts=accs=>{
      if(accs&&accs.length>0){connectMM();}
    };
    window.ethereum.on('accountsChanged',onAccounts);
    return()=>window.ethereum.removeListener('accountsChanged',onAccounts);
  },[]);

  return(
    <div style={{height:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'var(--bg)',padding:'16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:420,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,padding:'24px 20px',display:'flex',flexDirection:'column',gap:16,marginTop:'auto',marginBottom:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <img src={'/favicon.svg'} style={{width:52,height:52,borderRadius:14,objectFit:'cover',flexShrink:0}} alt="PMT"/>
          <div>
            <div style={{fontSize:22,fontWeight:600}}>PMT-Chat</div>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',letterSpacing:'1.5px',marginTop:2}}>DECENTRALIZED MESSENGER</div>
          </div>
        </div>
        <p style={{fontSize:13.5,color:'var(--text2)',lineHeight:1.6}}>
          End-to-end encrypted messages stored on the blockchain. No servers. No surveillance. Own your conversations.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['+','E2E Encrypted','AES-256 + wallet keys'],['#','On-Chain','PMT Chain'],
            ['*','Self-Custody','Wallet = identity'],['+','Send PMT','Crypto in-chat']].map(([i,t,s])=>(
            <div key={t} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',
              background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10}}>
              <span style={{fontSize:16,flexShrink:0}}>{i}</span>
              <div>
                <div style={{fontSize:12,fontWeight:500}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s}</div>
              </div>
            </div>
          ))}
        </div>
        {err&&(
          <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:10,padding:'10px 14px',fontSize:12.5,color:'var(--danger)',lineHeight:1.5}}>
            ! {err}
            {!hasProvider&&(
              <div style={{marginTop:8}}>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
                  style={{color:'var(--accent)',fontWeight:500}}>Download MetaMask </a>
              </div>
            )}
          </div>
        )}


        <button onClick={connectMM} disabled={connecting}
          style={{padding:'13px 20px',
            background:connecting?'rgba(246,133,27,0.5)':'#faff63',
            border:'none',borderRadius:10,
            color:'#000000',fontWeight:600,fontSize:14,cursor:connecting?'default':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all .2s'}}>
          {connecting
            ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',
                borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',
                animation:'spin .7s linear infinite'}}/>Approve in MetaMask...</>
            : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h2a2 2 0 0 1 0 4h-2v-4z"/><path d="M2 10h20"/></svg>Connect Wallet</>}
        </button>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>self-custody</span>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <button onClick={onCreateWallet}
            style={{padding:'12px 10px',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <span style={{fontSize:22,color:"var(--accent)"}}>+</span>
            <span style={{fontWeight:500}}>Create Wallet</span>
            <span style={{fontSize:10,color:'var(--muted)'}}>New self-custody wallet</span>
          </button>
          <button onClick={onImportWallet}
            style={{padding:'12px 10px',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent2)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <span style={{fontSize:22}}>v</span>
            <span style={{fontWeight:500}}>Import Wallet</span>
            <span style={{fontSize:10,color:'var(--muted)'}}>Seed phrase or key</span>
          </button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>or</span>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
        </div>

        <button onClick={onLogin}
          style={{padding:'11px 20px',background:'var(--surface2)',border:'1px solid var(--accent)',borderRadius:10,
            color:'var(--accent)',fontSize:13.5,fontWeight:500,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          Log In with Username
        </button>
        <button onClick={onDemo}
          style={{padding:'11px 20px',background:'transparent',border:'1px solid var(--border)',borderRadius:10,
            color:'var(--text2)',fontSize:13.5,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          Try Demo Mode (no wallet required)
        </button>
        <p style={{fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.5}}>
          Built on PMT Chain | React 18
        </p>
      </div>
    </div>
  );
}