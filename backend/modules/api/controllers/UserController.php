<?php

namespace backend\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\web\Response;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\web\ForbiddenHttpException;
use app\models\UserDb;
use backend\components\InstitutionAccess;
use yii\filters\Cors;
use yii\filters\AccessControl;
use yii\filters\auth\HttpBearerAuth;

class UserController extends ActiveController
{
    public $modelClass = 'app\models\UserDb';

    /**
     * Configures behaviors for the controller.
     *
     * @return array The behavior configurations.
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();

        // Add the authenticator after CORS
        $behaviors['authenticator'] = [
            'class' => HttpBearerAuth::class,
            'except' => ['options'], // Skip authentication for OPTIONS
        ];

        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];
        $behaviors['rateLimiter'] = [
            'class' => \backend\components\SimpleRateLimiter::class,
            'actions' => ['create-local', 'reset-password'],
            'limit' => 30,
            'window' => 60,
        ];

        // Access control - only admin role can access these endpoints
        $behaviors['access'] = [
            'class' => \yii\filters\AccessControl::class,
            'only' => ['index', 'view', 'update', 'delete', 'approve', 'reject', 'create-local', 'reset-password'],
            'rules' => [
                [
                    'allow' => true,
                    'actions' => ['index', 'view', 'update', 'delete', 'approve', 'reject', 'create-local', 'reset-password'],
                    'roles' => ['@'], // Authenticated users only
                    'matchCallback' => function ($rule, $action) use (&$behaviors) {
                        // Check if user has admin role
                        return UserController::checkAdminRoleStatic();
                    }
                ],
            ],
        ];

        return $behaviors;
    }

    /**
     * Overrides default actions to customize them.
     *
     * @return array The action configurations.
     */
    public function actions()
    {
        $actions = parent::actions();

        // Customize the index action to allow filtering
        $actions['index']['prepareDataProvider'] = [$this, 'prepareDataProvider'];

        // Disable default actions to use custom implementations
        unset($actions['create'], $actions['update']);

        return $actions;
    }

    public function actionCreateLocal()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = $this->requestData();
        $password = isset($data['password']) ? (string)$data['password'] : '';
        $email = isset($data['email']) ? trim((string)$data['email']) : '';
        if ($email === '') {
            throw new BadRequestHttpException('Email is required for local users.');
        }
        if (strlen($password) < 12) {
            throw new BadRequestHttpException('Password must be at least 12 characters.');
        }

        $model = new UserDb();
        $this->applySafeUserData($model, $data);
        $model->auth_provider = 'local';
        $model->approved = isset($data['approved']) ? (int)(bool)$data['approved'] : 1;
        $model->setPassword($password);
        $this->assertCanManageUser($model);

        if ($model->save()) {
            return $model;
        }

        if (!$model->hasErrors()) {
            throw new ServerErrorHttpException('Failed to create the local user for unknown reasons.');
        }

