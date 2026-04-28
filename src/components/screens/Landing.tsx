// @ts-nocheck
import React, { useState, useEffect } from 'react';

const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// Popular mobile wallets with their deeplink formats
const MOBILE_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    color: '#F6851B',
    bg: '#FFF7EE',
    deeplink: (url) => `https://metamask.app.link/dapp/${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.5 3.5L20.3 13.1l2.4-5.7L33.5 3.5z" fill="#E17726" stroke="#E17726" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2.5 3.5l13.1 9.7-2.3-5.8L2.5 3.5z" fill="#E27625" stroke="#E27625" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28.7 25.4l-3.5 5.4 7.5 2.1 2.1-7.3-6.1-.2zM1.2 25.6l2.1 7.3 7.5-2.1-3.5-5.4-6.1.2z" fill="#E27625" stroke="#E27625" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.4 16.1l-2 3.1 7.2.3-.2-7.8-5 4.4zM25.6 16.1l-5.1-4.5-.2 7.9 7.2-.3-1.9-3.1z" fill="#E27625" stroke="#E27625" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.8 30.8l4.3-2.1-3.7-2.9-.6 5zM20.9 28.7l4.3 2.1-.6-5-3.7 2.9z" fill="#E27625" stroke="#E27625" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'trust',
    name: 'Trust',
    color: '#3375BB',
    bg: '#EEF4FF',
    deeplink: (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=https%3A%2F%2F${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#3375BB"/>
      <path d="M18 6L8 10v8c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12v-8L18 6z" fill="white" stroke="none"/>
    </svg>`,
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    color: '#0052FF',
    bg: '#EEF3FF',
    deeplink: (url) => `https://go.cb-wallet.com/wsegue?cb_url=https%3A%2F%2F${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#0052FF"/>
      <circle cx="18" cy="18" r="10" fill="white"/>
      <rect x="13" y="15" width="10" height="6" rx="2" fill="#0052FF"/>
    </svg>`,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    color: '#AB9FF2',
    bg: '#F5F3FF',
    deeplink: (url) => `https://phantom.app/ul/browse/https%3A%2F%2F${url}?ref=https%3A%2F%2F${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#AB9FF2"/>
      <path d="M28 18c0 5.5-4.5 10-10 10S8 23.5 8 18 12.5 8 18 8s10 4.5 10 10z" fill="white"/>
      <path d="M15.5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM20.5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="#AB9FF2"/>
      <path d="M13 21s1-2 5-2 5 2 5 2" stroke="#AB9FF2" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    color: '#175BFF',
    bg: '#F0F4FF',
    deeplink: (url) => `https://rnbwapp.com/wc?uri=https%3A%2F%2F${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#rbow)"/>
      <defs><linearGradient id="rbow" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#FF6B6B"/><stop offset=".3" stop-color="#FFBA08"/><stop offset=".6" stop-color="#06D6A0"/><stop offset="1" stop-color="#118AB2"/></linearGradient></defs>
      <path d="M10 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M13 22c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>
      <path d="M16 22c0-1.1.9-2 2-2s2 .9 2 2" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'imtoken',
    name: 'imToken',
    color: '#11C4D1',
    bg: '#EDFCFD',
    deeplink: (url) => `imtokenv2://navigate/DappBrowser?url=https%3A%2F%2F${url}`,
    icon: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#11C4D1"/>
      <text x="18" y="24" text-anchor="middle" font-size="16" font-weight="bold" fill="white">iT</text>
    </svg>`,
  },
];

export default function Landing({onDemo,onMetaMask,onCreateWallet,onImportWallet,onLogin}){
  const [connecting,setConnecting]=useState(false);
  const [err,setErr]=useState(null);
  const [wallets,setWallets]=useState([]);  // EIP-6963 extension wallets
  const [showPicker,setShowPicker]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [inWalletBrowser,setInWalletBrowser]=useState(false);
  const [walletBrowserName,setWalletBrowserName]=useState('');

  useEffect(()=>{
    const mob = isMobile();
    setMobile(mob);

    // Detect if already inside a wallet's in-app browser
    if(mob && window.ethereum){
      if(window.ethereum.isMetaMask){ setInWalletBrowser(true); setWalletBrowserName('MetaMask'); }
      else if(window.ethereum.isTrust||window.ethereum.isTrustWallet){ setInWalletBrowser(true); setWalletBrowserName('Trust Wallet'); }
      else if(window.ethereum.isCoinbaseWallet){ setInWalletBrowser(true); setWalletBrowserName('Coinbase Wallet'); }
      else if(window.ethereum.isPhantom){ setInWalletBrowser(true); setWalletBrowserName('Phantom'); }
      else if(window.ethereum){ setInWalletBrowser(true); setWalletBrowserName('Wallet'); }
    }

    // EIP-6963 for desktop extensions
    if(!mob){
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
      const t=setTimeout(()=>window.dispatchEvent(new Event('eip6963:requestProvider')),500);
      return()=>{window.removeEventListener('eip6963:announceProvider',onAnnounce);clearTimeout(t);};
    }
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
      if(e.code===4001) setErr('Connection rejected. Please approve in your wallet.');
      else if(e.code===-32002) setErr('Wallet has a pending request. Open your wallet and approve it.');
      else setErr('Connection failed: '+(e.message||String(e)));
    }finally{setConnecting(false);}
  };

  const handleConnectWallet=()=>{
    setErr(null);
    if(mobile){
      // Already inside a wallet browser
      if(window.ethereum){ connectWith(window.ethereum, walletBrowserName||'Wallet'); return; }
      // Show mobile wallet picker
      setShowPicker(true);
      return;
    }
    // Desktop: EIP-6963
    const evmWallets=wallets.filter(w=>!w.name?.toLowerCase().includes('tron'));
    if(evmWallets.length===0){
      const p=window.ethereum?.isMetaMask?window.ethereum:null;
      if(p){connectWith(p,'MetaMask');return;}
      setErr('No Ethereum wallet detected. Please install MetaMask from metamask.io, then refresh.');
      return;
    }
    if(evmWallets.length===1){ connectWith(evmWallets[0].provider,evmWallets[0].name); return; }
    setShowPicker(true);
  };

  const evmWallets=wallets.filter(w=>!w.name?.toLowerCase().includes('tron'));
  const pageUrl=window.location.hostname+(window.location.pathname!=='/'?window.location.pathname:'');

  return(
    <div style={{height:'100%',display:'flex',alignItems:'flex-start',justifyContent:'center',
      background:'var(--bg)',padding:'16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:420,background:'var(--panel)',border:'1px solid var(--border)',
        borderRadius:16,padding:'24px 20px',display:'flex',flexDirection:'column',gap:16,
        marginTop:'auto',marginBottom:'auto'}}>

        {/* Brand */}
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <img src={'/pmt-logo.png'} style={{width:52,height:52,borderRadius:14,objectFit:'cover',flexShrink:0}} alt="PMT"/>
          <div>
            <div style={{fontSize:22,fontWeight:600}}>PMT-Chat</div>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',letterSpacing:'1.5px',marginTop:2}}>DECENTRALIZED MESSENGER</div>
          </div>
        </div>

        <p style={{fontSize:13.5,color:'var(--text2)',lineHeight:1.6}}>
          End-to-end encrypted messages stored on the blockchain. No servers. No surveillance.
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
            {!mobile&&(
              <div style={{marginTop:8}}>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
                  style={{color:'var(--accent)',fontWeight:500}}>Download MetaMask →</a>
              </div>
            )}
          </div>
        )}

        {/* ── DESKTOP wallet picker (EIP-6963) ── */}
        {showPicker&&!mobile&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,
            padding:'14px',display:'flex',flexDirection:'column',gap:8}}>
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

        {/* ── MOBILE wallet picker ── */}
        {showPicker&&mobile&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px'}}>
            <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--mono)',letterSpacing:'1px',marginBottom:12}}>
              SELECT YOUR WALLET
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {MOBILE_WALLETS.map(w=>(
                <a key={w.id} href={w.deeplink(pageUrl)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,
                    padding:'12px 8px',background:'var(--surface2)',border:'1px solid var(--border)',
                    borderRadius:12,textDecoration:'none',cursor:'pointer',transition:'border-color .15s'}}
                  onTouchStart={e=>e.currentTarget.style.borderColor='var(--accent)'}
                  onTouchEnd={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{width:44,height:44,borderRadius:12,overflow:'hidden',flexShrink:0}}
                    dangerouslySetInnerHTML={{__html:w.icon}}/>
                  <span style={{fontSize:11,color:'var(--text2)',fontWeight:500,textAlign:'center'}}>{w.name}</span>
                </a>
              ))}
            </div>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:12,lineHeight:1.5,textAlign:'center'}}>
              Tap your wallet to open this app inside it, then connect.
            </p>
            <button onClick={()=>setShowPicker(false)}
              style={{width:'100%',marginTop:8,padding:'9px',background:'transparent',
                border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
              Cancel
            </button>
          </div>
        )}

        {/* ── Connect Wallet button ── */}
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
              {inWalletBrowser?`Connect ${walletBrowserName}`:mobile?'Connect Wallet':evmWallets.length>1?`Connect Wallet (${evmWallets.length} found)`:'Connect Wallet'}</>}
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
              display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <span style={{fontSize:22,color:'var(--accent)'}}>+</span>
            <span style={{fontWeight:500}}>Create Wallet</span>
            <span style={{fontSize:10,color:'var(--muted)'}}>New self-custody wallet</span>
          </button>
          <button onClick={onImportWallet}
            style={{padding:'12px 10px',background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:10,color:'var(--text)',fontSize:13,cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
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
