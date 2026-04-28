// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Wallet, Profile, Contact, MsgsMap, Message, Screen } from './types';
import { STORAGE_KEYS } from './types';
import { storage } from './lib/storage';
import { AppContext } from './lib/context';
import { now, rndHash, uid, normalizeAddress, shortHash, nextBlock, b64ToObjectUrl } from './lib/utils';
import { uploadToPinata, getIpfsUrl } from './lib/pinata';
import { hashMessage, broadcastMessage } from './lib/pmtchain';
import { useInboxPoll } from './hooks/useInboxPoll';
import { AI_AGENT_ADDRESS, AI_AGENT_CONTACT } from './constants/ai';
import { DEMO_CONTACTS, buildInitMsgs } from './constants/demo';
import { DEFAULT_AI_KEY, AI_MODEL } from './constants/keys';
import Landing from './components/screens/Landing';
import CreateWalletFlow from './components/screens/CreateWalletFlow';
import ImportWalletFlow from './components/screens/ImportWalletFlow';
import LoginScreen from './components/screens/LoginScreen';
import SetupMetaMaskFlow from './components/screens/SetupMetaMaskFlow';
import Sidebar from './components/sidebar/Sidebar';
import ChatPanel from './components/chat/ChatPanel';
import ProfileModal from './components/modals/ProfileModal';
import SettingsModal from './components/modals/SettingsModal';
import WalletModal from './components/modals/WalletModal';
import EditContactModal from './components/modals/EditContactModal';
import NewChatModal from './components/modals/NewChatModal';
import GroupChatModal from './components/modals/GroupChatModal';
import SearchOverlay from './components/modals/SearchOverlay';
import NotificationToast from './components/notifications/NotificationToast';
import Empty from './components/screens/Empty';

interface Notif {
  id: string;
  contact: Contact;
  text: string;
  ts: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [msgs, setMsgs] = useState<MsgsMap>({});
  const [active, setActive] = useState<Contact | null>(null);
  const activeRef = useRef<Contact | null>(null);
  const walletRef = useRef<Wallet | null>(null);
  const profileRef = useRef<Profile>({ name: '', bio: '', avatarUrl: null, address: null });

  const setActiveAndRef = useCallback((c: Contact | null) => {
    setActive(c); activeRef.current = c;
  }, []);

  const [showProfile, setShowProfile] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [profile, setProfile] = useState<Profile>({ name: '', bio: '', avatarUrl: null, address: null });
  const [darkMode, setDarkMode] = useState<boolean>(() => storage.getTheme() !== 'light');

  useEffect(() => {
    walletRef.current = wallet;
    profileRef.current = profile;
  }, [wallet, profile]);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    storage.setTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = useCallback(() => setDarkMode(d => !d), []);

  const accountKey = wallet?.address
    ? normalizeAddress(wallet.address)
    : isDemo ? 'demo' : null;

  useEffect(() => {
    if (!accountKey) return;
    const savedContacts = storage.getContacts(accountKey);
    if (savedContacts.length > 0) {
      savedContacts.forEach(c => { c.address = c.address.toLowerCase(); });
      const withAI = savedContacts.some(c => c.isAI) ? savedContacts : [AI_AGENT_CONTACT, ...savedContacts];
      setContacts(withAI);
    } else if (isDemo) {
      const dc = [AI_AGENT_CONTACT, ...DEMO_CONTACTS.map(c => ({ ...c, address: c.address.toLowerCase() }))];
      setContacts(dc);
    } else {
      setContacts([AI_AGENT_CONTACT]);
    }
    const savedMsgs = storage.getMsgs(accountKey);
    if (Object.keys(savedMsgs).length > 0) {
      const normalized: MsgsMap = {};
      Object.entries(savedMsgs).forEach(([addr, list]) => {
        const key = addr.toLowerCase();
        normalized[key] = [...(normalized[key] ?? []), ...(list ?? []).map(m => {
          if ((m.type === 'image' || m.type === 'file') && !m.fileUrl) {
            if (m.ipfsCid) m.fileUrl = getIpfsUrl(m.ipfsCid);
            else if (m.b64Data) m.fileUrl = m.b64Data;
          }
          if (m.type === 'voice' && m.audioMsgId && !m.audioUrl) {
            try { const b64 = storage.getAudio(m.audioMsgId); if (b64) m.audioUrl = b64ToObjectUrl(b64); } catch {}
          }
          return m;
        })];
      });
      setMsgs(normalized);
    } else if (isDemo) {
      setMsgs(buildInitMsgs());
    }
    const sp = storage.getProfile(accountKey);
    const p = { ...sp, address: walletRef.current?.address ?? null };
    setProfile(p);
    profileRef.current = p;
  }, [accountKey, isDemo]);

