// Debug endpoint — tests Redis REST connectivity
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
