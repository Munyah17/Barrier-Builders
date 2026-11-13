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
// Rows inserted directly via SQL (no usable `data` JSON) are rebuilt from
// their promoted columns so they don't become invisible.
function bfs_table_items(string $table): array {
    $out = [];
    foreach (db()->query("SELECT * FROM `$table` ORDER BY sort_order, id") as $row) {
        $item = bfs_jd($row['data'] ?? null);
        if (!is_array($item)) {
            $item = [];
            foreach ($row as $k => $v) {
                if (in_array($k, ['id', 'sort_order', 'data', 'pass_hash', 'password'], true)) continue;
                if ($v !== null && $v !== '') $item[$k] = $v;
            }
        }
        $item['id'] = $row['id'];
        $out[$row['id']] = $item;
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

function bfs_state_save(array $state, bool $authed, int $bytes = 0, bool $allowAdmins = false): void {
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
                // admin accounts are written ONLY through api/admins.php
                // (dedicated endpoint with duplicate/role/permission checks)
                if ($key === 'admins' && !$allowAdmins) continue;
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
/* roles & permissions                                                */
/* ------------------------------------------------------------------ */

// Canonical permission keys enforced by api/admins.php and the whole-state
// write gate in api/data.php.
function bfs_all_permissions(): array {
    return [
        'dashboard.view', 'analytics.view',
        'products.manage', 'promotions.manage', 'gallery.manage',
        'quotes.manage', 'invoices.manage', 'orders.manage',
        'content.manage', 'messages.manage', 'clients.manage',
        'admins.manage', 'roles.manage', 'settings.manage', 'sync',
    ];
}

// Idempotent schema ensure for roles — safe to call from any endpoint.
function bfs_ensure_roles_schema(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS bfs_roles (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        sort_order INT NOT NULL DEFAULT 0,
        name VARCHAR(120) NOT NULL DEFAULT '',
        permissions MEDIUMTEXT NULL,
        data MEDIUMTEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (!$pdo->query("SHOW COLUMNS FROM bfs_admins LIKE 'role_id'")->fetchColumn()) {
        $pdo->exec("ALTER TABLE bfs_admins ADD COLUMN role_id VARCHAR(64) NULL");
    }
    if (!(int)$pdo->query("SELECT COUNT(*) FROM bfs_roles")->fetchColumn()) {
        $pdo->prepare("INSERT INTO bfs_roles (id, sort_order, name, permissions, data) VALUES (?,?,?,?,?)")
            ->execute(['role-admin', 0, 'Administrator', json_encode(['*']), json_encode(['builtin' => true])]);
    }
    // existing admins keep full access — assign them the Administrator role
    $pdo->exec("UPDATE bfs_admins SET role_id = 'role-admin' WHERE role_id IS NULL OR role_id = ''");
}

function bfs_roles_all(): array {
    bfs_ensure_roles_schema();
    $out = [];
    foreach (db()->query("SELECT * FROM bfs_roles ORDER BY sort_order, name") as $r) {
        $meta = bfs_jd($r['data'] ?? null);
        $out[] = [
            'id' => (string)$r['id'],
            'name' => (string)$r['name'],
            'permissions' => bfs_jd($r['permissions'] ?? null) ?: [],
            'builtin' => !empty($meta['builtin']),
        ];
    }
    return $out;
}

function bfs_role(string $id): ?array {
    foreach (bfs_roles_all() as $r) if ($r['id'] === $id) return $r;
    return null;
}

// Permission set for an admin item/row. Owner and admins without an explicit
// role keep full access (backwards compatible); a role that no longer exists
// grants nothing.
function bfs_admin_perms(array $admin): array {
    if (bfs_is_owner_admin($admin)) return ['*'];
    $rid = (string)($admin['role_id'] ?? $admin['roleId'] ?? '');
    if ($rid === '') return ['*'];
    $role = bfs_role($rid);
    if (!$role) return [];
    $p = $role['permissions'];
    return in_array('*', $p, true) ? ['*'] : $p;
}

function bfs_admin_can(array $admin, string $perm): bool {
    $p = bfs_admin_perms($admin);
    return in_array('*', $p, true) || in_array($perm, $p, true);
}

/* ------------------------------------------------------------------ */
/* admin rows (column-first, data JSON optional)                       */
/* ------------------------------------------------------------------ */

// Merge a bfs_admins row into a state item: columns win for identity fields,
// data JSON supplies the rest. Never exposes pass_hash/password.
function bfs_admin_row_to_item(array $row): array {
    $item = bfs_jd($row['data'] ?? null);
    if (!is_array($item)) $item = [];
    foreach (['id' => $row['id'], 'username' => $row['username'], 'name' => $row['name'],
              'email' => $row['email'], 'active' => $row['active'], 'protected' => $row['protected'],
              'role_id' => $row['role_id'] ?? null, 'createdAt' => $row['created_at']] as $k => $v) {
        if ($v === null || $v === '') continue;
        // TINYINT columns come back as 0/1 — normalise to real booleans so
        // `=== false` checks work everywhere
        $item[$k] = ($k === 'active' || $k === 'protected') ? (bool)(int)$v : $v;
    }
    $item['id'] = (string)$row['id'];
    unset($item['password']);
    return $item;
}

function bfs_admin_row_by_login(string $user): ?array {
    $st = db()->prepare('SELECT id, username, name, email, active, protected, role_id, pass_hash, created_at, data FROM bfs_admins WHERE username = ? OR email = ? LIMIT 1');
    $st->execute([$user, $user]);
    $row = $st->fetch();
    if (!$row) return null;
    return ['item' => bfs_admin_row_to_item($row), 'pass_hash' => (string)($row['pass_hash'] ?? '')];
}

function bfs_admin_row_by_id(string $id): ?array {
    $st = db()->prepare('SELECT id, username, name, email, active, protected, role_id, pass_hash, created_at, data FROM bfs_admins WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) return null;
    return ['item' => bfs_admin_row_to_item($row), 'pass_hash' => (string)($row['pass_hash'] ?? '')];
}

/* ------------------------------------------------------------------ */
/* admin session revalidation                                          */
/* ------------------------------------------------------------------ */

// Returns the session admin (with perms) only if the account still exists,
// is active, and is verified against the bfs_admins row — not browser state.
function bfs_session_admin() {
    static $cache = null, $done = false;
    if ($done) return $cache;
    $done = true; $cache = null;
    $s = $_SESSION['admin'] ?? null;
    if (!is_array($s) || empty($s['user'])) return null;
    try {
        $sid = (string)($s['id'] ?? '');
        $row = $sid !== '' ? bfs_admin_row_by_id($sid) : null;
        if (!$row) {
            // session may predate id storage — fall back to username/email
            $row = bfs_admin_row_by_login((string)$s['user']);
        }
        if (!$row) return null;
        $a = $row['item'];
        if (($a['active'] ?? true) === false) { unset($_SESSION['admin']); return null; }
        $cache = ['id' => (string)$a['id'], 'user' => (string)($a['username'] ?? $s['user']),
            'name' => (string)($a['name'] ?? ''), 'email' => (string)($a['email'] ?? ''),
            'role_id' => (string)($a['role_id'] ?? ''), 'perms' => bfs_admin_perms($a)];
        return $cache;
    } catch (Throwable $e) {
        error_log('bfs_session_admin: ' . $e->getMessage());
        return null;
    }
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

// Shared credential check. Authenticates against the actual bfs_admins row
// (username/email columns + pass_hash), checks active status, and only falls
// back to the settings credentials when no account exists at all.
// Returns the session admin array on success, null on bad credentials.
// Throws on database failure so callers can return a proper 500.
function bfs_attempt_login($user, $pass) {
    $user = (string)$user; $pass = (string)$pass;
    try {
        bfs_ensure_roles_schema();
        $row = bfs_admin_row_by_login($user);
        if ($row) {
            $a = $row['item'];
            if (($a['active'] ?? true) === false) return null; // disabled
            $cred = ['pass_hash' => $row['pass_hash'], 'item' => $a];
            $via = bfs_verify_cred($cred, $pass);
            if (!$via) return null; // wrong password — no settings fallback
            try { bfs_upgrade_cred('bfs_admins', (string)$a['id'], $cred, $pass); } catch (Throwable $e) {}
            $name = trim((string)($a['name'] ?? ''));
            if ($name === '' || strtolower($name) === 'yard admin') $name = (string)($a['username'] ?? '');
            session_regenerate_id(true);
            $_SESSION['admin'] = [
                'id' => (string)$a['id'],
                'user' => (string)($a['username'] ?? ''),
                'name' => $name,
                'email' => (string)($a['email'] ?? ''),
                'role_id' => (string)($a['role_id'] ?? ''),
            ];
            $_SESSION['admin']['perms'] = bfs_admin_perms($a);
            return $_SESSION['admin'];
        }
        // no admins-table account — legacy settings credentials fallback
        $settings = bfs_load_settings(db());
        $su = (string)($settings['adminUser'] ?? '');
        $sp = (string)($settings['adminPass'] ?? '');
        if ($su !== '' && $sp !== '' && hash_equals($su, $user) && hash_equals($sp, $pass)) {
            session_regenerate_id(true);
            $_SESSION['admin'] = ['id' => '', 'user' => $su, 'name' => $su, 'email' => '', 'role_id' => '', 'perms' => ['*']];
            return $_SESSION['admin'];
        }
        return null;
    } catch (Throwable $e) {
        error_log('bfs_attempt_login: ' . $e->getMessage());
        throw $e;
    }
}

// Form-post login (static fallback): redirect like the old endpoint.
function bfs_login($user, $pass): void {
    try {
        if (bfs_attempt_login($user, $pass)) { header('Location: /admin/'); exit; }
    } catch (Throwable $e) { /* fall through to error redirect */ }
    header('Location: /admin/?e=1'); exit;
}

// JSON login for fetch() callers: returns the admin array or null.
// Throws on server failure so the endpoint can return 500.
function bfs_login_api($user, $pass): ?array {
    return bfs_attempt_login($user, $pass);
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
