<?php
// Barrier Builders — admin account & role management API.
//
// Every request requires a valid, DB-verified admin session (401 otherwise)
// and the relevant permission (403 otherwise). Account writes go straight to
// bfs_admins with prepared statements — never through the whole-state blob.
//
//   GET  ?action=list    -> admins + roles (secrets stripped)
//   GET  ?action=roles   -> roles only
//   POST {action: ...}   -> see handle() below
require __DIR__ . '/state_store.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Strip everything that must never leave the server.
function admin_public(array $a): array {
    return [
        'id' => (string)($a['id'] ?? ''),
        'username' => (string)($a['username'] ?? $a['user'] ?? ''),
        'name' => (string)($a['name'] ?? ''),
        'email' => (string)($a['email'] ?? ''),
        'active' => ($a['active'] ?? true) !== false,
        'protected' => !empty($a['protected']),
        'role_id' => (string)($a['role_id'] ?? ''),
        'createdAt' => (string)($a['createdAt'] ?? ''),
        'avatar' => (string)($a['avatar'] ?? ''),
    ];
}

function role_public(array $r): array {
    return ['id' => $r['id'], 'name' => $r['name'], 'permissions' => $r['permissions'], 'builtin' => !empty($r['builtin'])];
}

// Require a valid session; returns the admin array or responds 401.
function require_admin(): array {
    $me = bfs_session_admin();
    if (!$me) respond(401, ['ok' => false, 'error' => 'session expired']);
    return $me;
}

// Require a permission; responds 403 when missing.
function require_perm(array $me, string $perm): void {
    if (!bfs_admin_can($me, $perm)) respond(403, ['ok' => false, 'error' => 'forbidden']);
}

function clean_str($v, int $max = 190): string {
    return mb_substr(trim((string)$v), 0, $max);
}

function admin_item_from_input(array $in, array $existing = []): array {
    $item = $existing;
    foreach (['username', 'name', 'email'] as $k) {
        if (array_key_exists($k, $in)) $item[$k] = clean_str($in[$k]);
    }
    if (array_key_exists('active', $in)) $item['active'] = (bool)$in['active'];
    if (array_key_exists('role_id', $in)) $item['role_id'] = clean_str($in['role_id'], 64);
    if (array_key_exists('avatar', $in)) $item['avatar'] = clean_str($in['avatar'], 200000);
    return $item;
}

