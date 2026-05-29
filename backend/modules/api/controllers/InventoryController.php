<?php

namespace backend\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\web\UploadedFile;
use yii\web\Response;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\web\ConflictHttpException;
use app\models\Inventory;
use app\models\InventoryBranch;
use app\models\Folio;
use backend\components\InstitutionAccess;
use yii\filters\Cors;
use yii\filters\AccessControl;
use yii\filters\auth\HttpBearerAuth;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use yii\web\UnauthorizedHttpException;


class InventoryController extends ActiveController
{
    public $modelClass = 'app\models\Inventory';

    public function verbs()
{
    return [
        'update' => ['PUT', 'PATCH', 'POST'],
        'set-branches' => ['PUT', 'PATCH', 'POST'],
        'add-branch' => ['POST'],
        'delete-branch' => ['DELETE'],
        // other actions
    ];
}

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
            'except' => ['options', 'image', 'location-data', 'get-data', 'get-folio', 'get-image-data', 'branches'], // Skip authentication for OPTIONS
        ];
    
        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => Yii::$app->params['cors'],
        ];
        $behaviors['rateLimiter'] = [
            'class' => \backend\components\SimpleRateLimiter::class,
            'actions' => ['get-folio', 'inventory-search', 'get-image-data', 'image'],
            'limit' => 120,
            'window' => 60,
        ];

    
        // Access control
        $behaviors['access'] = [
            'class' => \yii\filters\AccessControl::class,
            'only' => ['create', 'update', 'delete', 'index', 'view', 'get-data', 'image', 'location-data', 'get-folio', 'branches', 'set-branches', 'add-branch', 'delete-branch'],
            'rules' => [
                // Public access to specific actions
                [
                    'allow' => true,
                    'actions' => ['image', 'location-data', 'get-data', 'get-folio', 'branches'],
                ],
                // Access for authenticated users with the right role
                [
                    'allow' => true,
                    'actions' => ['create', 'update', 'delete', 'set-branches', 'add-branch', 'delete-branch'],
                    'roles' => ['@'], // Role-based access control
                ],
                [
                    'allow' => false,
                ]
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

        // Disable default actions if needed
        unset($actions['index'], $actions['create'], $actions['delete'], $actions['view'], $actions['update']);

        return $actions;
    }
    



    /**
     * Creates a new Inventory item with optional file upload.
     *
     * @return Inventory The created Inventory model.
     * @throws ServerErrorHttpException If there is an error saving the model.
     * @throws BadRequestHttpException If the file upload fails due to size or other restrictions.
     */
    public function actionCreate()
    {
        $model = new Inventory();
        $postData = Yii::$app->request->post();
        $model->load($postData, '');
        InstitutionAccess::assertCanAccessCode($model->owner);
        $branches = $this->extractBranchesFromData($postData);
        $this->assertCanAccessBranches($branches);

        // Check for file upload errors before processing
        $this->checkFileUploadErrors();

        // Check for duplicate folio_id
        if (Inventory::find()->where(['folio_id' => $model->folio_id])->exists()) {
            throw new ConflictHttpException('FOLIO ID already exists in the database.');
        }

        // Handle file uploads
        $upload = UploadedFile::getInstanceByName('image');
        if ($upload) {
            $this->saveUploadedFiles([$upload], $model->folio_id);
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            if ($model->save()) {
                $this->syncBranches($model->id, $branches);
                $transaction->commit();
                Yii::$app->response->statusCode = 201; // Created
                return $model;
            }

            $transaction->rollBack();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }

        if (!$model->hasErrors()) {
            throw new ServerErrorHttpException('Failed to create the object for unknown reasons.');
        }

        return $model;
    }

    /**
     * Updates an existing Inventory item with optional file upload.
     *
     * @param integer $id The ID of the Inventory item to update.
     * @return Inventory The updated Inventory model.
     * @throws NotFoundHttpException If the Inventory item is not found.
     * @throws ServerErrorHttpException If there is an error saving the model.
     * @throws BadRequestHttpException If the file upload fails due to size or other restrictions.
     */
    public function actionUpdate($id)
    {
        $model = $this->findModel($id);
    
        // Check for file upload errors before processing
        $this->checkFileUploadErrors();
    
        // Load the form data
        if (Yii::$app->request->isPost) {
            $data = Yii::$app->request->post();
        } else {
            $rawBody = Yii::$app->request->getRawBody();
            $data = json_decode($rawBody, true);
        }
    
        InstitutionAccess::assertCanAccessInventory($model);
        $model->load($data, '');
        InstitutionAccess::assertCanAccessCode($model->owner);
        $branches = $this->extractBranchesFromData($data);
        $this->assertCanAccessBranches($branches);
    
        // Handle file uploads
        $uploads = UploadedFile::getInstancesByName('image');
        if ($uploads) {
            $this->saveUploadedFiles($uploads, $model->folio_id);
        }
    
        $transaction = Yii::$app->db->beginTransaction();
        try {
            if ($model->save()) {
                $this->syncBranches($model->id, $branches);
                $transaction->commit();
                return $model;
            }

            $transaction->rollBack();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }
    
        throw new ServerErrorHttpException('Failed to update the object for unknown reasons.');
    }
    

    /**
     * Returns the image data associated with an Inventory item.
     *
     * @param integer $id The ID of the Inventory item.
     * @return string The image data.
     * @throws NotFoundHttpException If the Inventory item is not found.
     */
    public function actionImage($id)
    {
        $model = $this->findModel($id);
        $path = Yii::getAlias('@app/images/');
        $filename = $this->findImageFile($path, $model->folio_id);

        if ($filename) {
            $mimeType = mime_content_type($filename);
            Yii::$app->response->format = Response::FORMAT_RAW;
            Yii::$app->response->headers->set('Content-Type', $mimeType);
            return file_get_contents($filename);
        } else {
            throw new NotFoundHttpException('Image not found.');
        }
    }

    /**
     * Searches the FOLIO inventory based on a query.
     *
     * @param string $query The search query.
     * @return mixed The search results.
     * @throws BadRequestHttpException If the query parameter is missing.
     */
    public function actionInventorySearch($query = null)
    {
        if ($query === null) {
            throw new BadRequestHttpException('Missing "query" parameter.');
        }

        try {
            $folio = new FOLIO();
            return $folio->inventorySearch($query, 'instance');
        } catch (\Exception $e) {
            Yii::warning('FOLIO inventory search failed: ' . $e->getMessage(), __METHOD__);
            throw new BadRequestHttpException('FOLIO inventory search failed.');
        }
    }

    /**
     * Retrieves FOLIO data based on an ID.
     *
     * @param string $id The FOLIO ID.
     * @return mixed The FOLIO data.
     * @throws BadRequestHttpException If the ID parameter is missing.
     */
    public function actionGetFolio($id = null)
    {
        if ($id === null) {
            throw new BadRequestHttpException('Missing "id" parameter.');
        }
        $this->validateLookupId($id);

        $folioConfig = Yii::$app->params['folio'];
        if (empty($folioConfig['baseUrl']) || empty($folioConfig['apiKey'])) {
            return ['holding' => []];
        }

        try {
            $folio = new FOLIO();
            return $folio->processRequest($id);
        } catch (\Exception $e) {
            Yii::warning('FOLIO RTAC request failed: ' . $e->getMessage(), __METHOD__);
            throw new BadRequestHttpException('FOLIO request failed.');
        }
    }

    /**
     * Retrieves Inventory items based on the owner.
     *
     * @param string $owner The owner identifier.
     * @return Inventory[] The list of Inventory items.
     * @throws BadRequestHttpException If the owner parameter is missing.
     */
    public function actionLocationData($owner = null)
    {
        if ($owner === null) {
            throw new BadRequestHttpException('Missing "owner" parameter.');
        }
        $this->validateLookupId($owner);

        return Inventory::find()
            ->with('inventoryBranches')
            ->where(['owner' => $owner])
            ->orderBy(['sort_order' => SORT_ASC])
            ->all();
    }

    /**
     * Returns branch rows for an Inventory item.
     * Public (read-only).
     */
    public function actionBranches($id)
    {
        $model = $this->findModel($id);
        InstitutionAccess::assertCanAccessInventory($model);
        return InventoryBranch::find()
            ->where(['inventory_id' => (int)$id])
            ->orderBy(['branch' => SORT_ASC])
            ->all();
    }

    /**
     * Replaces the full set of branches for an Inventory item.
     * Authenticated.
     */
    public function actionSetBranches($id)
    {
        $model = $this->findModel($id);
        InstitutionAccess::assertCanAccessInventory($model);

        $data = Yii::$app->request->isPost ? Yii::$app->request->post() : (json_decode(Yii::$app->request->getRawBody(), true) ?: []);
        $branches = $this->extractBranchesFromData($data);
        if ($branches === null) {
            throw new BadRequestHttpException('Provide "branch" or "branches".');
        }
        $this->assertCanAccessBranches($branches);
        $this->syncBranches((int)$id, $branches);
        return $this->actionBranches($id);
    }

    /**
     * Adds a single branch for an Inventory item.
     * Authenticated.
     */
    public function actionAddBranch($id)
    {
        $model = $this->findModel($id);
        InstitutionAccess::assertCanAccessInventory($model);

        $data = Yii::$app->request->isPost ? Yii::$app->request->post() : (json_decode(Yii::$app->request->getRawBody(), true) ?: []);
        $branch = isset($data['branch']) ? trim((string)$data['branch']) : '';
        if ($branch === '') {
            throw new BadRequestHttpException('Missing "branch".');
        }
        InstitutionAccess::assertCanAccessCode($branch);

        $row = new InventoryBranch();
        $row->inventory_id = (int)$id;
        $row->branch = $branch;
        if (!$row->save()) {
            return $row;
        }

        Yii::$app->response->statusCode = 201;
        return $row;
    }

    /**
     * Deletes a branch row by its ID.
     * Authenticated.
     */
    public function actionDeleteBranch($id)
    {
        $row = InventoryBranch::findOne((int)$id);
        if ($row === null) {
            throw new NotFoundHttpException("Branch row not found: $id");
        }
        $model = $this->findModel($row->inventory_id);
        InstitutionAccess::assertCanAccessInventory($model);

        if ($row->delete() === false) {
            throw new ServerErrorHttpException('Failed to delete branch row for unknown reasons.');
        }

        Yii::$app->response->statusCode = 204;
        return null;
    }

    /**
     * Finds the Inventory model based on its primary key value.
     *
     * @param integer $id The ID of the Inventory model.
     * @return Inventory The loaded model.
     * @throws NotFoundHttpException If the model cannot be found.
     */
    protected function findModel($id)
    {
        $model = Inventory::findOne($id);
        if ($model === null) {
            throw new NotFoundHttpException("Inventory item not found: $id");
        }
        return $model;
    }

    /**
     * Checks for PHP file upload errors and throws appropriate exceptions.
     *
     * @throws BadRequestHttpException If there are file upload errors.
     */
    protected function checkFileUploadErrors()
    {
        // Check if POST data is empty but Content-Length indicates data was sent
        // This happens when post_max_size is exceeded
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        
        if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
            $postMaxSize = ini_get('post_max_size');
            $uploadMaxSize = ini_get('upload_max_filesize');
            Yii::warning("Upload rejected: Content-Length ($contentLength bytes) exceeds limits. post_max_size: $postMaxSize, upload_max_filesize: $uploadMaxSize", __METHOD__);
            
            throw new BadRequestHttpException(
                "The uploaded data exceeds the maximum allowed size of {$postMaxSize}. " .
                "The maximum file size for uploads is {$uploadMaxSize}. " .
                "Please upload a smaller image file."
            );
        }
        
        // Check if any files were attempted to be uploaded
        if (!empty($_FILES)) {
            foreach ($_FILES as $fileKey => $file) {
                if (isset($file['error'])) {
                    // Handle array of files
                    $errors = is_array($file['error']) ? $file['error'] : [$file['error']];
                    
                    foreach ($errors as $error) {
                        if ($error !== UPLOAD_ERR_OK && $error !== UPLOAD_ERR_NO_FILE) {
                            Yii::warning("File upload error code: $error for file: $fileKey", __METHOD__);
                            
                            switch ($error) {
                                case UPLOAD_ERR_INI_SIZE:
                                    $maxSize = ini_get('upload_max_filesize');
                                    throw new BadRequestHttpException(
                                        "The uploaded file exceeds the maximum allowed size of {$maxSize}. " .
                                        "Please upload a smaller image file."
                                    );
                                case UPLOAD_ERR_FORM_SIZE:
                                    throw new BadRequestHttpException(
                                        'The uploaded file exceeds the maximum allowed size specified in the form.'
                                    );
                                case UPLOAD_ERR_PARTIAL:
                                    throw new BadRequestHttpException(
                                        'The file was only partially uploaded. Please try again.'
                                    );
                                case UPLOAD_ERR_NO_TMP_DIR:
                                    throw new ServerErrorHttpException(
                                        'Missing a temporary folder for file upload.'
                                    );
                                case UPLOAD_ERR_CANT_WRITE:
                                    throw new ServerErrorHttpException(
                                        'Failed to write file to disk.'
                                    );
                                case UPLOAD_ERR_EXTENSION:
                                    throw new ServerErrorHttpException(
                                        'A PHP extension stopped the file upload.'
                                    );
                                default:
                                    throw new BadRequestHttpException(
                                        'An unknown error occurred during file upload.'
                                    );
                            }
                        }
                    }
                }
            }
        }
    }

        /**
     * Deletes an existing Inventory item along with its image.
     *
     * @param integer $id The ID of the Inventory item to delete.
     * @throws NotFoundHttpException If the Inventory item is not found.
     * @throws ServerErrorHttpException If there is an error deleting the model.
     */
    public function actionDelete($id)
    {
        $model = $this->findModel($id);
        InstitutionAccess::assertCanAccessInventory($model);
        $folioId = $model->folio_id;

        // Remove branch rows (also handled by FK cascade if enabled)
        InventoryBranch::deleteAll(['inventory_id' => (int)$model->id]);

        if ($model->delete() !== false) {
            // After deleting the record, delete the associated image file
            $this->deleteImageFile($folioId);
            Yii::$app->response->statusCode = 204; // No Content
        } else {
            throw new ServerErrorHttpException('Failed to delete the object for unknown reasons.');
        }
    }

    /**
     * Accepts branches from either:
     * - branch: string
     * - branches: array of strings
     * - branches: JSON string array
     */
    /**
     * @return array|null Returns null when request did not include any branch fields.
     */
    protected function extractBranchesFromData($data)
    {
        if (!is_array($data)) {
            return null;
        }

        $hasAnyKey = array_key_exists('branch', $data) || array_key_exists('branches', $data);
        if (!$hasAnyKey) {
            return null;
        }

        $branches = [];

        if (isset($data['branches'])) {
            $incoming = $data['branches'];
            if (is_string($incoming)) {
                $decoded = json_decode($incoming, true);
                $incoming = is_array($decoded) ? $decoded : [$incoming];
            }
            if (is_array($incoming)) {
                $branches = array_merge($branches, $incoming);
            }
        }

        if (isset($data['branch'])) {
            $branches[] = $data['branch'];
        }

        $branches = array_values(array_unique(array_filter(array_map(
            static function ($v) {
                return trim((string)$v);
            },
            $branches
        ), static function ($v) {
            return $v !== '';
        })));

        return $branches;
    }

    protected function assertCanAccessBranches($branches)
    {
        if ($branches === null) {
            return;
        }

        foreach ($branches as $branch) {
            InstitutionAccess::assertCanAccessCode($branch);
        }
    }

    protected function syncBranches($inventoryId, $branches)
    {
        $inventoryId = (int)$inventoryId;
        if ($inventoryId <= 0) {
            return;
        }

        // Null means the request didn't include any branch fields.
        // (This keeps partial updates safe.)
        if ($branches === null) {
            return;
        }

        if (!is_array($branches)) {
            $branches = [];
        }

        InventoryBranch::deleteAll(['inventory_id' => $inventoryId]);

        foreach ($branches as $branch) {
            $row = new InventoryBranch();
            $row->inventory_id = $inventoryId;
            $row->branch = $branch;
            if (!$row->save()) {
                throw new BadRequestHttpException('Invalid branch value.');
            }
        }
    }


    /**
     * Saves uploaded files to the specified path.
     *
     * @param UploadedFile[] $uploads The uploaded files.
     * @param string $folioId The FOLIO ID to associate with the files.
     * @throws ServerErrorHttpException If a file cannot be saved.
     */
    protected function saveUploadedFiles($uploads, $folioId)
    {
        $path = Yii::getAlias('@app/images/');
        $safeFolioId = $this->safeFolioId($folioId);
        if ($safeFolioId === '') {
            throw new BadRequestHttpException('Invalid FOLIO ID.');
        }
    
        // Step 1: Delete existing images for this folioId
        $pattern = $path . '/' . $safeFolioId . '.*'; // Matches any file with the folioId as the name and any extension
        $existingFiles = glob($pattern);
        foreach ($existingFiles as $existingFile) {
            if (!unlink($existingFile)) {
                Yii::warning('Failed to delete file: ' . $existingFile, __METHOD__);
                throw new ServerErrorHttpException('Failed to delete the old image.');
            }
        }
    
        // Step 2: Save the new uploaded file
        foreach ($uploads as $file) {
            $this->validateUploadedImage($file);
            $filename = $path . '/' . $safeFolioId . '.' . strtolower($file->extension);
            if (!$file->saveAs($filename)) {
                throw new ServerErrorHttpException('Failed to save the uploaded file.');
            }
        }
    }
    

        /**
     * Renames an existing image file when folio_id changes.
     *
     * @param string $oldFolioId The old FOLIO ID.
     * @param string $newFolioId The new FOLIO ID.
     * @throws ServerErrorHttpException If the file cannot be renamed.
     */
    protected function renameImageFile($oldFolioId, $newFolioId)
    {
        $path = Yii::getAlias('@app/images/');
        $oldFilename = $this->findImageFile($path, $oldFolioId);
        if ($oldFilename) {
            $extension = pathinfo($oldFilename, PATHINFO_EXTENSION);
            $newFilename = $path . '/' . $this->safeFolioId($newFolioId) . '.' . $extension;
            if (!rename($oldFilename, $newFilename)) {
                throw new ServerErrorHttpException('Failed to rename the image file.');
            }
        }
    }

        /**
     * Deletes the image file associated with a FOLIO ID.
     *
     * @param string $folioId The FOLIO ID.
     */
    protected function deleteImageFile($folioId)
    {
        $path = Yii::getAlias('@app/images/');
        $filename = $this->findImageFile($path, $folioId);
        if ($filename) {
            if (!unlink($filename)) {
                // Log an error if unable to delete the file
                Yii::error("Failed to delete image file: $filename", __METHOD__);
            }
        }
    }

    /**
     * Finds the image file associated with a FOLIO ID.
     *
     * @param string $path The base path for images.
     * @param string $folioId The FOLIO ID.
     * @return string|false The filename if found, false otherwise.
     */
    protected function findImageFile($path, $folioId)
    {
        $pattern = $path . '/' . $this->safeFolioId($folioId) . '.{jpg,jpeg,png,gif,webp}';
        $files = glob($pattern, GLOB_BRACE);
        return $files[0] ?? false;
    }

    protected function validateUploadedImage(UploadedFile $file)
    {
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $extension = strtolower($file->extension);
        if (!in_array($extension, $allowedExtensions, true)) {
            throw new BadRequestHttpException('Unsupported image type.');
        }

        $maxUploadSize = (int)(getenv('MAX_UPLOAD_BYTES') ?: 5242880);
        if ($file->size > $maxUploadSize) {
            throw new BadRequestHttpException('Uploaded image is too large.');
        }

        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if ($file->tempName && is_file($file->tempName)) {
            $mimeType = mime_content_type($file->tempName);
            if (!in_array($mimeType, $allowedMimeTypes, true)) {
                throw new BadRequestHttpException('Uploaded file is not a valid image.');
            }
        }
    }

    protected function safeFolioId($folioId)
    {
        $folioId = basename((string)$folioId);
        return preg_replace('/[^A-Za-z0-9._-]/', '', $folioId);
    }

    protected function validateLookupId($id)
    {
        $id = (string)$id;
        if ($id === '' || strlen($id) > 128 || !preg_match('/^[A-Za-z0-9._:-]+$/', $id)) {
            throw new BadRequestHttpException('Invalid identifier.');
        }
    }

    public function actionGetImageData()
    {
        $id = Yii::$app->request->get('id');
        if($id !== null){
            $search = Inventory::find()->where(['id' => $id])->one();
            if (!$search) {
                throw new NotFoundHttpException('Image not found.');
            }
            $response = \Yii::$app->response;
            $response->format = yii\web\Response::FORMAT_RAW;
            $response->headers->add('content-type', 'image/jpg');
            $path = Yii::getAlias('@app/images/');
            $location = $path . '/' . $this->safeFolioId($search->folio_id);
            $filename = glob($location . ".{jpg,png,gif,jpeg}",  GLOB_BRACE);
            if(isset($filename[0])){
                $img_data = file_get_contents($filename[0]);
                $response->data = $img_data;
                return $response;   
            } else {
                $img_data = file_get_contents($path .'/placeholder.png');
                $response->data = $img_data;
                return $response; 
            }
        } else {
           return Yii::createObject([
               'class' => 'yii\web\Response',
               'format' => \yii\web\Response::FORMAT_JSON,
               'data' => [
                   'message' => 'Missing id',
                   'code' => 401
               ],
           ]); 
        }
    }
}
