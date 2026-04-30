// Debug endpoint — tests Redis REST connectivity
async function redis(cmd, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const res = await fetch(`${url}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  }
  const redisUrl = process.env.KV_REDIS_URL;
  if (redisUrl) {
    const u = new URL(redisUrl);
    const res = await fetch(`https://${u.hostname}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${u.password}` }
    });
    return res.json();
  }
  throw new Error('No credentials');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REDIS_URL;
    const ping = await redis('PING');
    const testKey = 'pmt:debug:test';
    await redis('SET', testKey, 'ok');
    const val = await redis('GET', testKey);
    await redis('DEL', testKey);
    res.json({ ok: true, ping, roundtrip: val === 'ok', urlScheme: url ? new URL(url).protocol : 'none', mode: 'REST fetch (no TCP)' });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
