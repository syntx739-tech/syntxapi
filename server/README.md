# ARCTIC Shared API

This Node.js API serves the ARCTIC loader and admin keypanel.

## Local setup

1. Copy `local.env.example` to `local.env`.
2. Set `ARCTIC_ADMIN_PASSWORD` to the admin password.
3. Start the API with the root `start_api.bat`.
4. Open the keypanel and sign in with the configured admin username and password.

The first successful browser login binds that browser's generated device identifier. A different browser or cleared site storage is rejected until the reset request is approved.

Sessions last **30 days** (see `SESSION_TTL_MS`), so the browser stays signed in between visits. Revoking the session from the Security settings signs the browser out; the device binding itself stays until a reset is approved.

## Discord device reset

A Discord webhook can post a one-time approval link. Set:

```text
ARCTIC_DISCORD_WEBHOOK_URL=https://your-new-webhook-url
ARCTIC_PUBLIC_API_URL=https://your-public-api-domain.example
```

`ARCTIC_PUBLIC_API_URL` must be reachable from Discord. `127.0.0.1` only works for local development and cannot be used for remote approval.

The webhook URL previously shared in chat should be rotated before use. Keep the replacement in `local.env`; never put it in the React frontend or commit it.

## Staff website

The API also serves the separate staff website build (folder `STAFF WEBSITE`).

- Admin creates staff accounts on the main keypanel (Staff tab).
- Staff sign in via `POST /api/staff/login`.
- Staff generate keys via `POST /api/staff/keys` within their fixed quota.
- Staff order more keys via `POST /api/staff/orders`; the order is posted to a Discord webhook and remains pending until the owner handles it in the main keypanel.
- The owner reviews orders via `GET /api/admin/orders`, fulfills them via `POST /api/admin/orders/:id/fulfill`, or rejects them via `PATCH /api/admin/orders/:id/status`.
- Fulfilling an order generates the requested keys, assigns them to the requesting staff account, and makes them visible in the staff website. Staff orders are accepted only while the staff account is active.

Set in `local.env`:

```text
ARCTIC_STAFF_ORDER_WEBHOOK_URL=https://your-staff-orders-webhook-url
```

Quotas are configured server-side in `STAFF_KEY_QUOTA`:

```text
5x 1 Day | 3x 7 Days | 2x 30 Days | 1x 90 Days | 1x 1 Year | 1x Lifetime
```

Staff endpoints are protected by a separate staff session token (`arctic-staff-session` in the browser) with the same 30-day lifetime.

## Key categories

License keys can carry a category label (e.g. a reseller name) to keep the inventory clean and sorted.

```text
GET    /api/admin/categories
POST   /api/admin/categories   { "name": "Reseller XY" }
DELETE /api/admin/categories/:id
```

Keys are generated with `category` in the body of `POST /api/admin/keys`. Keys keep their label even if the category is later deleted. Owner-fulfilled staff orders can also be assigned a category before generation.

## Production requirements

- Use HTTPS.
- Set `ARCTIC_ALLOWED_ORIGIN` to the exact keypanel origin.
- Keep `server/data` outside the public web root.
- Replace the JSON file store with MySQL or PostgreSQL for multi-instance hosting.
- Use a Node-capable host; InfinityFree free hosting cannot run this API reliably for desktop clients.
