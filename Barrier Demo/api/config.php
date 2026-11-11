<?php
// Barrier Builders — DB config (XAMPP defaults: root / no password)
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'barrier_fencing');
define('DB_USER', 'root');
define('DB_PASS', '');

// Groq AI (server-side only — never exposed to the browser)
define('GROQ_API_KEY', 'gsk_COMAwbXreLsiNv9umJZXWGdyb3Y2aPyoaRhLPBbYrjoOjJG4fVl');

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}
