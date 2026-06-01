# V1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the v1 setup/security hardening needed for a smooth first outside-library implementation.

**Architecture:** Add a backend `SetupPreflight` component that inspects runtime env, public config, YAML-derived config, and local asset paths without returning secrets. Expose it through a system-admin-only settings endpoint, render the results in the existing admin UI, neutralize legacy demo auth, and update documentation to match the checks.

**Tech Stack:** Yii2/PHP backend, Codeception unit tests, React/Vite frontend, Reactstrap/Bootstrap UI, existing admin layout.

---

## File Structure

- Create `backend/components/SetupPreflight.php`: single-purpose setup health checker.
- Create `backend/tests/unit/components/SetupPreflightTest.php`: focused unit coverage for preflight results and secret redaction.
- Modify `backend/modules/api/controllers/SettingsController.php`: add `actionPreflight()` and system-admin authorization.
- Modify `backend/config/web.php`: add `GET preflight` route for `api/settings`.
- Modify `backend/models/User.php`: remove hardcoded demo users and make legacy identity inert.
- Modify `backend/models/LoginForm.php`: make legacy form unable to authenticate and point maintainers to API local auth.
- Modify `src/components/Admin/AdminSidebar.jsx`: add Setup Health navigation item.
- Modify `src/pages/AdminPage.jsx`: render the setup health tab and title.
- Create `src/components/Admin/tabs/SetupHealthTab.jsx`: fetch and display preflight groups.
- Modify `README.md`: add first-institution setup and production readiness mapping.

---

### Task 1: Backend Preflight Component

**Files:**
- Create: `backend/components/SetupPreflight.php`
- Test: `backend/tests/unit/components/SetupPreflightTest.php`

- [ ] **Step 1: Write failing tests for preflight checks**

Create `backend/tests/unit/components/SetupPreflightTest.php`:

