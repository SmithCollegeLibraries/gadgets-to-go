# FOLIO and availability access paths

The React frontend does not call FOLIO, EBSCO Edge, or LibTools directly. It calls the Yii API, and Yii is the only application layer that holds integration credentials.

## Real-time availability lookups

The item views call:

```text
GET /api/inventory/get-folio?id={folio_id}
```

That action instantiates `backend/models/Folio.php` and calls `FOLIO::processRequest()`. The model builds an EBSCO Edge RTAC request from:

```text
FOLIO_AVAILABILITY_BASE_URL
FOLIO_RTAC_BASE_PATH
FOLIO_API_KEY
```

This is a direct call from Yii to EBSCO Edge for real-time availability. It is not the inventory data source.

Example EBSCO Edge RTAC base:

```text
https://edge-example.folio.ebsco.com
```

Five Colleges deployments use:

```text
https://edge-fivecolleges.folio.ebsco.com
```

## Admin inventory search

The admin add-item flow calls:

```text
GET /api/inventory/inventory-search?query={query}
```

That action calls `FOLIO::inventorySearch()`. Yii authenticates directly to the FOLIO API/Okapi inventory service with:

```text
FOLIO_INVENTORY_BASE_URL
FOLIO_TENANT_ID
FOLIO_USERNAME
FOLIO_PASSWORD
```

It posts to `/authn/login-with-expiry`, extracts the `folioAccessToken` value from the returned `Set-Cookie` headers, caches that access token, and then searches `/search/instances` with a `Cookie: folioAccessToken=...` header.

Example FOLIO inventory API base:

```text
https://api-example.folio.ebsco.com
```

Five Colleges deployments use:

```text
https://api-fivecolleges.folio.ebsco.com
```

`FOLIO_BASE_URL` and `FOLIO_OKAPI_URL` are still accepted as backward-compatible aliases for older deployments, but new deployments should use the explicit `FOLIO_AVAILABILITY_BASE_URL` and `FOLIO_INVENTORY_BASE_URL` names.

## LibTools status

No active frontend code calls a `libtools2` endpoint after this branch. The previous admin add-item search path now goes through `/api/inventory/inventory-search`, which keeps credentials and FOLIO integration details in the Yii backend.