  useEffect(() => {
    if (!accountKey || contacts.length === 0) return;
    storage.setContacts(accountKey, contacts);
  }, [contacts, accountKey]);

  useEffect(() => {
    if (!accountKey) return;
    storage.setMsgs(accountKey, msgs);
  }, [msgs, accountKey]);

  const pushNotif = useCallback((contact: Contact, text: string) => {
    const n: Notif = { id: uid(), contact, text, ts: Date.now() };
    setNotifs(p => [...p.slice(-4), n]);
    setTimeout(() => setNotifs(p => p.filter(x => x.id !== n.id)), 5000);
  }, []);

  useInboxPoll({ wallet, isDemo, setMsgs, setContacts, pushNotif });

  const handleMediaUploaded = useCallback((mediaMsgId: string, cid: string | null, ipfsUrl: string | null, fallbackB64?: string) => {
    if (!accountKey) return;
    setMsgs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(addr => {
        updated[addr] = (updated[addr] ?? []).map(m => {
          const mId = m.mediaMsgId ?? m.imgMsgId ?? '';
          if (mId !== mediaMsgId) return m;
          if (cid) return { ...m, ipfsCid: cid, fileUrl: ipfsUrl ?? getIpfsUrl(cid), uploading: false, b64Data: undefined };
          if (fallbackB64) return { ...m, fileUrl: fallbackB64, b64Data: fallbackB64, uploading: false };
          return m;
        });
        // Update inbox
        updated[addr]?.forEach(m => {
          if ((m.mediaMsgId ?? m.imgMsgId) !== mediaMsgId) return;
          const toAddr = m._toAddr ?? addr;
          try {
            const inbox: Record<string, unknown>[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.inbox(toAddr)) ?? '[]');
            const ni = inbox.map(im => (im.mediaMsgId ?? im.imgMsgId) !== mediaMsgId ? im : cid ? { ...im, ipfsCid: cid, b64Data: null } : { ...im, b64Data: fallbackB64 });
            localStorage.setItem(STORAGE_KEYS.inbox(toAddr), JSON.stringify(ni));
          } catch {}
        });
      });
      try {
        const stored = storage.getMsgs(accountKey);
        Object.keys(stored).forEach(addr => {
          stored[addr] = (stored[addr] ?? []).map(m => {
            if ((m.mediaMsgId ?? m.imgMsgId) !== mediaMsgId) return m;
            if (cid) return { ...m, ipfsCid: cid, fileUrl: null, uploading: false };
            if (fallbackB64) return { ...m, b64Data: fallbackB64, fileUrl: null, uploading: false };
            return m;
          });
        });
        storage.setMsgs(accountKey, stored);
      } catch {}
      return updated;
    });
  }, [accountKey]);

  const handleReact = useCallback((contactAddr: string, msgId: string, emoji: string) => {
    setMsgs(p => {
      const addr = contactAddr.toLowerCase();
      return {
        ...p,
        [addr]: (p[addr] ?? []).map(m => {
          if (m.id !== msgId) return m;
          const reactions = { ...(m.reactions ?? {}) };
          reactions[emoji] = (reactions[emoji] ?? 0) === 1 ? 0 : 1;
          if (!isDemo && walletRef.current?.address) {
            try {
              const inbox: object[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.inbox(addr)) ?? '[]');
              inbox.push({ id: `rxn_${Date.now()}`, type: 'reaction', msgId, emoji, reactions, from: walletRef.current.address, ts: Date.now() });
              localStorage.setItem(STORAGE_KEYS.inbox(addr), JSON.stringify(inbox));
            } catch {}
          }
          return { ...m, reactions };
        }),
      };
    });
  }, [isDemo]);

  const sendMsg = useCallback(async (input: string | Partial<Message>) => {
    if (!activeRef.current) return;
    const isVoice = typeof input === 'object' && input.type === 'voice';
    const isImage = typeof input === 'object' && input.type === 'image';
    const isFile  = typeof input === 'object' && input.type === 'file';
    const block = nextBlock();
    const msg: Message = (isVoice || isImage || isFile)
      ? { id: uid(), out: true, ...(input as object), type: (input as Message).type, text: '', time: now(), block, confirms: 0, hash: rndHash(), pending: true }
      : { id: uid(), out: true, type: 'text', text: input as string, time: now(), block, confirms: 0, hash: rndHash(), pending: true };
    const addr = normalizeAddress(activeRef.current.address);
    setMsgs(p => ({ ...p, [addr]: [...(p[addr] ?? []), { ...msg, _toAddr: addr }] }));
    const preview = isVoice ? '🎙 Voice message' : isImage ? '🖼 Image' : isFile ? `📄 ${(input as Message).fileName ?? 'File'}` : input as string;
    setContacts(p => p.map(c => c.id === activeRef.current?.id ? { ...c, preview } : c));

    // AI Agent
    if (activeRef.current.isAI && typeof input === 'string') {
      const userMsg = input;
      const typingId = `ai_typing_${Date.now()}`;
      setMsgs(p => ({ ...p, [addr]: [...(p[addr] ?? []), { id: typingId, out: false, type: 'text', text: '...', time: now(), block, confirms: 0, hash: rndHash(), isTyping: true }] }));
      setContacts(p => p.map(c => c.isAI ? { ...c, preview: 'Typing...' } : c));
      setMsgs(prev => {
        const history = (prev[addr] ?? []).filter(m => !m.isTyping).slice(-10).map(m => ({ role: m.out ? 'user' : 'assistant', content: m.text }));
        const aiKey = storage.getAiKey() ?? DEFAULT_AI_KEY;
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': aiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: AI_MODEL, max_tokens: 1000, system: 'You are PMT AI Assistant, a helpful AI built into PMT-Chat, a decentralized blockchain messenger. Help users with any questions: crypto, blockchain, general knowledge, coding, math, advice, etc. Be concise and friendly. You are powered by Claude.', messages: [...history, { role: 'user', content: userMsg }] }),
        })
        .then(r => r.json())
        .then(data => {
          const reply: string = data.content?.[0]?.text ?? 'Sorry, I could not respond right now.';
          setMsgs(p => ({ ...p, [addr]: (p[addr] ?? []).filter(m => m.id !== typingId).concat({ id: `ai_${Date.now()}`, out: false, type: 'text', text: reply, time: now(), block, confirms: 3, hash: rndHash() }) }));
          setContacts(p => p.map(c => c.isAI ? { ...c, preview: reply.slice(0, 50) + (reply.length > 50 ? '...' : '') } : c));
        })
        .catch(() => {
          setMsgs(p => ({ ...p, [addr]: (p[addr] ?? []).filter(m => m.id !== typingId).concat({ id: `ai_err_${Date.now()}`, out: false, type: 'text', text: '⚠️ AI unavailable right now. Please try again.', time: now(), block, confirms: 0, hash: rndHash() }) }));
        });
        return prev;
      });
      return;
    }

    // Blockchain delivery
    if (!activeRef.current.isGroup && !activeRef.current.isAI && !isDemo && walletRef.current?.address) {
      const w = walletRef.current;
      const toAddr = normalizeAddress(activeRef.current.address);
      const msgContent = isVoice ? '🎙 Voice message' : isImage ? '🖼 Image' : isFile ? `📄 ${(input as Message).fileName ?? 'File'}` : input as string;
      const msgType = isVoice ? 'voice' : isImage ? 'image' : isFile ? 'file' : 'text';
      try {
        const inboxMsg = { id: msg.id, type: msg.type, text: msgContent, ...(isVoice && { duration: (input as Message).duration, waveform: (input as Message).waveform, audioMsgId: (input as Message).audioMsgId, ipfsCid: (input as Message).ipfsCid, ipfsUrl: (input as Message).ipfsUrl }), ...((isImage || isFile) && { ipfsCid: (input as Message).ipfsCid ?? null, b64Data: (input as Message).b64Data ?? null, mediaMsgId: (input as Message).mediaMsgId, imgMsgId: (input as Message).imgMsgId, fileName: (input as Message).fileName, fileSize: (input as Message).fileSize, mimeType: (input as Message).mimeType }), from: w.address, fromName: profileRef.current?.name || w.username || w.address.slice(0, 8), time: now(), block, hash: msg.hash, confirms: 0, ts: Date.now() };
        const existing: object[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.inbox(toAddr)) ?? '[]');
        localStorage.setItem(STORAGE_KEYS.inbox(toAddr), JSON.stringify([...existing, inboxMsg]));
      } catch {}
      try {
        const msgHash = await hashMessage(w.address, toAddr, msgContent, Date.now());
        const { txHash, chain } = await broadcastMessage({ from: w.address, to: toAddr, msgHash, msgType, blockNum: block, useMetaMask: !!(window.ethereum && w.isMetaMask), metaMaskProvider: window.ethereum ?? null });
        setMsgs(p => ({ ...p, [toAddr]: (p[toAddr] ?? []).map(m => m.id === msg.id ? { ...m, hash: shortHash(txHash), chain, onChain: true } : m) }));
      } catch {}
    }
  }, [isDemo, handleMediaUploaded]);

  const selectContact = useCallback((c: Contact) => {
    setActiveAndRef(c);
    const addr = normalizeAddress(c.address);
    setMsgs(p => p[addr] ? p : { ...p, [addr]: [] });
    setContacts(p => p.map(x => x.id === c.id ? { ...x, unread: 0 } : x));
    setMobileSidebarOpen(false);
  }, [setActiveAndRef]);

  const saveProfile = useCallback((np: Profile) => {
    setProfile(np); profileRef.current = np;
    if (accountKey) storage.setProfile(accountKey, np);
  }, [accountKey]);

  const handleWallet = useCallback((w: Wallet) => { setWallet(w); walletRef.current = w; setScreen('chat'); }, []);
  const handleDemo = useCallback(() => { setIsDemo(true); const w = { address: 'demo', balance: '2.847', network: 'PMT Chain', username: 'Demo' }; setWallet(w); walletRef.current = w; setScreen('chat'); }, []);
  const handleLogout = useCallback(() => { storage.clearSession(); setWallet(null); walletRef.current = null; setIsDemo(false); setContacts([]); setMsgs({}); setActiveAndRef(null); setScreen('landing'); }, [setActiveAndRef]);

  if (screen === 'landing') return <Landing onDemo={handleDemo} onCreateWallet={() => setScreen('create')} onImportWallet={() => setScreen('import')} onLogin={() => setScreen('login')} onMetaMask={() => { if (!window.ethereum) { alert('MetaMask not found.'); return; } window.ethereum.request({ method: 'eth_requestAccounts' }).then((acc) => { const accounts = acc as string[]; const w: Wallet = { address: accounts[0], balance: '0.000', network: 'Ethereum', isMetaMask: true }; setWallet(w); walletRef.current = w; setScreen('metamask_setup'); }).catch(() => {}); }} />;
  if (screen === 'create') return <CreateWalletFlow onWallet={handleWallet} onBack={() => setScreen('landing')} />;
  if (screen === 'import') return <ImportWalletFlow onWallet={handleWallet} onBack={() => setScreen('landing')} />;
  if (screen === 'login') return <LoginScreen onLogin={handleWallet} onBack={() => setScreen('landing')} />;
  if (screen === 'metamask_setup' && wallet) return <SetupMetaMaskFlow wallet={wallet} onDone={(username) => { setWallet(w => w ? { ...w, username } : w); setScreen('chat'); }} onSkip={() => setScreen('chat')} />;

  return (
    <AppContext.Provider value={{ wallet, profile, isDemo, darkMode, toggleTheme }}>
      <div className="app-grid">
        <div className={`sidebar-overlay${mobileSidebarOpen ? ' visible' : ''}`} onClick={() => setMobileSidebarOpen(false)} />
        <Sidebar contacts={contacts} activeId={active?.id ?? null} wallet={wallet} isDemo={isDemo} profile={profile} mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} onSelect={selectContact} onNew={() => setShowNew(true)} onNewGroup={() => setShowGroup(true)} onProfile={() => { setShowProfile(true); setMobileSidebarOpen(false); }} onSettings={() => { setShowSettings(true); setMobileSidebarOpen(false); }} onWallet={() => setShowWallet(true)} onLogout={handleLogout} onEditContact={setEditContact} onSearch={() => setShowSearch(true)} />
        <main className="chat-panel">
          {active ? <ChatPanel contact={active} messages={msgs[normalizeAddress(active.address)] ?? []} onSend={sendMsg} isDemo={isDemo} onReact={(msgId, emoji) => handleReact(normalizeAddress(active.address), msgId, emoji)} onMediaUploaded={handleMediaUploaded} onOpenSidebar={() => setMobileSidebarOpen(true)} /> : <Empty onNew={() => setShowNew(true)} onOpenSidebar={() => setMobileSidebarOpen(true)} />}
        </main>
      </div>
      {showProfile && <ProfileModal profile={{ ...profile, address: wallet?.address ?? null }} onClose={() => setShowProfile(false)} onSave={saveProfile} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} darkMode={darkMode} onToggleTheme={toggleTheme} />}
      {showWallet && <WalletModal wallet={wallet} isDemo={isDemo} onClose={() => setShowWallet(false)} />}
      {showNew && <NewChatModal onClose={() => setShowNew(false)} onAdd={(c) => { setContacts(p => p.find(x => normalizeAddress(x.address) === normalizeAddress(c.address)) ? p : [...p, c]); selectContact(c); setShowNew(false); }} />}
      {showGroup && <GroupChatModal contacts={contacts.filter(c => !c.isAI && !c.isGroup)} onClose={() => setShowGroup(false)} onCreate={(g) => { setContacts(p => [g, ...p]); selectContact(g); setShowGroup(false); }} />}
      {editContact && <EditContactModal contact={editContact} onClose={() => setEditContact(null)} onSave={(u) => { setContacts(p => p.map(c => c.id === editContact.id ? { ...c, ...u } : c)); if (active?.id === editContact.id) setActiveAndRef({ ...active, ...u }); setEditContact(null); }} onDelete={() => { setContacts(p => p.filter(c => c.id !== editContact.id)); if (active?.id === editContact.id) setActiveAndRef(null); setEditContact(null); }} />}
      {showSearch && <SearchOverlay contacts={contacts} msgs={msgs} onClose={() => setShowSearch(false)} onNavigate={(cId) => { const c = contacts.find(x => x.id === cId); if (c) { selectContact(c); setShowSearch(false); }}} />}
      <NotificationToast notifs={notifs} onDismiss={(id) => setNotifs(p => p.filter(n => n.id !== id))} onSelect={(n) => { selectContact(n.contact); setNotifs(p => p.filter(x => x.id !== n.id)); }} />
    </AppContext.Provider>
  );
}

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; isMetaMask?: boolean; };
    _PMT_AI_KEY?: string;
  }
}