```php
<?php

namespace tests\unit\components;

use backend\components\AppConfig;
use backend\components\SetupPreflight;
use Codeception\Test\Unit;

class SetupPreflightTest extends Unit
{
    private $originalEnv = [];

    protected function _before()
    {
        foreach ($this->envKeys() as $key) {
            $this->originalEnv[$key] = getenv($key);
            putenv($key);
        }
    }

    protected function _after()
    {
        foreach ($this->envKeys() as $key) {
            if ($this->originalEnv[$key] === false) {
                putenv($key);
            } else {
                putenv($key . '=' . $this->originalEnv[$key]);
            }
        }
    }

    public function testSecureLocalConfigurationPassesCriticalChecks()
    {
        $this->setSecureEnv();
        $result = $this->checker()->run();

        $this->assertSame('pass', $this->findItem($result, 'app-secret')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'cors-origins')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'bootstrap-admin')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'folio-inventory')['severity']);
        $this->assertSame('pass', $this->findItem($result, 'rtac-availability')['severity']);
    }

    public function testDefaultBootstrapAdminProducesWarning()
    {
        $this->setSecureEnv();
        putenv('LOCAL_ADMIN_ENABLED=true');
        putenv('LOCAL_ADMIN_USERNAME=admin');
        putenv('LOCAL_ADMIN_PASSWORD=admin');

        $item = $this->findItem($this->checker()->run(), 'bootstrap-admin');

        $this->assertSame('warning', $item['severity']);
        $this->assertStringContainsString('LOCAL_ADMIN_ENABLED=false', $item['message']);
    }

    public function testMissingAppSecretProducesFailure()
    {
        $this->setSecureEnv();
        putenv('APP_SECRET_KEY=change-me-in-production-use-at-least-32-bytes');

        $this->assertSame('fail', $this->findItem($this->checker()->run(), 'app-secret')['severity']);
    }

    public function testWildcardCorsProducesFailure()
    {
        $this->setSecureEnv();
        putenv('APP_ALLOWED_ORIGINS=*');

        $this->assertSame('fail', $this->findItem($this->checker()->run(), 'cors-origins')['severity']);
    }

    public function testIncompleteFolioSettingsAreActionable()
    {
        $this->setSecureEnv();
        putenv('FOLIO_PASSWORD');

        $item = $this->findItem($this->checker()->run(), 'folio-inventory');

        $this->assertSame('fail', $item['severity']);
        $this->assertSame('FOLIO_INVENTORY_BASE_URL,FOLIO_TENANT_ID,FOLIO_USERNAME,FOLIO_PASSWORD', $item['field']);
        $this->assertStringContainsString('FOLIO_PASSWORD', $item['message']);
    }

    public function testSecretValuesAreNeverReturned()
    {
        $this->setSecureEnv();
        $encoded = json_encode($this->checker()->run());

        $this->assertStringNotContainsString('StrongPassword123!', $encoded);
        $this->assertStringNotContainsString('folio-secret', $encoded);
        $this->assertStringNotContainsString('rtac-secret', $encoded);
        $this->assertStringNotContainsString('super-secret-key', $encoded);
    }

    private function checker()
    {
        return new SetupPreflight(new AppConfig(__DIR__ . '/../../_data/institutions-test.yml'), dirname(__DIR__, 3));
    }

    private function setSecureEnv()
    {
        putenv('APP_SECRET_KEY=super-secret-key-with-more-than-32-bytes');
        putenv('APP_ALLOWED_ORIGINS=https://gadgets.example.edu');
        putenv('LOCAL_ADMIN_ENABLED=false');
        putenv('LOCAL_ADMIN_USERNAME=admin');
        putenv('LOCAL_ADMIN_PASSWORD=StrongPassword123!');
        putenv('AUTH_PROVIDERS=local,shibboleth');
        putenv('SHIB_ID_ATTRIBUTE=eppn');
        putenv('SHIB_USERNAME_ATTRIBUTE=uid');
        putenv('SHIB_FIRST_NAME_ATTRIBUTE=givenName');
        putenv('SHIB_LAST_NAME_ATTRIBUTE=sn');
        putenv('SHIB_EMAIL_ATTRIBUTE=mail');
        putenv('FOLIO_INVENTORY_BASE_URL=https://api-example.folio.ebsco.com');
        putenv('FOLIO_TENANT_ID=tenant');
        putenv('FOLIO_USERNAME=folio-user');
        putenv('FOLIO_PASSWORD=folio-secret');
        putenv('FOLIO_AVAILABILITY_BASE_URL=https://edge-example.folio.ebsco.com');
        putenv('FOLIO_RTAC_BASE_PATH=/prod/rtac/folioRTAC?mms_id=');
        putenv('FOLIO_API_KEY=rtac-secret');
        putenv('FRONTEND_BASE_URL=https://gadgets.example.edu');
        putenv('SMTP_HOST=smtp.example.edu');
        putenv('MAIL_FROM=no-reply@example.edu');
    }

    private function findItem(array $result, $key)
    {
        foreach ($result['groups'] as $group) {
            foreach ($group['items'] as $item) {
                if ($item['key'] === $key) {
                    return $item;
                }
            }
        }

        $this->fail('Missing preflight item: ' . $key);
    }

    private function envKeys()
    {
        return [
            'APP_SECRET_KEY',
            'APP_ALLOWED_ORIGINS',
            'LOCAL_ADMIN_ENABLED',
            'LOCAL_ADMIN_USERNAME',
            'LOCAL_ADMIN_PASSWORD',
            'AUTH_PROVIDERS',
            'SHIB_ID_ATTRIBUTE',
            'SHIB_USERNAME_ATTRIBUTE',
            'SHIB_FIRST_NAME_ATTRIBUTE',
            'SHIB_LAST_NAME_ATTRIBUTE',
            'SHIB_EMAIL_ATTRIBUTE',
            'FOLIO_INVENTORY_BASE_URL',
            'FOLIO_TENANT_ID',
            'FOLIO_USERNAME',
            'FOLIO_PASSWORD',
            'FOLIO_AVAILABILITY_BASE_URL',
            'FOLIO_RTAC_BASE_PATH',
            'FOLIO_API_KEY',
            'FRONTEND_BASE_URL',
            'SMTP_DSN',
            'SMTP_HOST',
            'MAIL_FROM',
        ];
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit components/SetupPreflightTest.php
```

Expected: FAIL because `backend\components\SetupPreflight` does not exist.

- [ ] **Step 3: Implement `SetupPreflight`**

