// Cross-device message relay
// Delivery strategy (in order):
//   1. Direct address match (pmt:inbox:{address})
//   2. Username lookup → current address (pmt:user:{username} → address)
//   3. Legacy address lookup → forwarding address (pmt:fwd:{oldAddr} → newAddr)

import Redis from 'ioredis';

let _r = null;
function getRedis() {
  const url = process.env.KV_REDIS_URL;
  if (!url) return null;
  if (_r && (_r.status === 'ready' || _r.status === 'connect')) return _r;
  if (_r) { try { _r.disconnect(); } catch {} }
  _r = new Redis(url, {
    maxRetriesPerRequest: 1, connectTimeout: 5000, commandTimeout: 5000,
    enableOfflineQueue: true,
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });
  _r.on('error', () => { _r = null; });
  return _r;
}

async function waitReady(r) {
  if (r.status === 'ready') return;
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error('timeout')), 4000);
    r.once('ready', () => { clearTimeout(t); ok(); });
    r.once('error', e => { clearTimeout(t); fail(e); });
  });
}

// Deliver msg to a Redis list key, return true if delivered
async function deliver(r, address, msg) {
  if (!address) return false;
  const key = `pmt:inbox:${address.toLowerCase()}`;
  await r.rpush(key, JSON.stringify(msg));
  await r.expire(key, 604800);
  return true;
}

// Resolve the best delivery address for a given address+username combo
async function resolveDeliveryAddresses(r, contactAddr, contactUsername) {
  const addrs = new Set();
  if (contactAddr) addrs.add(contactAddr.toLowerCase());

  // Try username → current address
  if (contactUsername) {
    try {
      const raw = await r.get(`pmt:user:${contactUsername.toLowerCase()}`);
      if (raw) {
        const u = JSON.parse(raw);
        if (u.address) addrs.add(u.address.toLowerCase());
      }
    } catch {}
  }

  // Try forwarding table: stored contact addr → current polling addr
  if (contactAddr) {
    try {
      const fwd = await r.get(`pmt:fwd:${contactAddr.toLowerCase()}`);
      if (fwd) addrs.add(fwd.toLowerCase());
    } catch {}
  }

  return [...addrs];
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
  const username = (urlObj.searchParams.get('username') || '').toLowerCase().trim().slice(0, 50);

  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const r = getRedis();
  if (!r) {
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(200).json({ ok: true, relay: 'disabled' });
  }

  try { await waitReady(r); } catch {}

  const key = `pmt:inbox:${address}`;

  try {
    if (req.method === 'GET') {
      // Heartbeat: register this address as the current polling address for this user
      // This builds the forwarding table for anyone who has an old address for this user
      try {
        await r.set(`pmt:online:${address}`, Date.now(), 'EX', 86400);
        if (username) {
          // Map username → this address (update pmt:user record's address field)
          const userKey = `pmt:user:${username}`;
          const raw = await r.get(userKey);
          if (raw) {
            const u = JSON.parse(raw);
            if (u.address?.toLowerCase() !== address) {
              // Address changed! Store forwarding from old to new
              await r.set(`pmt:fwd:${u.address.toLowerCase()}`, address, 'EX', 2592000);
              u.address = address;
              await r.set(userKey, JSON.stringify(u));
              console.log(`[inbox] address updated for ${username}: ${u.address} → ${address}`);
            }
          }
        }
      } catch {}

      const msgs = await r.lrange(key, 0, -1);
      if (msgs.length > 0) await r.del(key);
      const parsed = msgs.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
      return res.status(200).json(parsed);

    } else if (req.method === 'POST') {
      let body = '';
      await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
      const msg = JSON.parse(body);

      // Resolve all possible addresses for this recipient
      const toUsername = (msg.toUsername || urlObj.searchParams.get('username') || '').toLowerCase().trim();
      const addrs = await resolveDeliveryAddresses(r, address, toUsername || null);

      let delivered = 0;
      for (const addr of addrs) {
        if (await deliver(r, addr, msg)) delivered++;
      }

      return res.status(200).json({ ok: true, delivered, addrs });

    } else {
      res.status(405).end();
    }
  } catch (e) {
    console.error('[inbox]', e.message);
    if (req.method === 'GET') return res.status(200).json([]);
    return res.status(500).json({ error: e.message });
  }
}
