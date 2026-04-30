// Cross-device message relay using ioredis + KV_REDIS_URL
import Redis from 'ioredis';

function makeRedis() {
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  const r = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    commandTimeout: 4000,
    enableOfflineQueue: false,
    lazyConnect: false,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
  r.on('error', () => {}); // suppress unhandled error events
  return r;
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

  const url = new URL(req.url, `http://${req.headers.host}`);
  const address = (url.searchParams.get('address') || '').toLowerCase().slice(0, 66);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  // Create a fresh Redis connection per request (serverless-safe)
  const r = makeRedis();
  if (!r) {
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const key = `pmt:${address}`;

  try {
    if (req.method === 'GET') {
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);
      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800); // 7 days
      res.status(200).json({ ok: true });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox] Redis error:', e.message);
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(500).json({ error: String(e.message) });
  } finally {
    r.disconnect();
  }
}
