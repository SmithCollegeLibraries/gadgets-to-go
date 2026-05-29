<?php

namespace backend\components;

use Symfony\Component\Yaml\Yaml;
use yii\base\InvalidConfigException;

class AppConfig
{
    private $data;

    public function __construct($path = null)
    {
        $path = $path ?: dirname(__DIR__) . '/config/institutions.yml';
        if (!is_file($path)) {
            throw new InvalidConfigException("Institution config file not found: {$path}");
        }

        $data = Yaml::parseFile($path);
        if (!is_array($data)) {
            throw new InvalidConfigException('Institution config must contain a YAML object.');
        }

        $this->data = $data;
    }

    public function publicConfig()
    {
        $institutions = [];
        foreach ($this->institutions() as $institution) {
            $institutions[] = [
                'slug' => $institution['slug'],
                'code' => $institution['code'],
                'name' => $institution['name'],
                'image' => isset($institution['image']) ? $institution['image'] : '',
                'branchPrefixes' => isset($institution['branchPrefixes']) && is_array($institution['branchPrefixes'])
                    ? array_values($institution['branchPrefixes'])
                    : [],
                'branches' => isset($institution['branches']) && is_array($institution['branches'])
                    ? array_values($institution['branches'])
                    : [],
                'locations' => isset($institution['locations']) && is_array($institution['locations'])
                    ? array_values($institution['locations'])
                    : [],
                'emailDomains' => isset($institution['emailDomains']) && is_array($institution['emailDomains'])
                    ? array_values($institution['emailDomains'])
                    : [],
                'defaults' => isset($institution['defaults']) && is_array($institution['defaults'])
                    ? $institution['defaults']
                    : [],
            ];
        }

        return [
            'appName' => isset($this->data['appName']) ? $this->data['appName'] : 'Library Equipment',
            'deployment' => $this->deploymentConfig(),
            'requestAccess' => $this->requestAccessConfig(),
            'authProviders' => isset($this->data['authProviders']) && is_array($this->data['authProviders'])
                ? array_values($this->data['authProviders'])
                : ['shibboleth', 'local'],
            'institutions' => $institutions,
        ];
    }

    public function institutions()
    {
        $institutions = isset($this->data['institutions']) && is_array($this->data['institutions'])
            ? $this->data['institutions']
            : [];

        foreach ($institutions as $institution) {
            foreach (['slug', 'code', 'name'] as $required) {
                if (empty($institution[$required])) {
                    throw new InvalidConfigException("Institution entries require {$required}.");
                }
            }
        }

        return $institutions;
    }

    private function deploymentConfig()
    {
        $deployment = isset($this->data['deployment']) && is_array($this->data['deployment'])
            ? $this->data['deployment']
            : [];
        $institutions = $this->institutions();
        $defaultSlug = isset($institutions[0]['slug']) ? $institutions[0]['slug'] : '';
        $type = isset($deployment['type']) ? $deployment['type'] : (count($institutions) > 1 ? 'multi-library' : 'single-library');

        return [
            'type' => $type,
            'primaryInstitutionSlug' => isset($deployment['primaryInstitutionSlug']) ? $deployment['primaryInstitutionSlug'] : $defaultSlug,
            'homePage' => isset($deployment['homePage'])
                ? $deployment['homePage']
                : ($type === 'single-library' ? 'redirect' : 'institution-picker'),
        ];
    }

    private function requestAccessConfig()
    {
        $requestAccess = isset($this->data['requestAccess']) && is_array($this->data['requestAccess'])
            ? $this->data['requestAccess']
            : [];
        $deployment = $this->deploymentConfig();

        return [
            'affiliationPrompt' => isset($requestAccess['affiliationPrompt'])
                ? $requestAccess['affiliationPrompt']
                : ($deployment['type'] === 'single-library' ? 'Library' : 'Where are you from?'),
            'showAffiliationSelector' => isset($requestAccess['showAffiliationSelector'])
                ? (bool)$requestAccess['showAffiliationSelector']
                : $deployment['type'] !== 'single-library',
        ];
    }

    public function allowedOrigins()
    {
        return $this->csvEnv('APP_ALLOWED_ORIGINS', ['http://localhost:5173', 'https://localhost:5173']);
    }

    public function authProviders()
    {
        $configured = $this->csvEnv('AUTH_PROVIDERS', []);
        if ($configured) {
            return $configured;
        }

        return isset($this->data['authProviders']) && is_array($this->data['authProviders'])
            ? array_values($this->data['authProviders'])
            : ['shibboleth', 'local'];
    }

    public function shibboleth()
    {
        return [
            'attributes' => [
                'id' => self::env('SHIB_ID_ATTRIBUTE', 'eppn'),
                'username' => self::env('SHIB_USERNAME_ATTRIBUTE', 'uid'),
                'firstName' => self::env('SHIB_FIRST_NAME_ATTRIBUTE', 'givenName'),
                'lastName' => self::env('SHIB_LAST_NAME_ATTRIBUTE', 'sn'),
                'email' => self::env('SHIB_EMAIL_ATTRIBUTE', 'mail'),
            ],
            'institutionAttribute' => self::env('SHIB_INSTITUTION_ATTRIBUTE', ''),
            'institutionMap' => $this->keyValueEnv('SHIB_INSTITUTION_MAP'),
        ];
    }

    public static function env($name, $default = null)
    {
        $value = getenv($name);
        if ($value === false || $value === '') {
            return $default;
        }

        return $value;
    }

    private function csvEnv($name, array $default)
    {
        $value = self::env($name);
        if ($value === null) {
            return $default;
        }

        return array_values(array_filter(array_map('trim', explode(',', $value)), function ($item) {
            return $item !== '';
        }));
    }

    private function keyValueEnv($name)
    {
        $items = $this->csvEnv($name, []);
        $map = [];
        foreach ($items as $item) {
            $parts = array_map('trim', explode(':', $item, 2));
            if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
                $map[$parts[0]] = $parts[1];
            }
        }

        return $map;
    }
}