Create `backend/components/SetupPreflight.php`:

```php
<?php

namespace backend\components;

class SetupPreflight
{
    private $appConfig;
    private $projectRoot;

    public function __construct(AppConfig $appConfig, $projectRoot = null)
    {
        $this->appConfig = $appConfig;
        $this->projectRoot = $projectRoot ?: dirname(__DIR__, 2);
    }

    public function run()
    {
        $groups = [
            [
                'key' => 'local-testing',
                'label' => 'Local testing readiness',
                'items' => [
                    $this->checkAppSecret(),
                    $this->checkAuthProviders(),
                    $this->checkInstitutionConfig(),
                ],
            ],
            [
                'key' => 'shared-staging',
                'label' => 'Shared staging readiness',
                'items' => [
                    $this->checkCorsOrigins(),
                    $this->checkBootstrapAdmin(),
                    $this->checkMailSettings(),
                    $this->checkInstitutionImages(),
                ],
            ],
            [
                'key' => 'production',
                'label' => 'Production readiness',
                'items' => [
                    $this->checkFolioInventory(),
                    $this->checkRtacAvailability(),
                    $this->checkShibbolethSettings(),
                ],
            ],
        ];

        return [
            'summary' => $this->summary($groups),
            'groups' => $groups,
        ];
    }

    private function checkAppSecret()
    {
        $secret = AppConfig::env('APP_SECRET_KEY', '');
        if ($secret === '' || $secret === 'change-me-in-production-use-at-least-32-bytes' || strlen($secret) < 32) {
            return $this->item('app-secret', 'fail', 'Application secret', 'Set APP_SECRET_KEY to a unique random value with at least 32 characters.', 'APP_SECRET_KEY');
        }

        return $this->item('app-secret', 'pass', 'Application secret', 'APP_SECRET_KEY is configured.', 'APP_SECRET_KEY');
    }

    private function checkCorsOrigins()
    {
        $origins = $this->appConfig->allowedOrigins();
        if (!$origins || in_array('*', $origins, true)) {
            return $this->item('cors-origins', 'fail', 'Allowed frontend origins', 'Set APP_ALLOWED_ORIGINS to the exact frontend URL. Wildcard origins are not safe for shared deployments.', 'APP_ALLOWED_ORIGINS');
        }

        return $this->item('cors-origins', 'pass', 'Allowed frontend origins', 'APP_ALLOWED_ORIGINS is restricted to explicit origins.', 'APP_ALLOWED_ORIGINS');
    }

    private function checkBootstrapAdmin()
    {
        $enabled = \app\models\UserDb::localBootstrapEnabled(AppConfig::env('LOCAL_ADMIN_ENABLED', 'true'));
        $username = AppConfig::env('LOCAL_ADMIN_USERNAME', '');
        $password = AppConfig::env('LOCAL_ADMIN_PASSWORD', '');
        if ($enabled && ($username === 'admin' || $password === 'admin' || $password === '')) {
            return $this->item('bootstrap-admin', 'warning', 'Bootstrap admin', 'Create a named system admin, then set LOCAL_ADMIN_ENABLED=false. Do not share an environment with admin/admin enabled.', 'LOCAL_ADMIN_ENABLED');
        }
        if ($enabled) {
            return $this->item('bootstrap-admin', 'warning', 'Bootstrap admin', 'Bootstrap admin is still enabled. Disable it with LOCAL_ADMIN_ENABLED=false after creating a named system admin.', 'LOCAL_ADMIN_ENABLED');
        }

        return $this->item('bootstrap-admin', 'pass', 'Bootstrap admin', 'Bootstrap admin is disabled.', 'LOCAL_ADMIN_ENABLED');
    }

    private function checkAuthProviders()
    {
        $providers = $this->appConfig->authProviders();
        $unsupported = array_values(array_diff($providers, ['local', 'shibboleth']));
        if (!$providers || $unsupported) {
            return $this->item('auth-providers', 'fail', 'Authentication providers', 'Configure authProviders with supported values: local and/or shibboleth.', 'authProviders');
        }

        return $this->item('auth-providers', 'pass', 'Authentication providers', 'Configured auth providers are supported.', 'authProviders');
    }

    private function checkMailSettings()
    {
        if (!in_array('local', $this->appConfig->authProviders(), true)) {
            return $this->item('mail-settings', 'pass', 'Password reset email', 'Local auth is disabled, so password reset email is not required.', 'SMTP_HOST');
        }

        $hasDsn = AppConfig::env('SMTP_DSN', '') !== '';
        $hasHost = AppConfig::env('SMTP_HOST', '') !== '';
        $hasFrom = AppConfig::env('MAIL_FROM', '') !== '';
        if (!$hasDsn && (!$hasHost || !$hasFrom)) {
            return $this->item('mail-settings', 'warning', 'Password reset email', 'Configure SMTP_DSN or SMTP_HOST and MAIL_FROM so local password reset emails can be sent.', 'SMTP_DSN,SMTP_HOST,MAIL_FROM');
        }

        return $this->item('mail-settings', 'pass', 'Password reset email', 'Mail settings are present for local password resets.', 'SMTP_DSN,SMTP_HOST,MAIL_FROM');
    }

    private function checkFolioInventory()
    {
        return $this->requiredEnvItem('folio-inventory', 'FOLIO inventory search', [
            'FOLIO_INVENTORY_BASE_URL',
            'FOLIO_TENANT_ID',
            'FOLIO_USERNAME',
            'FOLIO_PASSWORD',
        ]);
    }

    private function checkRtacAvailability()
    {
        return $this->requiredEnvItem('rtac-availability', 'RTAC availability', [
            'FOLIO_AVAILABILITY_BASE_URL',
            'FOLIO_RTAC_BASE_PATH',
            'FOLIO_API_KEY',
        ]);
    }

    private function checkShibbolethSettings()
    {
        if (!in_array('shibboleth', $this->appConfig->authProviders(), true)) {
            return $this->item('shibboleth-settings', 'pass', 'Shibboleth attributes', 'Shibboleth auth is disabled.', 'authProviders');
        }

        return $this->requiredEnvItem('shibboleth-settings', 'Shibboleth attributes', [
            'SHIB_ID_ATTRIBUTE',
            'SHIB_USERNAME_ATTRIBUTE',
            'SHIB_FIRST_NAME_ATTRIBUTE',
            'SHIB_LAST_NAME_ATTRIBUTE',
            'SHIB_EMAIL_ATTRIBUTE',
        ], 'warning');
    }

    private function checkInstitutionConfig()
    {
        try {
            $public = $this->appConfig->publicConfig();
        } catch (\Throwable $e) {
            return $this->item('institution-config', 'fail', 'Institution configuration', 'Fix backend/config/institutions.yml: ' . $e->getMessage(), 'backend/config/institutions.yml');
        }

        $deployment = $public['deployment'];
        if (!in_array($deployment['type'], ['single-library', 'multi-library'], true)) {
            return $this->item('institution-config', 'fail', 'Institution configuration', 'deployment.type must be single-library or multi-library.', 'deployment.type');
        }

        $slugs = array_column($public['institutions'], 'slug');
        if ($deployment['type'] === 'single-library' && !in_array($deployment['primaryInstitutionSlug'], $slugs, true)) {
            return $this->item('institution-config', 'fail', 'Institution configuration', 'deployment.primaryInstitutionSlug must match one configured institution slug.', 'deployment.primaryInstitutionSlug');
        }

        if (!in_array($deployment['homePage'], ['redirect', 'institution-picker'], true)) {
            return $this->item('institution-config', 'fail', 'Institution configuration', 'deployment.homePage must be redirect or institution-picker.', 'deployment.homePage');
        }

        return $this->item('institution-config', 'pass', 'Institution configuration', 'institutions.yml has valid deployment settings.', 'backend/config/institutions.yml');
    }

    private function checkInstitutionImages()
    {
        $public = $this->appConfig->publicConfig();
        if (($public['deployment']['type'] ?? '') !== 'multi-library') {
            return $this->item('institution-images', 'pass', 'Institution images', 'Single-library deployments do not require institution picker images.', 'institutions[].image');
        }

        foreach ($public['institutions'] as $institution) {
            if (empty($institution['image'])) {
                return $this->item('institution-images', 'warning', 'Institution images', 'Add image paths for every institution. Store frontend images in public/images and reference them as /images/name.png.', 'institutions[].image');
            }
            if (!$this->publicImageExists($institution['image'])) {
                return $this->item('institution-images', 'warning', 'Institution images', 'Institution image paths should resolve under public/images. Store images in public/images and reference them as /images/name.png.', 'institutions[].image');
            }
        }

        return $this->item('institution-images', 'pass', 'Institution images', 'Institution image paths are configured.', 'institutions[].image');
    }

    private function requiredEnvItem($key, $label, array $fields, $missingSeverity = 'fail')
    {
        $missing = [];
        foreach ($fields as $field) {
            if (AppConfig::env($field, '') === '') {
                $missing[] = $field;
            }
        }

        if ($missing) {
            return $this->item($key, $missingSeverity, $label, 'Missing required setting(s): ' . implode(', ', $missing) . '.', implode(',', $fields));
        }

        return $this->item($key, 'pass', $label, $label . ' settings are present.', implode(',', $fields));
    }

    private function publicImageExists($imagePath)
    {
        if (strpos($imagePath, '/images/') !== 0) {
            return false;
        }

        return is_file($this->projectRoot . '/public' . $imagePath);
    }

    private function item($key, $severity, $label, $message, $field)
    {
        return compact('key', 'severity', 'label', 'message', 'field');
    }

    private function summary(array $groups)
    {
        $passes = 0;
        $warnings = 0;
        $failures = 0;
        foreach ($groups as $group) {
            foreach ($group['items'] as $item) {
                if ($item['severity'] === 'pass') {
                    $passes++;
                } elseif ($item['severity'] === 'warning') {
                    $warnings++;
                } else {
                    $failures++;
                }
            }
        }

        return [
            'status' => $failures > 0 ? 'fail' : ($warnings > 0 ? 'warning' : 'pass'),
            'passes' => $passes,
            'warnings' => $warnings,
            'failures' => $failures,
        ];
    }
}
```

