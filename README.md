# Gadgets-to-Go

Gadgets-to-Go is a React and Yii2 application for publishing library equipment inventory from FOLIO. The React frontend provides the public catalog and staff admin screens. The Yii2 backend owns database access, authentication, FOLIO inventory search, EBSCO Edge availability lookups, email, and API security controls.

The application is configurable for a single library or a multi-library consortium. Institution names, library branches, FOLIO locations, email domains, auth providers, and default display text are defined in `backend/config/institutions.yml`.

## Architecture

- Frontend: React 18, Vite, Reactstrap, Zustand
- Backend: Yii2, PHP, MariaDB/MySQL
- Local services: Docker Compose, MariaDB, MailHog
- Inventory source: FOLIO API/Okapi through the Yii backend
- Real-time availability source: EBSCO Edge RTAC through the Yii backend
- Auth options: Shibboleth and local admin login

The browser never receives FOLIO credentials and does not call FOLIO, EBSCO Edge, or LibTools directly.

## Requirements

For Docker-based local development:

- Docker Desktop or another Docker Compose compatible client
- Git

For non-Docker development:

- Node.js 20 or newer
- npm
- PHP 8.1 compatible runtime
- Composer
- MariaDB or MySQL
- Apache or another web server capable of serving the Yii2 backend

Docker is the recommended setup for evaluation and local development.

## Quick Start With Docker

1. Clone the repository and enter it:

```bash
git clone <repository-url>
cd gadgets-to-go
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Review `.env` before connecting to shared or production services. For local-only testing, the defaults are intentionally safe placeholders.

4. Start the stack:

```bash
docker compose up --build
```

The first run installs frontend npm packages and backend Composer packages into the mounted project directories. This can take a few minutes.

5. Open the frontend:

```text
http://localhost:5173
```

6. Open the backend API:

```text
http://localhost:8000/api
```

7. Open MailHog for local email testing:

```text
http://localhost:8025
```

The local Docker database is seeded from `docker/mysql/init/001-schema-seed.sql`. It uses representative test data and a local admin account. Do not import production SQL dumps into shared local environments unless they have been reviewed and sanitized.

Default local admin credentials:

```text
Username: admin
Password: admin
```

Change these with `LOCAL_ADMIN_USERNAME`, `LOCAL_ADMIN_PASSWORD`, and `LOCAL_ADMIN_EMAIL` before any shared deployment.

## Configuration Files

Primary configuration files:

- `.env`: environment-specific secrets, URLs, database settings, auth settings, and FOLIO settings
- `.env.example`: template for new environments
- `backend/config/institutions.yml`: institution, branch, location, deployment, and auth provider configuration
- `docker-compose.yml`: local development services
- `backend/config/folio.php`: maps environment variables into Yii's FOLIO integration config
- `backend/config/db.php`: maps environment variables into Yii database config

Do not commit real secrets, production passwords, API keys, or unsanitized production exports.

## Institution Setup

Edit `backend/config/institutions.yml` to define the institution framework.

You can also use the browser-based generator at:

```text
http://localhost:5173/setup-config
```

The generator is disabled unless `VITE_ENABLE_SETUP_CONFIG=true` is set. Enable it only while generating a configuration, then turn it off and restart or rebuild the frontend.

```env
VITE_ENABLE_SETUP_CONFIG=true
```

The generator creates copyable YAML and `.env` snippets. It does not write files on the server. Save the YAML output as `backend/config/institutions.yml`, place institution images in `public/images/`, copy any needed `.env` values into your environment, then set `VITE_ENABLE_SETUP_CONFIG=false`.

The packaged `backend/config/institutions.yml` is a neutral single-library starter. The previous Five Colleges configuration is kept as `backend/config/institutions.five-colleges.example.yml` for reference or for Five Colleges deployments.

### Single Library

Use this shape when one institution should be the only public catalog:

```yaml
appName: Library Equipment
deployment:
  type: single-library
  primaryInstitutionSlug: main-library
  homePage: redirect
requestAccess:
  affiliationPrompt: Library
  showAffiliationSelector: false
authProviders:
  - shibboleth
  - local
institutions:
  - slug: main-library
    code: LIB
    name: Main Library
    image: /images/library-logo.gif
    branchPrefixes:
      - LIB
    branches:
      - code: LIBMAIN
        name: Main Library
      - code: LIBMEDIA
        name: Media Services
    locations:
      - code: LIBEQ
        name: Equipment Desk
      - code: LIBMEDIA
        name: Media Equipment
    emailDomains:
      - example.edu
    defaults:
      libraryName: Main Library
      headerText: Equipment Checkout
      footerText: ""
