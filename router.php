<?php
// Router for PHP built-in server: serves clean URLs without .html extension
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = urldecode($path);

// Canonical redirect: /products.html -> /products (keep query string)
if (preg_match('/\.html$/i', $path)) {
    $clean = preg_replace('/\.html$/i', '', $path);
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    header('Location: ' . $clean . ($qs ? '?' . $qs : ''), true, 301);
    exit;
}

// Serve existing files and directories directly
$file = __DIR__ . $path;
if ($path !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}
if (is_dir($file)) {
    // index.php first (matches DirectoryIndex order) — let the built-in
    // server execute it so PHP pages like /admin/ are never shadowed by a
    // static index.html stub.
    if (file_exists($file . '/index.php')) {
        return false;
    }
    $index = $file . '/index.html';
    if (file_exists($index)) {
        readfile($index);
        return true;
    }
    return false;
}

// Try clean URL: /products -> /products.html
$clean = __DIR__ . $path . '.html';
if (file_exists($clean)) {
    readfile($clean);
    return true;
}

// Try index.html for root
if ($path === '/' || $path === '') {
    readfile(__DIR__ . '/index.html');
    return true;
}

// 404
http_response_code(404);
readfile(__DIR__ . '/index.html');
return true;
