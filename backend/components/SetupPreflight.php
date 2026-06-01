<?php

namespace backend\components;

use app\models\UserDb;

class SetupPreflight
{
    private $appConfig;
    private $projectRoot;

    public function __construct(AppConfig $appConfig, $projectRoot = null)
    {
        $this->appConfig = $appConfig;
        $this->projectRoot = $projectRoot ?: dirname(__DIR__, 2);
    }

    public function run()
    {
        $groups = [
            [
                'key' => 'local-testing',
                'label' => 'Local testing readiness',
                'items' => [
                    $this->checkAppSecret(),
                    $this->checkAuthProviders(),
                    $this->checkInstitutionConfig(),
                ],
            ],
            [
                'key' => 'shared-staging',
                'label' => 'Shared staging readiness',
                'items' => [
                    $this->checkCorsOrigins(),
                    $this->checkBootstrapAdmin(),
                    $this->checkMailSettings(),
                    $this->checkInstitutionImages(),
                ],
            ],
            [
                'key' => 'production',
                'label' => 'Production readiness',
                'items' => [
                    $this->checkFolioInventory(),
                    $this->checkRtacAvailability(),
                    $this->checkShibbolethSettings(),
                ],
            ],
        ];

        return [
            'summary' => $this->summary($groups),
            'groups' => $groups,
        ];
    }

    private function checkAppSecret()
    {
        $secret = AppConfig::env('APP_SECRET_KEY', '');
        if ($this->isDefaultLikeAppSecret($secret)) {
            return $this->item(
                'app-secret',
                'fail',
                'Application secret',
                'Set APP_SECRET_KEY to a unique random value with at least 32 characters.',
                'APP_SECRET_KEY'
            );
        }

        return $this->item(
            'app-secret',
            'pass',
            'Application secret',
            'APP_SECRET_KEY is configured.',
            'APP_SECRET_KEY'
        );
    }

    private function isDefaultLikeAppSecret($secret)
    {
        if ($secret === '' || strlen($secret) < 32) {
            return true;
        }

        $normalized = strtolower($secret);
        $defaultFragments = [
            'change-me',
            'local-development',
            'replace-with',
            'example',
            'default',
        ];

        foreach ($defaultFragments as $fragment) {
            if (strpos($normalized, $fragment) !== false) {
                return true;
            }
        }

        return false;
    }

    private function checkCorsOrigins()
    {
        $configuredOrigins = AppConfig::env('APP_ALLOWED_ORIGINS', '');
        $origins = $this->csvValues($configuredOrigins);
        if (!$origins || in_array('*', $origins, true)) {
            return $this->item(
                'cors-origins',
                'fail',
                'Allowed frontend origins',
                'Set APP_ALLOWED_ORIGINS to the exact frontend URL. Wildcard origins are not safe for shared deployments.',
                'APP_ALLOWED_ORIGINS'
            );
        }

        return $this->item(
            'cors-origins',
            'pass',
            'Allowed frontend origins',
            'APP_ALLOWED_ORIGINS is restricted to explicit origins.',
            'APP_ALLOWED_ORIGINS'
        );
    }

    private function csvValues($value)
    {
        return array_values(array_filter(array_map('trim', explode(',', $value)), function ($item) {
            return $item !== '';
        }));
    }

    private function checkBootstrapAdmin()
    {
        $enabled = UserDb::localBootstrapEnabled(AppConfig::env('LOCAL_ADMIN_ENABLED', 'true'));
        $username = AppConfig::env('LOCAL_ADMIN_USERNAME', '');
        $password = AppConfig::env('LOCAL_ADMIN_PASSWORD', '');

        if ($enabled && ($username === 'admin' || $password === 'admin' || $password === '')) {
            return $this->item(
                'bootstrap-admin',
                'warning',
                'Bootstrap admin',
                'Create a named system admin, then set LOCAL_ADMIN_ENABLED=false. Do not share an environment with admin/admin enabled.',
                'LOCAL_ADMIN_ENABLED'
            );
        }

        if ($enabled) {
            return $this->item(
                'bootstrap-admin',
                'warning',
                'Bootstrap admin',
                'Bootstrap admin is still enabled. Disable it with LOCAL_ADMIN_ENABLED=false after creating a named system admin.',
                'LOCAL_ADMIN_ENABLED'
            );
        }

        return $this->item(
            'bootstrap-admin',
            'pass',
            'Bootstrap admin',
            'Bootstrap admin is disabled.',
            'LOCAL_ADMIN_ENABLED'
        );
    }

