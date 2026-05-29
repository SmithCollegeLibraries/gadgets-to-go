# Local Docker Setup

This setup runs the React frontend, Yii2 backend, MariaDB, and MailHog with sanitized seed data.

1. Copy `.env.example` to `.env` and replace secrets before any shared environment.
2. Start the stack:

```bash
docker compose up --build
```

3. Open the app at `http://localhost:5173`.
4. Backend API is available at `http://localhost:8000/api`.
5. MailHog is available at `http://localhost:8025`.

The local admin credentials are `admin` / `admin` unless changed with `LOCAL_ADMIN_USERNAME` and `LOCAL_ADMIN_PASSWORD`.

Do not import the production SQL dump directly into shared local stacks. The Docker database uses `docker/mysql/init/001-schema-seed.sql`, which keeps representative inventory/style records and replaces real users with a fake local admin.
