<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "authorized_users".
 *
 * @property int $id
 * @property string $username
 * @property string $full_name
 * @property string $email
 * @property string $department
 * @property string $institution
 * @property string $role
 * @property int $approved
 * @property string $date_added
 */
class UserDb extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'authorized_users';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['username'], 'required'],
            [['email', 'full_name', 'department', 'institution'], 'string'],
            [['approved'], 'integer'],
            [['approved'], 'default', 'value' => 0],
            [['date_added'], 'safe'],
            [['username'], 'string', 'max' => 100],
            [['full_name', 'email', 'department', 'institution'], 'string', 'max' => 200],
            [['role'], 'string', 'max' => 50],
            [['role'], 'default', 'value' => 'user'],
            [['email'], 'email'],
            [['username'], 'unique'],
            [['email'], 'unique'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'username' => 'Username',
            'full_name' => 'Full Name',
            'email' => 'Email',
            'department' => 'Department',
            'institution' => 'Institution',
            'role' => 'Role',
            'approved' => 'Approved',
            'date_added' => 'Date Added',
        ];
    }
}
