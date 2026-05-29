<?php

namespace backend\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\web\BadRequestHttpException;
use yii\web\ServerErrorHttpException;
use yii\web\NotFoundHttpException;
use yii\filters\Cors;
use app\models\Label;
use backend\components\InstitutionAccess;
use yii\filters\AccessControl;
use yii\filters\auth\HttpBearerAuth; // If you're using token-based auth
use yii\web\UnauthorizedHttpException;

class LabelController extends ActiveController
{
    public $modelClass = 'app\models\Label';

    /**
     * Configures behaviors for the controller.
     *
     * @return array The behavior configurations.
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();

        // Remove authentication filter if present, or adjust as needed
        // Authentication Filter
        $behaviors['authenticator'] = [
            'class' => HttpBearerAuth::class,
            'except' => ['options', 'get-data', 'index', 'image', 'location-data', 'label'],
        ];

        // Add the CORS filter
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];

        // Add Access Control if needed
        $behaviors['access'] = [
            'class' => AccessControl::class,
            'only' => ['get-data', 'create-label', 'update', 'index'],
            'rules' => [
                [
                    'allow' => true,
                    'actions' => ['get-data', 'index', 'image', 'location-data', 'label'],
                    // No 'roles' means accessible by all, including guests
                ],
                [
                    'allow' => true,
                    'actions' => ['create-label', 'update'],
                    'roles' => ['@'], // Ensure this is applied to authenticated users only
                ],
                [
                    'allow' => false,
                ],
            ],
        ];

        return $behaviors;
    }

    public function actions()
    {
        $actions = parent::actions();

        // Disable default actions if needed
        unset($actions['index'], $actions['create'], $actions['delete'], $actions['view'], $actions['update']);

        return $actions;
    }

    /**
     * Action for updating Labels or creating them if they don't exist.
     *
     * @return array The success message.
     * @throws BadRequestHttpException If required data is missing.
     * @throws ServerErrorHttpException If there is an error saving the models.
     */
    public function actionUpdate()
{
    $rawBody = Yii::$app->request->getRawBody();
    $data = json_decode($rawBody, true);
    if (!is_array($data)) {
        throw new BadRequestHttpException('Invalid data format. Expecting an array.');
    }

    $transaction = Yii::$app->db->beginTransaction();
    try {
        foreach ($data as $item) {
            if (!isset($item['location'], $item['name'], $item['text'])) {
                throw new BadRequestHttpException('Missing required fields in one or more items.');
            }
            InstitutionAccess::assertCanAccessCode($item['location']);

            // Find or create the label
            $model = Label::findOne(['name' => $item['name'], 'location' => $item['location']]);
            
            if ($model === null) {
                $model = new Label();
                $model->location = $item['location'];
                $model->name = $item['name'];
            } else {
            }

            // Update the text field
            $model->text = $item['text'];

            // Save and check if it was successful
            if (!$model->save()) {
                Yii::error('Error saving label: ' . json_encode($model->errors));
                // Return the errors to the frontend for debugging
                return ['error' => $model->errors];
            } else {
            }
        }

        $transaction->commit();
        return ['message' => 'Labels updated successfully.'];
    } catch (\Exception $e) {
        Yii::error('Failed to update labels: ' . $e->getMessage());
        $transaction->rollBack();
        throw new ServerErrorHttpException('Failed to update labels: ' . $e->getMessage());
    }
}

    


    /**
     * Example of logging for other actions if needed.
     */
    public function actionIndex()
    {
        // Get the 'location' query parameter
        $location = Yii::$app->request->getQueryParam('location');

        // Create a query for the Label model
        $query = Label::find();

        // If 'location' query parameter is provided, add the condition
        if ($location !== null) {
            $query->andWhere(['location' => $location]);
        }

        // Return the filtered results
        return $query->all();
    }

}
