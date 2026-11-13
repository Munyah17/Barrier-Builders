# Barrier Builders

Public website and yard admin for **Barrier Builders** — `barrierfencing.co.zw`.

Stack: HTML, CSS, JavaScript + PHP/MySQL on cPanel. Optional Python API for file persistence and SpaceXAI estimates.

## Data layer

The site state (products, quotes, invoices, orders, clients, admins, content,
promotions, gallery, analytics) lives in **relational MySQL tables** — one table
per collection (`bfs_products`, `bfs_quotes`, `bfs_invoices`, …). Each row keeps
indexed columns plus a `data` JSON column with the full item.

- `api/data.php` — the single sync endpoint the frontend already uses
  (GET whole state / POST whole state; unchanged contract).
- `api/state_store.php` — relational codec: assembles state on GET, syncs
  collections transactionally on POST. Anonymous POSTs may only append
  quotes/leads/contacts, upsert clients, and bump analytics — catalogue,
  pricing, invoices, orders, content and admin accounts require an admin
  session.
- `api/install.sql` — schema (`CREATE TABLE IF NOT EXISTS`, safe to re-run).
- `api/migrate.php` — one-time migration: `php api/migrate.php` (CLI) or
  `/api/migrate.php?go=1` on an empty DB. Imports the legacy `bfs_state` blob
  or `api/seed.json` into the new tables; also adds `pass_hash` columns to
  databases created before password hashing existed.
- `api/client-auth.php` — client portal auth: register / login / logout /
  session restore / password change with PHP sessions and `password_hash()`.
- `js/store.js` keeps localStorage as an offline cache and syncs with
  `api/data.php` — the `BFS.*` API contract is unchanged.

## Auth & passwords

- **Admin** (`/admin/`): PHP session, JSON login via `api/data.php`. Sessions
  are revalidated against `bfs_admins` on every page load and write — a deleted
  or deactivated admin loses access immediately. The owner account (`munyah`)
  is protected and cannot be deleted.
- **Clients** (`/portal/`): PHP session via `api/client-auth.php`. Passwords
  are stored as `password_hash()` in `bfs_clients.pass_hash`; legacy base64
  secrets are upgraded on first successful login. Client passwords are never
  included in `api/data.php` GET responses.
- **Anonymous writes** to `api/data.php` can only append quotes/leads/contacts,
  upsert clients, and bump analytics. Products, pricing, invoices, orders,
  content and admin accounts require an admin session.
- There is no seeded demo data — fresh installs start empty (products,
  content, settings and the admin account still come from `seed.json`).

## Local preview

```bash
php -S 127.0.0.1:8080
```

or `python -m http.server 8080`

Open http://127.0.0.1:8080

## Admin portal

URL: `/admin/`

| | |
|---|---|
| Username | `munyah` |
| Password | `griezmann17` |

Change both under **Settings** after first login. Phone, WhatsApp, address and VAT rate are also edited there.

## What the site does

- Public catalogue, gallery, promotions, contact
- Instant quote calculator (bill of quantities)
- AI estimator (plain-English job → recommended fence + BOQ)
- Numbered quotations (`BFS-Q-YEAR-####`)
- **One-click quote → tax invoice** in admin (15% VAT)
- Auto-creates a tracking code (`BFS-TRK-#####`)
- Public order tracking
- Admin analytics (page views, quotes, invoices)
- Inventory stock levels drive the calculator prices

Data lives in MySQL (`barrierco_db`) with a localStorage cache in the browser.
Export JSON from Settings for backups.

## Optional Python API

```bash
python api/app.py
```

- `GET /health`
- `POST /estimate` — if `XAI_API_KEY` is set, calls SpaceXAI (`https://api.x.ai/v1`)
- `GET/POST /data/*.json` — persist products / promotions when the server can write `data/`

The public AI estimator does **not** require Python. It uses the on-site rules engine and live inventory prices.

## Deploy on cPanel

1. Upload this folder to `public_html` (or the `barrierfencing.co.zw` document root).
2. Import `api/install.sql` via phpMyAdmin, then run `api/migrate.php?go=1`
   once to seed (or `php api/migrate.php` from Terminal).
3. Set DB credentials in `api/config.php` for the cPanel account.
4. Confirm `index.html` is the directory index (`.htaccess` is included).
5. Point the domain DNS at the hosting account.
6. Sign in to `/admin/`, update company details, stock and promotions.

Contact numbers in the seed data are placeholders — replace them in Settings before go-live.