- [ ] **Step 4: Run preflight unit tests**

Run:

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit components/SetupPreflightTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/components/SetupPreflight.php backend/tests/unit/components/SetupPreflightTest.php
git commit -m "Add setup preflight checks"
```

---

### Task 2: Preflight API Endpoint

**Files:**
- Modify: `backend/modules/api/controllers/SettingsController.php`
- Modify: `backend/config/web.php`
- Test: add endpoint authorization tests if an API test harness exists; otherwise cover authorization helper with unit-level method extraction.

- [ ] **Step 1: Add failing route expectation by running current endpoint**

Run:

```bash
curl -i http://localhost:8000/api/settings/preflight
```

Expected before implementation: 404 or route-not-found.

- [ ] **Step 2: Implement system-admin-only endpoint**

In `backend/modules/api/controllers/SettingsController.php`, add:

```php
use backend\components\SetupPreflight;
use yii\web\ForbiddenHttpException;
```

Then add the action and helper:

```php
public function actionPreflight()
{
    Yii::$app->response->format = Response::FORMAT_JSON;
    $this->requireSystemAdmin();

    $checker = new SetupPreflight(Yii::$app->params['appConfig']);
    return $checker->run();
}

private function requireSystemAdmin()
{
    $identity = Yii::$app->user->identity;
    if ($identity === null || !isset($identity->role) || $identity->role !== 'system-admin') {
        throw new ForbiddenHttpException('System administrator access is required.');
    }
}
```

Update `behaviors()` access list:

```php
'only' => ['save-disabled-items', 'preflight'],
```

and add `preflight` to the authenticated rules.

- [ ] **Step 3: Add URL rule**

In `backend/config/web.php`, update the `api/settings` `extraPatterns`:

```php
'GET preflight' => 'preflight',
```

- [ ] **Step 4: Verify endpoint behavior manually**

Run without token:

```bash
curl -i http://localhost:8000/api/settings/preflight
```

Expected: 401 Unauthorized.

Run with a system-admin token from local login:

```bash
curl -i -H "Authorization: Bearer TOKEN_FROM_LOCAL_LOGIN" http://localhost:8000/api/settings/preflight
```

Expected: 200 JSON with `summary` and `groups`, no secret values.

- [ ] **Step 5: Run backend unit suite**

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/modules/api/controllers/SettingsController.php backend/config/web.php
git commit -m "Expose setup preflight endpoint"
```

