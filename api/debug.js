// Debug endpoint — tests Redis connectivity
import Redis from 'ioredis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const url = process.env.KV_REDIS_URL;
  if (!url) {
    res.status(200).json({ ok: false, error: 'KV_REDIS_URL not set' });
    return;
  }

  const r = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    commandTimeout: 4000,
    enableOfflineQueue: false,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
  r.on('error', () => {});

  try {
    const key = 'pmt:debug:test';
    await r.set(key, 'hello', 'EX', 60);
    const val = await r.get(key);
    await r.del(key);
    res.status(200).json({ ok: true, roundtrip: val === 'hello', urlPrefix: url.slice(0, 20) });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  } finally {
    r.disconnect();
  }
}
