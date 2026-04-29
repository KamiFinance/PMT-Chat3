// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getWCProvider, resetWCProvider } from '../../lib/walletconnect';

const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// Popular mobile wallets — deeplink opens the dapp in wallet browser,
// wcRedirect opens WC approval screen then returns user to the site
const MOBILE_WALLETS = [
  { id:'metamask', name:'MetaMask', color:'#F6851B',
    deeplink:(url)=>`https://metamask.app.link/dapp/${url}`,
    wcRedirect:(uri,ret)=>`https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}&redirectUrl=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#F6851B"/><text y="28" x="20" text-anchor="middle" font-size="22">🦊</text></svg>' },
  { id:'trust', name:'Trust', color:'#3375BB',
    deeplink:(url)=>`https://link.trustwallet.com/open_url?coin_id=60&url=https://${url}`,
    wcRedirect:(uri,ret)=>`https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}&returnUrl=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#3375BB"/><text y="28" x="20" text-anchor="middle" font-size="22">🛡️</text></svg>' },
  { id:'coinbase', name:'Coinbase', color:'#0052FF',
    deeplink:(url)=>`https://go.cb-wallet.com/wsegue?cb_url=https://${url}`,
    wcRedirect:(uri,ret)=>`https://go.cb-wallet.com/wc?uri=${encodeURIComponent(uri)}&return_url=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#0052FF"/><text y="28" x="20" text-anchor="middle" font-size="20" fill="white" font-weight="bold">C</text></svg>' },
  { id:'rainbow', name:'Rainbow', color:'#175BFF',
    deeplink:(url)=>`https://rnbwapp.com/wc?uri=https://${url}`,
    wcRedirect:(uri,ret)=>`https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}&redirectUrl=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF6B6B"/><stop offset=".5" stop-color="#FFBA08"/><stop offset="1" stop-color="#118AB2"/></linearGradient></defs><rect width="40" height="40" rx="12" fill="url(#rb)"/><text y="28" x="20" text-anchor="middle" font-size="22">🌈</text></svg>' },
  { id:'phantom', name:'Phantom', color:'#AB9FF2',
    deeplink:(url)=>`https://phantom.app/ul/browse/https://${url}?ref=https://${url}`,
    wcRedirect:(uri,ret)=>`https://phantom.app/ul/wc?uri=${encodeURIComponent(uri)}&redirectUrl=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#AB9FF2"/><text y="28" x="20" text-anchor="middle" font-size="22">👻</text></svg>' },
  { id:'imtoken', name:'imToken', color:'#11C4D1',
    deeplink:(url)=>`imtokenv2://navigate/DappBrowser?url=https://${url}`,
    wcRedirect:(uri,ret)=>`imtokenv2://wc?uri=${encodeURIComponent(uri)}&redirect=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#11C4D1"/><text y="26" x="20" text-anchor="middle" font-size="13" fill="white" font-weight="bold">iToken</text></svg>' },
  { id:'safepal', name:'SafePal', color:'#0F60FF',
    deeplink:(url)=>`https://link.safepal.io/dapp?url=https://${url}`,
    wcRedirect:(uri,ret)=>`safepalwallet://wc?uri=${encodeURIComponent(uri)}&return=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#0F60FF"/><path d="M20 8 L30 13 L30 22 C30 27.5 25.5 32 20 33.5 C14.5 32 10 27.5 10 22 L10 13 Z" fill="none" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 20 L19 23 L24 17" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' },
  { id:'tangem', name:'Tangem', color:'#1C1C1E',
    deeplink:(url)=>`https://app.tangem.com/wc?uri=https://${url}`,
    wcRedirect:(uri,ret)=>`tangem://wc?uri=${encodeURIComponent(uri)}&returnUrl=${encodeURIComponent(ret)}`,
    icon:'<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#1C1C1E"/><rect x="9" y="13" width="22" height="14" rx="3" fill="none" stroke="white" stroke-width="2"/><rect x="12" y="16" width="7" height="4" rx="1" fill="white"/><circle cx="26" cy="21" r="2" fill="#00D4AA"/><circle cx="21" cy="21" r="2" fill="white" opacity="0.5"/></svg>' },
];

