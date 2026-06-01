# Local Authentication Design

## Goal

Make local authentication a full database-backed user system for institutions that do not use Shibboleth, while preserving the existing environment-configured admin as a first-run bootstrap path.

## Current State

The current local login flow accepts only `LOCAL_ADMIN_USERNAME` and `LOCAL_ADMIN_PASSWORD` from environment variables. It creates or reuses an `authorized_users` row for profile metadata, but no per-user password is stored. Existing user management can approve, edit, and delete authorized users, but it cannot create local credentials, change passwords, or reset forgotten passwords.

## Data Model

Extend `authorized_users` with local-auth credential fields:

- `auth_provider`: `local` or `shibboleth`, defaulting to `shibboleth` for existing rows.
- `password_hash`: Yii-generated password hash for local users.
- `password_reset_token_hash`: hash of a single-use password reset token.
- `password_reset_expires_at`: reset token expiry timestamp.
- `last_login_at`: timestamp of the last successful local login.

Plaintext passwords, reset tokens, and JWTs must never be stored in the database or written to logs.

## Backend Behavior

Local login should first look up an approved `authorized_users` row by username or email with `auth_provider=local`, then validate the submitted password with `Yii::$app->security->validatePassword()`. If no database-backed local users exist and the submitted credentials match `LOCAL_ADMIN_USERNAME` and `LOCAL_ADMIN_PASSWORD`, the backend should bootstrap that admin row using `Yii::$app->security->generatePasswordHash()` and continue issuing the normal JWT.

Admin user management should support create, update, approve, reject, and delete. Admins may create local users with an initial password and may trigger a password reset for a local user. Non-system admins remain scoped to their institution.

Password reset should be token-based. The forgot-password endpoint returns a generic success response whether or not the account exists, hashes the reset token before storage, expires it quickly, and emails the raw token only once. The reset endpoint validates the token hash and expiry before setting a new password hash and clearing reset fields.

Logged-in local users should be able to change their own password by providing their current password.

## Frontend Behavior

The local login modal remains on the staff login screen. User Management gains:

- Create local user modal.
- Optional password fields for local users.
- Admin-triggered reset password action for local users.

Add a forgot-password link to the local login area and a reset-password page that accepts the emailed token.

## Security Requirements

- Use Yii security APIs for password hashing, password validation, random token generation, and token hash comparison.
- Rate-limit login, forgot-password, reset-password, and change-password endpoints.
- Return generic login and reset messages to avoid account enumeration.
- Do not expose `password_hash`, reset token fields, or JWTs in user API responses.
- Keep JWT expiry short and do not log JWTs.
- Require admin authorization for user creation, admin updates, and admin reset actions.
- Require current password for self-service password changes.

## Testing

Add backend unit tests for password hashing, validation, bootstrap admin creation, reset token hashing, reset token expiry, and API response serialization. Add frontend lint/build coverage for the new user management and reset-password UI. Use focused backend tests before full test runs.
