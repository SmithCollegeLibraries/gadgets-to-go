<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "inventory_branch".
 *
 * @property int $id
 * @property int $inventory_id
 * @property string $branch
 * @property string $timestamp
 */
class InventoryBranch extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'inventory_branch';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['inventory_id', 'branch'], 'required'],
            [['inventory_id'], 'integer'],
            [['timestamp'], 'safe'],
            [['branch'], 'string', 'max' => 255],
            [['inventory_id', 'branch'], 'unique', 'targetAttribute' => ['inventory_id', 'branch']],
            [['inventory_id'], 'exist', 'skipOnError' => true, 'targetClass' => Inventory::class, 'targetAttribute' => ['inventory_id' => 'id']],
        ];
    }

    public function getInventory()
    {
        return $this->hasOne(Inventory::class, ['id' => 'inventory_id']);
    }
}
