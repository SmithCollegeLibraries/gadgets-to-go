<?php

namespace backend\modules\api\controllers;

use Yii;
use backend\components\AppConfig;
use yii\filters\Cors;
use yii\rest\Controller;
use yii\web\Response;

class ConfigController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];

        return $behaviors;
    }

    public function actionIndex()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return Yii::$app->params['appConfig']->publicConfig();
    }
}
