<?php
// One-off generator: emits api/install.sql with schema + full seed data
// (INSERTs) so the DB can be rebuilt entirely from phpMyAdmin.
// Run: php api/_gen_install.php   (from repo root or api/)
require __DIR__ . '/state_store.php';

$seed = json_decode(file_get_contents(__DIR__ . '/seed.json'), true);
if (!is_array($seed)) { fwrite(STDERR, "seed.json unreadable\n"); exit(1); }

function sq($v) {
    if ($v === null) return 'NULL';
    return "'" . str_replace("'", "''", (string)$v) . "'";
}
function sj($v) { return sq(json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); }

$defs = bfs_defs();
$cols = bfs_schema_columns();

$out = [];
$out[] = "-- =============================================================";
$out[] = "-- Barrier Builders — FULL INSTALL (schema + seed data)";
$out[] = "-- Import this file in phpMyAdmin. It DROPS and recreates all";
$out[] = "-- bfs_* tables, then loads products, content, settings and the";
$out[] = "-- two admin accounts. Safe to re-run (full rebuild).";
$out[] = "-- =============================================================";
$out[] = "";
$out[] = "CREATE DATABASE IF NOT EXISTS barrierco_db";
$out[] = "  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
$out[] = "USE barrierco_db;";
$out[] = "";
$out[] = "SET FOREIGN_KEY_CHECKS = 0;";
$out[] = "";

// 1. schema — reuse install.sql CREATE statements, prefixed with DROP
$schema = file_get_contents(__DIR__ . '/schema.sql');
// strip header comments + CREATE DATABASE/USE lines
$schema = preg_replace('/^--[^\n]*$/m', '', $schema);
$schema = preg_replace('/CREATE DATABASE[^;]*;/i', '', $schema);
$schema = preg_replace('/USE\s+\w+\s*;/i', '', $schema);
foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
    if ($stmt === '') continue;
    if (preg_match('/CREATE TABLE IF NOT EXISTS [`]?(\w+)[`]?/i', $stmt, $m)) {
        $out[] = "DROP TABLE IF EXISTS `{$m[1]}`;";
    }
    $out[] = $stmt . ";";
    $out[] = "";
}
$out[] = "SET FOREIGN_KEY_CHECKS = 1;";
$out[] = "";

// 2. list collections
foreach ($defs as $key => $def) {
    $table = $def['table'];
    $items = $seed[$key] ?? [];
    if (!is_array($items) || !$items) continue;
    $out[] = "-- {$key} (" . count($items) . ")";
    $i = 0;
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $promoted = $def['promote']($item);
        $dataJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $id = (string)($item['id'] ?? '');

        if ($key === 'admins') {
            // credential columns: bcrypt hash of the (base64 legacy) password
            $plain = (string)($item['password'] ?? '');
            $decoded = base64_decode($plain, true);
            if ($decoded !== false && $decoded !== '') $plain = $decoded;
            $hash = password_hash($plain !== '' ? $plain : 'changeme', PASSWORD_DEFAULT);
            $promoted['pass_hash'] = $hash;
            $promoted['role_id'] = 'role-admin';
            // strip password from the data JSON — never store plaintext
            unset($item['password']);
            $dataJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        if ($key === 'clients' && !empty($item['password'])) {
            $plain = (string)$item['password'];
            $decoded = base64_decode($plain, true);
            if ($decoded !== false && $decoded !== '') $plain = $decoded;
            $promoted['pass_hash'] = password_hash($plain, PASSWORD_DEFAULT);
            unset($item['password']);
            $dataJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $fields = ['id' => sq($id), 'sort_order' => $i++];
        foreach ($promoted as $c => $v) $fields[$c] = sq($v);
        $fields['data'] = sq($dataJson);
        $names = implode(',', array_map(fn($c) => "`$c`", array_keys($fields)));
        $vals  = implode(',', array_values($fields));
        $out[] = "INSERT INTO `{$table}` ({$names}) VALUES ({$vals});";
    }
    $out[] = "";
}

// 3. settings (k/v, v = JSON-encoded value)
$out[] = "-- settings";
foreach (($seed['settings'] ?? []) as $k => $v) {
    if (strpos((string)$k, '__') === 0) continue;
    $out[] = "INSERT INTO bfs_settings (k, v) VALUES (" . sq(bfs_s($k)) . ", " . sj($v) . ");";
}
$out[] = "";

// 4. content sections
$out[] = "-- content";
$i = 0;
foreach (($seed['content'] ?? []) as $section => $data) {
    $out[] = "INSERT INTO bfs_content (section, sort_order, data) VALUES (" . sq(bfs_s($section)) . ", " . $i++ . ", " . sj($data) . ");";
}
$out[] = "";

// 5. roles + meta
$out[] = "-- roles";
$out[] = "INSERT INTO bfs_roles (id, sort_order, name, permissions, data) VALUES ('role-admin', 0, 'Administrator', '[\"*\"]', '{\"builtin\":true}');";
$out[] = "";
$out[] = "-- meta";
$out[] = "INSERT INTO bfs_meta (k, v) VALUES ('updatedAt', " . sq((string)time()) . ");";
$out[] = "";

file_put_contents(__DIR__ . '/install.sql', implode("\n", $out));
echo "install.sql written: " . count($out) . " lines\n";
