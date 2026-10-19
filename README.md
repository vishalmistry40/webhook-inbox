# Webhook inbox

A small dependency-free Node service for trying out signed webhooks. It verifies an HMAC-SHA256 over the **raw request bytes**, checks an event ID for deduplication, and exposes recent events for local inspection.

```sh
npm test
WEBHOOK_SECRET=development-only-secret npm start
```

`POST /webhooks` takes JSON plus `X-Event-Id` and `X-Webhook-Signature: sha256=<hex HMAC>`. `GET /events` lists recent payloads; `GET /health` checks readiness. The demo intentionally keeps data in memory. Restarting loses events, deduplication is bounded to the latest 500 IDs, and `/events` is unauthenticated: **do not expose this service to the public Internet or feed it sensitive data**. A production version needs durable storage, authenticated inspection, replay-window policy and per-source secret rotation.
