<?php

namespace app\models;

use Yii;
use backend\components\HtmlSanitizer;

/**
 * This is the model class for table "label".
 *
 * @property int $id
 * @property string $name
 * @property string $text
 * @property string $location
 */
class Label extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'label';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['name', 'location'], 'required'],
            [['text'], 'string'],
            [['name'], 'string', 'max' => 100],
            [['location'], 'string', 'max' => 5],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'name' => 'Name',
            'text' => 'Text',
            'location' => 'Location',
        ];
    }

    public function beforeValidate()
    {
        if ($this->text !== null) {
            $this->text = HtmlSanitizer::clean($this->text);
        }

        return parent::beforeValidate();
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
