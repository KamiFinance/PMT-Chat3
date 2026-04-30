// Cross-device message relay — pure fetch REST, no TCP connections
// Works reliably in Vercel serverless (no ioredis, no persistent connections)

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache');
}

// Execute a Redis command via REST API (works with both Upstash and Redis Cloud REST)
async function redis(cmd, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // If REST URL available, use it
  if (url && token) {
    const res = await fetch(`${url}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.result;
  }

  // Fallback: derive Upstash REST from KV_REDIS_URL redis://default:TOKEN@HOST
  const redisUrl = process.env.KV_REDIS_URL;
  if (redisUrl) {
    try {
      const u = new URL(redisUrl);
      const restUrl = `https://${u.hostname}`;
      const restToken = u.password;
      const res = await fetch(`${restUrl}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
        headers: { Authorization: `Bearer ${restToken}` }
      });
      const data = await res.json();
      return data.result;
    } catch {}
  }

  throw new Error('No Redis REST credentials configured');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const address = (urlObj.searchParams.get('address') || '').toLowerCase().trim();
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const key = `pmt:${address}`;

  try {
    if (req.method === 'GET') {
      const msgs = await redis('LRANGE', key, '0', '-1');
      if (msgs && msgs.length > 0) await redis('DEL', key);
      const parsed = (msgs || []).map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      return res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);
      await redis('RPUSH', key, JSON.stringify(msg));
      await redis('EXPIRE', key, '604800');
      return res.status(200).json({ ok: true });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox]', e.message);
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(500).json({ error: e.message });
  }
}
