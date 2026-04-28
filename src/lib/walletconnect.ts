// WalletConnect v2 helper — lazy-initialises the provider on first use
import { WC_PROJECT_ID } from '../constants/keys';

let wcProvider: any = null;

export async function getWCProvider() {
  if (wcProvider) return wcProvider;
  const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
  wcProvider = await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    chains: [1],
    optionalChains: [137, 10, 42161, 56, 43114],
    showQrModal: false,   // we render our own QR
    metadata: {
      name: 'PMT-Chat',
      description: 'Decentralized encrypted messenger on PMT Chain',
      url: 'https://pmt-chat3.vercel.app',
      icons: ['https://pmt-chat3.vercel.app/pmt-logo.png'],
    },
  });
  return wcProvider;
}

export function resetWCProvider() {
  if (wcProvider) {
    try { wcProvider.disconnect().catch(() => {}); } catch {}
    wcProvider = null;
  }
}
