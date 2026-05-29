<?php

namespace backend\components;

use Yii;
use yii\base\ActionFilter;
use yii\web\TooManyRequestsHttpException;

class SimpleRateLimiter extends ActionFilter
{
    public $limit = 60;
    public $window = 60;
    public $actions = [];

    public function beforeAction($action)
    {
        if ($this->actions && !in_array($action->id, $this->actions, true)) {
            return parent::beforeAction($action);
        }

        $ip = $this->clientIp();
        $key = 'rate-limit:' . $action->controller->uniqueId . ':' . $action->id . ':' . $ip;
        $count = Yii::$app->cache->get($key);

        if ($count === false) {
            Yii::$app->cache->set($key, 1, $this->window);
            return parent::beforeAction($action);
        }

        if ($count >= $this->limit) {
            throw new TooManyRequestsHttpException('Rate limit exceeded. Please try again later.');
        }

        Yii::$app->cache->set($key, $count + 1, $this->window);
        return parent::beforeAction($action);
    }

    private function clientIp()
    {
        $remoteIp = Yii::$app->request->userIP ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $trustedProxies = array_filter(array_map('trim', explode(',', getenv('TRUSTED_PROXIES') ?: '')));

        if (in_array($remoteIp, $trustedProxies, true)) {
            $forwardedFor = Yii::$app->request->headers->get('X-Forwarded-For');
            if ($forwardedFor) {
                $clientIp = trim(explode(',', $forwardedFor)[0]);
                if (filter_var($clientIp, FILTER_VALIDATE_IP)) {
                    return $clientIp;
                }
            }
        }

        return $remoteIp;
    }
}