        return $model;
    }

    /**
     * Prepares the data provider for the index action.
     * Allows filtering by approved status.
     *
     * @return \yii\data\ActiveDataProvider
     */
    public function prepareDataProvider()
    {
        $query = UserDb::find();
        $slug = InstitutionAccess::scopedInstitutionSlug();
        if ($slug !== '' && !self::currentUserIsSystemAdmin()) {
            $query->andWhere(['institution' => $slug]);
        }

        // Allow filtering by approved status
        if (isset($_GET['approved'])) {
            $query->andWhere(['approved' => (int)$_GET['approved']]);
        }

        return new \yii\data\ActiveDataProvider([
            'query' => $query,
            'pagination' => [
                'pageSize' => 50,
            ],
            'sort' => [
                'defaultOrder' => [
                    'date_added' => SORT_DESC,
                ]
            ],
        ]);
    }

    /**
     * Updates an existing user.
     *
     * @param integer $id The ID of the user to update.
     * @return UserDb The updated user model.
     * @throws NotFoundHttpException If the user is not found.
     * @throws ServerErrorHttpException If there is an error saving the model.
     */
    public function actionUpdate($id)
    {
        $model = $this->findModel($id);
        $this->assertCanManageUser($model);

        // Load the form data
        if (Yii::$app->request->isPut || Yii::$app->request->isPatch) {
            $rawBody = Yii::$app->request->getRawBody();
            $data = json_decode($rawBody, true);
        } else {
            $data = Yii::$app->request->post();
        }

        $this->applySafeUserData($model, $data);

        if ($model->save()) {
            return $model;
        }

        if (!$model->hasErrors()) {
            throw new ServerErrorHttpException('Failed to update the user for unknown reasons.');
        }

        return $model;
    }

    /**
     * Approves a user.
     *
     * @param integer $id The ID of the user to approve.
     * @return UserDb The updated user model.
     * @throws NotFoundHttpException If the user is not found.
     * @throws ServerErrorHttpException If there is an error saving the model.
     */
    public function actionApprove($id)
    {
        $model = $this->findModel($id);
        $this->assertCanManageUser($model);
        $model->approved = 1;

        if ($model->save()) {
            // Optionally send approval email to user
            $this->sendApprovalEmail($model);
            return $model;
        }

        throw new ServerErrorHttpException('Failed to approve the user.');
    }

    /**
     * Rejects/revokes approval for a user.
     *
     * @param integer $id The ID of the user to reject.
     * @return UserDb The updated user model.
     * @throws NotFoundHttpException If the user is not found.
     * @throws ServerErrorHttpException If there is an error saving the model.
     */
    public function actionReject($id)
    {
        $model = $this->findModel($id);
        $this->assertCanManageUser($model);
        $model->approved = 0;

        if ($model->save()) {
            return $model;
        }

        throw new ServerErrorHttpException('Failed to reject the user.');
    }

    public function actionResetPassword($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $model = $this->findModel($id);
        $this->assertCanManageUser($model);
        if ($model->auth_provider !== 'local') {
            throw new BadRequestHttpException('Password resets are only available for local users.');
        }
        if (!$model->email) {
            throw new BadRequestHttpException('Local user does not have an email address.');
        }

        $token = $model->generatePasswordResetToken(3600);
        if (!$model->save(false, ['password_reset_token_hash', 'password_reset_expires_at'])) {
            throw new ServerErrorHttpException('Failed to create password reset token.');
        }

        $this->sendPasswordResetEmail($model, $token);
        return ['message' => 'If the local user has an email address, reset instructions have been sent.'];
    }

    /**
     * Finds the UserDb model based on its primary key value.
     *
     * @param integer $id The ID of the UserDb model.
     * @return UserDb The loaded model.
     * @throws NotFoundHttpException If the model cannot be found.
     */
    protected function findModel($id)
    {
        $model = UserDb::findOne($id);
        if ($model === null) {
            throw new NotFoundHttpException("User not found: $id");
        }
        return $model;
    }

    protected function assertCanManageUser(UserDb $model)
    {
        if (self::currentUserIsSystemAdmin()) {
            return;
        }

        $slug = InstitutionAccess::scopedInstitutionSlug();
        if ($slug !== '' && $model->institution !== $slug) {
            throw new ForbiddenHttpException('You are not allowed to manage users for this institution.');
        }
    }

    private function requestData()
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        return is_array($data) ? $data : Yii::$app->request->post();
    }

    private function applySafeUserData(UserDb $model, array $data)
    {
        foreach (['username', 'email', 'full_name', 'department', 'institution', 'role'] as $attribute) {
            if (array_key_exists($attribute, $data)) {
                $model->{$attribute} = is_string($data[$attribute]) ? trim($data[$attribute]) : $data[$attribute];
            }
        }

        if (isset($data['role']) && in_array($data['role'], ['super-admin', 'system-admin'], true) && !self::currentUserIsSystemAdmin()) {
            throw new ForbiddenHttpException('Only system administrators can assign system roles.');
        }
    }

    /**
     * Checks if the current user has admin role.
     *
     * @return bool
     */
    protected function checkAdminRole()
    {
        return self::checkAdminRoleStatic();
    }

    /**
     * Static method to check if the current user has admin role.
     *
     * @return bool
     */
    protected static function checkAdminRoleStatic()
    {
        // Get the JWT token from the request
        $authHeader = Yii::$app->request->headers->get('Authorization');
        
        if ($authHeader && preg_match('/^Bearer\s+(.*?)$/', $authHeader, $matches)) {
            $token = $matches[1];
            
            try {
                $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(Yii::$app->params['jwtSecretKey'], 'HS256'));
                
                // Check if the user has admin role
                if (isset($decoded->role) && in_array($decoded->role, ['admin', 'super-admin', 'system-admin'], true)) {
                    return true;
                }
            } catch (\Exception $e) {
                Yii::warning('Admin JWT decode failed.', __METHOD__);
                return false;
            }
        }
        
        return false;
    }

    protected static function currentUserIsSystemAdmin()
    {
        $authHeader = Yii::$app->request->headers->get('Authorization');
        if ($authHeader && preg_match('/^Bearer\s+(.*?)$/', $authHeader, $matches)) {
            try {
                $decoded = \Firebase\JWT\JWT::decode($matches[1], new \Firebase\JWT\Key(Yii::$app->params['jwtSecretKey'], 'HS256'));
                return isset($decoded->role) && in_array($decoded->role, ['super-admin', 'system-admin'], true);
            } catch (\Exception $e) {
                return false;
            }
        }

        return false;
    }

    /**
     * Sends an approval email to the user.
     *
     * @param UserDb $user The user model.
     */
    protected function sendApprovalEmail($user)
    {
        $emailContent = "Dear {$user->full_name},\n\n";
        $emailContent .= "Your access request for Gadgets-to-Go has been approved.\n\n";
        $emailContent .= "You can now log in to the system.\n\n";
        $emailContent .= "Best regards,\n";
        $emailContent .= "Gadgets-to-Go Team";

        Yii::$app->mailer
            ->compose()
            ->setTo($user->email)
            ->setFrom([Yii::$app->params['mail']['from'] => 'Gadgets-to-Go'])
            ->setSubject('Access Request Approved')
            ->setTextBody($emailContent)
            ->send();
    }

    protected function sendPasswordResetEmail($user, $token)
    {
        $frontendBaseUrl = rtrim(\backend\components\AppConfig::env('FRONTEND_BASE_URL', 'http://localhost:5173'), '/');
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
