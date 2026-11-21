================================================================
 BARRIER BUILDERS — cPanel DEPLOYMENT GUIDE
================================================================

WHAT'S IN THIS PACKAGE
----------------------
  index.html, css/, js/, assets/, api/, admin/, portal/ ...
  (all public pages, admin panel, client portal, API)

  api/config.php   - database credentials (EDIT BEFORE UPLOAD)
  api/install.sql  - full database schema
  api/seed.json    - starter content + TWO admin accounts
  api/migrate.php  - creates schema + seeds the database (run once)


STEP 1 — CREATE THE DATABASE (cPanel)
-------------------------------------
  1. cPanel -> "MySQL Databases"
  2. Create a database, e.g.  barrierco_newdb
  3. Create a user, e.g.         barrierco_newdb
     with a strong password
  4. "Add User To Database" -> select BOTH -> ALL PRIVILEGES
  5. Write down: DB name, DB user, DB password


STEP 2 — EDIT api/config.php
----------------------------
  Open api/config.php and set:

      DB_NAME  = 'your_db_name'
      DB_USER  = 'your_db_user'
      DB_PASS  = 'your_db_password'
      DB_HOST  = 'localhost'        (leave as-is on cPanel)


STEP 3 — UPLOAD FILES
---------------------
  Option A (recommended):
    - Compress this whole folder to a .zip
    - cPanel -> File Manager -> public_html -> Upload -> Extract

  Option B:
    - Upload all files/folders into public_html (or a subfolder)
    - Keep the folder structure exactly as-is

  IMPORTANT: upload the HIDDEN .htaccess file too
  (File Manager -> Settings -> tick "Show Hidden Files")


STEP 4 — BUILD THE DATABASE
----------------------------
  Visit once in your browser:

      https://yourdomain.com/api/migrate.php?go=1

  You should see "Schema created." / "Migrated state from
  api/seed.json." — this creates ALL tables and loads content.

  REBUILD / RESET (wipes all site data back to seed):
      https://yourdomain.com/api/migrate.php?go=1&force=1

  SECURITY: after a successful install, DELETE these two files
  from the server (they are public):
      api/migrate.php
      api/seed.json


STEP 5 — LOG IN
---------------
  Admin panel:   https://yourdomain.com/admin/
  Client portal: https://yourdomain.com/portal/

  DEFAULT ADMIN ACCOUNTS (change passwords immediately!):
    1) username: munyah    password: griezmann17
    2) username: manager   password: manager2026

  To change an admin password: Admin -> Admins -> edit account.


TROUBLESHOOTING
---------------
  * White page / 500 error
      -> api/config.php credentials wrong, or PHP PDO MySQL
         extension missing (ask host / enable in cPanel)
  * "Access denied" on migrate.php
      -> DB user not added to the database, or wrong password
  * Login says invalid_credentials
      -> wrong username/password; or DB was seeded from an old
         backup — rebuild with migrate.php?go=1&force=1
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
