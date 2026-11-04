<?php
// お問い合わせフォームの受け口。DiscordのWebhookへ転送する。
// Webhook URL はブラウザに出さないため、ここ（サーバー側）だけで使う。
// 設定は _private/config.php（Web から読めない）に置く: <?php return ['discord_webhook' => 'https://discord.com/api/webhooks/...'];

header('Content-Type: application/json; charset=utf-8');

function done(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['ok' => $code === 200, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(405, 'POSTで送ってください');

$config = @include __DIR__ . '/_private/config.php';
$webhook = is_array($config) ? ($config['discord_webhook'] ?? '') : '';
if (!preg_match('#^https://(discord\.com|discordapp\.com)/api/webhooks/#', $webhook)) done(500, '受付の設定がまだです');

$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) done(400, '送信内容を読めませんでした');

// ボット避け: 人には見えない欄に何か入っていたら、受け付けたふりをして捨てる
if (!empty($in['website'])) done(200, 'ありがとうございます');

$memo = trim((string)($in['memo'] ?? ''));
$url  = trim((string)($in['url'] ?? ''));

if ($memo === '' || mb_strlen($memo) > 1000) done(400, 'お問い合わせ内容を1000文字以内で入れてください');
if ($url !== '' && (!preg_match('#^https?://[^\s]+$#', $url) || mb_strlen($url) > 300)) done(400, 'URLの形をご確認ください');

// 連投よけ: 同じ接続元から1時間に5件まで（接続元はハッシュにして一時的に数えるだけ）
$dir = __DIR__ . '/_private/rate';
@mkdir($dir, 0700, true);
$key = $dir . '/' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('YmdH'));
$n = (int)@file_get_contents($key);
if ($n >= 5) done(429, '時間をおいてもう一度お願いします');
@file_put_contents($key, (string)($n + 1));
foreach (glob($dir . '/*') ?: [] as $f) { if (filemtime($f) < time() - 7200) @unlink($f); }

$clean = fn(string $s) => str_replace(['@', '`'], ['＠', "'"], $s); // メンションやコードブロックを無効にする
$content = "【お問い合わせ】\n"
    . "> " . str_replace("\n", "\n> ", $clean($memo)) . "\n"
    . ($url !== '' ? "<" . $url . ">\n" : '');

$ch = curl_init($webhook);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'content' => mb_substr($content, 0, 1900),
        'allowed_mentions' => ['parse' => []],
    ], JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);
curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status < 200 || $status >= 300) done(502, '送れませんでした。時間をおいてもう一度お願いします');
done(200, '送信しました。ありがとうございます');
