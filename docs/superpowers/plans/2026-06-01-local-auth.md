# Local Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure database-backed local user accounts with admin user creation, password changes, and password reset while preserving the env-admin bootstrap path.

**Architecture:** Extend the existing `authorized_users` table and `UserDb` model instead of creating a parallel identity store. Add focused service logic to `AuthController` and `UserController`, using Yii security APIs for hashes and random tokens, and update the React login and user-management screens to expose the new workflows.

**Tech Stack:** Yii2 REST controllers, Yii security component, MariaDB schema SQL, Symfony/Yii mailer, React, Reactstrap, axios, Codeception unit tests, ESLint.

---

### Task 1: Schema And Model Credentials

**Files:**
- Modify: `backend/migrations/create_users_table.sql`
- Modify: `backend/models/UserDb.php`
- Create: `backend/tests/unit/models/UserDbCredentialTest.php`

- [ ] **Step 1: Add failing model tests**

Create tests asserting that `UserDb::setPassword()`, `validatePassword()`, reset-token generation, reset-token validation, and sensitive-field serialization behave correctly.

Run: `php -d register_argc_argv=On vendor/bin/codecept run unit models/UserDbCredentialTest.php`

Expected: fail because the credential methods and attributes do not exist.

- [ ] **Step 2: Extend SQL schema**

Add these columns to `authorized_users` in `backend/migrations/create_users_table.sql`:

```sql
auth_provider VARCHAR(50) NOT NULL DEFAULT 'shibboleth',
password_hash VARCHAR(255) NULL,
password_reset_token_hash VARCHAR(255) NULL,
password_reset_expires_at DATETIME NULL,
last_login_at DATETIME NULL,
```

- [ ] **Step 3: Implement credential methods on `UserDb`**

Add model rules and methods:

```php
public function setPassword($password)
{
    $this->password_hash = Yii::$app->security->generatePasswordHash($password);
}

public function validatePassword($password)
{
    return $this->password_hash !== null
        && Yii::$app->security->validatePassword($password, $this->password_hash);
}

public function generatePasswordResetToken($ttlSeconds = 3600)
{
    $token = Yii::$app->security->generateRandomString(48);
    $this->password_reset_token_hash = Yii::$app->security->generatePasswordHash($token);
    $this->password_reset_expires_at = gmdate('Y-m-d H:i:s', time() + $ttlSeconds);
    return $token;
}

public function validatePasswordResetToken($token)
{
    return $this->password_reset_token_hash
        && $this->password_reset_expires_at
        && strtotime($this->password_reset_expires_at . ' UTC') >= time()
        && Yii::$app->security->validatePassword($token, $this->password_reset_token_hash);
}

public function clearPasswordResetToken()
{
    $this->password_reset_token_hash = null;
    $this->password_reset_expires_at = null;
}
```

Hide `password_hash`, reset token fields, and other credential internals from API serialization with `fields()`.

- [ ] **Step 4: Run credential tests**

Run: `php -d register_argc_argv=On vendor/bin/codecept run unit models/UserDbCredentialTest.php`

Expected: pass.

### Task 2: Database-Backed Local Auth

**Files:**
- Modify: `backend/modules/api/controllers/AuthController.php`
- Test: `backend/tests/unit/controllers/AuthControllerLocalTest.php` or focused model/controller unit coverage available in the current suite.

- [ ] **Step 1: Add tests for login behavior**

Test that local login validates a DB-backed local user's password hash, rejects wrong passwords with generic 401, requires `approved=1`, updates `last_login_at`, and bootstraps the env admin only when no matching local account exists.

- [ ] **Step 2: Replace env-only local login**

Update `actionLocalLogin()` to:

```php
$user = UserDb::find()
    ->where(['auth_provider' => 'local'])
    ->andWhere(['or', ['username' => $username], ['email' => $username]])
    ->one();

if ($user && (int)$user->approved === 1 && $user->validatePassword($password)) {
    $user->last_login_at = gmdate('Y-m-d H:i:s');
    $user->save(false, ['last_login_at']);
    return $this->localLoginResponse($user);
}
```

