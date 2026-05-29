<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "disabled_items".
 *
 * @property int $id
 * @property string $owner
 * @property string $item_type
 * @property string $item_code
 * @property string $created_at
 * @property string $updated_at
 */
class DisabledItem extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'disabled_items';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['owner', 'item_type', 'item_code'], 'required'],
            [['item_type'], 'string'],
            [['item_type'], 'in', 'range' => ['branch', 'location']],
            [['created_at', 'updated_at'], 'safe'],
            [['owner'], 'string', 'max' => 10],
            [['item_code'], 'string', 'max' => 50],
            [['owner', 'item_type', 'item_code'], 'unique', 'targetAttribute' => ['owner', 'item_type', 'item_code']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'owner' => 'Owner',
            'item_type' => 'Item Type',
            'item_code' => 'Item Code',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }

    /**
     * Get all disabled items for a specific owner and type.
     *
     * @param string $owner Institution code
     * @param string $itemType 'branch' or 'location'
     * @return array Array of item codes
     */
    public static function getDisabledItems($owner, $itemType)
    {
        $items = self::find()
            ->select(['item_code'])
            ->where([
                'owner' => $owner,
                'item_type' => $itemType,
            ])
            ->column();

        return $items ?: [];
    }
}
