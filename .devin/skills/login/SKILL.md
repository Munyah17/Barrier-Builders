---
name: login
description: Client portal login, registration and KYC verification flow
---

# Client portal login

The client portal lives at `/portal/`. Client accounts are **server-side**:
`api/client-auth.php` handles register / login / logout / session restore with
PHP sessions (`bfs_client` session name) and `password_hash()` credentials in
`bfs_clients.pass_hash`. There are no seeded demo client accounts — register a
fresh one for testing.

## Start the site

```bash
php -S 127.0.0.1:8080 -t .
```

Open http://127.0.0.1:8080/portal/

## Register a new client

1. Open `/portal/#/register` (or click "Create an account" on the login screen).
2. Fill name, email, phone, password and submit.
3. The client is registered **and logged in automatically** (PHP session),
   landing on `#/orders`.

## Log in / log out

- Login: `/portal/#/login` — email + password, verified server-side.
  Wrong credentials show "Invalid credentials."
- Logout: "Sign out" tab in the portal, the avatar menu on any public page, or
  the settings page button. Calls `api/client-auth.php` logout and returns to
  the login screen.
- Deactivated clients (`active === false`, toggled in admin) cannot log in and
  their session is dropped on the next request.
- `BFS.clientAuthed()` returns the cached server-verified client (populated by
  `client-auth.php?action=me` on page load and after login/register).

## KYC (identity verification)

1. Client opens `/portal/#/kyc` and submits full name, ID type, ID number,
   proof of address, ID document reference.
2. Status becomes `pending`; the client sees a "pending review" banner.
3. An admin reviews it under **Admin → Clients** (`/admin/#/clients`) with
   Verify / Reject buttons (`BFS.verifyClientKyc`). A `verified` KYC cannot be
   reset by the client — the API preserves it on anonymous profile saves.
4. Verified/rejected status shows on the client's KYC tab and in their
   notifications feed.

## What clients see when logged in

- **Orders** (`#/orders`) — orders matched by email or phone (`BFS.clientOrders`),
  each with a delivery timeline and progress bar.
- **Alerts** (`#/notifications`) — order events, KYC status, promotions.
- **Promotions** (`#/promos`) — active promotions from the store.
- **Settings** (`#/settings`) — name, phone, password change (via
  `client-auth.php` changepassword), profile photo (stored as data URL).
- A mobile bottom nav appears on public pages (`js/ui.js`) and inside the portal.

## Automated checks

```bash
node tests/test-store.js        # store-level functions (no server needed)
node tests/test-client-auth.js  # client-auth API (server must be running)
node tests/test-portal.js       # full portal flow in jsdom (server must be running)
node tests/test-admin.js        # admin login/dashboard in jsdom (server must be running)
```
