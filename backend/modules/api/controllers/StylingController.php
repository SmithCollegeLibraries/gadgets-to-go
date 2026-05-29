<?php
namespace backend\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\web\BadRequestHttpException;
use yii\web\ServerErrorHttpException;
use app\models\Styling;
use backend\components\InstitutionAccess;
use yii\filters\Cors;
use yii\filters\AccessControl;
use yii\filters\auth\HttpBearerAuth; // Include for token-based auth

class StylingController extends ActiveController
{
    public $modelClass = 'app\models\Styling';

    /**
     * Configures behaviors for the controller.
     *
     * @return array The behavior configurations.
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();

        // Add CORS support
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];

        // Add JWT Bearer authentication
        $behaviors['authenticator'] = [
            'class' => HttpBearerAuth::class,
            'except' => ['options', 'get-data'], // Allow unauthenticated access to these actions
        ];

        // Add access control for specific actions
        $behaviors['access'] = [
            'class' => AccessControl::class,
            'only' => ['create', 'update', 'delete', 'create-style', 'update-style'], // Specify actions to which rules apply
            'rules' => [
                // Allow public access to 'get-data'
                [
                    'allow' => true,
                    'actions' => ['get-data'],
                    // No 'roles' => [] means accessible by all, including guests
                ],
                // Allow CRUD actions for authenticated users
                [
                    'allow' => true,
                    'actions' => ['create', 'update', 'delete', 'create-style', 'update-style'],
                    'roles' => ['@'], // '@' means authenticated users
                ],
                // Deny all other actions by default
                [
                    'allow' => false,
                ],
            ],
        ];

        return $behaviors;
    }

    /**
     * Overrides default actions to customize or disable them.
     *
     * @return array The action configurations.
     */
    public function actions()
    {
        $actions = parent::actions();

        // Disable default 'create', 'update', and 'delete' actions
        unset($actions['index'],$actions['create'], $actions['update'], $actions['delete']);

        return $actions;
    }

    /**
     * Retrieves styling data based on the 'location' parameter.
     *
     * @param string $location The location identifier.
     * @return Styling[] The list of styling records.
     * @throws BadRequestHttpException If the 'location' parameter is missing.
     */
    public function actionGetData($location = null)
    {
        if ($location === null) {
            throw new BadRequestHttpException('Missing "location" parameter.');
        }

        $stylings = Styling::find()->where(['location' => $location])->all();

        return $stylings;
    }

    /**
     * Creates new styling records based on the provided data.
     *
     * @return array A success message.
     * @throws BadRequestHttpException If required data is missing.
     * @throws ServerErrorHttpException If saving fails.
     */
    public function actionCreateStyle()
    {
        $data = Yii::$app->request->post();

        if (empty($data['location']) || empty($data['data'])) {
            throw new BadRequestHttpException('Missing "location" or "data" parameter.');
        }

        $location = $data['location'];
        InstitutionAccess::assertCanAccessCode($location);
        $items = $data['data'];

        foreach ($items as $type => $colorHash) {
            $styling = new Styling();
            $styling->location = $location;
            $styling->type = $type;
            $styling->color_hash = $colorHash;

            if (!$styling->save()) {
                throw new ServerErrorHttpException('Failed to create styling record.');
            }
        }

        Yii::$app->response->statusCode = 201; // Created
        return ['message' => 'Styling records created successfully.'];
    }

    /**
     * Updates existing styling records or creates them if they do not exist.
     *
     * @return array A success message.
     * @throws BadRequestHttpException If required data is missing.
     * @throws ServerErrorHttpException If saving fails.
     */
    public function actionUpdateStyle()
    {
        $rawBody = Yii::$app->request->getRawBody();
        $data = json_decode($rawBody, true);
    
        if (!is_array($data)) {
            throw new BadRequestHttpException('Invalid data format. Expecting an array.');
        }
    
        // Start the transaction
        $transaction = Yii::$app->db->beginTransaction();
        
        try {
            foreach ($data as $item) {
                if (!isset($item['type'], $item['color_hash'], $item['location'])) {
                    throw new BadRequestHttpException('Missing required fields (type, color_hash, or location) in one or more items.');
                }
    
                $type = $item['type'];
                $colorHash = $item['color_hash'];
                $location = $item['location'];
                InstitutionAccess::assertCanAccessCode($location);
    
                // Find the existing styling record or create a new one
                $styling = Styling::find()->where(['type' => $type, 'location' => $location])->one();
    
                if ($styling === null) {
                    $styling = new Styling();
                    $styling->location = $location;
                    $styling->type = $type;
                }
    
                $styling->color_hash = $colorHash;
    
                // Save the styling record
                if (!$styling->save()) {
                    throw new ServerErrorHttpException('Failed to save styling record for type: ' . $type);
                }
            }
    
            // Commit the transaction if everything is successful
            $transaction->commit();
    
            return ['message' => 'Styling records updated successfully.'];
        } catch (\Exception $e) {
            // Roll back the transaction if something fails
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to update styling records: ' . $e->getMessage());
        }
    }
    
}
