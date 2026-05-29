<?php

namespace app\models;

use Yii;
use yii\base\Model;
use yii\httpclient\Client;
use yii\base\Exception;

class FOLIO extends Model
{
    private $config;
    private $client;

    /**
     * Initializes the FOLIO model with configuration and HTTP client.
     */
    public function __construct($config = [])
    {
        parent::__construct($config);
        $this->config = Yii::$app->params['folio'];
        $this->client = new Client(['baseUrl' => $this->config['folioBaseUrl']]);
    }

    /**
     * Processes a request to the FOLIO RTAC endpoint.
     *
     * @param string $id The MMS ID for the request.
     * @return mixed The response data from the RTAC endpoint.
     * @throws Exception If the request fails.
     */
    public function processRequest($id)
    {
        $url = $this->config['baseUrl']
            . $this->config['rtacBasePath']
            . rawurlencode((string)$id)
            . '&apikey='
            . rawurlencode((string)$this->config['apiKey']);
        return $this->edgeSearch($url);
    }

    /**
     * Performs an inventory search.
     *
     * @param string $query The search query.
     * @param string $type  The type of search.
     * @return mixed The search results.
     * @throws Exception If the search fails.
     */
    public function inventorySearch($query, $type)
    {
        $this->debug('inventory-search.start', [
            'queryLength' => strlen((string)$query),
            'type' => $type,
        ]);

        $token = $this->getToken();

        $endpoint = $this->getEndpoint($type);
        return $this->modSearch($query, $endpoint, $token);
    }

    /**
     * Authenticates with the FOLIO API and retrieves a token.
     *
     * @return string The authentication token.
     * @throws Exception If authentication fails.
     */
    private function authenticate()
    {
        return $this->authenticateWithExpiryCookie();
    }

    private function authenticateWithExpiryCookie()
    {
        if (!function_exists('curl_init')) {
            Yii::error('FOLIO login-with-expiry requires the PHP cURL extension.', __METHOD__);
            throw new Exception('FOLIO authentication failed.');
        }

        $url = rtrim($this->config['folioBaseUrl'], '/') . '/authn/login-with-expiry';
        $this->debug('auth.start', [
            'baseUrl' => $this->config['folioBaseUrl'] ? $this->config['folioBaseUrl'] : 'missing',
            'tenantConfigured' => $this->config['tenantId'] !== '',
            'usernameConfigured' => $this->config['username'] !== '',
            'passwordConfigured' => $this->config['password'] !== '',
            'endpoint' => '/authn/login-with-expiry',
        ]);

        $postData = json_encode([
            'username' => $this->config['username'],
            'password' => $this->config['password'],
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [
                'x-okapi-tenant: ' . $this->config['tenantId'],
                'Content-Type: application/json',
            ],
        ]);

        $fullResponse = curl_exec($ch);
        if ($fullResponse === false) {
            $curlError = curl_error($ch);
            Yii::error('FOLIO login-with-expiry cURL error: ' . $curlError, __METHOD__);
            $this->debug('auth.curl-error', ['error' => $curlError]);
            curl_close($ch);
            throw new Exception('FOLIO authentication failed.');
        }

        $statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $rawHeaders = substr($fullResponse, 0, $headerSize);
        $accessToken = self::extractFolioAccessToken($rawHeaders);
        $this->debug('auth.response', [
            'statusCode' => $statusCode,
            'setCookieHeaderPresent' => stripos($rawHeaders, 'set-cookie:') !== false,
            'folioAccessTokenCookiePresent' => $accessToken !== false,
        ]);

        if ($statusCode < 200 || $statusCode >= 300) {
            Yii::error('FOLIO login-with-expiry failed with status ' . $statusCode, __METHOD__);
            throw new Exception('FOLIO authentication failed.');
        }

        if ($accessToken) {
            Yii::$app->cache->set($this->tokenCacheKey(), $accessToken, 3600);
            return $accessToken;
        }

        Yii::error('FOLIO login-with-expiry did not return folioAccessToken cookie.', __METHOD__);
        throw new Exception('FOLIO authentication failed.');
    }

