<?php
use backend\components\AppConfig;

$availabilityBaseUrl = AppConfig::env('FOLIO_AVAILABILITY_BASE_URL', AppConfig::env('FOLIO_BASE_URL', ''));
$inventoryBaseUrl = AppConfig::env('FOLIO_INVENTORY_BASE_URL', AppConfig::env('FOLIO_OKAPI_URL', $availabilityBaseUrl));

return [
    'username'      => AppConfig::env('FOLIO_USERNAME', ''),
    'password'      => AppConfig::env('FOLIO_PASSWORD', ''),
    'apiKey'        => AppConfig::env('FOLIO_API_KEY', ''),
    'tenantId'      => AppConfig::env('FOLIO_TENANT_ID', ''),
    'authMode'      => AppConfig::env('FOLIO_AUTH_MODE', 'okapi-token'),
    'baseUrl'       => $availabilityBaseUrl,
    'folioBaseUrl'  => $inventoryBaseUrl,
    'rtacBasePath'  => AppConfig::env('FOLIO_RTAC_BASE_PATH', '/prod/rtac/folioRTAC?mms_id='),
];