```

With `homePage: redirect`, `/` sends users directly to `/school/main-library`.

### Multi-Library Consortium

Use this shape when the home page should let users choose among multiple institutions:

```yaml
appName: Library Equipment
deployment:
  type: multi-library
  primaryInstitutionSlug: library-a
  homePage: institution-picker
requestAccess:
  affiliationPrompt: Where are you from?
  showAffiliationSelector: true
authProviders:
  - shibboleth
  - local
institutions:
  - slug: library-a
    code: LIA
    name: Library A
    image: /images/library-a.gif
    branchPrefixes:
      - LIA
    branches:
      - code: LIAMAIN
        name: Library A Main
    locations:
      - code: LIAEQ
        name: Library A Equipment
    emailDomains:
      - library-a.edu
    defaults:
      libraryName: Library A
      headerText: Library A Equipment Checkout
      footerText: ""
  - slug: library-b
    code: LIB
    name: Library B
    image: /images/library-b.gif
    branchPrefixes:
      - LIB
    branches:
      - code: LIBMAIN
        name: Library B Main
    locations:
      - code: LIBEQ
        name: Library B Equipment
    emailDomains:
      - library-b.edu
    defaults:
      libraryName: Library B
      headerText: Library B Equipment Checkout
      footerText: ""
```

Field meanings:

- `appName`: product name shown in the browser title, home page, login copy, admin embed labels, and default page heading text
- `slug`: URL identifier used in `/school/{slug}` and `/admin/{slug}`
- `code`: local owner code stored with inventory records
- `name`: public display name
- `image`: image path served by the frontend, usually under `public/images`
- `branchPrefixes`: branch code prefixes used to filter public branch options
- `branches`: branch locations shown in public filters and admin assignment controls
- `locations`: FOLIO locations shown in admin FOLIO search controls
- `emailDomains`: domains used to infer affiliation for access requests
- `defaults`: initial public display text when database styling/layout values are absent

After changing `institutions.yml`, restart the backend in Docker:

```bash
docker compose up -d backend
```

### Allowed YAML Values

Top-level fields:

| Field | Required | Allowed values | Default |
| --- | --- | --- | --- |
| `appName` | No | Any display string | `Library Equipment` |
| `deployment.type` | No | `single-library`, `multi-library` | `single-library` when one institution is configured, otherwise `multi-library` |
| `deployment.primaryInstitutionSlug` | No | Any configured institution `slug` | First configured institution |
| `deployment.homePage` | No | `redirect`, `institution-picker` | `redirect` for `single-library`, `institution-picker` for `multi-library` |
| `requestAccess.affiliationPrompt` | No | Any display string | `Library` for `single-library`, `Where are you from?` for `multi-library` |
| `requestAccess.showAffiliationSelector` | No | `true`, `false` | `false` for `single-library`, `true` for `multi-library` |
| `authProviders` | No | `shibboleth`, `local` | `shibboleth`, `local` |

Institution fields:

| Field | Required | Example | Notes |
| --- | --- | --- | --- |
| `slug` | Yes | `main-library` | Lowercase URL-safe value is recommended. |
| `code` | Yes | `LIB` | Must match the owner code used in local inventory records. |
| `name` | Yes | `Main Library` | Public display name. |
| `image` | No | `/images/main-library.png` | Used on the multi-library home/dashboard cards. |
| `branchPrefixes` | No | `LIB` | Used to filter branch options on public pages. |
| `branches[].code` | No | `LIBMAIN` | Branch code users see in filters and admin assignment. |
| `branches[].name` | No | `Main Library` | Branch display name. |
| `locations[].code` | No | `LIBEQ` | FOLIO location code shown in admin FOLIO search controls. |
| `locations[].name` | No | `Equipment Desk` | FOLIO location display name. |
| `emailDomains[]` | No | `example.edu` | Used for access-request and Shibboleth institution resolution. |
| `defaults.libraryName` | No | `Main Library` | Default public page library name before admin styling data exists. |
| `defaults.headerText` | No | `Equipment Checkout` | Default public page heading before admin styling data exists. |
| `defaults.footerText` | No | `Contact us for help.` | Default footer text. |

### Institution Images

Institution dashboard images should be saved in:

```text
public/images/
```

Reference them in YAML from the public web root:

```yaml
image: /images/main-library.png
```

Recommended formats are `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, and `.svg`. Use images that are already sized and cropped appropriately for the dashboard cards; the setup generator will ask for the image path but will not upload image files.

These are different from item photos uploaded through the admin tools. Institution images are public frontend assets in `public/images/`; item photos are backend-managed uploads served by the Yii API from the backend image storage path.

## FOLIO And Availability Setup

Gadgets-to-Go has two separate integration paths:

