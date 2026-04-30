// Cross-device message relay using ioredis + KV_REDIS_URL
// Key: pmt:inbox:{address} — stores messages for that address
// Key: pmt:online:{address} — stores last-seen timestamp + username

import Redis from 'ioredis';

let _redis = null;

function getRedis() {
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  if (_redis && (_redis.status === 'ready' || _redis.status === 'connect')) return _redis;
  if (_redis) { try { _redis.disconnect(); } catch {} }
  _redis = new Redis(url, {
    maxRetriesPerRequest: 1, connectTimeout: 5000, commandTimeout: 5000,
    enableOfflineQueue: true, lazyConnect: false,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
  _redis.on('error', () => { _redis = null; });
  return _redis;
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
  const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim();

  if (!address && !username) { res.status(400).json({ error: 'address or username required' }); return; }

  const r = getRedis();
  if (!r) {
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(200).json({ ok: true, relay: 'disabled' });
  }

  // Wait for Redis ready
  if (r.status !== 'ready') {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 4000);
      r.once('ready', () => { clearTimeout(t); resolve(); });
      r.once('error', (e) => { clearTimeout(t); reject(e); });
    }).catch(() => {});
  }

  // If username provided, resolve to current address
  let resolvedAddress = address;
  if (username && !address) {
    try {
      const raw = await r.get(`pmt:user:${username}`);
      if (raw) {
        const user = JSON.parse(raw);
        resolvedAddress = user.address?.toLowerCase();
      }
    } catch {}
  }

  if (!resolvedAddress) {
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(404).json({ error: 'user not found' });
  }

  const key = `pmt:inbox:${resolvedAddress}`;

  try {
    if (req.method === 'GET') {
      // Register heartbeat: address → username mapping
      if (address) {
        try {
          if (username) await r.set(`pmt:addr:${address}`, username, 'EX', 86400);
          await r.set(`pmt:online:${address}`, Date.now(), 'EX', 3600);
        } catch {}
      }
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      return res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);

      // If recipient username known, also deliver to their current registered address
      const toUsername = msg.toUsername;
      let deliveredTo = [resolvedAddress];

      if (toUsername) {
        try {
          const raw = await r.get(`pmt:user:${toUsername.toLowerCase()}`);
          if (raw) {
            const user = JSON.parse(raw);
            const currentAddr = user.address?.toLowerCase();
            if (currentAddr && currentAddr !== resolvedAddress) {
              // Deliver to both old address and current registered address
              await r.rpush(`pmt:inbox:${currentAddr}`, JSON.stringify(msg));
              await r.expire(`pmt:inbox:${currentAddr}`, 604800);
              deliveredTo.push(currentAddr);
            }
          }
        } catch {}
      }

      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800);
      return res.status(200).json({ ok: true, deliveredTo });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox]', e.message);
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(500).json({ error: e.message });
  }
}
