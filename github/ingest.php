<?php

declare(strict_types=1);

header("Content-Type: text/plain; charset=utf-8");

$queueDir = __DIR__ . "/queue";
if (!is_dir($queueDir) && !mkdir($queueDir, 0775, true) && !is_dir($queueDir)) {
    http_response_code(500);
    echo "queue dir create failed\n";
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") {
    http_response_code(405);
    echo "Method Not Allowed\n";
    exit;
}

$rawBody = file_get_contents("php://input");
if ($rawBody === false || $rawBody === "") {
    http_response_code(400);
    echo "empty body\n";
    exit;
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo "invalid json\n";
    exit;
}

$secret = getenv("GITHUB_WEBHOOK_SECRET") ?: "";
if ($secret !== "") {
    $sigHeader = $_SERVER["HTTP_X_HUB_SIGNATURE_256"] ?? "";
    if (!preg_match('/^sha256=[a-f0-9]{64}$/', $sigHeader)) {
        http_response_code(401);
        echo "missing/invalid signature header\n";
        exit;
    }

    $expected = "sha256=" . hash_hmac("sha256", $rawBody, $secret);
    if (!hash_equals($expected, $sigHeader)) {
        http_response_code(401);
        echo "signature mismatch\n";
        exit;
    }
}

$event = $_SERVER["HTTP_X_GITHUB_EVENT"] ?? "unknown";
$delivery = $_SERVER["HTTP_X_GITHUB_DELIVERY"] ?? "";
$repo = $payload["repository"]["full_name"] ?? "";
$ref = $payload["ref"] ?? "";
$sender = $payload["sender"]["login"] ?? "";

$record = [
    "received_at" => gmdate("c"),
    "meta" => [
        "event" => $event,
        "delivery" => $delivery,
        "repo" => $repo,
        "ref" => $ref,
        "sender" => $sender,
        "remote_addr" => $_SERVER["REMOTE_ADDR"] ?? "",
        "user_agent" => $_SERVER["HTTP_USER_AGENT"] ?? "",
    ],
    "payload" => $payload,
];

$fname = sprintf(
    "%s/%s-%s.json",
    $queueDir,
    gmdate("Ymd-His"),
    bin2hex(random_bytes(4))
);

$result = file_put_contents(
    $fname,
    json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
);

if ($result === false) {
    http_response_code(500);
    echo "queue write failed\n";
    exit;
}

http_response_code(200);
echo "queued\n";
