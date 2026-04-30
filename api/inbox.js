// Cross-device message relay
// Auto-derives Upstash REST credentials from KV_REDIS_URL if REST vars not set

import Redis from 'ioredis';

function getCreds() {
  // Prefer explicit REST vars
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { type: 'rest', url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  // Derive REST from KV_REDIS_URL (Vercel Redis = Upstash under the hood)
  // redis://default:TOKEN@HOST:PORT  →  https://HOST  + Bearer TOKEN
  const raw = process.env.KV_REDIS_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      const token = decodeURIComponent(u.password || u.username);
      const host = u.hostname;
      if (token && host) {
        return { type: 'rest', url: `https://${host}`, token };
      }
    } catch {}
    // Fall back to TCP if URL parsing fails
    return { type: 'tcp', raw };
  }
  return null;
}

async function restCmd(url, token, args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${res.status}: ${text}`);
  }
  return (await res.json()).result;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const address = (urlObj.searchParams.get('address') || '').toLowerCase().slice(0, 66);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const creds = getCreds();
  if (!creds) {
    res.status(200).json(req.method === 'GET' ? [] : { ok: true, relay: 'disabled' });
    return;
  }

  const key = `pmt:${address}`;

  // --- REST path ---
  if (creds.type === 'rest') {
    try {
      if (req.method === 'GET') {
        const msgs = await restCmd(creds.url, creds.token, ['LRANGE', key, 0, -1]);
        if (msgs?.length) await restCmd(creds.url, creds.token, ['DEL', key]);
        const parsed = (msgs||[]).map(m=>{try{return JSON.parse(m);}catch{return null;}}).filter(Boolean);
        return res.status(200).json(parsed);
      }
      if (req.method === 'POST') {
        let body = '';
        await new Promise(r=>{req.on('data',c=>body+=c);req.on('end',r);});
        const msg = JSON.parse(body);
        await restCmd(creds.url, creds.token, ['RPUSH', key, JSON.stringify(msg)]);
        await restCmd(creds.url, creds.token, ['EXPIRE', key, 604800]);
        return res.status(200).json({ ok: true });
      }
    } catch(e) {
      console.error('[inbox REST]', e.message);
      // Log the url prefix for debugging (not the token)
      console.error('[inbox REST] url prefix:', creds.url?.slice(0,40));
      return res.status(req.method==='GET'?200:500).json(
        req.method==='GET' ? [] : { error: e.message }
      );
    }
  }

  // --- TCP path (fallback) ---
  const r = new Redis(creds.raw, {
    maxRetriesPerRequest: 1, connectTimeout: 5000, commandTimeout: 5000,
    enableOfflineQueue: false,
    tls: creds.raw.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
  r.on('error', () => {});
  try {
    if (req.method === 'GET') {
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length) await r.del(key);
      const parsed = msgs.map(m=>{try{return JSON.parse(m);}catch{return null;}}).filter(Boolean);
      return res.status(200).json(parsed);
    }
    if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve=>{req.on('data',c=>body+=c);req.on('end',resolve);});
      const msg = JSON.parse(body);
      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800);
      return res.status(200).json({ ok: true });
    }
  } catch(e) {
    console.error('[inbox TCP]', e.message);
    return res.status(req.method==='GET'?200:500).json(
      req.method==='GET' ? [] : { error: e.message }
    );
  } finally { r.disconnect(); }

  res.status(405).end();
}
