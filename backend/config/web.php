<?php

$params = require __DIR__ . '/params.php';
$db = require __DIR__ . '/db.php';

$smtpDsn = \backend\components\AppConfig::env('SMTP_DSN', '');
$mailerTransport = $smtpDsn !== ''
    ? ['dsn' => $smtpDsn]
    : [
        'scheme' => \backend\components\AppConfig::env('SMTP_SCHEME', 'smtp'),
        'host' => \backend\components\AppConfig::env('SMTP_HOST', 'localhost'),
        'username' => \backend\components\AppConfig::env('SMTP_USERNAME', ''),
        'password' => \backend\components\AppConfig::env('SMTP_PASSWORD', ''),
        'port' => (int)\backend\components\AppConfig::env('SMTP_PORT', '25'),
    ];

$config = [
    'id' => 'basic',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'modules' => [
        'api' => [
            'class' => 'backend\modules\api\Module',
        ],
    ],
    'components' => [
        'request' => [
            'cookieValidationKey' => $params['jwtSecretKey'],
        ],
        'response' => [
            'on beforeSend' => function ($event) {
                $headers = $event->sender->headers;
                $headers->set('X-Content-Type-Options', 'nosniff');
                $headers->set('Referrer-Policy', \backend\components\AppConfig::env('REFERRER_POLICY', 'strict-origin-when-cross-origin'));
                $headers->set('Permissions-Policy', \backend\components\AppConfig::env('PERMISSIONS_POLICY', 'camera=(), microphone=(), geolocation=()'));

                $frameAncestors = \backend\components\AppConfig::env('SECURITY_FRAME_ANCESTORS', '');
                if ($frameAncestors !== '') {
                    $headers->set('Content-Security-Policy', 'frame-ancestors ' . $frameAncestors);
                }

                if (\backend\components\AppConfig::env('ENABLE_HSTS', 'false') === 'true') {
                    $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
                }
            },
        ],
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'user' => [
            'identityClass' => 'backend\components\ShibbolethUser',
            'enableAutoLogin' => false,
            'enableSession' => false,
            'loginUrl' => null, // Disable default login URL
        ],
        'authManager' => [
            'class' => 'yii\rbac\DbManager', // or use 'yii\rbac\PhpManager' for file-based RBAC
            'defaultRoles' => ['guest'], // optional
        ],
        'errorHandler' => [
            'errorAction' => 'site/error',
        ],
        'mailer' => [
            'class' => \yii\symfonymailer\Mailer::class,
            // send all mails to a file by default. You have to set
            // 'useFileTransport' to false and configure transport
            // for the mailer to send real emails.
            'useFileTransport' => false,
            'transport' => $mailerTransport,
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning', 'info'],
                ],
            ],
        ],
        'db' => $db,
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'enableStrictParsing' => true,
            'rules' => [
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/auth'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'POST local-login' => 'local-login',
                        'POST exchange-code' => 'exchange-code',
                        'GET logout' => 'logout',
                        'POST logout' => 'logout',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/config'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET index' => 'index',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/request-access'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'POST create' => 'create',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/user'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET index' => 'index',
                        'GET view/<id>' => 'view',
                        'PUT update/<id>' => 'update',
                        'PATCH update/<id>' => 'update',
                        'DELETE delete/<id>' => 'delete',
                        'POST approve/<id>' => 'approve',
                        'POST reject/<id>' => 'reject',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/inventory'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'POST create' => 'create',
                        'POST update/<id>' => 'update',
                        'DELETE delete/<id>' => 'delete',
                        'GET image/<id>' => 'image',
                        'GET branches/<id>' => 'branches',
                        'POST branches/<id>' => 'set-branches',
                        'PUT branches/<id>' => 'set-branches',
                        'PATCH branches/<id>' => 'set-branches',
                        'POST add-branch/<id>' => 'add-branch',
                        'DELETE branch/<id>' => 'delete-branch',
                        'GET inventory-search' => 'inventory-search',
                        'GET get-folio' => 'get-folio',
                        'GET location-data' => 'location-data',
                        'GET get-image-data' => 'get-image-data',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/label'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET get-data' => 'get-data',
                        'POST create-label' => 'create-label',
                        'PUT update' => 'update',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/styling'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET get-data' => 'get-data',         // Public access
                        'POST create-style' => 'create-style', // Authenticated access
                        'POST update-style' => 'update-style', // Authenticated access
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/login'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET login' => 'login',
                        'POST request-access' => 'request-access',
                    ],
                ],
                [
                    'class' => 'yii\rest\UrlRule',
                    'controller' => ['api/settings'],
                    'pluralize' => false,
                    'extraPatterns' => [
                        'GET disabled-items' => 'disabled-items',
                        'POST disabled-items' => 'save-disabled-items',
                    ],
                ],
            ],
        ],
    ],
    'as cors' => [
        'class' => \yii\filters\Cors::class,
        'cors' => $params['cors'],
    ],
    'params' => $params,
];

if (YII_ENV_DEV) {
    // configuration adjustments for 'dev' environment
    $config['bootstrap'][] = 'debug';
    $config['modules']['debug'] = [
        'class' => 'yii\debug\Module',
        // uncomment the following to add your IP if you are not connecting from localhost.
        'allowedIPs' => ['127.0.0.1', '::1'],
    ];

    $config['bootstrap'][] = 'gii';
    $config['modules']['gii'] = [
        'class' => 'yii\gii\Module',
        // uncomment the following to add your IP if you are not connecting from localhost.
        //'allowedIPs' => ['127.0.0.1', '::1'],
    ];
}

return $config;
