-- Barrier Fencing Solutions — MySQL schema (XAMPP / phpMyAdmin)
CREATE DATABASE IF NOT EXISTS barrier_fencing
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE barrier_fencing;

-- Single-row application state store.
-- The frontend syncs its full JSON state here so data persists across
-- browsers/devices instead of living only in localStorage.
CREATE TABLE IF NOT EXISTS bfs_state (
  id         TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  data       LONGTEXT         NOT NULL,
  updated_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional audit log of sync events (handy in phpMyAdmin).
CREATE TABLE IF NOT EXISTS bfs_sync_log (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action     VARCHAR(10)   NOT NULL,
  bytes      INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
