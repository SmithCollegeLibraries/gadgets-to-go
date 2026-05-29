<?php

namespace tests\unit\components;

use backend\components\InstitutionAccess;
use Symfony\Component\Yaml\Yaml;
use Codeception\Test\Unit;

class InstitutionAccessTest extends Unit
{
    public function testAdminWithoutLocationCanAccessAnyCode()
    {
        $this->assertTrue(InstitutionAccess::canAccessCode((object)['role' => 'admin'], 'LIB'));
    }

    public function testSuperAdminCanAccessAnyCode()
    {
        $this->assertTrue(InstitutionAccess::canAccessCode((object)['role' => 'super-admin', 'location' => 'testu'], 'OTHER'));
    }

    public function testScopedAdminCanOnlyAccessOwnInstitutionCode()
    {
        $payload = (object)['role' => 'admin', 'location' => 'testu'];
        $institutions = $this->institutions();

        $this->assertTrue(InstitutionAccess::canAccessCode($payload, 'TST', $institutions));
        $this->assertFalse(InstitutionAccess::canAccessCode($payload, 'OTHER', $institutions));
    }

    public function testScopedAdminCanAccessConfiguredBranchPrefix()
    {
        $payload = (object)['role' => 'admin', 'location' => 'testu'];
        $institutions = $this->institutions();

        $this->assertTrue(InstitutionAccess::canAccessCode($payload, 'TSLIB', $institutions));
        $this->assertFalse(InstitutionAccess::canAccessCode($payload, 'XXLIB', $institutions));
    }

    private function institutions()
    {
        $data = Yaml::parseFile(__DIR__ . '/../../_data/institutions-test.yml');
        return $data['institutions'];
    }
}
