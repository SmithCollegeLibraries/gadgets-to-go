<?php

namespace tests\unit\controllers;

use app\controllers\SiteController;
use Codeception\Test\Unit;
use Yii;
use yii\web\BadRequestHttpException;

class SiteControllerTest extends Unit
{
    public function testLegacyLoginRouteIsExplicitlyDisabled()
    {
        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage('Staff authentication is handled by the React admin application and API auth flows.');

        $this->controller()->actionLogin();
    }

    private function controller()
    {
        return new SiteController('site', Yii::$app);
    }
}
