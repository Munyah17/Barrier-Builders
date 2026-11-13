<?php
// Barrier Builders — relational state store.
// Keeps the legacy whole-state JSON contract used by js/store.js:
//   GET  -> assembled state object (admin secrets stripped)
//   POST -> syncs the posted state into per-entity tables
// Tables: one per collection; each row = promoted columns + `data` JSON
// (the full item, authoritative on read). See api/install.sql.

require_once __DIR__ . '/config.php';

const BFS_OWNER_EMAIL   = 'munyamuzvidziwa19@gmail.com';
const BFS_OWNER_LEGACY  = 'munyah777@gmail.com';
const BFS_EVENTS_LIMIT  = 2000;

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

function bfs_j(?array $v): ?string {
    if ($v === null) return null;
    return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function bfs_jd(?string $s) {
    if ($s === null || $s === '') return null;
    $d = json_decode($s, true);
    return is_array($d) ? $d : null;
}
function bfs_s($v): string { return is_scalar($v) ? (string)$v : ''; }
function bfs_n($v) { return is_numeric($v) ? $v + 0 : 0; }

/* ------------------------------------------------------------------ */
/* collection definitions                                              */
/* 'promote' maps a state item to indexed columns (data JSON is truth) */
/* 'anon'   = what an unauthenticated POST may do:                     */
/*             'ro'      ignore entirely (admin-only)                  */
/*             'append'  insert items whose id is not yet in the table */
/*             'upsert'  insert/update by id, never delete             */
/* ------------------------------------------------------------------ */

function bfs_defs(): array {
    return [
        'products' => ['table' => 'bfs_products', 'anon' => 'ro', 'promote' => function ($i) {
            return ['slug' => bfs_s($i['slug'] ?? ''), 'name' => bfs_s($i['name'] ?? ''),
                'category' => bfs_s($i['category'] ?? ''), 'unit' => bfs_s($i['unit'] ?? ''),
                'featured' => !empty($i['featured']) ? 1 : 0,
                'price_per_m' => bfs_n($i['pricePerM'] ?? 0), 'stock' => bfs_n($i['stock'] ?? 0),
                'stock_unit' => bfs_s($i['stockUnit'] ?? ''), 'image' => bfs_s($i['image'] ?? '')];
        }],
        'promotions' => ['table' => 'bfs_promotions', 'anon' => 'ro', 'promote' => function ($i) {
            return ['title' => bfs_s($i['title'] ?? ''), 'active' => ($i['active'] ?? true) ? 1 : 0,
                'tag' => bfs_s($i['tag'] ?? ''), 'starts' => bfs_s($i['starts'] ?? '') ?: null,
                'ends' => bfs_s($i['ends'] ?? '') ?: null];
        }],
        'gallery' => ['table' => 'bfs_gallery', 'anon' => 'ro', 'promote' => function ($i) {
            return ['title' => bfs_s($i['title'] ?? ''), 'type' => bfs_s($i['type'] ?? ''),
                'location' => bfs_s($i['location'] ?? ''), 'image' => bfs_s($i['image'] ?? ''),
                'year' => isset($i['year']) && is_numeric($i['year']) ? (int)$i['year'] : null];
        }],
        'quotes' => ['table' => 'bfs_quotes', 'anon' => 'append', 'promote' => function ($i) {
            return ['ref' => bfs_s($i['ref'] ?? ''), 'created_at' => bfs_s($i['createdAt'] ?? $i['at'] ?? '') ?: null,
                'status' => bfs_s($i['status'] ?? 'sent'), 'source' => bfs_s($i['source'] ?? ''),
                'invoice_ref' => bfs_s($i['invoiceRef'] ?? '') ?: null,
                'subtotal' => bfs_n($i['subtotal'] ?? 0), 'vat' => bfs_n($i['vat'] ?? 0),
                'total' => bfs_n($i['total'] ?? 0)];
        }],
        'invoices' => ['table' => 'bfs_invoices', 'anon' => 'ro', 'promote' => function ($i) {
            return ['ref' => bfs_s($i['ref'] ?? ''), 'quote_ref' => bfs_s($i['quoteRef'] ?? '') ?: null,
                'quote_id' => bfs_s($i['quoteId'] ?? '') ?: null, 'lead_id' => bfs_s($i['leadId'] ?? '') ?: null,
                'created_at' => bfs_s($i['createdAt'] ?? '') ?: null, 'due_at' => bfs_s($i['dueAt'] ?? '') ?: null,
                'status' => bfs_s($i['status'] ?? 'unpaid'),
                'subtotal' => bfs_n($i['subtotal'] ?? 0), 'vat' => bfs_n($i['vat'] ?? 0),
                'total' => bfs_n($i['total'] ?? 0), 'paid' => bfs_n($i['paid'] ?? 0),
                'tracking' => bfs_s($i['tracking'] ?? '') ?: null];
        }],
        'orders' => ['table' => 'bfs_orders', 'anon' => 'ro', 'promote' => function ($i) {
            return ['tracking' => bfs_s($i['tracking'] ?? ''), 'invoice_ref' => bfs_s($i['invoiceRef'] ?? '') ?: null,
                'quote_ref' => bfs_s($i['quoteRef'] ?? '') ?: null,
                'created_at' => bfs_s($i['createdAt'] ?? '') ?: null, 'status' => bfs_s($i['status'] ?? 'pending')];
        }],
        'contacts' => ['table' => 'bfs_contacts', 'anon' => 'append', 'promote' => function ($i) {
            return ['created_at' => bfs_s($i['at'] ?? $i['createdAt'] ?? '') ?: null,
                'name' => bfs_s($i['name'] ?? ''), 'contact' => bfs_s($i['contact'] ?? '')];
        }],
        'leads' => ['table' => 'bfs_leads', 'anon' => 'append', 'promote' => function ($i) {
            return ['created_at' => bfs_s($i['at'] ?? $i['createdAt'] ?? '') ?: null,
                'status' => bfs_s($i['status'] ?? 'new'), 'type' => bfs_s($i['type'] ?? ''),
                'name' => bfs_s($i['name'] ?? ''), 'email' => bfs_s($i['email'] ?? ''),
                'contact' => bfs_s($i['contact'] ?? ''), 'title' => bfs_s($i['title'] ?? ''),
                'estimate' => isset($i['estimate']) && is_numeric($i['estimate']) ? bfs_n($i['estimate']) : null];
        }],
        'clients' => ['table' => 'bfs_clients', 'anon' => 'upsert', 'credential' => true,
            'preserve_anon' => ['active'],
            'preserve_fn' => function ($item, $existing) {
                // anonymous upserts may edit profile fields only — never let a
                // visitor overwrite credentials, email or a verified KYC
                unset($item['password']);
                if (isset($existing['email'])) $item['email'] = $existing['email'];
                if ((($existing['kyc']['status'] ?? '') === 'verified') && isset($item['kyc'])) {
                    $item['kyc'] = $existing['kyc'];
                }
                return $item;
            },
            'promote' => function ($i) {
            return ['name' => bfs_s($i['name'] ?? ''), 'email' => bfs_s($i['email'] ?? ''),
                'phone' => bfs_s($i['phone'] ?? ''), 'active' => array_key_exists('active', $i) && $i['active'] === false ? 0 : 1,
                'created_at' => bfs_s($i['createdAt'] ?? '') ?: null];
        }],
        'admins' => ['table' => 'bfs_admins', 'anon' => 'ro', 'credential' => true, 'promote' => function ($i) {
            return ['username' => bfs_s($i['username'] ?? ''), 'name' => bfs_s($i['name'] ?? ''),
                'email' => bfs_s($i['email'] ?? ''), 'password' => null,
                'active' => array_key_exists('active', $i) && $i['active'] === false ? 0 : 1,
                'protected' => !empty($i['protected']) ? 1 : 0,
                'created_at' => bfs_s($i['createdAt'] ?? '') ?: null];
        }],
    ];
}

/* ------------------------------------------------------------------ */
/* owner-admin protection (ported from the blob implementation)        */
/* ------------------------------------------------------------------ */

function bfs_is_owner_admin($a): bool {
    if (!is_array($a)) return false;
    if (($a['protected'] ?? false) === true) return true;
    $email = strtolower(trim((string)($a['email'] ?? '')));
    $user = strtolower(trim((string)($a['username'] ?? '')));
    if ($email === BFS_OWNER_EMAIL || $email === BFS_OWNER_LEGACY) return true;
    if ((string)($a['id'] ?? '') === 'ad-1' && $user === 'munyah') return true;
    return false;
}

function bfs_ensure_owner(array &$state): void {
    if (!isset($state['admins']) || !is_array($state['admins'])) $state['admins'] = [];
    $owners = []; $rest = [];
    foreach ($state['admins'] as $a) {
        if (!is_array($a)) continue;
        if (strtolower(trim((string)($a['name'] ?? ''))) === 'yard admin') $a['name'] = (string)($a['username'] ?? '');
        if (bfs_is_owner_admin($a)) $owners[] = $a; else $rest[] = $a;
    }
    if ($owners) {
        $owner = $owners[0];
        for ($i = 1; $i < count($owners); $i++) {
            if (empty($owner['password']) && !empty($owners[$i]['password'])) $owner['password'] = $owners[$i]['password'];
            if (empty($owner['avatar']) && !empty($owners[$i]['avatar'])) $owner['avatar'] = $owners[$i]['avatar'];
        }
    } else {
        $owner = ['id' => 'ad-1', 'username' => 'Munyah', 'name' => 'Munyah',
            'email' => BFS_OWNER_EMAIL, 'active' => true, 'protected' => true,
            'createdAt' => gmdate('c')];
    }
    $owner['email'] = BFS_OWNER_EMAIL;
    $owner['protected'] = true;
    $owner['active'] = true;
    if (empty($owner['username'])) $owner['username'] = 'Munyah';
    $name = trim((string)($owner['name'] ?? ''));
    if ($name === '' || strtolower($name) === 'yard admin') $owner['name'] = 'Munyah';
    if (empty($owner['id'])) $owner['id'] = 'ad-1';
    $state['admins'] = array_merge([$owner], $rest);
}

function bfs_hide_admin_secrets(array &$state): void {
    $admins = $state['admins'] ?? [];
    foreach ($admins as &$a) {
        if (is_array($a)) unset($a['password']);
    }
    unset($a);
    $state['admins'] = $admins;
    if (isset($state['settings']) && is_array($state['settings'])) unset($state['settings']['adminPass']);
    // client passwords are server-side credentials only — never leave the API
    $clients = $state['clients'] ?? [];
    foreach ($clients as &$c) {
        if (is_array($c)) unset($c['password']);
    }
    unset($c);
    $state['clients'] = $clients;
}

/* ------------------------------------------------------------------ */
/* low-level table sync                                                */
/* ------------------------------------------------------------------ */

// Returns map id => decoded item for a collection table.
function bfs_table_items(string $table): array {
    $out = [];
    foreach (db()->query("SELECT id, data FROM `$table` ORDER BY sort_order, id") as $row) {
        $item = bfs_jd($row['data'] ?? null);
        if (is_array($item)) { $item['id'] = $row['id']; $out[$row['id']] = $item; }
    }
    return $out;
}

function bfs_upsert_row(PDO $pdo, string $table, string $id, int $sort, array $promoted, string $dataJson): void {
    $cols = ['id' => $id, 'sort_order' => $sort] + $promoted + ['data' => $dataJson];
    $names = implode(',', array_map(fn($c) => "`$c`", array_keys($cols)));
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $updates = implode(',', array_map(fn($c) => "`$c` = VALUES(`$c`)", array_diff(array_keys($cols), ['id'])));
    $pdo->prepare("INSERT INTO `$table` ($names) VALUES ($ph) ON DUPLICATE KEY UPDATE $updates")
        ->execute(array_values($cols));
}

/*
 * Sync one list collection.
 *  $mode 'mirror' : delete rows missing from $items, upsert all (authed)
 *  $mode 'append' : insert only ids not present (anonymous quotes/leads/contacts)
 *  $mode 'upsert' : insert/update by id, never delete (anonymous clients)
 *  $preserve      : item keys forced back to DB values on 'upsert' (anon clients: active)
 */
function bfs_sync_collection(PDO $pdo, array $def, array $items, string $mode, array $preserve = []): void {
    $table = $def['table'];
    $existing = bfs_table_items($table);
    $seen = [];

    foreach (array_values($items) as $idx => $item) {
        if (!is_array($item)) continue;
        $id = bfs_s($item['id'] ?? '');
        if ($id === '') continue;
        $seen[$id] = true;
        $isNew = !isset($existing[$id]);

        if ($mode === 'append' && !$isNew) continue;
        if ($mode === 'upsert' && !$isNew && $preserve) {
            foreach ($preserve as $k) {
                if (array_key_exists($k, $existing[$id])) $item[$k] = $existing[$id][$k];
            }
        }
        if ($mode === 'upsert' && !$isNew && isset($def['preserve_fn'])) {
            $item = $def['preserve_fn']($item, $existing[$id]);
        }
        if ($mode === 'ro') continue;

        // credential collections: hash any supplied legacy password — the
        // UPDATE must run after the upsert so brand-new rows get it too
        $passHash = null;
        if (!empty($def['credential']) && !empty($item['password']) && is_string($item['password'])) {
            $passHash = bfs_hash_legacy($item['password']);
            unset($item['password']);
        }

        $promoted = ($def['promote'] ?? fn($i) => [])($item);
        bfs_upsert_row($pdo, $table, $id, $idx, $promoted, (string)bfs_j($item));
        if ($passHash !== null && $passHash !== '') {
            $pdo->prepare("UPDATE `$table` SET pass_hash = ? WHERE id = ?")->execute([$passHash, $id]);
        }
    }

    if ($mode === 'mirror') {
        $stale = array_diff(array_keys($existing), array_keys($seen));
        if ($stale) {
            $in = implode(',', array_fill(0, count($stale), '?'));
            $pdo->prepare("DELETE FROM `$table` WHERE id IN ($in)")->execute(array_values($stale));
        }
    }
}

function bfs_sync_settings(PDO $pdo, array $settings): void {
    $st = $pdo->prepare('INSERT INTO bfs_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
    $seen = [];
    foreach ($settings as $k => $v) {
        $k = bfs_s($k);
        if ($k === '' || strpos($k, '__') === 0) continue;
        $seen[] = $k;
        $st->execute([$k, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
    // delete keys no longer present (mirror)
    $rows = $pdo->query('SELECT k FROM bfs_settings')->fetchAll(PDO::FETCH_COLUMN);
    $gone = array_diff($rows, $seen);
    if ($gone) {
        $in = implode(',', array_fill(0, count($gone), '?'));
        $pdo->prepare("DELETE FROM bfs_settings WHERE k IN ($in)")->execute(array_values($gone));
    }
}

function bfs_load_settings(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query('SELECT k, v FROM bfs_settings') as $r) {
        $out[$r['k']] = json_decode((string)$r['v'], true);
    }
    return $out;
}

function bfs_sync_content(PDO $pdo, array $content): void {
    $st = $pdo->prepare('INSERT INTO bfs_content (section, sort_order, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), data = VALUES(data)');
    $seen = [];
    $i = 0;
    foreach ($content as $section => $data) {
        $section = bfs_s($section);
        if ($section === '') continue;
        $seen[] = $section;
        $st->execute([$section, $i++, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
    $rows = $pdo->query('SELECT section FROM bfs_content')->fetchAll(PDO::FETCH_COLUMN);
    $gone = array_diff($rows, $seen);
    if ($gone) {
        $in = implode(',', array_fill(0, count($gone), '?'));
        $pdo->prepare("DELETE FROM bfs_content WHERE section IN ($in)")->execute(array_values($gone));
    }
}

function bfs_load_content(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query('SELECT section, data FROM bfs_content ORDER BY sort_order, section') as $r) {
        $out[$r['section']] = bfs_jd($r['data']);
    }
    return $out;
}

function bfs_sync_analytics(PDO $pdo, array $analytics, bool $withEvents): void {
    $pv = $pdo->prepare('INSERT INTO bfs_analytics_pages (page, views) VALUES (?, ?) ON DUPLICATE KEY UPDATE views = VALUES(views)');
    foreach (($analytics['pageviews'] ?? []) as $page => $n) {
        $pv->execute([bfs_s($page), max(0, (int)$n)]);
    }
    $dy = $pdo->prepare('INSERT INTO bfs_analytics_daily (day, views, quotes, invoices) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE views = VALUES(views), quotes = VALUES(quotes), invoices = VALUES(invoices)');
    foreach (($analytics['daily'] ?? []) as $day => $d) {
        if (!is_array($d)) continue;
        $dy->execute([bfs_s($day), (int)($d['views'] ?? 0), (int)($d['quotes'] ?? 0), (int)($d['invoices'] ?? 0)]);
    }
    if ($withEvents && isset($analytics['events']) && is_array($analytics['events'])) {
        $pdo->exec('DELETE FROM bfs_analytics_events');
        $ev = array_slice($analytics['events'], -BFS_EVENTS_LIMIT);
        $ins = $pdo->prepare('INSERT INTO bfs_analytics_events (kind, at) VALUES (?, ?)');
        foreach ($ev as $e) {
            if (!is_array($e)) continue;
            $ins->execute([bfs_s($e['kind'] ?? ''), bfs_s($e['at'] ?? '') ?: null]);
        }
    }
}

function bfs_load_analytics(PDO $pdo): array {
    $pageviews = [];
    foreach ($pdo->query('SELECT page, views FROM bfs_analytics_pages') as $r) $pageviews[$r['page']] = (int)$r['views'];
    $daily = [];
    foreach ($pdo->query('SELECT day, views, quotes, invoices FROM bfs_analytics_daily') as $r) {
        $daily[$r['day']] = ['views' => (int)$r['views'], 'quotes' => (int)$r['quotes'], 'invoices' => (int)$r['invoices']];
    }
    $events = [];
    foreach ($pdo->query('SELECT kind, at FROM bfs_analytics_events ORDER BY id') as $r) {
        $events[] = ['kind' => $r['kind'], 'at' => $r['at']];
    }
    return ['pageviews' => $pageviews, 'events' => $events, 'daily' => $daily];
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

function bfs_state_empty(PDO $pdo): bool {
    $n = (int)$pdo->query(
        'SELECT (SELECT COUNT(*) FROM bfs_admins) + (SELECT COUNT(*) FROM bfs_products)
              + (SELECT COUNT(*) FROM bfs_quotes) + (SELECT COUNT(*) FROM bfs_clients)
              + (SELECT COUNT(*) FROM bfs_content) + (SELECT COUNT(*) FROM bfs_settings)'
    )->fetchColumn();
    return $n === 0;
}

function bfs_state_load() {
    $pdo = db();
    if (bfs_state_empty($pdo)) return null;

    $state = ['settings' => bfs_load_settings($pdo), 'content' => bfs_load_content($pdo)];
    foreach (bfs_defs() as $key => $def) {
        $state[$key] = array_values(bfs_table_items($def['table']));
    }
    $state['analytics'] = bfs_load_analytics($pdo);
    $state['updatedAt'] = (int)($pdo->query("SELECT v FROM bfs_meta WHERE k = 'updatedAt'")->fetchColumn() ?: 0);

    bfs_ensure_owner($state);
    return $state;
}

// Restore secrets the client never sees (GET strips them) before mirroring.
function bfs_preserve_admin_secrets(array &$state): void {
    $cur = bfs_table_items('bfs_admins');
    if (!empty($state['admins']) && is_array($state['admins'])) {
        foreach ($state['admins'] as &$a) {
            if (!is_array($a)) continue;
            $id = bfs_s($a['id'] ?? '');
            if ($id !== '' && isset($cur[$id]['password']) && $cur[$id]['password'] !== '' && empty($a['password'])) {
                $a['password'] = $cur[$id]['password'];
            }
        }
        unset($a);
    }
    $oldPass = bfs_s(bfs_load_settings(db())['adminPass'] ?? '');
    if ($oldPass !== '' && isset($state['settings']) && is_array($state['settings']) && empty($state['settings']['adminPass'])) {
        $state['settings']['adminPass'] = $oldPass;
    }
}

function bfs_state_save(array $state, bool $authed, int $bytes = 0): void {
    $pdo = db();
    $pdo->beginTransaction();
    try {
        if ($authed) {
            bfs_preserve_admin_secrets($state);
            bfs_ensure_owner($state);

            // Mirror only collections actually present in the payload —
            // an absent key means "not touched", never "delete all".
            if (isset($state['settings']) && is_array($state['settings'])) {
                bfs_sync_settings($pdo, $state['settings']);
            }
            if (isset($state['content']) && is_array($state['content'])) {
                bfs_sync_content($pdo, $state['content']);
            }
            foreach (bfs_defs() as $key => $def) {
                if (array_key_exists($key, $state)) {
                    bfs_sync_collection($pdo, $def, is_array($state[$key]) ? $state[$key] : [], 'mirror');
                }
            }
            if (isset($state['analytics']) && is_array($state['analytics'])) {
                bfs_sync_analytics($pdo, $state['analytics'], true);
            }
        } else {
            // Public writes: append-only leads/quotes/contacts, upsert clients,
            // analytics counters. Everything else keeps the DB version.
            foreach (['quotes', 'leads', 'contacts'] as $key) {
                $def = bfs_defs()[$key];
                bfs_sync_collection($pdo, $def, is_array($state[$key] ?? null) ? $state[$key] : [], 'append');
            }
            $cdef = bfs_defs()['clients'];
            bfs_sync_collection($pdo, $cdef, is_array($state['clients'] ?? null) ? $state['clients'] : [], 'upsert', $cdef['preserve_anon'] ?? []);
            bfs_sync_analytics($pdo, is_array($state['analytics'] ?? null) ? $state['analytics'] : [], false);
        }

        $state['updatedAt'] = (int) round(microtime(true) * 1000);
        $pdo->prepare("INSERT INTO bfs_meta (k, v) VALUES ('updatedAt', ?) ON DUPLICATE KEY UPDATE v = VALUES(v)")
            ->execute([(string)$state['updatedAt']]);
        $pdo->prepare('INSERT INTO bfs_sync_log (action, bytes) VALUES (?, ?)')
            ->execute(['save', $bytes]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/* ------------------------------------------------------------------ */
/* password hashing (password_hash) with legacy base64/raw fallback    */
/* ------------------------------------------------------------------ */

// Convert a legacy stored secret (raw or base64-of-password, as written by
// the old JS btoa() code) into a password_hash() value. Already-hashed
// values pass through untouched.
function bfs_hash_legacy($stored) {
    $stored = (string)$stored;
    if ($stored === '') return '';
    if (preg_match('/^\$2[aby]\$\d{2}\$/', $stored)) return $stored;
    $plain = $stored;
    // canonical base64 => it was btoa(password); decode to the real password
    if (strlen($stored) >= 8 && preg_match('/^[A-Za-z0-9+\/]+={0,2}$/', $stored)) {
        $dec = base64_decode($stored, true);
        if ($dec !== false && base64_encode($dec) === $stored) $plain = $dec;
    }
    return password_hash($plain, PASSWORD_DEFAULT);
}

// Fetch the credential columns for one admins/clients row.
function bfs_cred_row(string $table, string $id): ?array {
    $st = db()->prepare("SELECT pass_hash, data FROM `$table` WHERE id = ?");
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) return null;
    $row['item'] = bfs_jd($row['data'] ?? null) ?: [];
    return $row;
}

// Verify a plaintext password against pass_hash, falling back to the legacy
// secret inside the item JSON. Returns 'hash'|'legacy'|false.
function bfs_verify_cred(?array $credRow, string $plain) {
    if (!$credRow) return false;
    $hash = (string)($credRow['pass_hash'] ?? '');
    if ($hash !== '' && password_verify($plain, $hash)) return 'hash';
    $legacy = (string)($credRow['item']['password'] ?? '');
    if ($legacy !== '' && bfs_pass_ok($legacy, $plain)) return 'legacy';
    return false;
}

// After a successful legacy login, upgrade to pass_hash and strip the legacy
// secret from the stored item JSON.
function bfs_upgrade_cred(string $table, string $id, ?array $credRow, string $plain): void {
    if (!$credRow || empty($credRow['item']['password'])) {
        // no legacy secret stored — just ensure a hash exists for $plain
        if ($credRow && empty($credRow['pass_hash'])) {
            db()->prepare("UPDATE `$table` SET pass_hash = ? WHERE id = ?")
                ->execute([password_hash($plain, PASSWORD_DEFAULT), $id]);
        }
        return;
    }
    $hash = bfs_hash_legacy($credRow['item']['password']);
    $item = $credRow['item'];
    unset($item['password']);
    db()->prepare("UPDATE `$table` SET pass_hash = ?, data = ? WHERE id = ?")
        ->execute([$hash, bfs_j($item), $id]);
}

/* ------------------------------------------------------------------ */
/* admin session revalidation                                          */
/* ------------------------------------------------------------------ */

// Returns the session admin only if the account still exists and is active.
function bfs_session_admin() {
    static $cache = null, $done = false;
    if ($done) return $cache;
    $done = true; $cache = null;
    $s = $_SESSION['admin'] ?? null;
    if (!is_array($s) || empty($s['user'])) return null;
    try {
        $sid = (string)($s['id'] ?? '');
        $user = strtolower(trim((string)$s['user']));
        foreach (bfs_table_items('bfs_admins') as $a) {
            $aid = (string)($a['id'] ?? '');
            $au = strtolower(trim((string)($a['username'] ?? '')));
            $ae = strtolower(trim((string)($a['email'] ?? '')));
            $match = ($sid !== '' && $aid === $sid) || $au === $user || ($ae !== '' && $ae === $user);
            if (!$match) continue;
            if (($a['active'] ?? true) === false) return null;
            $cache = ['id' => $aid, 'user' => (string)($a['username'] ?? $s['user']),
                'name' => (string)($a['name'] ?? ''), 'email' => (string)($a['email'] ?? '')];
            return $cache;
        }
    } catch (Throwable $e) { /* DB down -> treat as logged out */ }
    return null;
}

/* ------------------------------------------------------------------ */
/* admin login (ported from the blob implementation)                  */
/* ------------------------------------------------------------------ */

function bfs_pass_ok($stored, $pass): bool {
    $stored = (string)$stored; $pass = (string)$pass;
    if ($stored === '') return false;
    if (hash_equals($stored, $pass)) return true;
    return hash_equals($stored, base64_encode($pass));
}

function bfs_find_admin(array $state, $user) {
    $id = strtolower(trim((string)$user));
    if ($id === '' || empty($state['admins']) || !is_array($state['admins'])) return null;
    foreach ($state['admins'] as $a) {
        if (!is_array($a)) continue;
        $u = strtolower(trim((string)($a['username'] ?? '')));
        $e = strtolower(trim((string)($a['email'] ?? '')));
        if ($u === $id || ($e !== '' && $e === $id)) return $a;
    }
    return null;
}

// Shared credential check. Returns the admin array on success (and upgrades
// the stored hash), null on failure.
function bfs_attempt_login($user, $pass) {
    try {
        $state = bfs_state_load();
    } catch (Throwable $e) {
        return null;
    }
    $found = bfs_find_admin($state ?: [], $user);
    $ok = false;
    if ($found && (($found['active'] ?? true) !== false)) {
        $cred = bfs_cred_row('bfs_admins', (string)($found['id'] ?? ''));
        $via = bfs_verify_cred($cred, (string)$pass);
        if ($via) {
            $ok = true;
            try { bfs_upgrade_cred('bfs_admins', (string)$found['id'], $cred, (string)$pass); } catch (Throwable $e) {}
        }
    }
    if (!$ok && !$found) {
        $settings = bfs_load_settings(db());
        $su = (string)($settings['adminUser'] ?? '');
        $sp = (string)($settings['adminPass'] ?? '');
        if ($su !== '' && $sp !== '' && hash_equals($su, (string)$user) && hash_equals($sp, (string)$pass)) {
            $found = ['id' => '', 'username' => $su, 'name' => $su, 'email' => ''];
            $ok = true;
        }
    }
    if (!$ok) return null;
    $name = trim((string)($found['name'] ?? ''));
    if ($name === '' || strtolower($name) === 'yard admin') $name = (string)($found['username'] ?? '');
    session_regenerate_id(true);
    $_SESSION['admin'] = [
        'id' => (string)($found['id'] ?? ''),
        'user' => (string)($found['username'] ?? ''),
        'name' => $name,
        'email' => (string)($found['email'] ?? ''),
    ];
    return $_SESSION['admin'];
}

// Form-post login (static fallback): redirect like the old endpoint.
function bfs_login($user, $pass): void {
    if (bfs_attempt_login($user, $pass)) { header('Location: /admin/'); exit; }
    header('Location: /admin/?e=1'); exit;
}

// JSON login for fetch() callers: reliable, no redirect sniffing.
function bfs_login_api($user, $pass): bool {
    return bfs_attempt_login($user, $pass) !== null;
}


/* ------------------------------------------------------------------ */
/* client portal auth (server-side sessions)                           */
/* ------------------------------------------------------------------ */

const BFS_CLIENT_SESSION = 'bfs_client_id';

function bfs_client_public(?array $item): ?array {
    if (!$item) return null;
    unset($item['password']);
    return $item;
}

// Fetch a client row (credential columns + decoded item).
function bfs_client_row(string $id): ?array {
    $st = db()->prepare('SELECT pass_hash, active, data FROM bfs_clients WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) return null;
    $row['item'] = bfs_jd($row['data'] ?? null) ?: [];
    $row['item']['id'] = $id;
    return $row;
}

function bfs_client_by_email(string $email): ?array {
    $st = db()->prepare('SELECT id FROM bfs_clients WHERE email = ? LIMIT 1');
    $st->execute([trim($email)]);
    $id = $st->fetchColumn();
    return $id ? bfs_client_row((string)$id) : null;
}

function bfs_client_insert(array $item, string $plainPass): string {
    $id = bfs_s($item['id'] ?? '') ?: ('cl-' . bin2hex(random_bytes(5)));
    $item['id'] = $id;
    $item['createdAt'] = $item['createdAt'] ?? gmdate('c');
    $item['active'] = $item['active'] ?? true;
    $item['kyc'] = $item['kyc'] ?? null;
    unset($item['password']);

    $def = bfs_defs()['clients'];
    $sort = (int)db()->query('SELECT COALESCE(MAX(sort_order),0)+1 FROM bfs_clients')->fetchColumn();
    $promoted = $def['promote']($item);
    bfs_upsert_row(db(), 'bfs_clients', $id, $sort, $promoted, (string)bfs_j($item));
    db()->prepare('UPDATE bfs_clients SET pass_hash = ? WHERE id = ?')
        ->execute([password_hash($plainPass, PASSWORD_DEFAULT), $id]);
    return $id;
}

function bfs_client_verify(array $row, string $plain) {
    $cred = ['pass_hash' => $row['pass_hash'] ?? '', 'item' => $row['item'] ?? []];
    return bfs_verify_cred($cred, $plain);
}
