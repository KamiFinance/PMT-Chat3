// User registry: username → { cid, passwordHash, salt, address }
import Redis from 'ioredis';

let redis = null;

function getRedis() {
  if (!process.env.KV_REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.KV_REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
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
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const r = getRedis();

  // GET /api/auth?username=xxx
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const username = (url.searchParams.get('username') || '').toLowerCase().trim();
    if (!username) { res.status(400).json({ error: 'username required' }); return; }
    if (!r) { res.status(404).json({ error: 'User not found' }); return; }
    try {
      const raw = await r.get(`pmt:user:${username}`);
      if (!raw) { res.status(404).json({ error: 'User not found' }); return; }
      res.status(200).json(JSON.parse(raw));
    } catch (e) { res.status(500).json({ error: String(e) }); }
    return;
  }

  // POST /api/auth — register or update user backup CID
  if (req.method === 'POST') {
    if (!r) { res.status(503).json({ error: 'Storage unavailable' }); return; }
    let body = '';
    await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
    try {
      const { username, cid, passwordHash, salt, address } = JSON.parse(body);
      if (!username || !cid || !passwordHash || !salt || !address) {
        res.status(400).json({ error: 'Missing required fields' }); return;
      }
      const key = `pmt:user:${username.toLowerCase().trim()}`;
      const existing = await r.get(key);
      if (existing) {
        const prev = JSON.parse(existing);
        if (prev.passwordHash !== passwordHash) {
          res.status(403).json({ error: 'Username already taken' }); return;
        }
      }
      const record = { username: username.toLowerCase().trim(), cid, passwordHash, salt, address, updated: Date.now() };
      await r.set(key, JSON.stringify(record));
      res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
    return;
  }

  res.status(405).end();
}
