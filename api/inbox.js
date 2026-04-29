// Cross-device message relay using ioredis + KV_REDIS_URL (Vercel Redis integration)
import Redis from 'ioredis';

let redis = null;

function getRedis() {
  if (!process.env.KV_REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.KV_REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: false,
      tls: process.env.KV_REDIS_URL.startsWith('rediss://') ? {} : undefined,
    });
    redis.on('error', () => { redis = null; });
  }
  return redis;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Prevent browser/CDN caching — inbox must always be fresh
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const address = (url.searchParams.get('address') || '').toLowerCase().slice(0, 66);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const r = getRedis();

  // Graceful fallback when Redis not configured
  if (!r) {
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const key = `pmt:${address}`;

  if (req.method === 'GET') {
    try {
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      res.status(200).json(parsed);
    } catch { res.status(200).json([]); }

  } else if (req.method === 'POST') {
    let body = '';
    await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
    try {
      const msg = JSON.parse(body);
      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800); // 7 days
      res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }

  } else {
    res.status(405).end();
  }
}
