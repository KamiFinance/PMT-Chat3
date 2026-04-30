// @ts-nocheck
// Cloud backup — encrypt full account data → store directly in Redis via /api/auth
// No Pinata/IPFS needed. Zero-knowledge: password never leaves device.

import { PMTAuth } from './auth';

// ── Encrypt/decrypt ───────────────────────────────────────────────────────────

async function encryptBackup(data: object, password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const toBytes = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBytes(saltHex), iterations: 150000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  const toHex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return JSON.stringify({ v: 3, encrypted: toHex(new Uint8Array(encrypted)), iv: toHex(iv) });
}

async function decryptBackup(blob: string, password: string, saltHex: string): Promise<object> {
  const { encrypted, iv } = JSON.parse(blob);
  const enc = new TextEncoder();
  const toBytes = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBytes(saltHex), iterations: 150000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBytes(iv) }, key, toBytes(encrypted));
  return JSON.parse(new TextDecoder().decode(dec));
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface BackupData {
  wallet: { address: string; privateKey?: string; username?: string };
  contacts: object[];
  messages: Record<string, object[]>;
  profile: object;
}

/**
 * Save encrypted backup directly to Redis via /api/auth.
 * No Pinata/IPFS required — works with zero external config.
 * Uses the stored passwordSalt so the hash is stable across saves.
 */
export async function saveCloudBackup(
  username: string,
  password: string,
  data: BackupData
): Promise<void> {
  const uname = username.toLowerCase().trim();

  // Reuse existing salt so passwordHash stays consistent (lets server verify ownership)
  const accountKey = `pmt_account_${uname}`;
  const stored = localStorage.getItem(accountKey);
  const existingSalt = stored ? (JSON.parse(stored).passwordSalt ?? null) : null;

  const { hash: passwordHash, salt } = await PMTAuth.hashPassword(password, existingSalt ?? undefined);

  // Encrypt the full backup with this salt
  const encryptedBackup = await encryptBackup(data, password, salt);

  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: uname,
      passwordHash,
      salt,
      address: data.wallet.address,
      encryptedBackup,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Backup error: ${res.status}`);
  }
}

/**
 * Load and decrypt backup from Redis for cross-device login.
 * Returns null if user not found. Throws if password wrong.
 */
export async function loadCloudBackup(
  username: string,
  password: string
): Promise<BackupData | null> {
  const res = await fetch(`/api/auth?username=${encodeURIComponent(username.toLowerCase().trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const record = await res.json();

  // Verify password before decrypting
  const ok = await PMTAuth.verifyPassword(password, record.passwordHash, record.salt);
  if (!ok) throw new Error('WRONG_PASSWORD');

  if (!record.encryptedBackup) return null; // old account — no backup yet

  const data = await decryptBackup(record.encryptedBackup, password, record.salt) as BackupData;
  return data;
}

/**
 * Check if a username is already registered.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const res = await fetch(`/api/auth?username=${encodeURIComponent(username.toLowerCase().trim())}`);
  return res.status === 404;
}
