<?php
// Barrier Builders — state sync endpoint.
// GET  -> whole site state as JSON (admin secrets stripped)
// POST -> sync posted state into the relational tables (api/state_store.php)
//        ?action=login handled as form post for /admin/
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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && isset($_GET['logout'])) {
    $_SESSION = [];
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_destroy();
    header('Location: /admin/');
    exit;
}

if ($method === 'GET') {
    try {
        $state = bfs_state_load();
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'unavailable']);
        exit;
    }
    if (!$state) { echo json_encode(['empty' => true]); exit; }
    bfs_hide_admin_secrets($state);
    echo json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    $isJson = is_array($json);

    // JSON login for fetch() callers — reliable, no redirect sniffing.
    // The static form fallback below keeps the redirect behaviour.
    if ($isJson && ($json['action'] ?? '') === 'login') {
        $ok = bfs_login_api((string)($json['user'] ?? ''), (string)($json['pass'] ?? ''));
        echo json_encode(['ok' => $ok]);
        exit;
    }
    if (!$isJson && isset($_POST['action']) && $_POST['action'] === 'login') {
        bfs_login((string)($_POST['user'] ?? ''), (string)($_POST['pass'] ?? ''));
    }
    if (!$isJson || (!isset($json['settings']) && !isset($json['admins']) && !isset($json['products']) && !isset($json['quotes']))) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid json']);
        exit;
    }
    // revalidate the session against the admins table — a deleted or
    // deactivated account loses write access immediately
    $me = bfs_session_admin();
    $authed = $me !== null;
    // Admin pages flag their writes; if the session is gone we must NOT
    // silently downgrade to a public write (which would drop the change
    // while still returning ok).
    if (!$authed && !empty($_SERVER['HTTP_X_BFS_ADMIN'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'session expired']);
        exit;
    }
    try {
        bfs_state_save($json, $authed, strlen($raw));
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'unavailable']);
        exit;
    }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
