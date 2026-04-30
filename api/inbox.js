// Cross-device message relay
// Uses Upstash Redis KV if configured, otherwise returns empty (same-device only)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd, ...args) {
  const res = await fetch(`${KV_URL}/${[cmd, ...args].join('/')}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Graceful fallback when KV not configured
  if (!KV_URL || !KV_TOKEN) {
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const address = (url.searchParams.get('address') || '').toLowerCase().slice(0, 42);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const key = `pmt:${address}`;

  if (req.method === 'GET') {
    try {
      const len = await kv('llen', key);
      if (!len || len === 0) { res.status(200).json([]); return; }
      const raw = await kv('lrange', key, '0', '-1');
      // Delete after reading
      await kv('del', key);
      const msgs = (Array.isArray(raw) ? raw : [])
        .map(m => { try { return JSON.parse(m); } catch { return null; } })
        .filter(Boolean);
      res.status(200).json(msgs);
    } catch { res.status(200).json([]); }
  } else if (req.method === 'POST') {
    try {
      let body = '';
      await new Promise(resolve => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
      });
      const msg = JSON.parse(body);
      await kv('rpush', key, JSON.stringify(msg));
      await kv('expire', key, '604800'); // 7 days
      res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  } else {
    res.status(405).end();
  }
}
