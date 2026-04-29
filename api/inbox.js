// Cross-device message relay using ioredis + KV_REDIS_URL
import Redis from 'ioredis';

let _redis = null;
function getRedis() {
  if (!process.env.KV_REDIS_URL) return null;
  if (_redis) return _redis;
  _redis = new Redis(process.env.KV_REDIS_URL, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  _redis.on('error', (err) => { console.error('Redis err:', err.message); _redis = null; });
  return _redis;
}

function headers(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

export default async function handler(req, res) {
  headers(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const address = (url.searchParams.get('address') || '').toLowerCase().replace(/[^0-9a-fx]/gi, '').slice(0, 66);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const r = getRedis();
  const key = `pmt:inbox:${address}`;

  if (!r) {
    if (req.method === 'GET') { res.status(200).json([]); return; }
    res.status(200).json({ ok: true, relay: 'disabled' }); return;
  }

  if (req.method === 'GET') {
    try {
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      res.status(200).json(parsed);
    } catch(e) { console.error('GET error:', e.message); res.status(200).json([]); }
    return;
  }

  if (req.method === 'POST') {
    try {
      // Use req.body (Vercel pre-parses JSON) or fall back to stream
      let msg = req.body;
      if (!msg || typeof msg === 'string') {
        let raw = typeof msg === 'string' ? msg : '';
        if (!raw) {
          raw = await new Promise(resolve => {
            let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d));
          });
        }
        msg = JSON.parse(raw);
      }
      if (!msg || !msg.from) { res.status(400).json({ error: 'invalid message' }); return; }
      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800); // 7 days
      res.status(200).json({ ok: true });
    } catch(e) { console.error('POST error:', e.message); res.status(500).json({ error: String(e) }); }
    return;
  }

  res.status(405).end();
}
