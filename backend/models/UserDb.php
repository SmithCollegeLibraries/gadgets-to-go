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
 * @property string $auth_provider
 * @property string|null $password_hash
 * @property string|null $password_reset_token_hash
 * @property string|null $password_reset_expires_at
 * @property string|null $last_login_at
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
            [['date_added', 'password_reset_expires_at', 'last_login_at'], 'safe'],
            [['username'], 'string', 'max' => 100],
            [['full_name', 'email', 'department', 'institution'], 'string', 'max' => 200],
            [['role', 'auth_provider'], 'string', 'max' => 50],
            [['role'], 'default', 'value' => 'user'],
            [['auth_provider'], 'default', 'value' => 'shibboleth'],
            [['password_hash', 'password_reset_token_hash'], 'string', 'max' => 255],
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
            'auth_provider' => 'Auth Provider',
            'last_login_at' => 'Last Login',
        ];
    }

    public function fields()
    {
        return [
            'id',
            'username',
            'full_name',
            'email',
            'department',
            'institution',
            'role',
            'approved',
            'date_added',
            'auth_provider',
            'last_login_at',
        ];
    }

    public function setPassword($password)
    {
        $this->password_hash = Yii::$app->security->generatePasswordHash($password);
    }

    public function validatePassword($password)
    {
        return $this->password_hash !== null
            && $this->password_hash !== ''
            && Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    public function generatePasswordResetToken($ttlSeconds = 3600)
    {
        $token = Yii::$app->security->generateRandomString(48);
        $this->password_reset_token_hash = Yii::$app->security->generatePasswordHash($token);
        $this->password_reset_expires_at = gmdate('Y-m-d H:i:s', time() + $ttlSeconds);

        return $token;
    }

    public function validatePasswordResetToken($token)
    {
        return $this->password_reset_token_hash
            && $this->password_reset_expires_at
            && strtotime($this->password_reset_expires_at . ' UTC') >= time()
            && Yii::$app->security->validatePassword($token, $this->password_reset_token_hash);
    }

    public function clearPasswordResetToken()
    {
        $this->password_reset_token_hash = null;
        $this->password_reset_expires_at = null;
    }
}
