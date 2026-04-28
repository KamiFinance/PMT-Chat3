// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';

export default function Landing({onDemo,onMetaMask,onCreateWallet,onImportWallet,onLogin}){
  const [connecting,setConnecting]=useState(false);
  const [err,setErr]=useState(null);
  const [wallets,setWallets]=useState([]); // EIP-6963 discovered wallets
  const [showPicker,setShowPicker]=useState(false);

  // Discover wallets via EIP-6963 on mount
  useEffect(()=>{
    const found=[];
    const onAnnounce=(e)=>{
      const {info,provider}=e.detail;
      if(!found.find(w=>w.uuid===info.uuid)){
        found.push({...info,provider});
        setWallets([...found]);
      }
    };
    window.addEventListener('eip6963:announceProvider',onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    // Re-request after short delay to catch late injectors
    const t=setTimeout(()=>window.dispatchEvent(new Event('eip6963:requestProvider')),500);
    return()=>{window.removeEventListener('eip6963:announceProvider',onAnnounce);clearTimeout(t);};
  },[]);

  const connectWith=async(provider,walletName)=>{
    setShowPicker(false);
    setErr(null);
    setConnecting(true);
    try{
      let accounts=[];
      try{accounts=await provider.request({method:'eth_accounts'});}catch{}
      if(!accounts||!accounts.length){
        accounts=await provider.request({method:'eth_requestAccounts'});
      }
      if(!accounts||!accounts.length)throw new Error('No accounts returned');
      const chainId=await provider.request({method:'eth_chainId'});
      const balHex=await provider.request({method:'eth_getBalance',params:[accounts[0],'latest']}).catch(()=>'0x0');
      const balEth=(parseInt(balHex,16)/1e18).toFixed(4);
      const netNames={'0x1':'Ethereum','0x5':'Goerli','0xaa36a7':'Sepolia','0x89':'Polygon','0xa':'Optimism','0xa4b1':'Arbitrum','0x46c52':'PMT Chain'};
      const netName=netNames[chainId]||('Chain '+parseInt(chainId,16));
      onMetaMask({address:accounts[0],balance:balEth,network:netName,chainId,isMetaMask:true,walletName});
    }catch(e){
      if(e.code===4001){
        setErr('Connection rejected. Please approve the connection in your wallet.');
      }else if(e.code===-32002){
        setErr('Wallet has a pending request. Click the wallet icon in your toolbar to approve it.');
      }else{
        setErr('Connection failed: '+(e.message||String(e)));
      }
    }finally{setConnecting(false);}
  };

  const handleConnectWallet=()=>{
    setErr(null);
    // Filter out TronLink — only show EVM wallets
    const evmWallets=wallets.filter(w=>!w.name?.toLowerCase().includes('tron'));
    if(evmWallets.length===0){
      // No EIP-6963 wallets — try legacy window.ethereum
      const p=window.ethereum?.isMetaMask?window.ethereum:null;
      if(p){connectWith(p,'MetaMask');return;}
      setErr('No Ethereum wallet detected. Please install MetaMask from metamask.io, then refresh.');
      return;
    }
    if(evmWallets.length===1){
      connectWith(evmWallets[0].provider,evmWallets[0].name);
      return;
    }
    // Multiple wallets — show picker
    setShowPicker(true);
  };

  const evmWallets=wallets.filter(w=>!w.name?.toLowerCase().includes('tron'));

  return(
    <div style={{height:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'var(--bg)',padding:'16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:420,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,padding:'24px 20px',display:'flex',flexDirection:'column',gap:16,marginTop:'auto',marginBottom:'auto'}}>

        {/* Brand */}
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

        {/* Feature grid */}
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

        {/* Error */}
        {err&&(
          <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:10,padding:'10px 14px',fontSize:12.5,color:'var(--danger)',lineHeight:1.5}}>
            {err}
            <div style={{marginTop:8}}>
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
                style={{color:'var(--accent)',fontWeight:500}}>Download MetaMask →</a>
            </div>
          </div>
        )}

        {/* Wallet picker modal */}
        {showPicker&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--mono)',letterSpacing:'1px',marginBottom:4}}>SELECT WALLET</div>
            {evmWallets.map(w=>(
              <button key={w.uuid} onClick={()=>connectWith(w.provider,w.name)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',
                  background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:9,
                  color:'var(--text)',cursor:'pointer',fontSize:13,fontWeight:500}}>
                {w.icon&&<img src={w.icon} style={{width:24,height:24,borderRadius:6}} alt={w.name}/>}
                {w.name}
              </button>
            ))}
            <button onClick={()=>setShowPicker(false)}
              style={{padding:'8px',background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
              Cancel
            </button>
          </div>
        )}

        {/* Connect Wallet button */}
        {!showPicker&&(
          <button onClick={handleConnectWallet} disabled={connecting}
            style={{padding:'13px 20px',
              background:connecting?'rgba(246,133,27,0.5)':'var(--accent)',
              border:'none',borderRadius:10,color:'#000',fontWeight:600,fontSize:14,
              cursor:connecting?'default':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all .2s'}}>
            {connecting
              ?<><span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',
                  borderTopColor:'#000',borderRadius:'50%',display:'inline-block',
                  animation:'spin .7s linear infinite'}}/>Connecting...</>
              :<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h2a2 2 0 0 1 0 4h-2v-4z"/><path d="M2 10h20"/></svg>
              Connect Wallet{evmWallets.length>1?` (${evmWallets.length} found)`:''}</>}
          </button>
        )}

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>self-custody</span>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <button onClick={onCreateWallet}
            style={{padding:'12px 10px',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,transition:'border-color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <span style={{fontSize:22,color:'var(--accent)'}}>+</span>
            <span style={{fontWeight:500}}>Create Wallet</span>
            <span style={{fontSize:10,color:'var(--muted)'}}>New self-custody wallet</span>
          </button>
          <button onClick={onImportWallet}
            style={{padding:'12px 10px',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,transition:'border-color .15s'}}
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
