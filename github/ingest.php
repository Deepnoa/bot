<?php
$queueDir = __DIR__ . "/queue";
if (!is_dir($queueDir)) { mkdir($queueDir, 0777, true); }
$payload = ["timestamp" => gmdate("c"), "data" => "test"];
$fname = $queueDir . "/" . gmdate("Ymd-His") . ".json";
file_put_contents($fname, json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
header("Content-Type: text/plain; charset=utf-8");
echo "OK\n";
