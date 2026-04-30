import Redis from 'ioredis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;
  const tcpUrl = process.env.KV_REDIS_URL;

  const info = {
    hasRestUrl: !!restUrl,
    hasRestToken: !!restToken,
    hasTcpUrl: !!tcpUrl,
    tcpUrlPrefix: tcpUrl?.slice(0,30) || null,
  };

  // Test REST if available
  if (restUrl && restToken) {
    try {
      const r = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${restToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', 'pmt:debug', 'ok', 'EX', '30'])
      });
      const d = await r.json();
      const r2 = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${restToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['GET', 'pmt:debug'])
      });
      const d2 = await r2.json();
      info.restTest = { set: d.result, get: d2.result, ok: d2.result === 'ok' };
    } catch(e) { info.restTest = { error: e.message }; }
  }

  // Test derived REST from KV_REDIS_URL
  if (!restUrl && tcpUrl) {
    try {
      const u = new URL(tcpUrl);
      const token = decodeURIComponent(u.password || u.username);
      const derivedUrl = `https://${u.hostname}`;
      info.derivedRestUrl = derivedUrl;
      const r = await fetch(derivedUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', 'pmt:debug', 'ok', 'EX', '30'])
      });
      const d = await r.json();
      info.derivedRestTest = { status: r.status, result: d.result, ok: d.result === 'OK' };
    } catch(e) { info.derivedRestTest = { error: e.message }; }
  }

  res.status(200).json(info);
}
