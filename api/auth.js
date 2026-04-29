// User registry: maps username → { cid (IPFS backup), passwordHash, salt, address }
// Uses Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  const path = [cmd, ...args.map(a => encodeURIComponent(String(a)))].join('/');
  const res = await fetch(`${KV_URL}/${path}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  return data.result ?? null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET /api/auth?username=xxx — look up user record
  if (req.method === 'GET') {
    const username = (req.query.username || '').toLowerCase().trim();
    if (!username) { res.status(400).json({ error: 'username required' }); return; }
    try {
      const raw = await kv('get', `pmt:user:${username}`);
      if (!raw) { res.status(404).json({ error: 'User not found' }); return; }
      const record = JSON.parse(raw);
      // Return everything except we keep passwordHash for client-side verification
      res.status(200).json(record);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
    return;
  }

  // POST /api/auth — register or update user backup
  if (req.method === 'POST') {
    let body = '';
    await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
    try {
      const { username, cid, passwordHash, salt, address } = JSON.parse(body);
      if (!username || !cid || !passwordHash || !salt || !address) {
        res.status(400).json({ error: 'Missing fields: username, cid, passwordHash, salt, address' });
        return;
      }
      const key = `pmt:user:${username.toLowerCase().trim()}`;
      // If user exists, verify ownership via passwordHash before allowing update
      const existing = await kv('get', key);
      if (existing) {
        const prev = JSON.parse(existing);
        // Allow update only if passwordHash matches (same user)
        if (prev.passwordHash !== passwordHash) {
          res.status(403).json({ error: 'Username already taken' });
          return;
        }
      }
      const record = { username: username.toLowerCase().trim(), cid, passwordHash, salt, address, updated: Date.now() };
      await kv('set', key, JSON.stringify(record));
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
    return;
  }

  res.status(405).end();
}
