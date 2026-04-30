// @ts-nocheck
// Cloud backup: encrypt full account data → Pinata IPFS → Redis registry
// Zero-knowledge: password never leaves device, only hash + encrypted blob stored

import { PMTAuth } from './auth';

// JWT resolved at call time from localStorage or env

// ── Encrypt/decrypt full backup ──────────────────────────────────────────────

async function encryptBackup(data: object, password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt'] as KeyUsage[]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  const toHex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return JSON.stringify({ v: 2, encrypted: toHex(new Uint8Array(encrypted)), iv: toHex(iv) });
}

async function decryptBackup(blob: string, password: string, salt: string): Promise<object> {
  const { encrypted, iv } = JSON.parse(blob);
  const enc = new TextEncoder();
  const toBytes = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBytes(salt), iterations: 150000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt'] as KeyUsage[]
  );
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBytes(iv) }, key, toBytes(encrypted));
  return JSON.parse(new TextDecoder().decode(dec));
}

// ── Pinata upload/download ───────────────────────────────────────────────────

async function uploadToIPFS(content: string): Promise<string> {
  const { uploadToPinata } = await import('./pinata');
  const blob = new Blob([content], { type: 'application/json' });
  return uploadToPinata(blob, 'pmt_backup_' + Date.now() + '.json');
}

async function fetchFromIPFS(cid: string): Promise<string> {
  const { fetchFromIpfs } = await import('./pinata');
  const res = await fetchFromIpfs(cid);
  return res.text();
}

// ── Registry API calls ───────────────────────────────────────────────────────

async function registryGet(username: string): Promise<{ cid: string; passwordHash: string; salt: string; address: string } | null> {
  try {
    const res = await fetch(`/api/auth?username=${encodeURIComponent(username.toLowerCase().trim())}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function registrySet(username: string, cid: string, passwordHash: string, salt: string, address: string): Promise<void> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.toLowerCase().trim(), cid, passwordHash, salt, address }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Registry error: ${res.status}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface BackupData {
  wallet: { address: string; privateKey?: string; username?: string };
  contacts: object[];
  messages: Record<string, object[]>;
  profile: object;
}

/**
 * Save encrypted backup to IPFS + register in Redis.
 * Called after account creation and periodically as data changes.
 */
export async function saveCloudBackup(
  username: string,
  password: string,
  data: BackupData
): Promise<{ cid: string }> {
  // 1. Derive salt and hash password for registry
  const { hash: passwordHash, salt } = await PMTAuth.hashPassword(password);
  const saltBytes = new Uint8Array((salt.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));

  // 2. Encrypt the full backup
  const encrypted = await encryptBackup(data, password, saltBytes);

  // 3. Upload to IPFS
  const cid = await uploadToIPFS(encrypted);

  // 4. Register in Redis (username → cid)
  await registrySet(username, cid, passwordHash, salt, data.wallet.address);

  return { cid };
}

/**
 * Load and decrypt backup from IPFS for cross-device login.
 * Returns null if user not found or password wrong.
 */
export async function loadCloudBackup(
  username: string,
  password: string
): Promise<BackupData | null> {
  // 1. Look up registry
  const record = await registryGet(username);
  if (!record) return null;

  // 2. Verify password client-side (before downloading)
  const ok = await PMTAuth.verifyPassword(password, record.passwordHash, record.salt);
  if (!ok) throw new Error('WRONG_PASSWORD');

  // 3. Fetch encrypted blob from IPFS
  const blob = await fetchFromIPFS(record.cid);

  // 4. Decrypt
  const data = await decryptBackup(blob, password, record.salt) as BackupData;
  return data;
}

/**
 * Check if a username is already registered in the cloud.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const record = await registryGet(username);
  return record === null;
}
