# V1 Hardening Design

## Goal

Make the first outside-library implementation smooth, secure, and easy to validate before distribution. The v1 release should give implementers clear setup feedback, remove obvious security smells, and document the production-readiness path without changing the current visual design.

## Scope

This work covers security and setup hardening needed before a v1 configurable distribution branch. It does not replace the current copy-and-paste setup generator with a full installer, and it does not redesign the admin interface.

Included:

- A backend setup health/preflight service.
- An authenticated admin-facing setup health view.
- Removal or neutralization of legacy Yii demo login artifacts.
- README updates aligned to the setup health checks.
- Clear treatment of the current low-severity Quill advisory.
- Verification guidance for cutting a distribution branch.

Deferred:

- A setup wizard that writes `.env` and `institutions.yml`.
- Full token revocation/session management.
- A full Content-Security-Policy rollout.
- Replacing the rich text editor solely to avoid the current low-severity dependency advisory.

## User Experience

The first implementer should be able to start Docker, configure the application, log in with the bootstrap admin, create a named system admin, disable the bootstrap admin, and see a clear setup health report in the admin area.

The setup health report should use the existing admin layout and styling. It should not introduce a new design language. It should show a small set of status groups:

- Local testing readiness
- Shared staging readiness
- Production readiness

Each check should return one of three severities:

- `pass`: the setting is acceptable.
- `warning`: the app can run, but the setting should be corrected before shared staging or production.
- `fail`: the setting is missing or unsafe enough that the relevant workflow is expected to break.

Each item should include:

- a human-readable label
- severity
- short explanation
- exact environment variable, YAML field, or file path to change

## Backend Preflight Service

Add a focused backend service responsible for setup health checks. The service should not make live network calls by default. It should inspect current runtime configuration, YAML configuration, and local filesystem paths only. Live FOLIO/RTAC connection tests can remain a future enhancement or a separate explicit action.

Checks:

- `APP_SECRET_KEY` exists and is not default-like.
- `APP_ALLOWED_ORIGINS` is configured and does not use wildcard origins.
- `LOCAL_ADMIN_ENABLED=false`, or bootstrap username/password are non-default and password is not `admin`.
- Local auth enabled implies password reset email settings are present enough to send mail.
- Auth providers are limited to supported values, currently `local` and `shibboleth`.
- Shibboleth enabled implies configured Shibboleth attribute names are present.
- FOLIO inventory search settings are either fully configured or clearly marked incomplete:
  - `FOLIO_INVENTORY_BASE_URL`
  - `FOLIO_TENANT_ID`
  - `FOLIO_USERNAME`
  - `FOLIO_PASSWORD`
- RTAC availability settings are either fully configured or clearly marked incomplete:
  - `FOLIO_AVAILABILITY_BASE_URL`
  - `FOLIO_RTAC_BASE_PATH`
  - `FOLIO_API_KEY`
- `institutions.yml` includes a valid `deployment.type`: `single-library` or `multi-library`.
- Single-library deployment includes a valid `primaryInstitutionSlug` that matches an institution.
- `deployment.homePage` is valid for the deployment type.
- Each institution includes required `slug`, `code`, and `name`.
- Institution image paths are present when using multiple institutions and resolve under the frontend public asset paths documented for implementers.

The service should return structured JSON suitable for frontend display:

```json
{
  "summary": {
    "status": "warning",
    "passes": 9,
    "warnings": 3,
    "failures": 1
  },
  "groups": [
    {
      "key": "production",
      "label": "Production readiness",
      "items": [
        {
          "key": "bootstrap-admin-disabled",
          "severity": "warning",
          "label": "Bootstrap admin is still enabled",
          "message": "Create a named system admin, then set LOCAL_ADMIN_ENABLED=false.",
          "field": "LOCAL_ADMIN_ENABLED"
        }
      ]
    }
  ]
}
```

## API Surface

Expose the preflight data through an authenticated admin endpoint. The endpoint should be available only to system admins.

Recommended route:

- `GET /api/settings/preflight`

If the existing settings controller is institution-scoped, the preflight endpoint should explicitly require a system admin because it reports deployment-wide configuration state.

The endpoint must not return secrets or secret-derived values. It should only report whether a secret exists and whether it appears default-like.

## Admin UI

Add a setup health section to the existing admin/settings area. Preserve the current design system and component conventions.

The UI should:

- Fetch `GET /api/settings/preflight`.
- Group items by readiness category.
- Use clear visual severity states that fit the existing Bootstrap styling.
- Avoid printing secret values.
- Give specific next actions, such as `Set FOLIO_INVENTORY_BASE_URL in .env`.
- Show a concise summary at the top.

The UI should not block admins from using the application. It is a readiness report, not a hard enforcement gate.

## Legacy Demo Auth Cleanup

The old Yii demo identity/login artifacts contain hardcoded `admin/admin` and `demo/demo` values. They appear inactive for the API-based admin workflows, but they are confusing and will trigger security-review concerns.

For v1, remove their credential-bearing behavior. The preferred outcome is to delete unused demo login code if no route depends on it. If Yii requires the classes to exist, replace them with inert implementations that cannot authenticate anyone and include a short comment explaining that local auth is handled by the API `authorized_users` table.

## Dependency Advisory Handling

The current frontend audit reports a low-severity Quill advisory through `react-quill-new`. The application mitigates persisted rich-text risk by sanitizing saved rich text through backend HTML purification.

For v1:

- Attempt a non-breaking dependency update only if lint, build, and rich text editing still pass.
- If no clean update is available, document the advisory and mitigation in the README production-readiness section.
- Do not make a risky editor replacement immediately before v1 solely for this low-severity issue.

## Documentation

Update README with a first-institution setup path:

1. Start Docker.
2. Generate or copy `institutions.yml`.
3. Configure `.env`.
4. Log in with the bootstrap admin.
5. Create a named system admin.
6. Set `LOCAL_ADMIN_ENABLED=false`.
7. Run or view setup health.
8. Test FOLIO inventory search.
9. Test RTAC availability.
10. Test local or Shibboleth auth.
11. Upload or place institution images.
12. Move to shared staging.

Add a production-readiness checklist that maps to the setup health checks. The README should make clear where institution images belong and that `.env` secrets must never be committed.

## Testing

Backend tests:

- Preflight passes with secure local test configuration.
- Default bootstrap admin produces a warning or failure.
- Missing `APP_SECRET_KEY` produces a failure.
- Wildcard CORS origin produces a failure.
- Incomplete FOLIO inventory settings produce an actionable warning/failure.
- Incomplete RTAC settings produce an actionable warning/failure.
- Invalid `deployment.type` produces a failure.
- Missing multi-campus image path produces a warning.
- Preflight endpoint rejects non-system-admin users.
- Preflight endpoint does not expose secret values.

Frontend verification:

- Lint passes.
- Build passes.
- Setup health view renders grouped pass/warning/fail items.
- No secret values appear in the rendered output.

Full verification before cutting the distribution branch:

- `npm run lint`
- `npm run build`
- `php -d register_argc_argv=On vendor/bin/codecept run unit`
- `composer audit --working-dir=backend`
- `npm audit --audit-level=moderate`
- `docker compose config`

## Distribution Branch

Continue implementation on `package-config-hardening`. After these hardening tasks pass verification, create `distribution/v1-configurable` from the verified commit. That branch should be the first branch given to the interested library for implementation testing.

