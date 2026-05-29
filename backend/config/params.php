<?php

use backend\components\AppConfig;

$appConfig = new AppConfig();

return [
    'appConfig' => $appConfig,
    'folio' => require __DIR__ . '/folio.php',
    'jwtSecretKey' => AppConfig::env('APP_SECRET_KEY', 'change-me-in-production-use-at-least-32-bytes'),
    'cors' => [
        'Origin' => $appConfig->allowedOrigins(),
        'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'Access-Control-Allow-Credentials' => true,
        'Access-Control-Max-Age' => 3600,
        'Access-Control-Allow-Headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
        'Access-Control-Expose-Headers' => [],
    ],
    'mail' => [
        'from' => AppConfig::env('MAIL_FROM', 'no-reply@example.edu'),
        'accessRequestRecipients' => array_values(array_filter(array_map('trim', explode(',', AppConfig::env('ACCESS_REQUEST_RECIPIENTS', 'admin@example.edu'))))),
    ],
    'authProviders' => $appConfig->authProviders(),
    'shibboleth' => $appConfig->shibboleth(),
];
