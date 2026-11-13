<?php
// Client portal auth — dedicated server-side sessions.
//   GET  ?action=me                  -> { ok, client|null }
//   POST { action: 'register'|'login'|'logout'|'changepassword', ... }
// Sessions are separate from the admin session (bfs_client_id).

require_once __DIR__ . '/state_store.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_name('bfs_client');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function client_session_row(): ?array {
    $id = (string)($_SESSION[BFS_CLIENT_SESSION] ?? '');
    if ($id === '') return null;
    $row = bfs_client_row($id);
    if (!$row || (($row['active'] ?? 1) === 0) || (($row['item']['active'] ?? true) === false)) {
        unset($_SESSION[BFS_CLIENT_SESSION]);
        return null;
    }
    return $row;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = (string)($_GET['action'] ?? '');
$in = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $in = json_decode($raw, true);
    if (!is_array($in)) $in = $_POST;
    $action = (string)($in['action'] ?? $action);
}

try {
    if ($action === 'me' || ($method === 'GET' && $action === '')) {
        $row = client_session_row();
        out(['ok' => true, 'client' => $row ? bfs_client_public($row['item']) : null]);
    }

    if ($method !== 'POST') out(['ok' => false, 'error' => 'method'], 405);

    if ($action === 'logout') {
        unset($_SESSION[BFS_CLIENT_SESSION]);
        out(['ok' => true]);
    }

    if ($action === 'register') {
        $name  = trim((string)($in['name'] ?? ''));
        $email = trim((string)($in['email'] ?? ''));
        $phone = trim((string)($in['phone'] ?? ''));
        $pass  = (string)($in['password'] ?? '');
        if ($name === '' || $email === '' || $pass === '') out(['ok' => false, 'error' => 'Name, email and password are required.'], 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(['ok' => false, 'error' => 'Enter a valid email address.'], 422);
        if (strlen($pass) < 6) out(['ok' => false, 'error' => 'Password must be at least 6 characters.'], 422);
        if (bfs_client_by_email($email)) out(['ok' => false, 'error' => 'An account with this email already exists.'], 409);

        $id = bfs_client_insert(['name' => $name, 'email' => $email, 'phone' => $phone], $pass);
        session_regenerate_id(true);
        $_SESSION[BFS_CLIENT_SESSION] = $id;
        $row = bfs_client_row($id);
        out(['ok' => true, 'client' => bfs_client_public($row['item'])]);
    }

    if ($action === 'login') {
        $email = trim((string)($in['email'] ?? ''));
        $pass  = (string)($in['password'] ?? '');
        $row = $email !== '' ? bfs_client_by_email($email) : null;
        $via = $row ? bfs_client_verify($row, $pass) : false;
        if (!$row || !$via) out(['ok' => false, 'error' => 'Invalid credentials.'], 401);
        if ((($row['active'] ?? 1) === 0) || (($row['item']['active'] ?? true) === false)) {
            out(['ok' => false, 'error' => 'This account has been disabled.'], 403);
        }
        try { bfs_upgrade_cred('bfs_clients', (string)$row['item']['id'],
            ['pass_hash' => $row['pass_hash'] ?? '', 'item' => $row['item']], $pass); } catch (Throwable $e) {}
        session_regenerate_id(true);
        $_SESSION[BFS_CLIENT_SESSION] = (string)$row['item']['id'];
        out(['ok' => true, 'client' => bfs_client_public($row['item'])]);
    }

    if ($action === 'changepassword') {
        $row = client_session_row();
        if (!$row) out(['ok' => false, 'error' => 'Not signed in.'], 401);
        $pass = (string)($in['password'] ?? '');
        if (strlen($pass) < 6) out(['ok' => false, 'error' => 'Password must be at least 6 characters.'], 422);
        db()->prepare('UPDATE bfs_clients SET pass_hash = ? WHERE id = ?')
            ->execute([password_hash($pass, PASSWORD_DEFAULT), (string)$row['item']['id']]);
        out(['ok' => true]);
    }

    out(['ok' => false, 'error' => 'unknown action'], 400);
} catch (Throwable $e) {
    out(['ok' => false, 'error' => 'server error'], 500);
}
