<?php

namespace backend\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\BadRequestHttpException;
use yii\web\ServerErrorHttpException;
use app\models\DisabledItem;
use yii\filters\Cors;
use yii\filters\auth\HttpBearerAuth;

class SettingsController extends Controller
{
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
            'except' => ['options', 'disabled-items'], // Skip authentication for OPTIONS and public endpoints
        ];

        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];

        // Access control
        $behaviors['access'] = [
            'class' => \yii\filters\AccessControl::class,
            'only' => ['save-disabled-items'],
            'rules' => [
                [
                    'allow' => true,
                    'actions' => ['save-disabled-items'],
                    'roles' => ['@'], // Authenticated users only
                ],
            ],
        ];

        return $behaviors;
    }

    /**
     * GET /api/settings/disabled-items
     * Retrieves disabled branches and locations for a specific institution.
     * Empty arrays means everything is enabled (default state).
     *
     * @return array Response with disabled branches and locations
     * @throws BadRequestHttpException If owner parameter is missing
     */
    public function actionDisabledItems()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $owner = Yii::$app->request->get('owner');
        if (!$owner) {
            throw new BadRequestHttpException('Missing required parameter: owner');
        }

        // Get disabled items (empty arrays if nothing is disabled)
        $branches = DisabledItem::getDisabledItems($owner, 'branch');
        $locations = DisabledItem::getDisabledItems($owner, 'location');

        return [
            'branches' => $branches,
            'locations' => $locations,
        ];
    }

    /**
     * POST /api/settings/disabled-items
     * Saves the list of disabled branches and locations for an institution.
     * Only disabled items are stored. Empty arrays = everything enabled.
     *
     * @return array Response with success status
     * @throws BadRequestHttpException If required data is missing
     * @throws ServerErrorHttpException If there is an error saving
     */
    public function actionSaveDisabledItems()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $data = Yii::$app->request->post();
        
        // Also try to get from raw body (for JSON requests)
        if (empty($data)) {
            $rawBody = Yii::$app->request->getRawBody();
            $data = json_decode($rawBody, true);
        }

        if (!isset($data['owner'])) {
            throw new BadRequestHttpException('Missing required field: owner');
        }

        $owner = $data['owner'];
        $disabledBranches = isset($data['branches']) && is_array($data['branches']) ? $data['branches'] : [];
        $disabledLocations = isset($data['locations']) && is_array($data['locations']) ? $data['locations'] : [];

        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Delete all existing records for this owner
            DisabledItem::deleteAll(['owner' => $owner]);

            $branchesAdded = 0;
            $locationsAdded = 0;

            // Add only the disabled branches
            foreach ($disabledBranches as $branchCode) {
                $model = new DisabledItem();
                $model->owner = $owner;
                $model->item_type = 'branch';
                $model->item_code = $branchCode;
                if ($model->save()) {
                    $branchesAdded++;
                }
            }

            // Add only the disabled locations
            foreach ($disabledLocations as $locationCode) {
                $model = new DisabledItem();
                $model->owner = $owner;
                $model->item_type = 'location';
                $model->item_code = $locationCode;
                if ($model->save()) {
                    $locationsAdded++;
                }
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Settings saved successfully',
                'disabled' => [
                    'branches' => $branchesAdded,
                    'locations' => $locationsAdded,
                ],
            ];
        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to save settings: ' . $e->getMessage());
        }
    }

    /**
     * Get all available branches from inventory_branch table.
     *
     * @return array Array of unique branch codes
     */
    protected function getAllAvailableBranches()
    {
        return Yii::$app->db->createCommand('
            SELECT DISTINCT branch
            FROM inventory_branch
            WHERE branch IS NOT NULL AND branch != ""
            ORDER BY branch ASC
        ')->queryColumn();
    }

    /**
     * Get all available locations from inventory table.
     *
     * @return array Array of unique location codes
     */
    protected function getAllAvailableLocations()
    {
        return Yii::$app->db->createCommand('
            SELECT DISTINCT location
            FROM inventory
            WHERE location IS NOT NULL AND location != ""
            ORDER BY location ASC
        ')->queryColumn();
    }

}
