---
name: login
description: Client portal login, registration and KYC verification flow
---

# Client portal login

The client portal lives at `/portal.html`. Accounts are stored in the shared BFS store (`js/store.js`, localStorage key `bfs_store_v1`, optionally synced to MySQL via `api/data.php`).

## Start the site

```bash
php -S 127.0.0.1:8080 -t .
```

Open http://127.0.0.1:8080/portal.html

## Demo client accounts (seed data)

| Email | Password | KYC status |
|---|---|---|
| `demo@barrierfencing.co.zw` | `Demo@123` | not submitted |
| `tariro@example.com` | `demo1234` | verified |

## Register a new client

1. Open `/portal.html#/register` (or click "Create an account" on the login screen).
2. Fill name, email, phone, password and submit.
3. The client is registered **and logged in automatically** (session key `bfs_client_auth` in sessionStorage), landing on `#/orders`.

## Log in / log out

- Login: `/portal.html#/login` — email + password. Wrong credentials show "Incorrect email or password."
- Logout: "Sign out" tab in the portal, the avatar menu on any public page, or the settings page button. Clears `bfs_client_auth` and returns to the login screen.
- Deactivated clients (`active === false`, toggled in admin) cannot log in.

## KYC (identity verification)

1. Client opens `/portal.html#/kyc` and submits full name, ID type, ID number, proof of address, ID document reference.
2. Status becomes `pending`; the client sees a "pending review" banner.
3. An admin reviews it under **Admin → Clients** (`/admin/#/clients`) with Verify / Reject buttons (`BFS.verifyClientKyc`).
4. Verified/rejected status shows on the client's KYC tab and in their notifications feed.

## What clients see when logged in

- **Orders** (`#/orders`) — orders matched by email or phone (`BFS.clientOrders`), each with a delivery timeline and progress bar.
- **Alerts** (`#/notifications`) — order events, KYC status, promotions.
- **Promotions** (`#/promos`) — active promotions from the store.
- **Settings** (`#/settings`) — name, phone, password change, profile photo (stored as data URL).
- A mobile bottom nav appears on public pages (`js/ui.js`) and inside the portal.

## Automated check

```bash
node tests/test-store.js   # store-level client functions (no server needed)
node tests/test-portal.js  # full portal flow in jsdom (server must be running)
```
