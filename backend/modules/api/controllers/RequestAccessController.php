<?php

namespace backend\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\web\Response;
use yii\filters\Cors;
use app\models\UserDb;
use yii\web\BadRequestHttpException;

class RequestAccessController extends ActiveController
{
    public $modelClass = ''; // Since we don't have a model, we'll handle actions manually

    // Enable CORS
    public function behaviors()
    {
        $behaviors = parent::behaviors();

        // Remove authentication filter if present
        unset($behaviors['authenticator']);

        // Add the CORS filter
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];
        $behaviors['rateLimiter'] = [
            'class' => \backend\components\SimpleRateLimiter::class,
            'actions' => ['create'],
            'limit' => 5,
            'window' => 300,
        ];

        return $behaviors;
    }

    // Disable CSRF validation
    public $enableCsrfValidation = false;

    // Override actions() to disable default CRUD actions
    public function actions()
    {
        $actions = parent::actions();

        // Disable all default actions
        unset($actions['index'], $actions['view'], $actions['create'], $actions['update'], $actions['delete']);

        return $actions;
    }

    // Define the custom action
    public function actionCreate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (Yii::$app->request->isPost) {
            $data = Yii::$app->request->post();

            // Validate required fields
            $requiredFields = ['email', 'fullName', 'department', 'role', 'school'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ['success' => false, 'message' => "Field '{$field}' is required."];
                }
            }

            // Check if user already exists
            $existingUser = UserDb::find()->where(['email' => $data['email']])->one();
            if ($existingUser) {
                return ['success' => false, 'message' => 'A user with this email already exists.'];
            }

            // Extract username from email (part before @)
            $username = strstr($data['email'], '@', true);

            // Create new user in database with approved = 0
            $user = new UserDb();
            $user->username = $username;
            $user->email = $data['email'];
            $user->full_name = $data['fullName'];
            $user->department = $data['department'];
            $user->role = $data['role'];
            $user->institution = $data['school'];
            $user->approved = 0; // Default to not approved

            if (!$user->save()) {
                return ['success' => false, 'message' => 'Failed to save user.', 'errors' => $user->errors];
            }

            // Prepare email content
            $emailContent = "New Access Request:\n\n";
            $emailContent .= "Full Name: " . $data['fullName'] . "\n";
            $emailContent .= "Email: " . $data['email'] . "\n";
            $emailContent .= "Department: " . $data['department'] . "\n";
            $emailContent .= "Role: " . $data['role'] . "\n";
            $emailContent .= "School: " . $data['school'] . "\n\n";
            $emailContent .= "Please log in to the admin panel to approve or reject this request.";

            $sent = Yii::$app
                ->mailer
                ->compose()
                ->setTo(Yii::$app->params['mail']['accessRequestRecipients'])
                ->setFrom([Yii::$app->params['mail']['from'] => 'Gadgets-to-Go'])
                ->setReplyTo([$data['email'] => $data['fullName']]) // Set user's email as reply-to
                ->setSubject('New Access Request - Approval Required')
                ->setTextBody($emailContent)
                ->send();

            return ['success' => true, 'message' => 'Request submitted successfully. You will be notified once approved.'];
        } else {
            return ['success' => false, 'message' => 'Invalid request method.'];
        }
    }
}
