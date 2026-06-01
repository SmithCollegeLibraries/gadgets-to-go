<?php

class LoginFormCest
{
    public function legacyLoginRouteIsDisabled(\FunctionalTester $I)
    {
        $I->amOnRoute('site/login');

        $I->seeResponseCodeIs(400);
        $I->see('Staff authentication is handled by the React admin application and API auth flows.');
        $I->dontSeeElement('form#login-form');
    }
}
