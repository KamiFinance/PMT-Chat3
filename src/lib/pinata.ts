import { DEFAULT_PINATA_JWT, IPFS_GATEWAYS } from '../constants/keys';
import { storage } from './storage';

function getJwt(): string {
  return storage.getPinataJwt() ?? DEFAULT_PINATA_JWT;
}

export function getIpfsUrl(cid: string): string {
  return `${IPFS_GATEWAYS[0]}${cid}`;
}

export async function uploadToPinata(file: File | Blob, fileName: string): Promise<string> {
  const jwt = getJwt();
  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  return data.IpfsHash as string;
}

export async function fetchFromIpfs(cid: string): Promise<Response> {
  for (const gw of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gw}${cid}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return res;
    } catch {
      // Try next gateway
    }
  }
  throw new Error(`Failed to fetch from IPFS: ${cid}`);
}

export function isConfigured(): boolean {
  return true; // Always configured — default key hardcoded
}
