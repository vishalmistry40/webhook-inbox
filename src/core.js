import { createHmac, timingSafeEqual } from 'node:crypto';

export function signature(body, secret) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}
export function validSignature(body, header, secret) {
  if (typeof header !== 'string' || !/^sha256=[0-9a-f]{64}$/.test(header)) return false;
  const supplied = Buffer.from(header.slice(7), 'hex');
  const expected = Buffer.from(signature(body, secret).slice(7), 'hex');
  return timingSafeEqual(supplied, expected);
}
export class Inbox {
  constructor({ maxEntries = 500 } = {}) {
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }
  accept(id, payload) {
    if (this.entries.has(id)) return { duplicate: true, entry: this.entries.get(id) };
    const entry = { id, payload, receivedAt: new Date().toISOString() };
    this.entries.set(id, entry);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value);
    return { duplicate: false, entry };
  }
  list(limit = 20) { return [...this.entries.values()].slice(-limit).reverse(); }
}
