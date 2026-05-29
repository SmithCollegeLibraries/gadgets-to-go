<?php

namespace backend\components;

use Yii;
use yii\base\ActionFilter;
use backend\models\AuthorizedUser;

class ShibbolethAuth extends ActionFilter
{
    public function beforeAction($action)
    {
        $uid = $_SERVER['uid'] ?? null;

        if ($uid === null) {
            // User is not authenticated via Shibboleth
            Yii::$app->user->logout();
            return false;
        }

        $authorizedUser = AuthorizedUser::findOne(['username' => $uid]);

        if ($authorizedUser === null) {
            // User is not authorized
            Yii::$app->user->logout();
            // Redirect to request access form or show error
            Yii::$app->response->redirect(['/site/request-access']);
            return false;
        }

        // Log in the user
        $identity = new ShibbolethUser($authorizedUser);
        Yii::$app->user->login($identity);

        return parent::beforeAction($action);
    }
}
