<?php
/**
 * ST-Points API Proxy — Routes /api/* requests to Node.js backend
 * Works without mod_proxy on shared hosting
 */

// Get the API path
$requestUri = $_SERVER['REQUEST_URI'];

// Only proxy /api/* requests
if (strpos($requestUri, '/api/') !== 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

$backendUrl = 'http://127.0.0.1:4000' . $requestUri;
$method = $_SERVER['REQUEST_METHOD'];

// Read request body
$body = file_get_contents('php://input');

// Build headers to forward
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) === 'host') continue;
    $headers[] = "$name: $value";
}
$headers[] = 'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'];

// Forward cookies
if (!empty($_SERVER['HTTP_COOKIE'])) {
    $headers[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
}

// Make the request to backend
$ch = curl_init($backendUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend nedostupný', 'detail' => curl_error($ch)]);
    curl_close($ch);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);

// Forward response status
http_response_code($httpCode);

// Forward response headers
foreach (explode("\r\n", $responseHeaders) as $header) {
    if (empty($header)) continue;
    if (stripos($header, 'HTTP/') === 0) continue;
    if (stripos($header, 'Transfer-Encoding:') === 0) continue;
    header($header, false);
}

echo $responseBody;
