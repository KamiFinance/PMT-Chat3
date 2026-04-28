import type { Contact, MsgsMap } from '../types';
import { rndHash, currentBlock } from '../lib/utils';

export const DEMO_CONTACTS: Contact[] = [
  { id: 1, address: '0x1db3c...7c4f', name: 'vitalik.eth', avatar: 'VB', color: '#a78bfa', bg: '#1e1b30', online: true },
  { id: 2, address: '0x9a1fc...2e5b', name: 'satoshi.btc', avatar: 'SN', color: '#f59e0b', bg: '#2a1f0a', online: false },
  { id: 3, address: '0x3c7da...0a1e', name: 'alice.defi',  avatar: 'AD', color: '#34d399', bg: '#0a2a1f', online: true },
  { id: 4, address: '0x7e2ab...b3f8', name: 'bob.nft',     avatar: 'BN', color: '#63d2ff', bg: '#0a1f2a', online: false },
  { id: 5, address: '0x2b9cc...5d7a', name: 'carol.dao',   avatar: 'CD', color: '#f43f5e', bg: '#2a0a14', online: true },
];

export function buildInitMsgs(): MsgsMap {
  const B = currentBlock();
  return {
    '0x1db3c...7c4f': [
      { id: 'm1', out: false, type: 'text', text: 'Hey! Did you see the new L2 upgrade proposal?', time: '09:30', block: B - 21, confirms: 24, hash: rndHash() },
      { id: 'm2', out: true,  type: 'text', text: 'Yes! Gas optimization looks ~60% better.', time: '09:32', block: B - 19, confirms: 22, hash: rndHash() },
      { id: 'm3', out: false, type: 'text', text: "I'm running benchmarks on testnet now.", time: '09:35', block: B - 16, confirms: 18, hash: rndHash() },
      { id: 'm4', out: false, type: 'text', text: 'When is the mainnet governance vote?', time: '09:41', block: B - 6, confirms: 6, hash: rndHash() },
    ],
    '0x9a1fc...2e5b': [
      { id: 'm5', out: false, type: 'text', text: 'Peer-to-peer electronic cash system.', time: '08:10', block: B - 145, confirms: 145, hash: rndHash() },
      { id: 'm6', out: true,  type: 'text', text: 'Satoshi?! Is that really you?!', time: '08:12', block: B - 143, confirms: 143, hash: rndHash() },
      { id: 'm7', out: false, type: 'text', text: 'Trust the math, not the messengers.', time: '08:20', block: B - 130, confirms: 130, hash: rndHash() },
    ],
    '0x3c7da...0a1e': [
      { id: 'm9',  out: true,  type: 'text', text: 'Deploying the new staking contract now!', time: 'Yesterday 14:22', block: B - 1400, confirms: 1400, hash: rndHash() },
      { id: 'm10', out: false, type: 'text', text: 'Tx confirmed in block! All functions verified on Etherscan', time: 'Yesterday 14:25', block: B - 1396, confirms: 1396, hash: rndHash() },
    ],
    '0x7e2ab...b3f8': [
      { id: 'm11', out: false, type: 'text', text: "NFT floor price just 3x'd. Rare trait holders printing.", time: 'Mon', block: B - 2900, confirms: 2900, hash: rndHash() },
    ],
    '0x2b9cc...5d7a': [
      { id: 'm12', out: false, type: 'text', text: 'Voted yes on proposal #47 - treasury diversification.', time: 'Sun', block: B - 4200, confirms: 4200, hash: rndHash() },
      { id: 'm13', out: true,  type: 'text', text: 'Same. Quorum reached, it passes!', time: 'Sun', block: B - 4195, confirms: 4195, hash: rndHash() },
    ],
  };
}