---

### Task 3: Admin Setup Health UI

**Files:**
- Create: `src/components/Admin/tabs/SetupHealthTab.jsx`
- Modify: `src/components/Admin/AdminSidebar.jsx`
- Modify: `src/pages/AdminPage.jsx`

- [ ] **Step 1: Create setup health tab component**

Create `src/components/Admin/tabs/SetupHealthTab.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Alert, Badge, Spinner } from 'reactstrap';

const severityColor = {
  pass: 'success',
  warning: 'warning',
  fail: 'danger',
};

const severityLabel = {
  pass: 'Pass',
  warning: 'Warning',
  fail: 'Fail',
};

function SetupHealthTab({ baseUrl, token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    axios
      .get(`${baseUrl}/settings/preflight`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (!cancelled) {
          setReport(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load setup health. System administrator access is required.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  const summaryColor = useMemo(() => severityColor[report?.summary?.status] || 'secondary', [report]);

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner size="sm" />
        <span>Loading setup health...</span>
      </div>
    );
  }

  if (error) {
    return <Alert color="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="h5 mb-1">Setup Health</h2>
          <p className="text-muted mb-0">Review configuration items before sharing this deployment.</p>
        </div>
        <Badge color={summaryColor} pill>
          {report.summary.failures} failed / {report.summary.warnings} warnings / {report.summary.passes} passed
        </Badge>
      </div>

      {(report.groups || []).map((group) => (
        <section className="mb-4" key={group.key}>
          <h3 className="h6 text-uppercase text-muted">{group.label}</h3>
          <div className="list-group">
            {(group.items || []).map((item) => (
              <div className="list-group-item" key={item.key}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">{item.label}</div>
                    <div className="text-muted small">{item.message}</div>
                    <code className="small">{item.field}</code>
                  </div>
                  <Badge color={severityColor[item.severity] || 'secondary'}>
                    {severityLabel[item.severity] || item.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

SetupHealthTab.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  token: PropTypes.string,
};

export default SetupHealthTab;
```

