<?php

namespace tests\unit\controllers;

use backend\modules\api\controllers\SettingsController;
use Codeception\Test\Unit;
use yii\web\ForbiddenHttpException;
use yii\web\IdentityInterface;
use Yii;

class SettingsControllerTest extends Unit
{
    private $originalIdentity;

    protected function _before()
    {
        $this->originalIdentity = Yii::$app->user->identity;
    }

    protected function _after()
    {
        Yii::$app->user->switchIdentity($this->originalIdentity);
    }

    public function testRequireSystemAdminRejectsAuthenticatedNonSystemAdmin()
    {
        Yii::$app->user->switchIdentity($this->identityWithRole('admin'));

        $this->expectException(ForbiddenHttpException::class);

        $this->invokeRequireSystemAdmin();
    }

    public function testRequireSystemAdminAllowsSystemAdmin()
    {
        Yii::$app->user->switchIdentity($this->identityWithRole('system-admin'));

        $this->invokeRequireSystemAdmin();

        $this->assertTrue(true);
    }

    public function testBehaviorsKeepDisabledItemsPublicAndPreflightAuthenticated()
    {
        $behaviors = $this->controller()->behaviors();

        $this->assertContains('disabled-items', $behaviors['authenticator']['except']);
        $this->assertNotContains('preflight', $behaviors['authenticator']['except']);
        $this->assertContains('save-disabled-items', $behaviors['access']['only']);
        $this->assertContains('preflight', $behaviors['access']['only']);
        $this->assertContains('preflight', $behaviors['access']['rules'][0]['actions']);
    }

    private function invokeRequireSystemAdmin()
    {
        $method = new \ReflectionMethod(SettingsController::class, 'requireSystemAdmin');
        $method->setAccessible(true);
        $method->invoke($this->controller());
    }

    private function controller()
    {
        return new SettingsController('settings', Yii::$app->getModule('api'));
    }

    private function identityWithRole($role)
    {
        return new class($role) implements IdentityInterface {
            public $role;

            public function __construct($role)
            {
                $this->role = $role;
            }

            public static function findIdentity($id)
            {
                return null;
            }

            public static function findIdentityByAccessToken($token, $type = null)
            {
                return null;
            }

            public function getId()
            {
                return 1;
            }

            public function getAuthKey()
            {
                return null;
            }

            public function validateAuthKey($authKey)
            {
                return false;
            }
        };
    }
}