- Real-time availability: Yii calls EBSCO Edge RTAC.
- Inventory search: Yii calls the FOLIO API/Okapi.

Configure these in `.env`:

```env
# Used only for FOLIO API/Okapi inventory search.
FOLIO_USERNAME=folio-service-user
FOLIO_PASSWORD=change-me
FOLIO_TENANT_ID=tenant-id
# okapi-token uses /authn/login and x-okapi-token.
# login-with-expiry uses /authn/login-with-expiry and the folioAccessToken cookie.
FOLIO_AUTH_MODE=okapi-token

# Used only for EBSCO Edge RTAC real-time availability.
FOLIO_API_KEY=edge-rtac-api-key

# EBSCO Edge RTAC base for real-time availability.
FOLIO_AVAILABILITY_BASE_URL=https://edge-example.folio.ebsco.com

# FOLIO API/Okapi base for inventory search.
FOLIO_INVENTORY_BASE_URL=https://api-example.folio.ebsco.com

FOLIO_RTAC_BASE_PATH=/prod/rtac/folioRTAC?mms_id=
```

The MMS ID is not configured in `.env`. The frontend sends the item identifier to `/api/inventory/get-folio?id=<mms_id>`, and the backend builds the RTAC URL as:

```text
FOLIO_AVAILABILITY_BASE_URL + FOLIO_RTAC_BASE_PATH + <mms_id> + "&apikey=" + FOLIO_API_KEY
```

Five Colleges deployments can still use this pattern, but it is an institution-specific example rather than a package default:

```env
FOLIO_AVAILABILITY_BASE_URL=https://edge-fivecolleges.folio.ebsco.com
FOLIO_INVENTORY_BASE_URL=https://api-fivecolleges.folio.ebsco.com
FOLIO_AUTH_MODE=login-with-expiry
```

Backward-compatible aliases are still accepted:

```env
FOLIO_BASE_URL=
FOLIO_OKAPI_URL=
```

New deployments should prefer the explicit `FOLIO_AVAILABILITY_BASE_URL` and `FOLIO_INVENTORY_BASE_URL` names.

More detail is available in `docs/folio-access.md`.

## Authentication Setup

Enabled auth providers are configured in `backend/config/institutions.yml` and may be overridden by the `AUTH_PROVIDERS` environment variable.

```env
AUTH_PROVIDERS=shibboleth,local
```

### Local Auth

Local auth is intended for development, testing, and institutions that need a simple admin pathway.

```env
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=replace-with-a-strong-password
LOCAL_ADMIN_EMAIL=admin@example.edu
```

The frontend posts to `/api/auth/local-login`, and the backend issues a JWT signed with `APP_SECRET_KEY`.

### Shibboleth

For Shibboleth deployments:

1. Place the Yii backend behind the institution's Shibboleth-protected web server path.
2. Set the frontend login URL:

```env
VITE_AUTH_URL=https://your-backend.example.edu/admin/authorize.php
```

3. Set public frontend and logout URLs:

```env
FRONTEND_BASE_URL=https://gadgets.example.edu
SHIBBOLETH_LOGOUT_URL=https://your-idp.example.edu/logout
```

4. Configure `APP_SECRET_KEY` to a strong random value shared by the backend scripts that issue and validate JWTs.

The Shibboleth authorization scripts are in `backend/admin/`. They read Shibboleth-provided server variables, map users to configured institutions, and redirect back to the frontend with a one-time authorization code.

The Shibboleth redirect uses a short-lived one-time authorization code. The frontend exchanges that code with `/api/auth/exchange-code` and stores the returned JWT locally. This keeps the JWT itself out of browser history and reverse-proxy URL logs.

Shibboleth attribute names are configurable. The package default uses `eppn` as a neutral persistent identifier, and each institution should set the server variable names released by its own IdP:

```env
SHIB_ID_ATTRIBUTE=eppn
SHIB_USERNAME_ATTRIBUTE=uid
SHIB_FIRST_NAME_ATTRIBUTE=givenName
SHIB_LAST_NAME_ATTRIBUTE=sn
SHIB_EMAIL_ATTRIBUTE=mail
```

Five Colleges deployments that release `fcIdNumber` can set `SHIB_ID_ATTRIBUTE=fcIdNumber`.

Institution resolution can use email domains from `institutions.yml`, or an explicit Shibboleth institution/campus attribute:

```env
SHIB_INSTITUTION_ATTRIBUTE=affiliation
SHIB_INSTITUTION_MAP=main:main-library,law:law-library
```

`SHIB_INSTITUTION_MAP` is a comma-separated list of `attribute-value:institution-slug` pairs. If the explicit attribute is absent or unmapped, the backend falls back to matching the configured `emailDomains`, then the primary institution.

