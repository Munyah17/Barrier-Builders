<?php
// Barrier Builders — image upload endpoint (admin only).
// Accepts multipart/form-data with field "file". Saves to assets/uploads/ and
// returns { ok, path } where path is site-relative (e.g. "assets/uploads/abc.jpg").

require __DIR__ . '/state_store.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'samesite'=>'Lax']);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'method not allowed']); exit; }

// Admin session required — uploads write files to the site.
if (!bfs_session_admin()) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'not authenticated']); exit; }

if (empty($_FILES['file'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'no file']); exit; }

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'upload error '.$f['error']]); exit; }

// Validate it's a real image
$info = @getimagesize($f['tmp_name']);
if (!$info) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'not an image']); exit; }

$allowed = [IMAGETYPE_JPEG=>'jpg', IMAGETYPE_PNG=>'png', IMAGETYPE_GIF=>'gif', IMAGETYPE_WEBP=>'webp', IMAGETYPE_AVIF=>'avif'];
$mime = $info[2];
if (!isset($allowed[$mime])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'unsupported image type']); exit; }

// Size guard (8 MB)
if ($f['size'] > 8 * 1024 * 1024) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'file too large (max 8MB)']); exit; }

$dir = __DIR__ . '/../assets/uploads';
if (!is_dir($dir)) { @mkdir($dir, 0755, true); }

$ext = $allowed[$mime];
$name = 'u_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = $dir . '/' . $name;

if (!move_uploaded_file($f['tmp_name'], $dest)) {
    http_response_code(500); echo json_encode(['ok'=>false,'error'=>'could not save file']); exit;
}

echo json_encode(['ok'=>true, 'path'=>'assets/uploads/'.$name, 'bytes'=>$f['size']]);
