<?php
// Barrier Builders — one-time migration to the relational schema.
//
//   CLI : php api/migrate.php [--force]
//   Web : /api/migrate.php?go=1   (only works while the DB is empty)
//
// What it does:
//   1. Creates the schema (api/install.sql) if the tables are missing.
//   2. Loads state from the legacy `bfs_state` blob if present, otherwise
//      api/seed.json, and writes it into the relational tables.
//   3. Refuses to overwrite existing data unless --force / ?force=1.
//
// The legacy bfs_state table is kept for rollback; data.php no longer reads it.

require __DIR__ . '/state_store.php';

$isCli = (PHP_SAPI === 'cli');
$force = $isCli ? in_array('--force', $argv ?? [], true) : (($_GET['force'] ?? '') === '1');
$go    = $isCli || (($_GET['go'] ?? '') === '1');

header('Content-Type: text/plain; charset=utf-8');

function out($m) { echo $m . "\n"; }

$pdo = db();

// 1. Schema ------------------------------------------------------------------
$has = $pdo->query("SHOW TABLES LIKE 'bfs_analytics_events'")->fetchColumn();
if (!$has) {
    out('Creating schema from install.sql ...');
    $sql = file_get_contents(__DIR__ . '/install.sql');
    // strip the CREATE DATABASE / USE lines — we are already connected
    $sql = preg_replace('/CREATE DATABASE[^;]*;/i', '', $sql);
    $sql = preg_replace('/USE\s+\w+\s*;/i', '', $sql);
    // drop `--` comment lines so semicolons inside comments can't split statements
    $sql = preg_replace('/^\s*--[^\n]*$/m', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
        if ($stmt !== '') $pdo->exec($stmt);
    }
    out('Schema created.');
} else {
    out('Schema already present.');
}

// 1b. Column upgrades for databases created before pass_hash existed ---------
foreach (['bfs_admins', 'bfs_clients'] as $tbl) {
    $hasCol = $pdo->query("SHOW COLUMNS FROM `$tbl` LIKE 'pass_hash'")->fetchColumn();
    if (!$hasCol) {
        $pdo->exec("ALTER TABLE `$tbl` ADD COLUMN pass_hash VARCHAR(255) NULL");
        out("Added pass_hash column to $tbl.");
    }
}

// 1c. Roles & permissions schema (idempotent) -------------------------------
bfs_ensure_roles_schema();
out('Roles schema ensured.');

// 2. Source state -------------------------------------------------------------
$state = null; $source = '';
try {
    $row = $pdo->query('SELECT data FROM bfs_state WHERE id = 1')->fetch();
    if ($row && $row['data'] !== '') {
        $state = json_decode($row['data'], true);
        $source = 'legacy bfs_state blob';
    }
} catch (Throwable $e) { /* table may not exist */ }

if (!is_array($state)) {
    $seedFile = __DIR__ . '/seed.json';
    if (is_file($seedFile)) {
        $state = json_decode(file_get_contents($seedFile), true);
        $source = 'api/seed.json';
    }
}

if (!is_array($state)) { out('ERROR: no source state found (no bfs_state row, no seed.json).'); exit(1); }

// 3. Guard --------------------------------------------------------------------
$empty = bfs_state_empty($pdo);
if (!$empty && !$force) {
    out('Target tables already contain data — refusing to overwrite.');
    out('Re-run with --force (CLI) or &force=1 (web) to replace it.');
    exit(1);
}
if (!$go) { out('Pass ?go=1 to run.'); exit(0); }

// 4. Write --------------------------------------------------------------------
try {
    bfs_state_save($state, true, 0, true); // allowAdmins: seed accounts on install
    out("Migrated state from {$source}.");
    foreach (['products','quotes','invoices','orders','clients','admins','leads','contacts','promotions','gallery'] as $k) {
        out(sprintf('  %-12s %d rows', $k, count($state[$k] ?? [])));
    }
    out('Done. You can delete api/migrate.php and api/seed.json if you like.');
} catch (Throwable $e) {
    out('ERROR: ' . $e->getMessage());
    exit(1);
}
