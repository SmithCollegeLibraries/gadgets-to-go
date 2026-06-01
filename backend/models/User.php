<?php
namespace app\models;


use Yii;

class User extends \yii\base\BaseObject implements \yii\web\IdentityInterface
{
    public $id;
    public $username;
    public $password;
    public $authKey;
    public $accessToken;

    /**
     * {@inheritdoc}
     */
    public static function findIdentity($id)
    {
        return null;
    }

    /**
     * Legacy identity hook retained for framework compatibility.
     * API bearer authentication uses backend\components\ShibbolethUser.
     *
     * {@inheritdoc}
     */
    public static function findIdentityByAccessToken($token, $type = null)
    {
        Yii::warning('Legacy User identity was called; API auth uses backend\\components\\ShibbolethUser.', __METHOD__);
        return null;
    }

    /**
     * Finds user by username
     *
     * @param string $username
     * @return static|null
     */
    public static function findByUsername($username)
    {
        return null;
    }

    /**
     * {@inheritdoc}
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * {@inheritdoc}
     */
    public function getAuthKey()
    {
        return $this->authKey;
    }

    /**
     * {@inheritdoc}
     */
    public function validateAuthKey($authKey)
    {
        return $this->authKey === $authKey;
    }

    /**
     * Validates password
     *
     * @param string $password password to validate
     * @return bool if password provided is valid for current user
     */
    public function validatePassword($password)
    {
        return false;
    }
}
