// Cross-device message relay
// Uses KV_REDIS_URL (redis://user:password@host:port) → converts to Upstash REST API

function getUpstashCreds() {
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    // Upstash Redis host is like: redis-12345.upstash.io or similar
    // REST endpoint: https://<host>  token: password
    const host = u.hostname;
    const token = u.password || u.username;
    if (!host || !token) return null;
    return { restUrl: `https://${host}`, token };
  } catch { return null; }
}

async function kvCmd(creds, ...args) {
  const res = await fetch(creds.restUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis REST ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
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

  const creds = getUpstashCreds();
  if (!creds) {
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(200).json({ ok: true, relay: 'disabled' });
    return;
  }

  const key = `pmt:${address}`;

  try {
    if (req.method === 'GET') {
      const msgs = await kvCmd(creds, 'LRANGE', key, 0, -1);
      if (msgs && msgs.length > 0) await kvCmd(creds, 'DEL', key);
      const parsed = (msgs || []).map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);
      await kvCmd(creds, 'RPUSH', key, JSON.stringify(msg));
      await kvCmd(creds, 'EXPIRE', key, 604800);
      res.status(200).json({ ok: true });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox] error:', e.message);
    if (req.method === 'GET') res.status(200).json([]);
    else res.status(500).json({ error: e.message });
  }
}
