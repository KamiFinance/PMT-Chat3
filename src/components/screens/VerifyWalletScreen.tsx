// @ts-nocheck
import React, { useState, useRef } from 'react';
import { getWCProvider, resetWCProvider } from '../../lib/walletconnect';
import QRCode from 'qrcode';

const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

function WCQRCanvas({ uri }) {
  const ref = useRef(null);
  React.useEffect(() => {
    if (!uri || !ref.current) return;
    QRCode.toCanvas(ref.current, uri, { width: 200, margin: 2, color: { dark: '#000', light: '#fff' } }).catch(() => {});
  }, [uri]);
  return <div style={{ background: '#fff', borderRadius: 12, padding: 10, display: 'inline-block' }}><canvas ref={ref} style={{ display: 'block' }} /></div>;
}

export default function VerifyWalletScreen({ address, onVerified, onLogout }) {
  const [err,       setErr]       = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [wcUri,     setWcUri]     = useState(null);

  const checkAddress = (accounts) => {
    if (!accounts?.length) throw new Error('No accounts returned from wallet');
    const connected = accounts[0].toLowerCase();
    const expected  = address.toLowerCase();
    if (connected !== expected) {
      const e = new Error('WRONG_ADDRESS');
      e.connected = connected; e.expected = expected;
      throw e;
    }
    onVerified();
  };

  const connectInjected = async () => {
    setVerifying(true); setErr(null);
    try {
      if (!window.ethereum) { setErr('No wallet found. Use WalletConnect below.'); return; }
      // wallet_requestPermissions ALWAYS opens MetaMask even if already connected
      // Then eth_accounts retrieves the selected account
      try {
        await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      } catch (permErr) {
        if (permErr.code === 4001) { setErr('Connection rejected — please approve in your wallet.'); return; }
        // Wallet doesn't support wallet_requestPermissions — fall through to eth_requestAccounts
      }
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      checkAddress(accounts);
    } catch (e) {
      if (e.message === 'WRONG_ADDRESS') {
        setErr(`Wrong wallet.\nExpected:  ${e.expected.slice(0,8)}...${e.expected.slice(-6)}\nConnected: ${e.connected.slice(0,8)}...${e.connected.slice(-6)}\n\nSwitch to the correct account.`);
      } else if (e.code === 4001) {
        setErr('Connection rejected — please approve in your wallet.');
      } else if (e.code === -32002) {
        setErr('Wallet has a pending request — open your wallet and approve it.');
      } else {
        setErr('Connection failed: ' + (e.message || String(e)));
      }
    } finally { setVerifying(false); }
  };

  const connectWC = async () => {
    setVerifying(true); setErr(null); setWcUri(null);
    const mob = isMobile();
    try {
      resetWCProvider();
      const provider = await getWCProvider();
      provider.once('display_uri', (uri) => {
        if (mob) {
          // Mobile: open wallet app via deep link (can't scan own screen)
          window.location.href = `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;
        } else {
          setWcUri(uri); setVerifying(false);
        }
      });
      provider.connect().then(() => {
        setWcUri(null);
        const accounts = provider.accounts || [];
        try { checkAddress(accounts); } catch (e) {
          if (e.message === 'WRONG_ADDRESS') {
            setErr(`Wrong wallet.\nExpected: ${e.expected.slice(0,8)}...${e.expected.slice(-6)}\nConnected: ${e.connected.slice(0,8)}...${e.connected.slice(-6)}`);
          } else { setErr(e.message); }
          resetWCProvider();
        }
      }).catch(e => {
        setWcUri(null); setVerifying(false); resetWCProvider();
        const msg = e.message || String(e);
        if (!msg.includes('reset') && !msg.includes('closed') && !msg.includes('rejected')) setErr('WalletConnect: ' + msg);
      });
    } catch (e) {
      setVerifying(false); resetWCProvider();
      setErr('WalletConnect: ' + (e.message || String(e)));
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ fontSize: 18, fontWeight: 600 }}>Confirm your wallet</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          Connect your wallet to confirm ownership. You won't be asked again for 24 hours.
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '1px', marginBottom: 4 }}>EXPECTED WALLET</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{address}</div>
        </div>

        {err && (
          <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--danger)', whiteSpace: 'pre-line' }}>{err}</div>
        )}

        <button onClick={connectInjected} disabled={verifying}
          style={{ padding: 13, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#0a0c14', fontWeight: 600, fontSize: 14, cursor: verifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: verifying ? 0.7 : 1 }}>
          {verifying
            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.3)', borderTopColor: '#0a0c14', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />Connecting...</>
            : '🔐 Connect & Verify Wallet'}
        </button>

        <button onClick={connectWC} disabled={verifying}
          style={{ padding: 11, background: '#2563eb', border: '1px solid #3b82f6', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: verifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: verifying ? 0.7 : 1 }}>
          <svg width="14" height="9" viewBox="0 0 40 25" fill="white"><path d="M8.19 4.78C14.72-1.59 25.28-1.59 31.81 4.78L32.6 5.55a.83.83 0 0 1 0 1.19l-2.85 2.77a.44.44 0 0 1-.61 0l-1.1-1.06c-4.5-4.35-11.78-4.35-16.28 0l-1.18 1.14a.44.44 0 0 1-.61 0L7.12 6.82a.83.83 0 0 1 0-1.19l1.07-.85zm29.32 5.47 2.54 2.46a.83.83 0 0 1 0 1.19L27.42 25.4a.87.87 0 0 1-1.22 0L17.7 17.2a.22.22 0 0 0-.31 0l-8.5 8.21a.87.87 0 0 1-1.22 0L.08 13.9a.83.83 0 0 1 0-1.19l2.54-2.46a.87.87 0 0 1 1.22 0l8.5 8.21a.22.22 0 0 0 .31 0l8.5-8.21a.87.87 0 0 1 1.22 0l8.5 8.21a.22.22 0 0 0 .31 0l8.5-8.21a.87.87 0 0 1 1.22 0z" /></svg>
          Verify with WalletConnect
        </button>

        <button onClick={onLogout}
          style={{ padding: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
          ← Log out
        </button>
      </div>

      {wcUri && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }} onClick={() => setWcUri(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 20px', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B99FC' }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>WalletConnect</span>
              </div>
              <button onClick={() => { setWcUri(null); resetWCProvider(); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <WCQRCanvas uri={wcUri} />
              <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>Scan with MetaMask, Trust, Coinbase or any WalletConnect wallet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
