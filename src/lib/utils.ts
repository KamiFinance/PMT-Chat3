// ── Time / Block ────────────────────────────────────────────────────────────
export function now(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

let _block = 18_400_000 + Math.floor(Math.random() * 10_000);
export function nextBlock(): number {
  return ++_block;
}
export function currentBlock(): number {
  return _block;
}

// ── Random helpers ──────────────────────────────────────────────────────────
export function rndHash(): string {
  const chars = '0123456789abcdef';
  const hex = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * 16)]).join('');
  return `0x${hex}...`;
}

export function uid(): string {
  return 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
}

// ── Formatting ──────────────────────────────────────────────────────────────
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Address normalization ────────────────────────────────────────────────────
export function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}

// ── Base64 helpers ───────────────────────────────────────────────────────────
export function b64ToBlob(b64: string): Blob {
  const [header, data] = b64.split(',');
  const mime = header.split(':')[1].split(';')[0];
  const decoded = atob(data);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function b64ToObjectUrl(b64: string): string {
  return URL.createObjectURL(b64ToBlob(b64));
}

// ── Deep clone (for localStorage round-trip safety) ─────────────────────────
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
