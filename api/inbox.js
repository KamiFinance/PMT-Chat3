// Cross-device message relay — fetch-based, no ioredis, works in serverless

// Parse redis://user:password@host:port into REST API credentials
// Redis Cloud / Upstash both support HTTP REST at https://host
function getCreds() {
  // Prefer explicit Upstash REST vars
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  // Derive from redis:// URL — works for Upstash Redis
  const raw = process.env.KV_REDIS_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return {
      url: `https://${u.hostname}`,
      token: decodeURIComponent(u.password || u.username),
    };
  } catch { return null; }
}

async function cmd(creds, ...args) {
  const r = await fetch(creds.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
  return (await r.json()).result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const u = new URL(req.url, `http://${req.headers.host}`);
  const address = (u.searchParams.get('address') || '').toLowerCase().slice(0, 66);
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const creds = getCreds();
  if (!creds) {
    res.status(200).json(req.method === 'GET' ? [] : { ok: true, relay: 'disabled' });
    return;
  }

  const key = `pmt:${address}`;

  try {
    if (req.method === 'GET') {
      const msgs = await cmd(creds, 'LRANGE', key, 0, -1);
      if (msgs?.length) await cmd(creds, 'DEL', key);
      const parsed = (msgs || []).map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(r => { req.on('data', c => body += c); req.on('end', r); });
      const msg = JSON.parse(body);
      await cmd(creds, 'RPUSH', key, JSON.stringify(msg));
      await cmd(creds, 'EXPIRE', key, 604800);
      res.status(200).json({ ok: true });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox]', e.message);
    res.status(200).json(req.method === 'GET' ? [] : { error: e.message });
  }
}
