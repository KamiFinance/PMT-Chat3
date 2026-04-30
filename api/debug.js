function getUpstashCreds() {
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    return { restUrl: `https://${u.hostname}`, token: u.password || u.username, raw: url.slice(0,30) };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const creds = getUpstashCreds();
  if (!creds) { res.status(200).json({ ok: false, error: 'KV_REDIS_URL not set' }); return; }

  try {
    const setRes = await fetch(creds.restUrl, {
      method:'POST', headers:{'Authorization':`Bearer ${creds.token}`,'Content-Type':'application/json'},
      body: JSON.stringify(['SET','pmt:debug:test','hello','EX','60'])
    });
    const setData = await setRes.json();

    const getRes = await fetch(creds.restUrl, {
      method:'POST', headers:{'Authorization':`Bearer ${creds.token}`,'Content-Type':'application/json'},
      body: JSON.stringify(['GET','pmt:debug:test'])
    });
    const getData = await getRes.json();

    res.status(200).json({
      ok: true,
      setStatus: setRes.status,
      setResult: setData.result,
      getResult: getData.result,
      roundtrip: getData.result === 'hello',
      urlPrefix: creds.raw
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message, urlPrefix: creds.raw });
  }
}