    private function checkAuthProviders()
    {
        $providers = $this->appConfig->authProviders();
        $unsupported = array_values(array_diff($providers, ['local', 'shibboleth']));
        if (!$providers || $unsupported) {
            return $this->item(
                'auth-providers',
                'fail',
                'Authentication providers',
                'Configure authProviders with supported values: local and/or shibboleth.',
                'authProviders'
            );
        }

        return $this->item(
            'auth-providers',
            'pass',
            'Authentication providers',
            'Configured auth providers are supported.',
            'authProviders'
        );
    }

    private function checkMailSettings()
    {
        if (!in_array('local', $this->appConfig->authProviders(), true)) {
            return $this->item(
                'mail-settings',
                'pass',
                'Password reset email',
                'Local auth is disabled, so password reset email is not required.',
                'SMTP_HOST'
            );
        }

        $hasDsn = AppConfig::env('SMTP_DSN', '') !== '';
        $hasHost = AppConfig::env('SMTP_HOST', '') !== '';
        $hasFrom = AppConfig::env('MAIL_FROM', '') !== '';
        if (!$hasDsn && (!$hasHost || !$hasFrom)) {
            return $this->item(
                'mail-settings',
                'warning',
                'Password reset email',
                'Configure SMTP_DSN or SMTP_HOST and MAIL_FROM so local password reset emails can be sent.',
                'SMTP_DSN,SMTP_HOST,MAIL_FROM'
            );
        }

        return $this->item(
            'mail-settings',
            'pass',
            'Password reset email',
            'Mail settings are present for local password resets.',
            'SMTP_DSN,SMTP_HOST,MAIL_FROM'
        );
    }

    private function checkFolioInventory()
    {
        return $this->requiredEnvItem('folio-inventory', 'FOLIO inventory search', [
            'FOLIO_INVENTORY_BASE_URL',
            'FOLIO_TENANT_ID',
            'FOLIO_USERNAME',
            'FOLIO_PASSWORD',
        ]);
    }

    private function checkRtacAvailability()
    {
        return $this->requiredEnvItem('rtac-availability', 'RTAC availability', [
            'FOLIO_AVAILABILITY_BASE_URL',
            'FOLIO_RTAC_BASE_PATH',
            'FOLIO_API_KEY',
        ]);
    }

    private function checkShibbolethSettings()
    {
        if (!in_array('shibboleth', $this->appConfig->authProviders(), true)) {
            return $this->item(
                'shibboleth-settings',
                'pass',
                'Shibboleth attributes',
                'Shibboleth auth is disabled.',
                'authProviders'
            );
        }

        return $this->requiredEnvItem('shibboleth-settings', 'Shibboleth attributes', [
            'SHIB_ID_ATTRIBUTE',
            'SHIB_USERNAME_ATTRIBUTE',
            'SHIB_FIRST_NAME_ATTRIBUTE',
            'SHIB_LAST_NAME_ATTRIBUTE',
            'SHIB_EMAIL_ATTRIBUTE',
        ], 'warning');
    }

