import { createServer } from 'node:http';
import { Inbox, validSignature } from './core.js';

export function makeServer({ secret, inbox = new Inbox() }) {
  if (!secret) throw new Error('WEBHOOK_SECRET must be set');
  return createServer(async (req, res) => {
    const reply = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { ok: true });
    if (req.method === 'GET' && req.url === '/events') return reply(200, { events: inbox.list() });
    if (req.method !== 'POST' || req.url !== '/webhooks') return reply(404, { error: 'not found' });
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 65536) return reply(413, { error: 'body too large' });
        chunks.push(chunk);
      }
    } catch { return reply(400, { error: 'incomplete request' }); }
    const body = Buffer.concat(chunks);
    if (!validSignature(body, req.headers['x-webhook-signature'], secret)) return reply(401, { error: 'invalid signature' });
    const id = req.headers['x-event-id'];
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) return reply(400, { error: 'invalid event id' });
    let payload;
    try { payload = JSON.parse(body.toString('utf8')); }
    catch { return reply(400, { error: 'invalid JSON' }); }
    const { duplicate, entry } = inbox.accept(id, payload);
    return reply(duplicate ? 200 : 201, { duplicate, id: entry.id, receivedAt: entry.receivedAt });
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT || 3000);
  makeServer({ secret: process.env.WEBHOOK_SECRET }).listen(port, () => console.log(`Listening on :${port}`));
}
