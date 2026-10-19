import { test } from 'node:test';
import { strictEqual as eq, deepStrictEqual as deep } from 'node:assert';
import { once } from 'node:events';
import { signature } from '../src/core.js';
import { makeServer } from '../src/server.js';

test('valid, duplicate, unauthorized, and invalid JSON', async () => {
  const server = makeServer({ secret: 'local-test-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const root = `http://127.0.0.1:${server.address().port}`;
  const submit = (body, id, sig = signature(body, 'local-test-secret')) => fetch(`${root}/webhooks`, {
    method: 'POST', body, headers: { 'x-event-id': id, 'x-webhook-signature': sig }
  });
  try {
    const body = JSON.stringify({ type: 'build.finished', build: 42 });
    let response = await submit(body, 'event-1');
    eq(response.status, 201);
    eq((await response.json()).duplicate, false);
    response = await submit(body, 'event-1');
    eq(response.status, 200);
    eq((await response.json()).duplicate, true);
    eq((await submit(body, 'event-2', signature(body, 'wrong'))).status, 401);
    eq((await submit('{', 'event-3')).status, 400);
    const list = await (await fetch(`${root}/events`)).json();
    deep(list.events.map(e => e.id), ['event-1']);
  } finally { server.close(); await once(server, 'close'); }
});
