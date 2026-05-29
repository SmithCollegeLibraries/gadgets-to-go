<?php

namespace backend\modules\api\controllers;

use Yii;
use app\models\UserDb;
use backend\components\AppConfig;
use Firebase\JWT\JWT;
use yii\filters\Cors;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;

class AuthController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];
        $behaviors['rateLimiter'] = [
            'class' => \backend\components\SimpleRateLimiter::class,
            'actions' => ['local-login', 'exchange-code'],
            'limit' => 10,
            'window' => 60,
        ];

        return $behaviors;
    }

    public function actionLocalLogin()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        if (!in_array('local', Yii::$app->params['authProviders'], true)) {
            throw new BadRequestHttpException('Local authentication is not enabled.');
        }

        $data = json_decode(Yii::$app->request->getRawBody(), true);
        if (!is_array($data)) {
            $data = Yii::$app->request->post();
        }

        $username = isset($data['username']) ? trim($data['username']) : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';

        $configuredUser = AppConfig::env('LOCAL_ADMIN_USERNAME', '');
        $configuredPassword = AppConfig::env('LOCAL_ADMIN_PASSWORD', '');
        if ($configuredUser === '' || $configuredPassword === '' || $username !== $configuredUser || !hash_equals($configuredPassword, $password)) {
            throw new UnauthorizedHttpException('Invalid credentials.');
        }

        $user = UserDb::find()->where(['username' => $username])->one();
        if ($user === null) {
            $user = new UserDb();
            $user->username = $username;
            $user->email = AppConfig::env('LOCAL_ADMIN_EMAIL', 'admin@example.edu');
            $user->full_name = AppConfig::env('LOCAL_ADMIN_NAME', 'Local Administrator');
            $user->department = 'Administration';
            $user->institution = AppConfig::env('LOCAL_ADMIN_INSTITUTION', 'local');
            $user->role = 'admin';
            $user->approved = 1;
            $user->save(false);
        }

        return [
            'token' => $this->createToken($user),
            'user' => [
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'institution' => $user->institution,
            ],
        ];
    }

    public function actionLogout()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->user->logout(false);
        return ['success' => true];
    }

    public function actionExchangeCode()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $data = json_decode(Yii::$app->request->getRawBody(), true);
        if (!is_array($data)) {
            $data = Yii::$app->request->post();
        }

        $code = isset($data['code']) ? trim($data['code']) : '';
        if ($code === '') {
            throw new BadRequestHttpException('Missing authorization code.');
        }

        $cacheKey = 'auth-code:' . $code;
        $token = Yii::$app->cache->get($cacheKey);
        Yii::$app->cache->delete($cacheKey);

        if (!$token) {
            throw new UnauthorizedHttpException('Invalid or expired authorization code.');
        }

        return ['token' => $token];
    }

    private function createToken(UserDb $user)
    {
        $now = time();
        return JWT::encode([
            'sub' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => $now,
            'exp' => $now + 3600,
        ], Yii::$app->params['jwtSecretKey'], 'HS256');
    }
}