- [ ] **Step 2: Add Setup Health to sidebar**

In `src/components/Admin/AdminSidebar.jsx`, add:

```jsx
{ id: 'setup', label: 'Setup Health', icon: '✓' },
```

to `menuItems`.

- [ ] **Step 3: Render Setup Health in AdminPage**

In `src/pages/AdminPage.jsx`, import:

```jsx
import SetupHealthTab from '../components/Admin/tabs/SetupHealthTab';
```

Add title mapping:

```jsx
{activeTab === 'setup' && 'Setup Health'}
```

Add tab render block:

```jsx
{activeTab === 'setup' && (
  <div className="admin-card">
    <SetupHealthTab baseUrl={baseUrl} token={token} />
  </div>
)}
```

- [ ] **Step 4: Run frontend checks**

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Admin/tabs/SetupHealthTab.jsx src/components/Admin/AdminSidebar.jsx src/pages/AdminPage.jsx
git commit -m "Add admin setup health view"
```

---

### Task 4: Neutralize Legacy Demo Auth

**Files:**
- Modify: `backend/models/User.php`
- Modify: `backend/models/LoginForm.php`
- Test: `backend/tests/unit/models/UserTest.php`, `backend/tests/unit/models/LoginFormTest.php`

- [ ] **Step 1: Update tests to assert demo auth is inert**

In `backend/tests/unit/models/UserTest.php`, add:

```php
public function testLegacyDemoUserCannotAuthenticate()
{
    $this->assertNull(\app\models\User::findByUsername('admin'));
    $this->assertNull(\app\models\User::findIdentityByAccessToken('100-token'));
}
```

In `backend/tests/unit/models/LoginFormTest.php`, update the successful admin login expectation to assert no legacy form login succeeds:

```php
public function testLegacyLoginFormDoesNotAuthenticateDemoUsers()
{
    $model = new \app\models\LoginForm([
        'username' => 'admin',
        'password' => 'admin',
    ]);

    $this->assertFalse($model->login());
}
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit models/UserTest.php models/LoginFormTest.php
```

Expected: FAIL until demo credentials are removed.

- [ ] **Step 3: Replace legacy User with inert identity**

In `backend/models/User.php`, remove the static demo users and implement:

```php
private static $users = [];
```

Keep the IdentityInterface methods but ensure:

```php
public static function findIdentity($id)
{
    return null;
}

