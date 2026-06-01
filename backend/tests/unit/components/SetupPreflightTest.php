<?php

namespace tests\unit\components;

use backend\components\AppConfig;
use backend\components\SetupPreflight;
use Codeception\Test\Unit;

class SetupPreflightTest extends Unit
{
    private $originalEnv = [];
    private $tempConfigPath;

    protected function _before()
    {
        foreach ($this->envKeys() as $key) {
            $this->originalEnv[$key] = getenv($key);
            putenv($key);
        }
    }

    protected function _after()
    {
        foreach ($this->envKeys() as $key) {
            if ($this->originalEnv[$key] === false) {
                putenv($key);
            } else {
                putenv($key . '=' . $this->originalEnv[$key]);
            }
        }

        if ($this->tempConfigPath !== null && is_file($this->tempConfigPath)) {
            unlink($this->tempConfigPath);
        }
    }

    public function testSecureLocalConfigurationPassesCriticalChecks()
    {
        $this->setSecureEnv();
        $result = $this->checker()->run();

        $this->assertSame('pass', $this->findItem($result, 'app-secret')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'cors-origins')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'bootstrap-admin')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'folio-inventory')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'rtac-availability')['severity']);
    }

    public function testDefaultBootstrapAdminProducesWarning()
    {
        $this->setSecureEnv();
        putenv('LOCAL_ADMIN_ENABLED=true');
        putenv('LOCAL_ADMIN_USERNAME=admin');
        putenv('LOCAL_ADMIN_PASSWORD=admin');

        $item = $this->findItem($this->checker()->run(), 'bootstrap-admin');

        $this->assertSame('warning', $item['severity']);
        $this->assertStringContainsString('LOCAL_ADMIN_ENABLED=false', $item['message']);
    }

    public function testMissingAppSecretProducesFailure()
    {
        $this->setSecureEnv();
        putenv('APP_SECRET_KEY=change-me-in-production-use-at-least-32-bytes');

        $this->assertSame('fail', $this->findItem($this->checker()->run(), 'app-secret')['severity']);
    }

    public function testWildcardCorsProducesFailure()
    {
        $this->setSecureEnv();
        putenv('APP_ALLOWED_ORIGINS=*');

        $this->assertSame('fail', $this->findItem($this->checker()->run(), 'cors-origins')['severity']);
    }

    public function testIncompleteFolioSettingsAreActionable()
    {
        $this->setSecureEnv();
        putenv('FOLIO_PASSWORD');

        $item = $this->findItem($this->checker()->run(), 'folio-inventory');

        $this->assertSame('fail', $item['severity']);
        $this->assertSame('FOLIO_INVENTORY_BASE_URL,FOLIO_TENANT_ID,FOLIO_USERNAME,FOLIO_PASSWORD', $item['field']);
        $this->assertStringContainsString('FOLIO_PASSWORD', $item['message']);
    }

    public function testSecretValuesAreNeverReturned()
    {
        $this->setSecureEnv();
        $encoded = json_encode($this->checker()->run());

        $this->assertStringNotContainsString('StrongPassword123!', $encoded);
        $this->assertStringNotContainsString('folio-secret', $encoded);
        $this->assertStringNotContainsString('rtac-secret', $encoded);
        $this->assertStringNotContainsString('super-secret-key', $encoded);
    }

    public function testMultiLibraryInstitutionImagePathsAreChecked()
    {
        $this->setSecureEnv();
        $checker = $this->checker($this->multiLibraryConfig());

        $item = $this->findItem($checker->run(), 'institution-images');

        $this->assertSame('pass', $item['severity']);
    }

    private function checker($configPath = null)
    {
        return new SetupPreflight(
            new AppConfig($configPath ?: __DIR__ . '/../../_data/institutions-test.yml'),
            dirname(__DIR__, 4)
        );
    }

    private function multiLibraryConfig()
    {
        $this->tempConfigPath = tempnam(sys_get_temp_dir(), 'institutions-');
        file_put_contents($this->tempConfigPath, implode("\n", [
            'appName: Gadgets-to-Go',
            'deployment:',
            '  type: multi-library',
            '  primaryInstitutionSlug: testu',
            '  homePage: institution-picker',
            'authProviders:',
            '  - shibboleth',
            '  - local',
            'institutions:',
            '  - slug: testu',
            '    code: TST',
            '    name: Test University',
            '    image: /images/logo.png',
            '  - slug: otheru',
            '    code: OTH',
            '    name: Other University',
            '    image: /images/amherst.gif',
            '',
        ]));

        return $this->tempConfigPath;
    }

    private function setSecureEnv()
    {
        putenv('APP_SECRET_KEY=super-secret-key-with-more-than-32-bytes');
        putenv('APP_ALLOWED_ORIGINS=https://gadgets.example.edu');
        putenv('LOCAL_ADMIN_ENABLED=false');
        putenv('LOCAL_ADMIN_USERNAME=admin');
        putenv('LOCAL_ADMIN_PASSWORD=StrongPassword123!');
        putenv('AUTH_PROVIDERS=local,shibboleth');
        putenv('SHIB_ID_ATTRIBUTE=eppn');
        putenv('SHIB_USERNAME_ATTRIBUTE=uid');
        putenv('SHIB_FIRST_NAME_ATTRIBUTE=givenName');
        putenv('SHIB_LAST_NAME_ATTRIBUTE=sn');
        putenv('SHIB_EMAIL_ATTRIBUTE=mail');
        putenv('FOLIO_INVENTORY_BASE_URL=https://api-example.folio.ebsco.com');
        putenv('FOLIO_TENANT_ID=tenant');
        putenv('FOLIO_USERNAME=folio-user');
        putenv('FOLIO_PASSWORD=folio-secret');
        putenv('FOLIO_AVAILABILITY_BASE_URL=https://edge-example.folio.ebsco.com');
        putenv('FOLIO_RTAC_BASE_PATH=/prod/rtac/folioRTAC?mms_id=');
        putenv('FOLIO_API_KEY=rtac-secret');
        putenv('FRONTEND_BASE_URL=https://gadgets.example.edu');
        putenv('SMTP_HOST=smtp.example.edu');
        putenv('MAIL_FROM=no-reply@example.edu');
    }

    private function findItem(array $result, $key)
    {
        foreach ($result['groups'] as $group) {
            foreach ($group['items'] as $item) {
                if ($item['key'] === $key) {
                    return $item;
                }
            }
        }

        $this->fail('Missing preflight item: ' . $key);
    }

    private function envKeys()
    {
        return [
            'APP_SECRET_KEY',
            'APP_ALLOWED_ORIGINS',
            'LOCAL_ADMIN_ENABLED',
            'LOCAL_ADMIN_USERNAME',
            'LOCAL_ADMIN_PASSWORD',
            'AUTH_PROVIDERS',
            'SHIB_ID_ATTRIBUTE',
            'SHIB_USERNAME_ATTRIBUTE',
            'SHIB_FIRST_NAME_ATTRIBUTE',
            'SHIB_LAST_NAME_ATTRIBUTE',
            'SHIB_EMAIL_ATTRIBUTE',
            'FOLIO_INVENTORY_BASE_URL',
            'FOLIO_TENANT_ID',
            'FOLIO_USERNAME',
            'FOLIO_PASSWORD',
            'FOLIO_AVAILABILITY_BASE_URL',
            'FOLIO_RTAC_BASE_PATH',
            'FOLIO_API_KEY',
            'FRONTEND_BASE_URL',
            'SMTP_DSN',
            'SMTP_HOST',
            'MAIL_FROM',
        ];
    }
}
