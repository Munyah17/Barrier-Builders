---
name: admin
description: Admin panel login, accounts, roles & permissions
---

# Admin panel

The admin panel lives at `/admin/` (PHP session, default `PHPSESSID`).

## Accounts & roles

- Admin accounts are managed **only** through `api/admins.php` — the
  whole-state `api/data.php` sync can no longer create/edit/delete admins.
- Every `admins.php` request needs a valid DB-verified session (401) and the
  matching permission (403): `admins.manage` for accounts, `roles.manage` for
  roles, `updateprofile` is self-service.
- Passwords are `password_hash()` in `bfs_admins.pass_hash`; duplicate
  username/email is rejected with 409.
- Roles live in `bfs_roles` (JSON `permissions` array, `"*"` = everything).
  The built-in `Administrator` role cannot be edited or deleted. Admins
  without a role keep full access (backwards compatible); the owner account
  (`munyah` / `ad-1`) is protected and always has `*`.
- Whole-state writes (`data.php` POST) additionally require the `sync`
  permission; admin pages flag writes with `X-BFS-Admin` and get 401 if the
  session expired.
- Login errors: 401 `invalid_credentials` vs 500 `server_error` — the UI
  shows "Invalid credentials" vs "Server error — try again".

## Automated checks

```bash
node tests/test-admin.js            # jsdom login + dashboard routes
node tests/test-admin-accounts.js   # write-path guards + account lifecycle
node tests/test-admin-roles.js      # roles, permissions, 401/403 enforcement
```
