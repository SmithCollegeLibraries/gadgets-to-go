<?php

use yii\helpers\Url;

class LoginCest
{
    public function legacyLoginRouteIsDisabled(AcceptanceTester $I)
    {
        $I->amOnPage(Url::toRoute('/site/login'));

        $I->see('Staff authentication is handled by the React admin application and API auth flows.');
        $I->dontSeeElement('form#login-form');
    }
}