    private function checkInstitutionConfig()
    {
        try {
            $public = $this->appConfig->publicConfig();
        } catch (\Throwable $e) {
            return $this->item(
                'institution-config',
                'fail',
                'Institution configuration',
                'Fix backend/config/institutions.yml: ' . $e->getMessage(),
                'backend/config/institutions.yml'
            );
        }

        $deployment = isset($public['deployment']) && is_array($public['deployment'])
            ? $public['deployment']
            : [];
        $type = isset($deployment['type']) ? $deployment['type'] : '';
        if (!in_array($type, ['single-library', 'multi-library'], true)) {
            return $this->item(
                'institution-config',
                'fail',
                'Institution configuration',
                'deployment.type must be single-library or multi-library.',
                'deployment.type'
            );
        }

        $institutions = isset($public['institutions']) && is_array($public['institutions'])
            ? $public['institutions']
            : [];
        $slugs = array_column($institutions, 'slug');
        if ($type === 'single-library' && !in_array($deployment['primaryInstitutionSlug'], $slugs, true)) {
            return $this->item(
                'institution-config',
                'fail',
                'Institution configuration',
                'deployment.primaryInstitutionSlug must match one configured institution slug.',
                'deployment.primaryInstitutionSlug'
            );
        }

        if (!in_array($deployment['homePage'], ['redirect', 'institution-picker'], true)) {
            return $this->item(
                'institution-config',
                'fail',
                'Institution configuration',
                'deployment.homePage must be redirect or institution-picker.',
                'deployment.homePage'
            );
        }

        return $this->item(
            'institution-config',
            'pass',
            'Institution configuration',
            'institutions.yml has valid deployment settings.',
            'backend/config/institutions.yml'
        );
    }

    private function checkInstitutionImages()
    {
        try {
            $public = $this->appConfig->publicConfig();
        } catch (\Throwable $e) {
            return $this->item(
                'institution-images',
                'warning',
                'Institution images',
                'Institution image paths could not be checked until institutions.yml is valid.',
                'institutions[].image'
            );
        }

        if (($public['deployment']['type'] ?? '') !== 'multi-library') {
            return $this->item(
                'institution-images',
                'pass',
                'Institution images',
                'Single-library deployments do not require institution picker images.',
                'institutions[].image'
            );
        }

        foreach ($public['institutions'] as $institution) {
            if (empty($institution['image'])) {
                return $this->item(
                    'institution-images',
                    'warning',
                    'Institution images',
                    'Add image paths for every institution. Store frontend images in public/images and reference them as /images/name.png.',
                    'institutions[].image'
                );
            }

            if (!$this->publicImageExists($institution['image'])) {
                return $this->item(
                    'institution-images',
                    'warning',
                    'Institution images',
                    'Institution image paths should resolve under public/images. Store images in public/images and reference them as /images/name.png.',
                    'institutions[].image'
                );
            }
        }

        return $this->item(
            'institution-images',
            'pass',
            'Institution images',
            'Institution image paths are configured.',
            'institutions[].image'
        );
    }

    private function requiredEnvItem($key, $label, array $fields, $missingSeverity = 'fail')
    {
        $missing = [];
        foreach ($fields as $field) {
            if (AppConfig::env($field, '') === '') {
                $missing[] = $field;
            }
        }

        if ($missing) {
            return $this->item(
                $key,
                $missingSeverity,
                $label,
                'Missing required setting(s): ' . implode(', ', $missing) . '.',
                implode(',', $fields)
            );
        }

        return $this->item(
            $key,
            'pass',
            $label,
            $label . ' settings are present.',
            implode(',', $fields)
        );
    }

    private function publicImageExists($imagePath)
    {
        if (strpos($imagePath, '/images/') !== 0) {
            return false;
        }

        return is_file($this->projectRoot . '/public' . $imagePath);
    }

    private function item($key, $severity, $label, $message, $field)
    {
        return compact('key', 'severity', 'label', 'message', 'field');
    }

    private function summary(array $groups)
    {
        $passes = 0;
        $warnings = 0;
        $failures = 0;
        foreach ($groups as $group) {
            foreach ($group['items'] as $item) {
                if ($item['severity'] === 'pass') {
                    $passes++;
                } elseif ($item['severity'] === 'warning') {
                    $warnings++;
                } else {
                    $failures++;
                }
            }
        }

        return [
            'status' => $failures > 0 ? 'fail' : ($warnings > 0 ? 'warning' : 'pass'),
            'passes' => $passes,
            'warnings' => $warnings,
            'failures' => $failures,
        ];
    }
}
