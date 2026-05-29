<?php

use backend\components\AppConfig;

return [
    'class' => 'yii\db\Connection',
    'dsn' => AppConfig::env('DB_DSN', 'mysql:host=127.0.0.1;dbname=gadgets_to_go'),
    'username' => AppConfig::env('DB_USER', 'gadgets_to_go'),
    'password' => AppConfig::env('DB_PASSWORD', ''),
    'charset' => AppConfig::env('DB_CHARSET', 'utf8mb4'),

    // Schema cache options (for production environment)
    //'enableSchemaCache' => true,
    //'schemaCacheDuration' => 60,
    //'schemaCache' => 'cache',
];
