// Cross-device message relay using Upstash Redis (via KV_REDIS_URL)
import Redis from 'ioredis';

let redis = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    lazyConnect: true,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
  redis.on('error', () => {}); // silence errors
  return redis;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const r = getRedis();
  if (!r) {
    // No Redis configured — graceful fallback (same-device only)
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const address = (url.searchParams.get('address') || '').toLowerCase().replace(/[^a-fx0-9]/g, '').slice(0, 42);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const key = `pmt:inbox:${address}`;

  try {
    await r.connect().catch(() => {}); // already connected is OK

    if (req.method === 'GET') {
      const len = await r.llen(key);
      if (!len) { res.status(200).json([]); return; }
      const pipeline = r.pipeline();
      pipeline.lrange(key, 0, -1);
      pipeline.del(key);
      const results = await pipeline.exec();
      const raw = results?.[0]?.[1] ?? [];
      const msgs = (Array.isArray(raw) ? raw : [])
        .map(m => { try { return JSON.parse(m); } catch { return null; } })
        .filter(Boolean);
      res.status(200).json(msgs);
    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);
      const pipeline = r.pipeline();
      pipeline.rpush(key, JSON.stringify(msg));
      pipeline.expire(key, 604800); // 7 days
      await pipeline.exec();
      res.status(200).json({ ok: true });
    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('Redis error:', e.message);
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(500).json({ error: 'relay unavailable' });
  }
}
