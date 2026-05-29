<?php
session_start();

use Firebase\JWT\JWT;

require_once __DIR__ . '/../vendor/autoload.php';
backend\components\BootstrapEnv::apply();
require_once __DIR__ . '/../vendor/yiisoft/yii2/Yii.php';

$config = require __DIR__ . '/../config/web.php';
$app = new yii\web\Application($config);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = Yii::$app->params['cors']['Origin'];
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

$shibboleth = Yii::$app->params['shibboleth'];
$attributes = $shibboleth['attributes'];

$identifier = serverAttribute($attributes['id']);
$username = serverAttribute($attributes['username']);
$email = serverAttribute($attributes['email']);
$firstname = serverAttribute($attributes['firstName']);
$lastname = serverAttribute($attributes['lastName']);
$institutionValue = !empty($shibboleth['institutionAttribute'])
    ? serverAttribute($shibboleth['institutionAttribute'])
    : null;

$username = $username ?: $identifier ?: $email;

if ($username) {
    $location = resolveLocationSlug($email ?: $identifier, $institutionValue);
    $userData = getUserFromDatabase($username);
    if ($userData) {
        $issuedAt = time();
        $jwt = JWT::encode([
            'iat' => $issuedAt,
            'exp' => $issuedAt + 3600,
            'username' => $username,
            'location' => $location,
            'role' => $userData['role'],
        ], Yii::$app->params['jwtSecretKey'], 'HS256');

        $code = issueAuthCode($jwt);
        redirectToFrontend("/admin/{$location}?auth_code={$code}");
    }

    redirectToFrontend('/request-access');
}

header('HTTP/1.1 400 Bad Request');
echo json_encode(['error' => 'Invalid session or missing attributes.']);

function serverAttribute($name)
{
    return $name !== '' && isset($_SERVER[$name]) ? $_SERVER[$name] : null;
}

function getUserFromDatabase($username)
{
    try {
        $user = Yii::$app->db->createCommand("
            SELECT username, role, approved
            FROM authorized_users
            WHERE username = :username AND approved = 1
        ")
            ->bindValue(':username', $username)
            ->queryOne();

        return $user ?: false;
    } catch (Exception $e) {
        Yii::error('Database query failed: ' . $e->getMessage(), __METHOD__);
        return false;
    }
}

function resolveLocationSlug($identityValue, $institutionValue = null)
{
    $institutions = Yii::$app->params['appConfig']->publicConfig()['institutions'];
    $map = Yii::$app->params['shibboleth']['institutionMap'] ?? [];

    if ($institutionValue && isset($map[$institutionValue])) {
        return $map[$institutionValue];
    }

    $domain = strtolower(substr(strrchr((string)$identityValue, '@') ?: '', 1));
    foreach ($institutions as $institution) {
        foreach ($institution['emailDomains'] as $emailDomain) {
            if ($domain === $emailDomain || substr($domain, -strlen('.' . $emailDomain)) === '.' . $emailDomain) {
                return $institution['slug'];
            }
        }
    }

    return $institutions[0]['slug'] ?? 'admin';
}

function redirectToFrontend($path)
{
    $frontendBaseUrl = rtrim(getenv('FRONTEND_BASE_URL') ?: '/', '/');
    $returnUrl = $_GET['return_url'] ?? '';
    if ($returnUrl !== '') {
        $parts = parse_url($returnUrl);
        $origin = isset($parts['scheme'], $parts['host']) ? $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '') : '';
        if (in_array($origin, Yii::$app->params['cors']['Origin'], true)) {
            $frontendBaseUrl = rtrim($origin, '/');
        }
    }

    header('Location: ' . $frontendBaseUrl . $path);
    exit();
}

function issueAuthCode($jwt)
{
    $code = bin2hex(random_bytes(32));
    Yii::$app->cache->set('auth-code:' . $code, $jwt, 300);
    return $code;
}
