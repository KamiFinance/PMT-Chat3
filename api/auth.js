// User registry: username → { cid, passwordHash, salt, address }
// Pure fetch REST — no ioredis, no TCP connections

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function redis(cmd, ...args) {
  // Try all common Upstash/Vercel KV env var name patterns
  const url = process.env.UPSTASH_KV_REST_API_URL
    || process.env.KV_REST_API_URL
    || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_KV_REST_API_TOKEN
    || process.env.KV_REST_API_TOKEN
    || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) throw new Error('No Redis REST credentials found');

  const path = [cmd, ...args].map(a => encodeURIComponent(String(a))).join('/');
  const res = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // GET /api/auth?username=xxx
    if (req.method === 'GET') {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim();
      if (!username) { res.status(400).json({ error: 'username required' }); return; }
      const raw = await redis('GET', `pmt:user:${username}`);
      if (!raw) { res.status(404).json({ error: 'User not found' }); return; }
      return res.status(200).json(JSON.parse(raw));
    }

    // POST /api/auth — register or update
    if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const { username, cid, passwordHash, salt, address } = JSON.parse(body);
      if (!username || !cid || !passwordHash || !salt || !address) {
        res.status(400).json({ error: 'Missing required fields' }); return;
      }
      const key = `pmt:user:${username.toLowerCase().trim()}`;
      const existing = await redis('GET', key);
      if (existing) {
        const prev = JSON.parse(existing);
        if (prev.passwordHash !== passwordHash) {
          res.status(403).json({ error: 'Username already taken' }); return;
        }
      }
      const record = { username: username.toLowerCase().trim(), cid, passwordHash, salt, address, updated: Date.now() };
      await redis('SET', key, JSON.stringify(record));
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('[auth]', e.message);
    res.status(500).json({ error: e.message });
  }
}
