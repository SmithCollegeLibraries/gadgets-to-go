<?php

namespace app\models;

use Yii;
use app\models\InventoryBranch;
use backend\components\HtmlSanitizer;

/**
 * This is the model class for table "inventory".
 *
 * @property int $id
 * @property string $folio_id
 * @property string $aleph_id
 * @property string $title
 * @property string $owner
 * @property string $location
 * @property int $sort_order
 * @property string $timestamp
 */
class Inventory extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'inventory';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['sort_order'], 'integer'],
            [['timestamp'], 'safe'],
            [['description'], 'string'],
            [['folio_id', 'title', 'location'], 'string', 'max' => 255],
            [['aleph_id'], 'string', 'max' => 50],
            [['owner'], 'string', 'max' => 10],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'folio_id' => 'Folio ID',
            'aleph_id' => 'Aleph ID',
            'title' => 'Title',
            'description' => 'Description',
            'owner' => 'Owner',
            'location' => 'Location',
            'sort_order' => 'Sort Order',
            'timestamp' => 'Timestamp',
        ];
    }

    public function getInventoryBranches()
    {
        return $this->hasMany(InventoryBranch::class, ['inventory_id' => 'id'])->orderBy(['branch' => SORT_ASC]);
    }

    public function fields()
    {
        $fields = parent::fields();

        // If the legacy `branch` column still exists, don't rely on it.
        unset($fields['branch']);

        $fields['branches'] = function (self $model) {
            return array_values(array_map(
                static function (InventoryBranch $row) {
                    return $row->branch;
                },
                $model->inventoryBranches
            ));
        };

        return $fields;
    }

    public function extraFields()
    {
        return array_merge(parent::extraFields(), ['inventoryBranches']);
    }

    public function beforeValidate()
    {
        if ($this->description !== null) {
            $this->description = HtmlSanitizer::clean($this->description);
        }

        return parent::beforeValidate();
    }

    /**
     * {@inheritdoc}
     * @return InventoryQuery the active query used by this AR class.
     */
    public static function find()
    {
        return new InventoryQuery(get_called_class());
    }
}
