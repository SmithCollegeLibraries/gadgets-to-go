<?php

namespace backend\models;

use Yii;
use yii\base\Model;

class AccessRequestForm extends Model
{
    public $username;
    public $email;
    public $reason;

    public function rules()
    {
        return [
            [['username', 'email', 'reason'], 'required'],
            ['email', 'email'],
            [['reason'], 'string', 'max' => 1000],
        ];
    }

    /**
     * Sends an email to the admin with the access request details.
     *
     * @return bool Whether the email was sent successfully.
     */
    public function sendRequest()
    {
        return Yii::$app->mailer->compose()
            ->setTo('admin@example.edu') // Replace with your admin email
            ->setFrom([$this->email => $this->username])
            ->setSubject('Access Request for Gadgets To Go')
            ->setTextBody("User {$this->username} ({$this->email}) has requested access.\n\nReason:\n{$this->reason}")
            ->send();
    }
}
