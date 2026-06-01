<?php

namespace tests\unit\models;

use app\models\UserDb;
use Codeception\Test\Unit;

require_once __DIR__ . '/../../../models/UserDb.php';

class UserDbCredentialTest extends Unit
{
    public function testPasswordHashValidatesWithoutStoringPlaintext()
    {
        $user = new TestableUserDb();
        $user->setPassword('CorrectHorseBatteryStaple!');

        $this->assertNotSame('CorrectHorseBatteryStaple!', $user->password_hash);
        $this->assertTrue($user->validatePassword('CorrectHorseBatteryStaple!'));
        $this->assertFalse($user->validatePassword('wrong-password'));
    }

    public function testPasswordResetTokenIsHashedAndExpires()
    {
        $user = new TestableUserDb();
        $token = $user->generatePasswordResetToken(3600);

        $this->assertNotEmpty($token);
        $this->assertNotSame($token, $user->password_reset_token_hash);
        $this->assertTrue($user->validatePasswordResetToken($token));
        $this->assertFalse($user->validatePasswordResetToken('wrong-token'));

        $user->password_reset_expires_at = gmdate('Y-m-d H:i:s', time() - 60);
        $this->assertFalse($user->validatePasswordResetToken($token));
    }

    public function testClearPasswordResetTokenRemovesResetFields()
    {
        $user = new TestableUserDb();
        $user->generatePasswordResetToken();

        $user->clearPasswordResetToken();

        $this->assertNull($user->password_reset_token_hash);
        $this->assertNull($user->password_reset_expires_at);
    }

    public function testFieldsDoNotExposeCredentialMaterial()
    {
        $user = new TestableUserDb();
        $fields = $user->fields();

        $this->assertArrayNotHasKey('password_hash', $fields);
        $this->assertArrayNotHasKey('password_reset_token_hash', $fields);
        $this->assertArrayNotHasKey('password_reset_expires_at', $fields);
    }

    public function testBootstrapAdminDefaultsToSystemAdmin()
    {
        $user = new TestableUserDb();
        $user->username = 'admin';

        $user->applyLocalBootstrapDefaults([
            'email' => 'admin@example.edu',
            'fullName' => 'Local Administrator',
            'institution' => '',
            'role' => 'system-admin',
        ], 'BootstrapPassword123!');

        $this->assertSame('local', $user->auth_provider);
        $this->assertSame('system-admin', $user->role);
        $this->assertSame('', $user->institution);
        $this->assertSame(1, $user->approved);
        $this->assertTrue($user->validatePassword('BootstrapPassword123!'));
    }
}

class TestableUserDb extends UserDb
{
    public function attributes()
    {
        return [
            'id',
            'username',
            'full_name',
            'email',
            'department',
            'institution',
            'role',
            'approved',
            'date_added',
            'auth_provider',
            'password_hash',
            'password_reset_token_hash',
            'password_reset_expires_at',
            'last_login_at',
        ];
    }
}
