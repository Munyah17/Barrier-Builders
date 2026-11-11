# Tests

Smoke tests for the Barrier Builders site. They run against the local PHP dev server.

## Setup

```bash
# 1. Start the site (from the repo root)
php -S 127.0.0.1:8080 -t .

# 2. Install jsdom once (only needed for the portal/admin browser tests)
cd tests
npm install jsdom --no-audit --no-fund
```

## Run

```bash
# Store logic only — no dependencies, no server needed
node tests/test-store.js

# Portal + admin — need the server running and jsdom installed
cd tests
node test-portal.js
node test-admin.js
```

Notes:

- `test-portal.js` / `test-admin.js` load the real pages over HTTP, so the PHP server must be running.
- Chart.js canvas warnings in `test-admin.js` are expected under jsdom (no canvas implementation) — they do not fail the test.
