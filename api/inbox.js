// Cross-device message relay via Upstash Redis REST API
// Uses KV_REST_API_URL + KV_REST_API_TOKEN (auto-injected by Vercel Redis integration)

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  // Upstash REST API: POST with JSON body is more reliable than GET with encoded path
  const res = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd, ...args]),
  });
  if (!res.ok) return null;
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

  // Graceful fallback when Redis not configured
  if (!KV_URL || !KV_TOKEN) {
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const url  = new URL(req.url, `http://${req.headers.host}`);
  const raw  = (url.searchParams.get('address') || '').toLowerCase();
  const addr = raw.replace(/[^a-f0-9x]/g, '').slice(0, 42);
  if (!addr) { res.status(400).json({ error: 'address required' }); return; }

  const key = `pmt:inbox:${addr}`;

  try {
    if (req.method === 'GET') {
      // Atomic: read all + delete
      const len = await kv('LLEN', key);
      if (!len || len === 0) { res.status(200).json([]); return; }
      const [raw2] = await Promise.all([
        kv('LRANGE', key, 0, -1),
        kv('DEL', key),
      ]);
      const msgs = (Array.isArray(raw2) ? raw2 : [])
        .map(m => { try { return JSON.parse(m); } catch { return null; } })
        .filter(Boolean);
      res.status(200).json(msgs);
    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(r => { req.on('data', c => body += c); req.on('end', r); });
      if (!body) { res.status(400).json({ error: 'empty body' }); return; }
      const msg = JSON.parse(body);
      // Don't store large binary data (images/files) in Redis — strip b64Data
      const lean = { ...msg, b64Data: undefined, imgData: undefined, fileData: undefined };
      await kv('RPUSH', key, JSON.stringify(lean));
      await kv('EXPIRE', key, 604800); // 7 days TTL
      res.status(200).json({ ok: true });
    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('inbox API error:', e.message);
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(500).json({ error: e.message });
  }
}
