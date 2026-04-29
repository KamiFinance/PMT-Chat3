// Vercel serverless function — cross-device message relay
// Uses Upstash Redis via KV environment variables

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${KV_REST_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pmt-address');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    // KV not configured — return empty (app falls back to localStorage)
    if (req.method === 'GET') res.json([]);
    else res.json({ ok: false, error: 'KV not configured' });
    return;
  }

  const address = (req.query.address || '').toLowerCase().replace(/[^a-f0-9x.]/g, '');
  if (!address) { res.status(400).json({ error: 'Missing address' }); return; }

  const key = `pmt:inbox:${address}`;

  if (req.method === 'GET') {
    // Read all messages and clear the inbox atomically
    try {
      const data = await kvFetch(`/lrange/${key}/0/-1`);
      const messages = (data.result || []).map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      if (messages.length > 0) await kvFetch(`/del/${key}`, 'GET');
      res.json(messages);
    } catch {
      res.json([]);
    }
  } else if (req.method === 'POST') {
    // Add a message to the inbox
    try {
      const msg = req.body;
      await kvFetch(`/rpush/${key}`, 'POST', [JSON.stringify(msg)]);
      // Expire inbox after 7 days
      await kvFetch(`/expire/${key}/604800`, 'GET');
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  } else {
    res.status(405).end();
  }
}
