<?php
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->query('SELECT data FROM bfs_state WHERE id = 1');
    $row  = $stmt->fetch();
    if ($row && $row['data'] !== '') {
        echo $row['data'];
    } else {
        echo json_encode(['empty' => true]);
    }
    exit;
}

if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if ($json === null) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid json']);
        exit;
    }
    $data = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = db()->prepare('INSERT INTO bfs_state (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
    $stmt->execute([$data]);
    db()->prepare('INSERT INTO bfs_sync_log (action, bytes) VALUES (?, ?)')
       ->execute(['save', strlen($data)]);
    echo json_encode(['ok' => true, 'bytes' => strlen($data)]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
