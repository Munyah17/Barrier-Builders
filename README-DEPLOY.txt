================================================================
 BARRIER BUILDERS — cPanel DEPLOYMENT GUIDE
================================================================

WHAT'S IN THIS PACKAGE
----------------------
  index.html, css/, js/, assets/, api/, admin/, portal/ ...
  (all public pages, admin panel, client portal, API)

  api/config.php   - database credentials (already set — verify)
  api/install.sql  - FULL database: schema + all seed data
                     (products, content, settings, admin accounts)
  api/schema.sql   - schema source used to build install.sql

  Database (already configured in api/config.php):
      DB name : barrierco_db
      DB user : barrierco_munyah
      DB pass : griezmann17
      DB host : 127.0.0.1  (localhost on cPanel)


STEP 1 — CREATE THE DATABASE (cPanel)
-------------------------------------
  1. cPanel -> "MySQL Databases"
  2. Create database:   barrierco_db
  3. Create user:       barrierco_munyah
     with password:     griezmann17
  4. "Add User To Database" -> select BOTH -> ALL PRIVILEGES
  5. (Optional but recommended: change the DB password afterwards
     and update api/config.php to match)


STEP 2 — UPLOAD FILES
---------------------
  Option A (recommended):
    - Compress this whole folder to a .zip
    - cPanel -> File Manager -> public_html -> Upload -> Extract

  Option B:
    - Upload all files/folders into public_html (or a subfolder)
    - Keep the folder structure exactly as-is

  IMPORTANT: upload the HIDDEN .htaccess file too
  (File Manager -> Settings -> tick "Show Hidden Files")


STEP 3 — IMPORT THE DATABASE (phpMyAdmin)
------------------------------------------
  1. cPanel -> "phpMyAdmin"
  2. Select database: barrierco_db  (left sidebar)
  3. Click the "Import" tab
  4. Choose file: api/install.sql  (from this package)
  5. Format: SQL -> click "Import" at the bottom
  6. You should see ~90+ successful queries, no errors.

  install.sql DROPS and recreates every bfs_* table, then loads
  all products, page content, settings and the two admin accounts.
  It is safe to re-run any time you want a full reset.


STEP 4 — VERIFY
---------------
  Admin panel:   https://barrierfencing.co.zw/admin/
  Client portal: https://barrierfencing.co.zw/portal/

  ADMIN ACCOUNTS (change passwords immediately after first login!):
    1) username: munyah    password: griezmann17
    2) username: manager   password: manager2026

  To change an admin password: Admin -> Admins -> edit account.
  New admins created in Admin -> Admins can log in immediately —
  accounts are stored server-side with hashed passwords.


STEP 5 — CLEAN UP (recommended)
-------------------------------
  After a successful import, you may DELETE these files from the
  server (they are development tools, not needed at runtime):
      api/migrate.php
      api/seed.json
      api/schema.sql
      api/_gen_install.php


TROUBLESHOOTING
---------------
  * White page / 500 error
      -> api/config.php credentials wrong, or PHP PDO MySQL
         extension missing (ask host / enable in cPanel)
  * phpMyAdmin import fails
      -> database barrierco_db does not exist yet (Step 1),
         or the SQL file was truncated during upload — re-upload
  * Login says invalid_credentials
      -> import did not complete; re-run install.sql in phpMyAdmin
  * "Access denied for user" in PHP
      -> DB user not added to barrierco_db, or wrong password —
         check Step 1.4 (ALL PRIVILEGES)
  * Pages look unstyled
      -> css/ folder missing or .htaccess blocking it; hard-refresh
         (Ctrl+F5) to bust cached CSS/JS
  * Still stuck: check cPanel -> Errors, or temporarily rename
     .htaccess to rule out rewrite issues.


NOTES
-----
  * Data lives in MySQL — the site syncs automatically.
  * Admin -> Settings -> Data -> "Export JSON" makes a backup.
  * Do NOT delete api/ folder — the site cannot save without it.
================================================================