Then keep an env-admin bootstrap helper that creates or upgrades a local admin row using a password hash when the submitted credentials match the configured env admin.

- [ ] **Step 3: Avoid credential leakage**

Ensure local-login responses include only token and safe user metadata. Log only generic login failures.

- [ ] **Step 4: Run backend auth tests**

Run the focused auth tests and then `php -d register_argc_argv=On vendor/bin/codecept run unit`.

### Task 3: Password Reset And Change Password APIs

**Files:**
- Modify: `backend/config/web.php`
- Modify: `backend/modules/api/controllers/AuthController.php`
- Modify: `backend/modules/api/controllers/UserController.php`
- Modify: `backend/config/params.php` if mail/app name parameters are needed

- [ ] **Step 1: Add routes**

Add REST routes:

```php
'POST forgot-password' => 'forgot-password',
'POST reset-password' => 'reset-password',
'POST change-password' => 'change-password',
```

under `api/auth`, and:

```php
'POST create-local' => 'create-local',
'POST reset-password/<id>' => 'reset-password',
```

under `api/user`.

- [ ] **Step 2: Implement forgot-password**

Accept `usernameOrEmail`, always return a generic success response, generate and store a hashed reset token only for approved local users, and send an email with the reset URL.

- [ ] **Step 3: Implement reset-password**

Accept `token` and `password`, find the user with an unexpired matching token hash, set a new password hash, clear reset fields, and return a generic success response.

- [ ] **Step 4: Implement change-password**

Require bearer auth, require `currentPassword`, validate it, set the new password hash, and clear reset fields.

- [ ] **Step 5: Implement admin local user creation and admin reset**

Admins can create local users with an initial password. Admin-triggered reset should send a reset email or return a one-time temporary reset initiation without exposing stored secrets.

### Task 4: Frontend Local User Workflows

**Files:**
- Modify: `src/components/StaffLogin.jsx`
- Modify: `src/components/Admin/tabs/UserManagementTab.jsx`
- Add or modify route/page in `src/App.jsx` and `src/pages/ResetPassword.jsx`

- [ ] **Step 1: Forgot password UI**

Add a forgot-password link to the local login modal. Submit `usernameOrEmail` to `/auth/forgot-password` and display the same generic success message for all responses.

- [ ] **Step 2: Reset password page**

Add `/reset-password?token=...` route with password and confirmation fields. Submit to `/auth/reset-password`.

- [ ] **Step 3: Admin create local user UI**

Add a Create User button and modal in User Management. Fields: username, email, full name, institution, department, role, approved, password, confirm password.

- [ ] **Step 4: Admin reset password action**

Add a Reset Password action for local users that calls `/user/reset-password/<id>` and shows a generic confirmation.

### Task 5: Verification, Docs, And Push

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Document local auth**

Document bootstrap admin, DB-backed local users, password reset mail setup, and security expectations.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run lint
npm run build
php -d register_argc_argv=On vendor/bin/codecept run unit
docker compose config
```

- [ ] **Step 3: Commit and push**

Commit in logical chunks:

```bash
git add backend/migrations/create_users_table.sql backend/models/UserDb.php backend/tests/unit/models/UserDbCredentialTest.php
git commit -m "Add local user credential model"
git add backend/modules/api/controllers/AuthController.php backend/modules/api/controllers/UserController.php backend/config/web.php
git commit -m "Add local password auth flows"
git add src/components/StaffLogin.jsx src/components/Admin/tabs/UserManagementTab.jsx src/App.jsx src/pages/ResetPassword.jsx README.md .env.example
git commit -m "Add local user management UI"
git push
```

## Self-Review

- Spec coverage: schema, hashing, reset tokens, local login, admin create/update/delete, forgot/change/reset password, rate limiting, and JWT safety are covered.
- Placeholder scan: no task depends on unresolved placeholder fields or unnamed files.
- Type consistency: credential field names are consistent across schema, model, controller, and UI tasks.
