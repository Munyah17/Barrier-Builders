# Barrier Fencing Solutions

Public website and yard admin for **Barrier Fencing Solutions** — `barrierfencing.co.zw`.

Stack: HTML, CSS, JavaScript on cPanel. Optional Python API for file persistence and SpaceXAI estimates.

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
| Username | `admin` |
| Password | `Barrier@2026` |

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

Data lives in the browser (`localStorage`) so the site works on plain cPanel static hosting. Export JSON from Settings for backups.

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
2. Confirm `index.html` is the directory index (`.htaccess` is included).
3. Point the domain DNS at the hosting account.
4. Sign in to `/admin/`, update company details, stock and promotions.

Contact numbers in the seed data are placeholders — replace them in Settings before go-live.
