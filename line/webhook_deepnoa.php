<?php
header('Content-Type: text/plain; charset=utf-8');

function safe_equals($a, $b) {
    if (!is_string($a) || !is_string($b)) {
        return false;
    }
    if (strlen($a) !== strlen($b)) {
        return false;
    }
    $result = 0;
    $len = strlen($a);
    for ($i = 0; $i < $len; $i++) {
        $result |= ord($a[$i]) ^ ord($b[$i]);
    }
    return $result === 0;
}

$baseDir = __DIR__ . '/deepnoa';
$queueDir = $baseDir . '/queue';
$secretFile = $baseDir . '/.line_secret';

if (!is_dir($queueDir)) {
    @mkdir($queueDir, 0777, true);
}
if (!is_dir($queueDir)) {
    http_response_code(500);
    echo "queue dir create failed\n";
    exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($method !== 'POST') {
    http_response_code(405);
    echo "Method Not Allowed\n";
    exit;
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || $rawBody === '') {
    http_response_code(400);
    echo "empty body\n";
    exit;
}

$secret = getenv('LINE_CHANNEL_SECRET');
if (!$secret && is_readable($secretFile)) {
    $secret = trim(file_get_contents($secretFile));
}
if (!$secret) {
    http_response_code(500);
    echo "LINE secret is not configured\n";
    exit;
}

$signature = isset($_SERVER['HTTP_X_LINE_SIGNATURE']) ? $_SERVER['HTTP_X_LINE_SIGNATURE'] : '';
if ($signature === '') {
    http_response_code(401);
    echo "missing signature\n";
    exit;
}

$expected = base64_encode(hash_hmac('sha256', $rawBody, $secret, true));
if (!safe_equals($expected, $signature)) {
    http_response_code(401);
    echo "signature mismatch\n";
    exit;
}

$body = json_decode($rawBody, true);
if (!is_array($body)) {
    http_response_code(400);
    echo "invalid json\n";
    exit;
}

$events = isset($body['events']) && is_array($body['events']) ? $body['events'] : array();
if (count($events) === 0) {
    http_response_code(200);
    echo "no events\n";
    exit;
}

$saved = 0;
foreach ($events as $event) {
    if (!is_array($event)) {
        continue;
    }

    $eventType = isset($event['type']) ? $event['type'] : '';
    $messageType = isset($event['message']['type']) ? $event['message']['type'] : '';
    if ($eventType !== 'message' || $messageType !== 'text') {
        continue;
    }

    $userId = isset($event['source']['userId']) ? $event['source']['userId'] : '';
    $replyToken = isset($event['replyToken']) ? $event['replyToken'] : '';
    $userMsg = isset($event['message']['text']) ? trim((string)$event['message']['text']) : '';
    if ($userId === '' || $replyToken === '' || $userMsg === '') {
        continue;
    }

    $record = array(
        'received_at' => gmdate('c'),
        'channel' => 'deepnoa',
        'source' => 'line_webhook',
        'job' => array(
            'user_id' => $userId,
            'reply_token' => $replyToken,
            'user_msg' => $userMsg,
        ),
        'event' => array(
            'type' => $eventType,
            'message_type' => $messageType,
            'timestamp' => isset($event['timestamp']) ? $event['timestamp'] : null,
            'line_request_id' => isset($_SERVER['HTTP_X_LINE_REQUEST_ID']) ? $_SERVER['HTTP_X_LINE_REQUEST_ID'] : '',
        ),
    );

    $file = sprintf('%s/%s-%s.json', $queueDir, gmdate('Ymd-His'), substr(md5(uniqid('', true)), 0, 8));
    $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    $written = file_put_contents($file, $json);
    if ($written !== false) {
        $saved++;
    }
}

http_response_code(200);
echo "queued {$saved}\n";
