export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const url = process.env.KV_REDIS_URL;
  const info = {
    hasUrl: !!url,
    urlScheme: url ? new URL(url).protocol : null,
    urlHost: url ? new URL(url).hostname.slice(0,30) : null,
  };

  if (!url) { res.status(200).json({...info, ok: false, error: 'no KV_REDIS_URL'}); return; }

  try {
    const { default: Redis } = await import('ioredis');
    const r = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
      lazyConnect: false,
      tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    r.on('error', ()=>{});

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
      r.once('ready', () => { clearTimeout(t); resolve(); });
      r.once('error', (e) => { clearTimeout(t); reject(e); });
    });

    await r.set('pmt:debug:test', 'hello', 'EX', 30);
    const val = await r.get('pmt:debug:test');
    await r.del('pmt:debug:test');
    r.disconnect();

    res.status(200).json({...info, ok: true, roundtrip: val === 'hello'});
  } catch (e) {
    res.status(200).json({...info, ok: false, error: e.message});
  }
}
