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
        $response = $this->client->createRequest()
            ->setUrl('/authn/login')
            ->setMethod('POST')
            ->setFormat(Client::FORMAT_JSON)
            ->addHeaders($this->getHeaders())
            ->setData([
                'username' => $this->config['username'],
                'password' => $this->config['password'],
            ])
            ->send();

        if ($response->isOk) {
            $token = $response->getHeaders()->get('x-okapi-token');
            if ($token) {
                // Store token in cache for reuse
                Yii::$app->cache->set('x-okapi-token', $token, 3600); // Token cached for 1 hour
                return $token;
            } else {
                Yii::error("Authentication failed: Token not received", __METHOD__);
                throw new Exception('Authentication failed: Token not received');
            }
        } else {
            Yii::error('Authentication failed with status ' . $response->getStatusCode(), __METHOD__);
            throw new Exception('FOLIO authentication failed.');
        }
    }

    /**
     * Retrieves the authentication token from cache or authenticates if not available.
     *
     * @return string The authentication token.
     * @throws Exception If authentication fails.
     */
    private function getToken()
    {
        $token = Yii::$app->cache->get('x-okapi-token');
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
        $response = $this->client->createRequest()
            ->setMethod('GET')
            ->setUrl($endpoint)
            ->setData([
                'expandAll' => 'true',
                'query'     => $query,
            ])
            ->setHeaders($this->getHeaders($token))
            ->send();

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

    /**
     * Constructs the headers for API requests.
     *
     * @param string|null $token The authentication token, if available.
     * @return array The headers.
     */
    private function getHeaders($token = null)
    {
        $headers = [
            'x-okapi-tenant' => $this->config['tenantId'],
            'Content-Type'   => 'application/json',
        ];

        if ($token) {
            $headers['x-okapi-token'] = $token;
        }

        return $headers;
    }
}
