<?php

namespace tests\unit\components;

use backend\components\AppConfig;
use Codeception\Test\Unit;

class AppConfigTest extends Unit
{
    public function testPublicConfigComesFromInstitutionYaml()
    {
        $config = new AppConfig(__DIR__ . '/../../_data/institutions-test.yml');

        $public = $config->publicConfig();

        $this->assertSame('Gadgets-to-Go', $public['appName']);
        $this->assertSame('single-library', $public['deployment']['type']);
        $this->assertSame('testu', $public['deployment']['primaryInstitutionSlug']);
        $this->assertSame('redirect', $public['deployment']['homePage']);
        $this->assertSame('Where are you from?', $public['requestAccess']['affiliationPrompt']);
        $this->assertFalse($public['requestAccess']['showAffiliationSelector']);
        $this->assertSame('testu', $public['institutions'][0]['slug']);
        $this->assertSame('TST', $public['institutions'][0]['code']);
        $this->assertSame('/images/testu.gif', $public['institutions'][0]['image']);
        $this->assertSame(['TS'], $public['institutions'][0]['branchPrefixes']);
        $this->assertSame('TSLIB', $public['institutions'][0]['branches'][0]['code']);
        $this->assertSame('TSLOC', $public['institutions'][0]['locations'][0]['code']);
        $this->assertArrayNotHasKey('folio', $public['institutions'][0]);
    }

    public function testAllowedOriginsAreParsedFromEnvironment()
    {
        putenv('APP_ALLOWED_ORIGINS=https://example.edu, http://localhost:5173');
        $config = new AppConfig(__DIR__ . '/../../_data/institutions-test.yml');

        $this->assertSame(
            ['https://example.edu', 'http://localhost:5173'],
            $config->allowedOrigins()
        );

        putenv('APP_ALLOWED_ORIGINS');
    }

    public function testFolioConfigSupportsSeparateEdgeAndOkapiHosts()
    {
        putenv('FOLIO_AVAILABILITY_BASE_URL=https://edge-example.folio.ebsco.com');
        putenv('FOLIO_INVENTORY_BASE_URL=https://api-example.folio.ebsco.com');

        $folioConfig = require __DIR__ . '/../../../config/folio.php';

        $this->assertSame('https://edge-example.folio.ebsco.com', $folioConfig['baseUrl']);
        $this->assertSame('https://api-example.folio.ebsco.com', $folioConfig['folioBaseUrl']);

        putenv('FOLIO_AVAILABILITY_BASE_URL');
        putenv('FOLIO_INVENTORY_BASE_URL');
    }

    public function testShibbolethConfigUsesFlexibleAttributeNames()
    {
        putenv('SHIB_ID_ATTRIBUTE=eppn');
        putenv('SHIB_USERNAME_ATTRIBUTE=employeeNumber');
        putenv('SHIB_FIRST_NAME_ATTRIBUTE=given_name');
        putenv('SHIB_LAST_NAME_ATTRIBUTE=family_name');
        putenv('SHIB_EMAIL_ATTRIBUTE=mail');
        putenv('SHIB_INSTITUTION_ATTRIBUTE=affiliation');
        putenv('SHIB_INSTITUTION_MAP=main:testu,other:otheru');

        $config = new AppConfig(__DIR__ . '/../../_data/institutions-test.yml');
        $shibboleth = $config->shibboleth();

        $this->assertSame('eppn', $shibboleth['attributes']['id']);
        $this->assertSame('employeeNumber', $shibboleth['attributes']['username']);
        $this->assertSame('given_name', $shibboleth['attributes']['firstName']);
        $this->assertSame('family_name', $shibboleth['attributes']['lastName']);
        $this->assertSame('mail', $shibboleth['attributes']['email']);
        $this->assertSame('affiliation', $shibboleth['institutionAttribute']);
        $this->assertSame(['main' => 'testu', 'other' => 'otheru'], $shibboleth['institutionMap']);

        putenv('SHIB_ID_ATTRIBUTE');
        putenv('SHIB_USERNAME_ATTRIBUTE');
        putenv('SHIB_FIRST_NAME_ATTRIBUTE');
        putenv('SHIB_LAST_NAME_ATTRIBUTE');
        putenv('SHIB_EMAIL_ATTRIBUTE');
        putenv('SHIB_INSTITUTION_ATTRIBUTE');
        putenv('SHIB_INSTITUTION_MAP');
    }

    public function testShibbolethConfigDefaultsToNeutralIdentifier()
    {
        putenv('SHIB_ID_ATTRIBUTE');

        $config = new AppConfig(__DIR__ . '/../../_data/institutions-test.yml');
        $shibboleth = $config->shibboleth();

        $this->assertSame('eppn', $shibboleth['attributes']['id']);
    }
}
