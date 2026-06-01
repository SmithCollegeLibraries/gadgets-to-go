<?php

namespace backend\modules\api\controllers;

use Yii;
use app\models\UserDb;
use backend\components\AppConfig;
use Firebase\JWT\JWT;
use yii\filters\Cors;
use yii\filters\auth\HttpBearerAuth;
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
        $behaviors['authenticator'] = [
            'class' => HttpBearerAuth::class,
            'only' => ['change-password'],
        ];
        $behaviors['rateLimiter'] = [
            'class' => \backend\components\SimpleRateLimiter::class,
            'actions' => ['local-login', 'exchange-code', 'forgot-password', 'reset-password', 'change-password'],
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

        $data = $this->requestData();

        $username = isset($data['username']) ? trim($data['username']) : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';
        if ($username === '' || $password === '') {
            throw new UnauthorizedHttpException('Invalid credentials.');
        }

        $user = UserDb::find()
            ->where(['auth_provider' => 'local'])
            ->andWhere(['or', ['username' => $username], ['email' => $username]])
            ->one();

        if ($user !== null && (int)$user->approved === 1 && $user->validatePassword($password)) {
            $user->last_login_at = gmdate('Y-m-d H:i:s');
            $user->save(false, ['last_login_at']);
            return $this->localLoginResponse($user);
        }

        $bootstrapUser = $this->bootstrapConfiguredAdmin($username, $password);
        if ($bootstrapUser !== null) {
            return $this->localLoginResponse($bootstrapUser);
        }

        Yii::warning('Local login failed.', __METHOD__);
        throw new UnauthorizedHttpException('Invalid credentials.');
    }

    private function bootstrapConfiguredAdmin($username, $password)
    {
        $configuredUser = AppConfig::env('LOCAL_ADMIN_USERNAME', '');
        $configuredPassword = AppConfig::env('LOCAL_ADMIN_PASSWORD', '');
        if ($configuredUser === '' || $configuredPassword === '' || $username !== $configuredUser || !hash_equals($configuredPassword, $password)) {
            return null;
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
        }

        $user->auth_provider = 'local';
        $user->setPassword($password);
        $user->last_login_at = gmdate('Y-m-d H:i:s');
        $user->save(false);

        return $user;
    }

    private function localLoginResponse(UserDb $user)
    {
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

    public function actionForgotPassword()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        if (!in_array('local', Yii::$app->params['authProviders'], true)) {
            throw new BadRequestHttpException('Local authentication is not enabled.');
        }

        $data = $this->requestData();
        $usernameOrEmail = isset($data['usernameOrEmail']) ? trim($data['usernameOrEmail']) : '';
        if ($usernameOrEmail !== '') {
            $user = UserDb::find()
                ->where(['auth_provider' => 'local', 'approved' => 1])
                ->andWhere(['or', ['username' => $usernameOrEmail], ['email' => $usernameOrEmail]])
                ->one();

            if ($user !== null && $user->email) {
                $token = $user->generatePasswordResetToken(3600);
                if ($user->save(false, ['password_reset_token_hash', 'password_reset_expires_at'])) {
                    $this->sendPasswordResetEmail($user, $token);
                }
            }
        }

        return ['message' => 'If a matching local account exists, password reset instructions have been sent.'];
    }

    public function actionResetPassword()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        if (!in_array('local', Yii::$app->params['authProviders'], true)) {
            throw new BadRequestHttpException('Local authentication is not enabled.');
        }

        $data = $this->requestData();
        $token = isset($data['token']) ? (string)$data['token'] : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';
        if ($token === '' || strlen($password) < 12) {
            throw new BadRequestHttpException('Invalid or expired password reset request.');
        }

        $user = $this->findUserByResetToken($token);
        if ($user === null) {
            throw new BadRequestHttpException('Invalid or expired password reset request.');
        }

        $user->setPassword($password);
        $user->clearPasswordResetToken();
        $user->save(false, ['password_hash', 'password_reset_token_hash', 'password_reset_expires_at']);

        return ['message' => 'Password has been reset.'];
    }

    public function actionChangePassword()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = $this->requestData();
        $currentPassword = isset($data['currentPassword']) ? (string)$data['currentPassword'] : '';
        $newPassword = isset($data['newPassword']) ? (string)$data['newPassword'] : '';
        if ($currentPassword === '' || strlen($newPassword) < 12) {
            throw new BadRequestHttpException('Invalid password change request.');
        }

        $user = UserDb::findOne(Yii::$app->user->id);
        if ($user === null || $user->auth_provider !== 'local' || !$user->validatePassword($currentPassword)) {
            throw new UnauthorizedHttpException('Invalid credentials.');
        }

        $user->setPassword($newPassword);
        $user->clearPasswordResetToken();
        $user->save(false, ['password_hash', 'password_reset_token_hash', 'password_reset_expires_at']);

        return ['message' => 'Password has been changed.'];
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

        $data = $this->requestData();

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
            'location' => $user->institution,
            'iat' => $now,
            'exp' => $now + 3600,
        ], Yii::$app->params['jwtSecretKey'], 'HS256');
    }

    private function requestData()
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        return is_array($data) ? $data : Yii::$app->request->post();
    }

    private function findUserByResetToken($token)
    {
        $users = UserDb::find()
            ->where(['auth_provider' => 'local', 'approved' => 1])
            ->andWhere(['not', ['password_reset_token_hash' => null]])
            ->andWhere(['>=', 'password_reset_expires_at', gmdate('Y-m-d H:i:s')])
            ->all();

        foreach ($users as $user) {
            if ($user->validatePasswordResetToken($token)) {
                return $user;
            }
        }

        return null;
    }

    private function sendPasswordResetEmail(UserDb $user, $token)
    {
        $frontendBaseUrl = rtrim(AppConfig::env('FRONTEND_BASE_URL', 'http://localhost:5173'), '/');
        $resetUrl = $frontendBaseUrl . '/reset-password?token=' . rawurlencode($token);
        Yii::$app->mailer
            ->compose()
            ->setTo($user->email)
            ->setFrom([Yii::$app->params['mail']['from'] => Yii::$app->params['appConfig']->publicConfig()['appName']])
            ->setSubject('Password reset request')
            ->setTextBody("Use this link to reset your password:\n\n{$resetUrl}\n\nThis link expires in one hour.")
            ->send();
    }
}
