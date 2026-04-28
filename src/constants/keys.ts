// Hardcoded default keys — users can override in Settings
export const DEFAULT_PINATA_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwZWM1YTg4Ni1hYTk2LTRhYTEtOTU0MS0xNDkwMjZhNDhmMjAiLCJlbWFpbCI6ImRldkBwdWJsaWNtYXN0ZXJwaWVjZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjY0NzI2MDA4MGZkNDUwZGRmNWMiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTJlMDE3ODMyODUxNGJiZmRjMjZmNjhiMDIwNDBjZjI0YjA3MzY0ZjE3YTc0NWUzNmE4NGMwM2E4NjVmZDM2IiwiZXhwIjoxODA4OTE0MDkyfQ.3aAHmqVeOgQr8h0r2Vcv-v-hpNUkk3xRBpt4ScK0pGM';

// AI key: read from env var at build time (set in Vercel dashboard)
// Falls back to empty — user can enter their own key in Settings
export const DEFAULT_AI_KEY: string =
  (import.meta as any).env?.VITE_ANTHROPIC_KEY ?? '';

export const AI_MODEL = 'claude-sonnet-4-5';

export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
] as const;
