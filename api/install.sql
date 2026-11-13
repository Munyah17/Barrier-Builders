-- Barrier Builders — relational schema (barrierco_db)
-- One table per store collection. Each row keeps promoted scalar columns for
-- querying plus a `data` JSON column holding the full item (authoritative).
-- Safe to re-run: CREATE TABLE IF NOT EXISTS only, no drops.
-- Legacy single-blob table `bfs_state` is left untouched — api/migrate.php
-- distributes it into these tables once.

CREATE DATABASE IF NOT EXISTS barrierco_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE barrierco_db;

-- Site settings (admin-editable company details). Values are JSON-encoded.
CREATE TABLE IF NOT EXISTS bfs_settings (
  k   VARCHAR(64)  NOT NULL PRIMARY KEY,
  v   MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Small key/value metadata (e.g. updatedAt).
CREATE TABLE IF NOT EXISTS bfs_meta (
  k   VARCHAR(64)  NOT NULL PRIMARY KEY,
  v   VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product catalogue.
CREATE TABLE IF NOT EXISTS bfs_products (
  id               VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order       INT          NOT NULL DEFAULT 0,
  slug             VARCHAR(190) NOT NULL DEFAULT '',
  name             VARCHAR(190) NOT NULL DEFAULT '',
  category         VARCHAR(120) NOT NULL DEFAULT '',
  unit             VARCHAR(40)  NOT NULL DEFAULT '',
  featured         TINYINT(1)   NOT NULL DEFAULT 0,
  price_per_m      DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock            DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock_unit       VARCHAR(40)  NOT NULL DEFAULT '',
  image            VARCHAR(255) NOT NULL DEFAULT '',
  data             MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bfs_promotions (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  title       VARCHAR(190) NOT NULL DEFAULT '',
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  tag         VARCHAR(80)  NOT NULL DEFAULT '',
  starts      VARCHAR(40)  NULL,
  ends        VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bfs_gallery (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  title       VARCHAR(190) NOT NULL DEFAULT '',
  type        VARCHAR(80)  NOT NULL DEFAULT '',
  location    VARCHAR(120) NOT NULL DEFAULT '',
  image       VARCHAR(255) NOT NULL DEFAULT '',
  year        INT          NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quotations (bill of quantities). Nested customer/project/items live in data.
CREATE TABLE IF NOT EXISTS bfs_quotes (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order   INT          NOT NULL DEFAULT 0,
  ref          VARCHAR(60)  NOT NULL DEFAULT '',
  created_at   VARCHAR(40)  NULL,
  status       VARCHAR(40)  NOT NULL DEFAULT 'sent',
  source       VARCHAR(40)  NOT NULL DEFAULT '',
  invoice_ref  VARCHAR(60)  NULL,
  subtotal     DECIMAL(14,2) NOT NULL DEFAULT 0,
  vat          DECIMAL(14,2) NOT NULL DEFAULT 0,
  total        DECIMAL(14,2) NOT NULL DEFAULT 0,
  data         MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bfs_invoices (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  ref         VARCHAR(60)  NOT NULL DEFAULT '',
  quote_ref   VARCHAR(60)  NULL,
  quote_id    VARCHAR(64)  NULL,
  lead_id     VARCHAR(64)  NULL,
  created_at  VARCHAR(40)  NULL,
  due_at      VARCHAR(40)  NULL,
  status      VARCHAR(40)  NOT NULL DEFAULT 'unpaid',
  subtotal    DECIMAL(14,2) NOT NULL DEFAULT 0,
  vat         DECIMAL(14,2) NOT NULL DEFAULT 0,
  total       DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid        DECIMAL(14,2) NOT NULL DEFAULT 0,
  tracking    VARCHAR(60)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Delivery / installation orders with tracking steps (steps JSON in data).
CREATE TABLE IF NOT EXISTS bfs_orders (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order   INT          NOT NULL DEFAULT 0,
  tracking     VARCHAR(60)  NOT NULL DEFAULT '',
  invoice_ref  VARCHAR(60)  NULL,
  quote_ref    VARCHAR(60)  NULL,
  created_at   VARCHAR(40)  NULL,
  status       VARCHAR(40)  NOT NULL DEFAULT 'pending',
  data         MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact-form messages.
CREATE TABLE IF NOT EXISTS bfs_contacts (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NULL,
  name        VARCHAR(190) NOT NULL DEFAULT '',
  contact     VARCHAR(190) NOT NULL DEFAULT '',
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leads: front-end quotes, AI estimates, enquiries.
CREATE TABLE IF NOT EXISTS bfs_leads (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NULL,
  status      VARCHAR(40)  NOT NULL DEFAULT 'new',
  type        VARCHAR(40)  NOT NULL DEFAULT '',
  name        VARCHAR(190) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  contact     VARCHAR(190) NOT NULL DEFAULT '',
  title       VARCHAR(190) NOT NULL DEFAULT '',
  estimate    DECIMAL(14,2) NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Client portal accounts. Credentials live in pass_hash (password_hash());
-- the `data` JSON never carries a usable password.
CREATE TABLE IF NOT EXISTS bfs_clients (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  name        VARCHAR(190) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  phone       VARCHAR(60)  NOT NULL DEFAULT '',
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  pass_hash   VARCHAR(255) NULL,
  created_at  VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin / yard accounts.
CREATE TABLE IF NOT EXISTS bfs_admins (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  username    VARCHAR(120) NOT NULL DEFAULT '',
  name        VARCHAR(120) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  password    VARCHAR(255) NULL,
  pass_hash   VARCHAR(255) NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  protected   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CMS content sections (hero, about, contact, footer, rules, posters, ...).
CREATE TABLE IF NOT EXISTS bfs_content (
  section     VARCHAR(80)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Analytics.
CREATE TABLE IF NOT EXISTS bfs_analytics_pages (
  page   VARCHAR(120) NOT NULL PRIMARY KEY,
  views  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bfs_analytics_daily (
  day       VARCHAR(10) NOT NULL PRIMARY KEY,
  views     INT UNSIGNED NOT NULL DEFAULT 0,
  quotes    INT UNSIGNED NOT NULL DEFAULT 0,
  invoices  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bfs_analytics_events (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind  VARCHAR(40) NOT NULL DEFAULT '',
  at    VARCHAR(40) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sync audit log (kept from the blob design).
CREATE TABLE IF NOT EXISTS bfs_sync_log (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action     VARCHAR(20)  NOT NULL,
  bytes      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
