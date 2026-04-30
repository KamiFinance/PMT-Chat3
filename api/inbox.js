// Cross-device message relay — ioredis with serverless-safe connection handling

let _redis = null;
let _connecting = false;

async function getRedis() {
  const { default: Redis } = await import('ioredis');
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;

  // Reuse connection if healthy
  if (_redis && (_redis.status === 'ready' || _redis.status === 'connect')) {
    return _redis;
  }

  // Create new connection
  if (_redis) { try { _redis.disconnect(); } catch {} }

  _redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => (times > 2 ? null : 100),
    connectTimeout: 6000,
    commandTimeout: 6000,
    enableOfflineQueue: true,
    lazyConnect: false,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    // Redis Cloud requires TLS even on redis:// sometimes
  });
  _redis.on('error', (e) => { console.error('[inbox redis error]', e.message); });

  // Wait for ready or error
  await new Promise((resolve, reject) => {
    if (_redis.status === 'ready') return resolve();
    const timeout = setTimeout(() => reject(new Error('Redis connect timeout')), 6000);
    _redis.once('ready', () => { clearTimeout(timeout); resolve(); });
    _redis.once('error', (e) => { clearTimeout(timeout); reject(e); });
  });

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
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  let r;
  try {
    r = await getRedis();
  } catch (e) {
    console.error('[inbox] connect failed:', e.message);
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(200).json({ ok: true, relay: 'disabled', reason: e.message });
  }

  if (!r) {
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(200).json({ ok: true, relay: 'disabled' });
  }

  const key = `pmt:${address}`;

  try {
    if (req.method === 'GET') {
      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      return res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);
      await r.rpush(key, JSON.stringify(msg));
      await r.expire(key, 604800);
      return res.status(200).json({ ok: true });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox] command error:', e.message);
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(500).json({ error: e.message });
  }
}
