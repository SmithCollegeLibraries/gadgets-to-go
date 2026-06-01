<?php

namespace tests\unit\models;

use Firebase\JWT\JWT;
use Yii;
use app\models\User;

class UserTest extends \Codeception\Test\Unit
{
    public function testFindUserById()
    {
        expect_not(User::findIdentity(100));
        expect_not(User::findIdentity(999));
    }

    public function testFindUserByAccessToken()
    {
        $token = JWT::encode([
            'username' => 'admin',
            'exp' => time() + 300,
        ], Yii::$app->params['jwtSecretKey'], 'HS256');

        expect_not(User::findIdentityByAccessToken($token));

        expect_not(User::findIdentityByAccessToken('non-existing'));        
    }

    public function testFindUserByUsername()
    {
        expect_not(User::findByUsername('admin'));
        expect_not(User::findByUsername('demo'));
        expect_not(User::findByUsername('not-admin'));
    }

    public function testLegacyDemoUserCannotAuthenticate()
    {
        $this->assertNull(User::findByUsername('admin'));
        $this->assertNull(User::findByUsername('demo'));
        $this->assertNull(User::findIdentityByAccessToken('100-token'));
        $this->assertNull(User::findIdentityByAccessToken('101-token'));
    }

    public function testValidatePasswordNeverAcceptsLegacyCredentials()
    {
        $user = new User([
            'username' => 'admin',
            'password' => 'admin',
        ]);

        expect_not($user->validatePassword('admin'));
        expect_not($user->validatePassword('demo'));
    }

}
