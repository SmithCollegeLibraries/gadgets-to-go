<?php
namespace app\models;


use Yii;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use yii\web\UnauthorizedHttpException;

class User extends \yii\base\BaseObject implements \yii\web\IdentityInterface
{
    public $id;
    public $username;
    public $password;
    public $authKey;
    public $accessToken;

    private static $users = [
        '100' => [
            'id' => '100',
            'username' => 'admin',
            'password' => 'admin',
            'authKey' => 'test100key',
            'accessToken' => '100-token',
        ],
        '101' => [
            'id' => '101',
            'username' => 'demo',
            'password' => 'demo',
            'authKey' => 'test101key',
            'accessToken' => '101-token',
        ],
    ];

    /**
     * {@inheritdoc}
     */
    public static function findIdentity($id)
    {
        return isset(self::$users[$id]) ? new static(self::$users[$id]) : null;
    }

    /**
     * Decodes JWT token and finds the user by the username embedded in the token.
     * This method is used by HttpBearerAuth to authenticate the user via JWT token.
     *
     * {@inheritdoc}
     */
    public static function findIdentityByAccessToken($token, $type = null)
    {
        try {
            $decoded = JWT::decode($token, new Key(Yii::$app->params['jwtSecretKey'], 'HS256'));

            // Verify the token has not expired
            if (isset($decoded->exp) && $decoded->exp < time()) {
                throw new UnauthorizedHttpException('The token has expired.');
            }

            // Assuming the username is part of the token's payload
            return static::findByUsername($decoded->username);

        } catch (\Exception $e) {
            Yii::warning('JWT decoding failed.', __METHOD__);
            return null;
        }
    }

    /**
     * Finds user by username
     *
     * @param string $username
     * @return static|null
     */
    public static function findByUsername($username)
    {
        foreach (self::$users as $user) {
            if (strcasecmp($user['username'], $username) === 0) {
                return new static($user);
            }
        }

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
        return $this->password === $password;
    }
}