## Environment Variables

Common variables:

```env
VITE_BASE_URL=/
VITE_API_BASE_URL=http://localhost:8000/api
VITE_AUTH_URL=http://localhost:8000/admin/authorize.php

APP_ENV=dev
YII_DEBUG=false
APP_SECRET_KEY=change-me-to-a-long-random-secret-at-least-32-bytes
APP_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUSTED_PROXIES=
SECURITY_FRAME_ANCESTORS=
REFERRER_POLICY=strict-origin-when-cross-origin
PERMISSIONS_POLICY=camera=(), microphone=(), geolocation=()
ENABLE_HSTS=false
FRONTEND_BASE_URL=http://localhost:5173

DB_DSN=mysql:host=db;dbname=gadgets_to_go
DB_USER=gadgets_to_go
DB_PASSWORD=gadgets_to_go
DB_CHARSET=utf8mb4

SMTP_DSN=
SMTP_SCHEME=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
MAIL_FROM=no-reply@example.edu
ACCESS_REQUEST_RECIPIENTS=admin@example.edu
MAX_UPLOAD_BYTES=5242880
```

Production values should use HTTPS origins, strong secrets, non-default database credentials, and institution-controlled SMTP settings. `SMTP_DSN` accepts Symfony Mailer DSNs such as `smtp://user:pass@smtp.example.edu:587`; when it is blank, the app uses `SMTP_SCHEME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, and `SMTP_PASSWORD`.

## Running Without Docker

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
composer install --working-dir=backend
```

Create a database and import either the sanitized seed schema or an institution-approved migration/export:

```bash
mysql -u <user> -p <database> < docker/mysql/init/001-schema-seed.sql
```

Create `.env` from `.env.example`, then set:

- `DB_DSN`
- `DB_USER`
- `DB_PASSWORD`
- `APP_SECRET_KEY`
- `APP_ALLOWED_ORIGINS`
- `FRONTEND_BASE_URL`
- `FOLIO_AVAILABILITY_BASE_URL`
- `FOLIO_INVENTORY_BASE_URL`
- auth provider settings

Start the frontend:

```bash
npm run dev
```

Serve the backend with Apache, Nginx, or PHP's built-in web server pointed at `backend/web`. A production deployment should use a real web server, HTTPS, and locked-down filesystem permissions.

## Development Commands

Frontend production build:

```bash
npm run build
```

Frontend lint:

```bash
npm run lint
```

Focused backend config test:

```bash
php -d register_argc_argv=On vendor/bin/codecept run unit components/AppConfigTest.php
```

Backend PHP syntax check:

```bash
find backend -path backend/vendor -prune -o -name '*.php' -print0 | xargs -0 -n1 php -l
```

Validate Docker Compose:

```bash
docker compose config
```

## Security And Production Hardening

Before production:

- Replace `APP_SECRET_KEY` with a long random secret.
- Replace local admin credentials or disable `local` auth if Shibboleth is required.
- Set `APP_ALLOWED_ORIGINS` to only the real frontend origins.
- Set `TRUSTED_PROXIES` to the comma-separated IPs of load balancers or reverse proxies that are allowed to supply `X-Forwarded-For`.
- Set `SECURITY_FRAME_ANCESTORS` to approved embedding origins if institutions use the embed feature, for example `'self' https://library.example.edu`.
- Set `ENABLE_HSTS=true` only after HTTPS is fully deployed for the backend origin.
- Use HTTPS for frontend, backend, Shibboleth, and FOLIO-facing environments.
- Keep `YII_DEBUG=false` outside isolated development environments.
- Keep FOLIO credentials and API keys out of Git.
- Use a restricted FOLIO service account with only the permissions required for inventory search.
- Store uploaded images outside writable application code paths when possible.
- Set `MAX_UPLOAD_BYTES` to the largest item image size your institution will accept.
- Review rate limits in `backend/components/SimpleRateLimiter.php` and tune them for expected traffic.
- Configure database backups, log retention, and monitoring.
- Run `npm audit` and `composer audit` regularly and schedule dependency upgrades.

The Docker seed is suitable for local testing only. Production deployments should use institution-managed database provisioning and sanitized migrations or imports.

## Troubleshooting

Check the public config API:

```bash
curl http://localhost:8000/api/config
```

Check seeded inventory:

```bash
curl "http://localhost:8000/api/inventory/location-data?owner=LIB"
```

Check Docker service status:

```bash
docker compose ps
```

Restart the backend after config changes:

```bash
docker compose up -d --build backend
```

Stop the stack:

```bash
docker compose down
```

Reset the local database volume:

```bash
docker compose down -v
docker compose up --build
```

Use `docker compose down -v` carefully. It deletes the local database volume.
