<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "styling".
 *
 * @property int $id
 * @property string $location
 * @property string $type
 * @property string $color_hash
 */
class Styling extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'styling';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['location'], 'string', 'max' => 5],
            [['type'], 'string', 'max' => 100],
            [['color_hash'], 'string', 'max' => 10],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'location' => 'Location',
            'type' => 'Type',
            'color_hash' => 'Color Hash',
        ];
    }

    /**
     * {@inheritdoc}
     * @return StylingQuery the active query used by this AR class.
     */
    public static function find()
    {
        return new StylingQuery(get_called_class());
    }
}
