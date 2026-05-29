<?php

namespace backend\components;

use Yii;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use yii\web\ForbiddenHttpException;
use yii\web\UnauthorizedHttpException;

class InstitutionAccess
{
    public static function currentPayload()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        if (!$authHeader || !preg_match('/^Bearer\s+(.*?)$/', $authHeader, $matches)) {
            throw new UnauthorizedHttpException('Missing bearer token.');
        }

        try {
            return JWT::decode($matches[1], new Key(Yii::$app->params['jwtSecretKey'], 'HS256'));
        } catch (\Exception $e) {
            Yii::warning('JWT decode failed during institution access check.', __METHOD__);
            throw new UnauthorizedHttpException('Invalid bearer token.');
        }
    }

    public static function assertCanAccessCode($code)
    {
        if (!self::canAccessCode(self::currentPayload(), $code)) {
            throw new ForbiddenHttpException('You are not allowed to modify records for this institution.');
        }
    }

    public static function assertCanAccessInventory($inventory)
    {
        self::assertCanAccessCode($inventory->owner);
    }

    public static function canAccessCode($payload, $code, ?array $institutions = null)
    {
        $role = isset($payload->role) ? (string)$payload->role : '';
        $location = isset($payload->location) ? (string)$payload->location : '';
        $code = (string)$code;

        if (in_array($role, ['super-admin', 'system-admin'], true)) {
            return true;
        }

        if ($role === 'admin' && $location === '') {
            return true;
        }

        $institution = self::institutionForLocation($location, $institutions);
        if (!$institution) {
            return false;
        }

        if ($code === ($institution['code'] ?? '')) {
            return true;
        }

        foreach ($institution['branchPrefixes'] ?? [] as $prefix) {
            if ($prefix !== '' && strpos($code, $prefix) === 0) {
                return true;
            }
        }

        foreach (['branches', 'locations'] as $listName) {
            foreach ($institution[$listName] ?? [] as $entry) {
                if (($entry['code'] ?? '') === $code) {
                    return true;
                }
            }
        }

        return false;
    }

    public static function scopedInstitutionSlug()
    {
        $payload = self::currentPayload();
        return isset($payload->location) ? (string)$payload->location : '';
    }

    private static function institutionForLocation($location, ?array $institutions = null)
    {
        if ($location === '') {
            return null;
        }

        if ($institutions === null) {
            $institutions = Yii::$app->params['appConfig']->publicConfig()['institutions'] ?? [];
        }
        foreach ($institutions as $institution) {
            if (($institution['slug'] ?? '') === $location) {
                return $institution;
            }
        }

        return null;
    }
}