// WalletConnect QR Modal component
function WCModal({ uri, onClose, wcWallets }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!uri || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, uri, {
      width: 220, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(console.error);
  }, [uri]);

  const copy = () => {
    navigator.clipboard.writeText(uri).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',
      justifyContent:'center',zIndex:300,padding:16}} onClick={onClose}>
      <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:18,padding:'24px 20px',
        width:'100%',maxWidth:380,display:'flex',flexDirection:'column',gap:14,animation:'slideUp .25s ease'}}
        onClick={e=>e.stopPropagation()}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:'#3B99FC'}}/>
            <span style={{fontSize:15,fontWeight:600}}>WalletConnect</span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:22,cursor:'pointer'}}>×</button>
        </div>

        {/* QR Code */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
          <div style={{background:'#fff',borderRadius:14,padding:12,display:'inline-block',
            boxShadow:'0 4px 20px rgba(0,0,0,.3)'}}>
            <canvas ref={canvasRef} style={{display:'block'}}/>
          </div>
          <p style={{fontSize:12,color:'var(--text2)',textAlign:'center',lineHeight:1.5}}>
            Scan with any WalletConnect-compatible wallet
          </p>
        </div>

        {/* Mobile wallet deep links */}
        {wcWallets && wcWallets.length > 0 && (
          <div>
            <div style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--mono)',letterSpacing:'1px',marginBottom:8}}>
              OR OPEN IN YOUR WALLET APP
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {wcWallets.map(w=>(
                <a key={w.id} href={w.wc(uri)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,
                    padding:'10px 6px',background:'var(--surface)',border:'1px solid var(--border)',
                    borderRadius:10,textDecoration:'none',cursor:'pointer'}}>
                  <div style={{width:36,height:36,borderRadius:9,overflow:'hidden'}}
                    dangerouslySetInnerHTML={{__html:w.icon}}/>
                  <span style={{fontSize:10,color:'var(--text2)',fontWeight:500}}>{w.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Copy URI */}
        <button onClick={copy}
          style={{padding:'9px',background:'var(--surface)',border:'1px solid var(--border)',
            borderRadius:9,color:copied?'var(--accent3)':'var(--muted)',fontSize:12,cursor:'pointer',
            fontFamily:'var(--mono)'}}>
          {copied ? '✓ Copied to clipboard' : '⧉ Copy WC URI'}
        </button>
      </div>
    </div>
  );
}

export default function Landing({onDemo,onMetaMask,onCreateWallet,onImportWallet,onLogin}){
  const [connecting,setConnecting]=useState(false);
  const [err,setErr]=useState(null);
  const [wallets,setWallets]=useState([]);
  const [showPicker,setShowPicker]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [inWalletBrowser,setInWalletBrowser]=useState(false);
  const [walletBrowserName,setWalletBrowserName]=useState('');
  const [wcUri,setWcUri]=useState(null);
  const [wcConnecting,setWcConnecting]=useState(false);

  useEffect(()=>{
    const mob=isMobile();
    setMobile(mob);
    if(mob && window.ethereum){
      if(window.ethereum.isMetaMask){ setInWalletBrowser(true); setWalletBrowserName('MetaMask'); }
      else if(window.ethereum.isTrust||window.ethereum.isTrustWallet){ setInWalletBrowser(true); setWalletBrowserName('Trust'); }
      else if(window.ethereum.isCoinbaseWallet){ setInWalletBrowser(true); setWalletBrowserName('Coinbase'); }
      else if(window.ethereum.isPhantom){ setInWalletBrowser(true); setWalletBrowserName('Phantom'); }
      else{ setInWalletBrowser(true); setWalletBrowserName('Wallet'); }
    }
    if(!mob){
      const found=[];
      const onAnnounce=(e)=>{
        const {info,provider}=e.detail;
        if(!found.find(w=>w.uuid===info.uuid)){ found.push({...info,provider}); setWallets([...found]); }
      };
      window.addEventListener('eip6963:announceProvider',onAnnounce);
      window.dispatchEvent(new Event('eip6963:requestProvider'));
      const t=setTimeout(()=>window.dispatchEvent(new Event('eip6963:requestProvider')),500);
      return()=>{ window.removeEventListener('eip6963:announceProvider',onAnnounce); clearTimeout(t); };
    }
  },[]);

  const connectWith=async(provider,walletName)=>{
    setShowPicker(false);
    setErr(null);
    setConnecting(true);
    try{
      let accounts=[];
      try{accounts=await provider.request({method:'eth_accounts'});}catch{}
      if(!accounts||!accounts.length) accounts=await provider.request({method:'eth_requestAccounts'});
      if(!accounts||!accounts.length) throw new Error('No accounts returned');
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

  const handleWalletConnect=async()=>{
    setErr(null);
    setWcConnecting(true);
    setShowPicker(false);
    try{
      // Always start fresh — reset any stale provider from previous attempts
      resetWCProvider();
      const provider=await getWCProvider();
      // Listen for QR URI — fires when WC is ready
      provider.once('display_uri',(uri)=>{
        setWcUri(uri);
        setWcConnecting(false);
        // On mobile: when user returns from wallet app, check if session connected
        if(isMobile()){
          const onVisible = () => {
            if(document.visibilityState === 'visible'){
              document.removeEventListener('visibilitychange', onVisible);
              // Session might have resolved while app was in background
              // The connect() promise handles this — just close the modal
              // and let the .then() fire naturally
              setWcUri(null);
            }
          };
          document.addEventListener('visibilitychange', onVisible);
        }
      });
      // Start connection — after connect() resolves, accounts are in provider.accounts
      provider.connect().then(async()=>{
        setWcUri(null);
        const accounts = provider.accounts || [];
        if (!accounts.length) { setErr('No accounts found in wallet.'); resetWCProvider(); return; }
        const address = accounts[0];
        const chainId = provider.chainId;
        const netNames = {'0x1':'Ethereum','0x5':'Goerli','0xaa36a7':'Sepolia','0x89':'Polygon','0xa':'Optimism','0xa4b1':'Arbitrum','0x46c52':'PMT Chain'};
        const chainHex = chainId ? '0x' + chainId.toString(16) : '0x1';
        const netName = netNames[chainHex] || ('Chain ' + chainId);
        let balEth = '0.0000';
        try {
          const balHex = await provider.request({method:'eth_getBalance', params:[address,'latest']});
          balEth = (parseInt(balHex,16)/1e18).toFixed(4);
        } catch {}
        onMetaMask({address, balance:balEth, network:netName, chainId:chainHex, isMetaMask:true, walletName:'WalletConnect'});
      }).catch((e)=>{
        setWcUri(null);
        setWcConnecting(false);
        resetWCProvider();
        const msg = e.message||String(e);
        if(msg.includes('User rejected')||msg.includes('rejected')||msg.includes('declined')) setErr('Connection rejected.');
        else if(msg.includes('reset')||msg.includes('closed')||msg.includes('disconnect')) { /* silently ignore */ }
        else if(msg.includes('Project')||msg.includes('3000')||msg.includes('projectId')) setErr('wc_no_project');
        else setErr('WalletConnect: '+msg);
      });
    }catch(e){
      setWcConnecting(false);
      resetWCProvider();
      const msg = e.message||String(e);
      if(msg.includes('Project ID') || msg.includes('project')){
        setErr('wc_no_project');
      } else {
        setErr('WalletConnect: '+msg);
      }
    }
  };

  const handleConnectWallet=()=>{
    setErr(null);
    if(mobile){
      if(window.ethereum){ connectWith(window.ethereum,walletBrowserName||'Wallet'); return; }
      setShowPicker(true);
      return;
    }
    const evmWallets=wallets.filter(w=>!w.name?.toLowerCase().includes('tron'));
    if(evmWallets.length===0){
      const p=window.ethereum?.isMetaMask?window.ethereum:null;
      if(p){connectWith(p,'MetaMask');return;}
      setErr('No Ethereum wallet detected. Install MetaMask or use WalletConnect below.');
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
              <div><div style={{fontSize:12,fontWeight:500}}>{t}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s}</div></div>
            </div>
          ))}
        </div>

        {/* Error */}
        {err==='wc_no_project'?(
          <div style={{background:'rgba(59,153,252,.08)',border:'1px solid rgba(59,153,252,.25)',
            borderRadius:10,padding:'12px 14px',fontSize:12.5,lineHeight:1.6}}>
            <div style={{fontWeight:600,color:'#3B99FC',marginBottom:4}}>🔑 WalletConnect Project ID needed</div>
            <div style={{color:'var(--text2)',fontSize:12}}>
              Get your free Project ID at{' '}
              <a href="https://cloud.reown.com" target="_blank" rel="noreferrer"
                style={{color:'#3B99FC',fontWeight:500}}>cloud.reown.com</a>
              {' '}→ Create project → copy the ID → add to Vercel as{' '}
              <code style={{fontFamily:'var(--mono)',fontSize:10,background:'var(--surface)',
                padding:'1px 5px',borderRadius:4}}>VITE_WC_PROJECT_ID</code>
            </div>
            <button onClick={()=>setErr(null)}
              style={{marginTop:8,padding:'4px 10px',background:'transparent',border:'1px solid rgba(59,153,252,.3)',
                borderRadius:6,color:'#3B99FC',fontSize:11,cursor:'pointer'}}>Dismiss</button>
          </div>
        ):err?(
          <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:10,padding:'10px 14px',fontSize:12.5,color:'var(--danger)',lineHeight:1.5}}>
            {err}
          </div>
        ):null}

        {/* Desktop EIP-6963 wallet picker */}
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

        {/* Mobile wallet grid */}
        {showPicker&&mobile&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px'}}>
            <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--mono)',letterSpacing:'1px',marginBottom:12}}>
              SELECT YOUR WALLET
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {MOBILE_WALLETS.map(w=>(
                <a key={w.id} href={w.deeplink(pageUrl)}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,
                    padding:'12px 8px',background:'var(--surface2)',border:'1px solid var(--border)',
                    borderRadius:12,textDecoration:'none',cursor:'pointer'}}>
                  <div style={{width:44,height:44,borderRadius:12,overflow:'hidden'}}
                    dangerouslySetInnerHTML={{__html:w.icon}}/>
                  <span style={{fontSize:11,color:'var(--text2)',fontWeight:500,textAlign:'center'}}>{w.name}</span>
                </a>
              ))}
            </div>
            <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
              <button onClick={handleWalletConnect}
                style={{width:'100%',padding:'11px',background:'rgba(59,153,252,.12)',
                  border:'1px solid rgba(59,153,252,.35)',borderRadius:10,
                  color:'#3B99FC',fontWeight:600,fontSize:13,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {wcConnecting?<><span style={{width:13,height:13,border:'2px solid rgba(59,153,252,.3)',
                  borderTopColor:'#3B99FC',borderRadius:'50%',display:'inline-block',
                  animation:'spin .7s linear infinite'}}/>Connecting...</>
                  :<>🔗 WalletConnect (QR Code)</>}
              </button>
            </div>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:10,lineHeight:1.5,textAlign:'center'}}>
              Tap your wallet or scan QR with any wallet
            </p>
            <button onClick={()=>setShowPicker(false)}
              style={{width:'100%',marginTop:4,padding:'9px',background:'transparent',
                border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
              Cancel
            </button>
          </div>
        )}

        {/* Main connect buttons */}
        {!showPicker&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {/* Primary: Connect Wallet (EIP-6963 / in-app browser) */}
            <button onClick={handleConnectWallet} disabled={connecting||wcConnecting}
              style={{padding:'13px 20px',
                background:connecting?'rgba(246,133,27,0.5)':'var(--accent)',
                border:'none',borderRadius:10,color:'#000',fontWeight:600,fontSize:14,
                cursor:(connecting||wcConnecting)?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all .2s'}}>
              {connecting
                ?<><span style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',
                    borderTopColor:'#000',borderRadius:'50%',display:'inline-block',
                    animation:'spin .7s linear infinite'}}/>Connecting...</>
                :<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h2a2 2 0 0 1 0 4h-2v-4z"/><path d="M2 10h20"/></svg>
                {inWalletBrowser?`Connect ${walletBrowserName}`:evmWallets.length>1?`Connect Wallet (${evmWallets.length} found)`:'Connect Wallet'}</>}
            </button>

            {/* WalletConnect button */}
            <button onClick={handleWalletConnect} disabled={connecting||wcConnecting}
              style={{padding:'12px 20px',
                background:wcConnecting?'rgba(59,153,252,.08)':'rgba(59,153,252,.1)',
                border:'1px solid rgba(59,153,252,.35)',borderRadius:10,
                color:'#3B99FC',fontWeight:600,fontSize:13.5,
                cursor:(connecting||wcConnecting)?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all .2s'}}>
              {wcConnecting
                ?<><span style={{width:13,height:13,border:'2px solid rgba(59,153,252,.3)',
                    borderTopColor:'#3B99FC',borderRadius:'50%',display:'inline-block',
                    animation:'spin .7s linear infinite'}}/>Connecting...</>
                :<><svg width="17" height="17" viewBox="0 0 40 25" fill="currentColor" style={{flexShrink:0}}>
                    <path d="M8.2 7c6.5-6.4 17.1-6.4 23.6 0l.8.8c.3.3.3.9 0 1.2l-2.7 2.7c-.2.2-.4.2-.6 0l-1.1-1.1c-4.5-4.5-11.9-4.5-16.4 0L10.4 12c-.2.2-.4.2-.6 0L7.1 9.3c-.3-.3-.3-.9 0-1.2L8.2 7zM36.3 10.9l2.4 2.4c.3.3.3.9 0 1.2L28.1 25.1c-.3.3-.9.3-1.2 0l-7.2-7.2c-.1-.1-.2-.1-.3 0l-7.2 7.2c-.3.3-.9.3-1.2 0L.4 14.5c-.3-.3-.3-.9 0-1.2l2.4-2.4c.3-.3.9-.3 1.2 0l7.2 7.2c.1.1.2.1.3 0l7.2-7.2c.3-.3.9-.3 1.2 0l7.2 7.2c.1.1.2.1.3 0l7.2-7.2c.3-.4.9-.4 1.3 0z"/>
                  </svg>
                WalletConnect</>}
            </button>
          </div>
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

      {/* WalletConnect QR Modal */}
      {wcUri&&(
        <WCModal uri={wcUri} onClose={()=>{setWcUri(null); resetWCProvider();}} isMobileView={mobile}/>
      )}
    </div>
  );
}
