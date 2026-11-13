<?php
// Barrier Builders — DB config (cPanel)
// On cPanel these are usually  cpaneluser_dbname / cpaneluser_dbuser /
// the password you set in "MySQL Databases" — NOT root/blank.
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'barrierco_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// Groq AI (server-side only — never exposed to the browser).
// Set the GROQ_API_KEY environment variable on the host to override this
// fallback, and rotate the key — it was committed to source at one point.
$groqKey = getenv('GROQ_API_KEY');
define('GROQ_API_KEY', $groqKey !== false && $groqKey !== ''
    ? $groqKey
    : 'gsk_COMAwbXreLsiNv9umJZXWGdyb3Y2aPyoaRhLPBbYrjoOjJG4fVl');

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