    public static function extractFolioAccessToken($rawHeaders)
    {
        $cookies = [];
        foreach (preg_split("/\r\n|\n|\r/", (string)$rawHeaders) as $line) {
            if (stripos($line, 'set-cookie:') === 0) {
                $cookies[] = trim(substr($line, 11));
            }
        }

        $combined = implode('; ', $cookies);
        if (preg_match('/folioAccessToken=([^;]+)/', $combined, $matches)) {
            return $matches[1];
        }

        return false;
    }

    /**
     * Retrieves the authentication token from cache or authenticates if not available.
     *
     * @return string The authentication token.
     * @throws Exception If authentication fails.
     */
    private function getToken()
    {
        $token = Yii::$app->cache->get($this->tokenCacheKey());
        $this->debug('auth.cache', ['hit' => (bool)$token]);
        if (!$token) {
            $token = $this->authenticate();
        }
        return $token;
    }

    /**
     * Performs a search using the FOLIO mod-search API.
     *
     * @param string $query    The search query.
     * @param string $endpoint The API endpoint.
     * @param string $token    The authentication token.
     * @return mixed The search results.
     * @throws Exception If the search fails.
     */
    private function modSearch($query, $endpoint, $token)
    {
        $this->debug('inventory-request.start', [
            'baseUrl' => $this->config['folioBaseUrl'] ? $this->config['folioBaseUrl'] : 'missing',
            'endpoint' => $endpoint,
            'tenantConfigured' => $this->config['tenantId'] !== '',
            'accessTokenConfigured' => $token !== '',
        ]);

        $response = $this->client->createRequest()
            ->setMethod('GET')
            ->setUrl($endpoint)
            ->setData([
                'expandAll' => 'true',
                'query'     => $query,
            ])
            ->setHeaders($this->getAuthenticatedHeaders($token))
            ->send();

        $this->debug('inventory-request.response', [
            'statusCode' => $response->getStatusCode(),
            'ok' => $response->isOk,
        ]);

        if ($response->isOk) {
            return $response->data;
        } else {
            Yii::error('modSearch failed with status ' . $response->getStatusCode(), __METHOD__);
            throw new Exception('FOLIO inventory search failed.');
        }
    }

    /**
     * Performs a search using the FOLIO edge-rtac API.
     *
     * @param string $url The complete API URL.
     * @return mixed The search results.
     * @throws Exception If the search fails.
     */
    private function edgeSearch($url)
    {
        $client = new Client();
        $response = $client->createRequest()
            ->setMethod('GET')
            ->setUrl($url)
            ->send();

        if ($response->isOk) {
            return $response->data;
        } else {
            Yii::error('Edge Search failed with status ' . $response->getStatusCode(), __METHOD__);
            throw new Exception('FOLIO availability request failed.');
        }
    }

    /**
     * Returns the appropriate API endpoint based on the search type.
     *
     * @param string $type The type of search.
     * @return string The API endpoint.
     */
    private function getEndpoint($type)
    {
        $endpoints = [
            'instance' => '/search/instances',
        ];

        return $endpoints[$type] ?? '/search/instances';
    }

    private function getAuthenticatedHeaders($token)
    {
        return [
            'x-okapi-tenant' => $this->config['tenantId'],
            'Content-Type'   => 'application/json',
            'Cookie'         => 'folioAccessToken=' . $token,
        ];
    }

    private function tokenCacheKey()
    {
        return 'folio-access-token:' . ($this->config['tenantId'] ?? '');
    }

    private function debug($event, array $context = [])
    {
        if (getenv('FOLIO_DEBUG') !== 'true') {
            return;
        }

        Yii::info('FOLIO debug ' . $event . ' ' . json_encode($context), __METHOD__);
    }
}