public static function findIdentityByAccessToken($token, $type = null)
{
    Yii::warning('Legacy User identity was called; API auth uses backend\\components\\ShibbolethUser.', __METHOD__);
    return null;
}

public static function findByUsername($username)
{
    return null;
}

public function validatePassword($password)
{
    return false;
}
```

- [ ] **Step 4: Make LoginForm inert**

In `backend/models/LoginForm.php`, keep validation structure for compatibility but ensure `login()` always returns false after validation:

```php
public function login()
{
    return false;
}
```

Add a short class comment:

```php
/**
 * Legacy Yii form model retained for framework compatibility.
 * Local staff authentication is handled by api/auth/local-login and UserDb.
 */
```

- [ ] **Step 5: Run focused tests**

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit models/UserTest.php models/LoginFormTest.php
```

Expected: PASS.

- [ ] **Step 6: Run backend unit suite**

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/models/User.php backend/models/LoginForm.php backend/tests/unit/models/UserTest.php backend/tests/unit/models/LoginFormTest.php
git commit -m "Neutralize legacy demo authentication"
```

---

### Task 5: README Production Readiness Updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add first-institution setup path**

In `README.md`, add a section after local Docker setup:

```markdown
## First Institution Setup Path

1. Start Docker with `docker compose up --build`.
2. Open `/setup-config` only while generating configuration snippets.
3. Save institution YAML to `backend/config/institutions.yml`.
4. Save runtime secrets and service URLs to `.env`; never commit this file.
5. Log in with the bootstrap local admin.
6. Create a named local system administrator.
7. Set `LOCAL_ADMIN_ENABLED=false` and restart the backend.
8. Open Admin > Setup Health and resolve failures.
9. Test FOLIO inventory search.
10. Test RTAC availability.
11. Test local auth or Shibboleth.
12. Place institution images in `public/images` and reference them as `/images/name.png`.
13. Move to shared staging only after Setup Health has no failures.
```

- [ ] **Step 2: Add setup health checklist**

In the production hardening section, add:

```markdown
### Setup Health

System administrators can review deployment readiness in Admin > Setup Health. The report checks application secrets, CORS origins, bootstrap admin state, mail settings, auth providers, FOLIO inventory configuration, RTAC availability configuration, Shibboleth attributes, institution YAML, and institution image paths. The report never displays secret values.
```

- [ ] **Step 3: Add Quill advisory note**

In the security section, add:

```markdown
### Known Frontend Advisory

`npm audit` currently reports a low-severity advisory for Quill through `react-quill-new`. Saved rich text is sanitized by the Yii backend with HTML Purifier before persistence. Treat this as a tracked dependency update: apply a non-breaking update when one is available and re-run lint/build before distribution.
```

- [ ] **Step 4: Commit docs**

```bash
git add README.md
git commit -m "Document v1 setup health workflow"
```

---

### Task 6: Verification and Distribution Branch

**Files:**
- No code files unless verification reveals a defect.

- [ ] **Step 1: Run backend unit tests**

```bash
cd backend
php -d register_argc_argv=On vendor/bin/codecept run unit
```

Expected: PASS.

- [ ] **Step 2: Run frontend lint and build**

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run backend security audit**

```bash
composer audit --working-dir=backend
```

Expected: no backend advisories.

- [ ] **Step 4: Run frontend security audit**

```bash
npm audit --audit-level=moderate
```

Expected: either no advisories after a safe update, or the known low-severity Quill advisory documented in README.

- [ ] **Step 5: Validate Docker config**

```bash
docker compose config
```

Expected: config renders successfully.

- [ ] **Step 6: Confirm git status is clean**

```bash
git status --short
```

Expected: no output.

- [ ] **Step 7: Create distribution branch after user approval**

```bash
git checkout -b distribution/v1-configurable
git push -u origin distribution/v1-configurable
```

Expected: branch is available for the interested library to test.
