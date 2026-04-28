// Wallet auth: password hashing and wallet encryption via Web Crypto API

export const PMTAuth = {
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    salt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256
    );
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt };
  },

  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const result = await PMTAuth.hashPassword(password, salt);
    return result.hash === hash;
  },

  async encryptWallet(walletData: object, password: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = enc.encode(JSON.stringify(walletData));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.stringify({
      encrypted: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    });
  },

  async decryptWallet(encryptedStr: string, password: string): Promise<object> {
    const { encrypted, salt, iv } = JSON.parse(encryptedStr);
    const enc = new TextEncoder();
    const toBytes = (hex: string) => new Uint8Array((hex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toBytes(salt), iterations: 100000, hash: 'SHA-256' },
      keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBytes(iv) }, key, toBytes(encrypted));
    return JSON.parse(new TextDecoder().decode(decrypted));
  },
};