function write_admin_row(string $id, array $item, ?string $passHash, ?int $sortOrder = null): void {
    $pdo = db();
    $username = clean_str($item['username'] ?? '', 120);
    $name = clean_str($item['name'] ?? '', 120);
    $email = clean_str($item['email'] ?? '');
    $active = (($item['active'] ?? true) === false) ? 0 : 1;
    $protected = !empty($item['protected']) ? 1 : 0;
    $roleId = clean_str($item['role_id'] ?? '', 64);
    $createdAt = (string)($item['createdAt'] ?? '');
    // never persist a usable password inside data JSON
    unset($item['password']);
    $data = bfs_j($item);
    if ($sortOrder === null) {
        $sortOrder = (int)$pdo->query("SELECT COALESCE(MAX(sort_order),0)+1 FROM bfs_admins")->fetchColumn();
    }
    $pdo->prepare("INSERT INTO bfs_admins
        (id, sort_order, username, name, email, password, pass_hash, active, protected, role_id, created_at, data)
        VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
        sort_order=VALUES(sort_order), username=VALUES(username), name=VALUES(name),
        email=VALUES(email), pass_hash=COALESCE(VALUES(pass_hash), pass_hash),
        active=VALUES(active), protected=VALUES(protected), role_id=VALUES(role_id),
        created_at=VALUES(created_at), data=VALUES(data)")
        ->execute([$id, $sortOrder, $username, $name, $email, $passHash, $active, $protected, $roleId, $createdAt, $data]);
}

function find_admin_conflict(string $username, string $email, string $excludeId = ''): ?array {
    $st = db()->query('SELECT id, username, email FROM bfs_admins');
    foreach ($st as $r) {
        if ($excludeId !== '' && (string)$r['id'] === $excludeId) continue;
        if ($username !== '' && strcasecmp((string)$r['username'], $username) === 0) return ['field' => 'username', 'id' => $r['id']];
        if ($email !== '' && strcasecmp((string)$r['email'], $email) === 0) return ['field' => 'email', 'id' => $r['id']];
    }
    return null;
}

$method = $_SERVER['REQUEST_METHOD'];

/* ------------------------------ GET -------------------------------- */
if ($method === 'GET') {
    $me = require_admin();
    $action = (string)($_GET['action'] ?? 'list');
    try {
        bfs_ensure_roles_schema();
        if ($action === 'roles') {
            respond(200, ['ok' => true, 'roles' => array_map('role_public', bfs_roles_all()), 'permissions' => bfs_all_permissions()]);
        }
        // list: admins from the DB rows (column-first), no secrets
        $admins = [];
        foreach (db()->query('SELECT * FROM bfs_admins ORDER BY sort_order, id') as $row) {
            $admins[] = admin_public(bfs_admin_row_to_item($row));
        }
        respond(200, ['ok' => true, 'admins' => $admins, 'roles' => array_map('role_public', bfs_roles_all()), 'permissions' => bfs_all_permissions(), 'me' => admin_public($me)]);
    } catch (Throwable $e) {
        error_log('admins.php GET: ' . $e->getMessage());
        respond(500, ['ok' => false, 'error' => 'server_error']);
    }
}

/* ------------------------------ POST ------------------------------- */
if ($method !== 'POST') respond(405, ['ok' => false, 'error' => 'method not allowed']);

$me = require_admin();
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(400, ['ok' => false, 'error' => 'invalid json']);
$action = (string)($in['action'] ?? '');

try {
    bfs_ensure_roles_schema();
    $pdo = db();

    switch ($action) {

    /* ---- self-service profile (any active admin) ---- */
    case 'updateprofile': {
        $raw = $pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote((string)$me['id']))->fetch();
        if (!$raw) respond(404, ['ok' => false, 'error' => 'not found']);
        $item = bfs_admin_row_to_item($raw);
        $newUser = clean_str($in['username'] ?? $item['username'], 120);
        $newEmail = clean_str($in['email'] ?? ($item['email'] ?? ''));
        $conflict = find_admin_conflict($newUser, $newEmail, (string)$me['id']);
        if ($conflict) respond(409, ['ok' => false, 'error' => $conflict['field'] . ' taken']);
        $item = admin_item_from_input([
            'username' => $newUser, 'name' => clean_str($in['name'] ?? $item['name'], 120),
            'email' => $newEmail, 'avatar' => $in['avatar'] ?? ($item['avatar'] ?? ''),
        ], $item);
        $passHash = !empty($in['password']) ? password_hash((string)$in['password'], PASSWORD_DEFAULT) : ($raw['pass_hash'] ?: null);
        write_admin_row((string)$me['id'], $item, $passHash);
        respond(200, ['ok' => true, 'admin' => admin_public(bfs_admin_row_to_item($pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote((string)$me['id']))->fetch()))]);
    }

    /* ---- account management (admins.manage) ---- */
    case 'create': {
        require_perm($me, 'admins.manage');
        $username = clean_str($in['username'] ?? '', 120);
        $email = clean_str($in['email'] ?? '');
        $password = (string)($in['password'] ?? '');
        if ($username === '') respond(400, ['ok' => false, 'error' => 'username required']);
        if (strlen($password) < 6) respond(400, ['ok' => false, 'error' => 'password must be at least 6 characters']);
        $conflict = find_admin_conflict($username, $email);
        if ($conflict) respond(409, ['ok' => false, 'error' => $conflict['field'] . ' already in use']);
        $roleId = clean_str($in['role_id'] ?? 'role-admin', 64);
        if (!bfs_role($roleId)) respond(400, ['ok' => false, 'error' => 'unknown role']);
        $id = 'ad-' . bin2hex(random_bytes(5));
        $item = admin_item_from_input($in, [
            'id' => $id, 'username' => $username, 'name' => clean_str($in['name'] ?? '', 120) ?: $username,
            'email' => $email, 'active' => true, 'role_id' => $roleId,
            'createdAt' => gmdate('c'),
        ]);
        write_admin_row($id, $item, password_hash($password, PASSWORD_DEFAULT));
        respond(200, ['ok' => true, 'admin' => admin_public(bfs_admin_row_to_item($pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote($id))->fetch()))]);
    }

    case 'update': {
        require_perm($me, 'admins.manage');
        $id = clean_str($in['id'] ?? '', 64);
        $raw = $pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote($id))->fetch();
        if (!$raw) respond(404, ['ok' => false, 'error' => 'not found']);
        $item = bfs_admin_row_to_item($raw);
        if (bfs_is_owner_admin($item) && array_key_exists('active', $in) && !$in['active']) {
            respond(403, ['ok' => false, 'error' => 'owner account cannot be disabled']);
        }
        $newUser = clean_str($in['username'] ?? $item['username'], 120);
        $newEmail = clean_str($in['email'] ?? ($item['email'] ?? ''));
        $conflict = find_admin_conflict($newUser, $newEmail, $id);
        if ($conflict) respond(409, ['ok' => false, 'error' => $conflict['field'] . ' already in use']);
        $item = admin_item_from_input([
            'username' => $newUser, 'name' => clean_str($in['name'] ?? $item['name'], 120),
            'email' => $newEmail, 'active' => array_key_exists('active', $in) ? (bool)$in['active'] : $item['active'],
            'role_id' => $in['role_id'] ?? ($item['role_id'] ?? ''),
            'avatar' => $in['avatar'] ?? ($item['avatar'] ?? ''),
        ], $item);
        $passHash = !empty($in['password']) ? password_hash((string)$in['password'], PASSWORD_DEFAULT) : $raw['pass_hash'];
        write_admin_row($id, $item, $passHash ?: null);
        respond(200, ['ok' => true, 'admin' => admin_public(bfs_admin_row_to_item($pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote($id))->fetch()))]);
    }

    case 'setactive': {
        require_perm($me, 'admins.manage');
        $id = clean_str($in['id'] ?? '', 64);
        $raw = $pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote($id))->fetch();
        if (!$raw) respond(404, ['ok' => false, 'error' => 'not found']);
        $item = bfs_admin_row_to_item($raw);
        $active = (bool)($in['active'] ?? true);
        if (bfs_is_owner_admin($item) && !$active) respond(403, ['ok' => false, 'error' => 'owner account cannot be disabled']);
        $item['active'] = $active;
        write_admin_row($id, $item, $raw['pass_hash'] ?: null);
        respond(200, ['ok' => true]);
    }

    case 'delete': {
        require_perm($me, 'admins.manage');
        $id = clean_str($in['id'] ?? '', 64);
        if ($id === (string)$me['id']) respond(403, ['ok' => false, 'error' => 'cannot delete your own account']);
        $raw = $pdo->query("SELECT * FROM bfs_admins WHERE id = " . $pdo->quote($id))->fetch();
        if (!$raw) respond(404, ['ok' => false, 'error' => 'not found']);
        if (bfs_is_owner_admin(bfs_admin_row_to_item($raw))) respond(403, ['ok' => false, 'error' => 'owner account cannot be deleted']);
        $pdo->prepare('DELETE FROM bfs_admins WHERE id = ?')->execute([$id]);
        respond(200, ['ok' => true]);
    }

    /* ---- role management (roles.manage) ---- */
    case 'role-create': {
        require_perm($me, 'roles.manage');
        $name = clean_str($in['name'] ?? '', 120);
        if ($name === '') respond(400, ['ok' => false, 'error' => 'role name required']);
        foreach (bfs_roles_all() as $r) {
            if (strcasecmp($r['name'], $name) === 0) respond(409, ['ok' => false, 'error' => 'role name already exists']);
        }
        $perms = array_values(array_intersect((array)($in['permissions'] ?? []), bfs_all_permissions()));
        if (in_array('*', (array)($in['permissions'] ?? []), true)) $perms = ['*'];
        $id = 'role-' . bin2hex(random_bytes(4));
        $pdo->prepare('INSERT INTO bfs_roles (id, sort_order, name, permissions, data) VALUES (?,?,?,?,?)')
            ->execute([$id, (int)$pdo->query('SELECT COALESCE(MAX(sort_order),0)+1 FROM bfs_roles')->fetchColumn(), $name, json_encode($perms), json_encode(['builtin' => false])]);
        respond(200, ['ok' => true, 'role' => role_public(bfs_role($id))]);
    }

    case 'role-update': {
        require_perm($me, 'roles.manage');
        $id = clean_str($in['id'] ?? '', 64);
        $role = bfs_role($id);
        if (!$role) respond(404, ['ok' => false, 'error' => 'not found']);
        if (!empty($role['builtin'])) respond(403, ['ok' => false, 'error' => 'built-in role cannot be edited']);
        $name = clean_str($in['name'] ?? $role['name'], 120);
        $perms = array_values(array_intersect((array)($in['permissions'] ?? $role['permissions']), bfs_all_permissions()));
        if (in_array('*', (array)($in['permissions'] ?? []), true)) $perms = ['*'];
        $pdo->prepare('UPDATE bfs_roles SET name = ?, permissions = ? WHERE id = ?')
            ->execute([$name, json_encode($perms), $id]);
        respond(200, ['ok' => true, 'role' => role_public(bfs_role($id))]);
    }

    case 'role-delete': {
        require_perm($me, 'roles.manage');
        $id = clean_str($in['id'] ?? '', 64);
        $role = bfs_role($id);
        if (!$role) respond(404, ['ok' => false, 'error' => 'not found']);
        if (!empty($role['builtin'])) respond(403, ['ok' => false, 'error' => 'built-in role cannot be deleted']);
        $used = (int)$pdo->query("SELECT COUNT(*) FROM bfs_admins WHERE role_id = " . $pdo->quote($id))->fetchColumn();
        if ($used > 0) respond(409, ['ok' => false, 'error' => "role is assigned to $used admin(s) — reassign them first"]);
        $pdo->prepare('DELETE FROM bfs_roles WHERE id = ?')->execute([$id]);
        respond(200, ['ok' => true]);
    }

    default:
        respond(400, ['ok' => false, 'error' => 'unknown action']);
    }
} catch (Throwable $e) {
    error_log('admins.php ' . $action . ': ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'server_error']);
}
