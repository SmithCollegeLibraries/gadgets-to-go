<?php

namespace app\models;

/**
 * This is the ActiveQuery class for [[Styling]].
 *
 * @see Styling
 */
class StylingQuery extends \yii\db\ActiveQuery
{
    /*public function active()
    {
        return $this->andWhere('[[status]]=1');
    }*/

    /**
     * {@inheritdoc}
     * @return Styling[]|array
     */
    public function all($db = null)
    {
        return parent::all($db);
    }

    /**
     * {@inheritdoc}
     * @return Styling|array|null
     */
    public function one($db = null)
    {
        return parent::one($db);
    }
}
