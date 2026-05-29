<?php

namespace backend\components;

class BootstrapEnv
{
    public static function apply()
    {
        defined('YII_DEBUG') or define('YII_DEBUG', self::boolEnv('YII_DEBUG', false));
        defined('YII_ENV') or define('YII_ENV', self::env('YII_ENV', self::env('APP_ENV', 'prod')));
    }

    private static function env($name, $default)
    {
        $value = getenv($name);
        return $value === false || $value === '' ? $default : $value;
    }

    private static function boolEnv($name, $default)
    {
        $value = getenv($name);
        if ($value === false || $value === '') {
            return $default;
        }

        return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
    }
}
