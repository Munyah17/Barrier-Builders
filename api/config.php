<?php
// Barrier Builders — DB config (cPanel)
// Defaults are the cPanel credentials; override with environment variables
// for local development (DB_HOST, DB_NAME, DB_USER, DB_PASS, GROQ_API_KEY).
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'barrierco_newdb');
define('DB_USER', getenv('DB_USER') ?: 'barrierco_newdb');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'griezmann17');

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
