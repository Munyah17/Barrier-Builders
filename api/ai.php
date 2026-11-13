<?php
// Barrier Builders — Groq AI proxy.
// Keeps the API key server-side. Accepts POST JSON:
//   { prompt, system?, max_tokens?, temperature?, model? }
// Returns { ok, text }.

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'method not allowed']); exit; }

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in) || empty($in['prompt'])) {
    http_response_code(400); echo json_encode(['ok'=>false,'error'=>'missing prompt']); exit;
}

$prompt   = trim((string)$in['prompt']);
$system   = trim((string)($in['system'] ?? 'You are a helpful assistant for Barrier Builders, a fencing company in Zimbabwe.'));
$maxTok   = max(50, min(2000, (int)($in['max_tokens'] ?? 600)));
$temp     = max(0, min(1.5, (float)($in['temperature'] ?? 0.7)));
$model    = preg_replace('/[^a-zA-Z0-9._\-\/]/', '', (string)($in['model'] ?? 'llama-3.3-70b-versatile'));

$key = defined('GROQ_API_KEY') ? GROQ_API_KEY : '';
if ($key === '') { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'AI not configured']); exit; }

$payload = [
    'model'       => $model,
    'temperature' => $temp,
    'max_tokens'  => $maxTok,
    'messages'    => [
        ['role' => 'system', 'content' => $system],
        ['role' => 'user',   'content' => $prompt],
    ],
];

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_TIMEOUT        => 60,
]);
$resp = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false) { http_response_code(502); echo json_encode(['ok'=>false,'error'=>'groq request failed: '.$err]); exit; }

$data = json_decode($resp, true);
if ($code !== 200 || !isset($data['choices'][0]['message']['content'])) {
    $msg = $data['error']['message'] ?? ('HTTP '.$code);
    http_response_code(502); echo json_encode(['ok'=>false,'error'=>$msg]); exit;
}

echo json_encode(['ok'=>true, 'text'=>trim($data['choices'][0]['message']['content']), 'model'=>$model]);
