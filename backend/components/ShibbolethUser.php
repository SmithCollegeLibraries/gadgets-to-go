<?php
namespace backend\components;

use Yii;
use yii\db\ActiveRecord;
use yii\web\IdentityInterface;
use Firebase\JWT\JWT; 
use Firebase\JWT\Key; // Ensure you import this class for decoding

class ShibbolethUser extends ActiveRecord implements IdentityInterface
{
    /**
     * Specify the table name associated with this model.
     * Change it from 'user' to 'authorized_users'.
     *
     * @return string the table name
     */
    public static function tableName()
    {
        return 'authorized_users'; // Use the correct table name here
    }

    /**
     * Finds an identity by the given ID.
     * @param string|int $id
     * @return IdentityInterface|null
     */
    public static function findIdentity($id)
    {
        return static::findOne(['id' => $id]);
    }

    /**
     * Finds an identity by the given token.
     * @param string $token
     * @param null $type
     * @return IdentityInterface|null
     */
    public static function findIdentityByAccessToken($token, $type = null)
    {
        try {
            $secretKey = Yii::$app->params['jwtSecretKey'];
            
            $payload = JWT::decode($token, new Key($secretKey, 'HS256'));
            if (!isset($payload->exp) || $payload->exp < time()) {
                return null;
            }

            // Return the user based on the username in the token
            return static::findOne(['username' => $payload->username]);

        } catch (\Exception $e) {
            Yii::warning('JWT decoding failed.', __METHOD__);
            return null; // Token is invalid or expired
        }
    }


    /**
     * Returns an ID that uniquely identifies a user identity.
     * @return string|int
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Returns a key used to validate cookie-based login.
     * @return string|null
     */
    public function getAuthKey()
    {
        // If not using cookies, return null
        return null;
    }

    /**
     * Validates the given authentication key.
     * @param string $authKey
     * @return bool
     */
    public function validateAuthKey($authKey)
    {
        // If not using cookies, always return false
        return false;
    }
}
