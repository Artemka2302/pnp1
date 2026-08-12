# PNP Docker

## Local run

Docker Compose reads secrets and database credentials from the untracked `.env` file. `DB_USER` is the restricted Django role; `POSTGRES_ADMIN_PASSWORD` belongs only to PostgreSQL administration and must be different from `DB_PASSWORD` in production.

```powershell
docker compose -f compose.yaml -f compose.local.yaml config
docker compose -f compose.yaml -f compose.local.yaml up --build -d
docker compose -f compose.yaml -f compose.local.yaml ps
docker compose -f compose.yaml -f compose.local.yaml logs -f web
```

The local site is available at `http://127.0.0.1:8000/` by default. PostgreSQL is available to host tools on `127.0.0.1:5433`. The one-shot `init` service applies migrations and collects static files before `web` starts. The `cleanup` service removes uploaded lead files after the configured retention period.

For a new empty database, import catalog data once:

```powershell
docker compose -f compose.yaml -f compose.local.yaml exec web python manage.py import_pnp_data
```

Run checks and tests:

```powershell
docker compose -f compose.yaml -f compose.local.yaml exec web python manage.py check
docker compose -f compose.yaml -f compose.local.yaml exec web python manage.py test
```

Stop containers without deleting data:

```powershell
docker compose -f compose.yaml -f compose.local.yaml down
```

Do not add `--volumes` unless the PostgreSQL and media data may be permanently deleted.

## Production run

Create a server-side `.env` from `.env.example`, use new production secrets, and set at least `SITE_DOMAIN`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, and the PostgreSQL credentials. Set `APP_IMAGE_TAG` to the deployed Git revision so that releases remain identifiable.

```bash
APP_IMAGE_TAG=$(git rev-parse --short HEAD)
sed -i '/^APP_IMAGE_TAG=/d' .env
printf '\nAPP_IMAGE_TAG=%s\n' "$APP_IMAGE_TAG" >> .env
docker compose -f compose.yaml -f compose.prod.yaml config
docker compose -f compose.yaml -f compose.prod.yaml up --build -d
docker compose -f compose.yaml -f compose.prod.yaml ps
```

Only Caddy publishes host ports in production. Caddy and Gunicorn share the `frontend` network; Gunicorn, PostgreSQL, and Redis share the internal `backend` network. Uploaded files are not publicly served at `/media/`.

The production `backup` service creates a PostgreSQL custom-format dump at startup and every 24 hours. Dumps are retained for seven days by default in the `postgres_backups` volume. Verify it after deployment:

```bash
docker compose -f compose.yaml -f compose.prod.yaml logs --tail=50 backup
docker compose -f compose.yaml -f compose.prod.yaml exec backup ls -lh /backups
```

This volume protects against an accidental import or database change, but not against loss of the server disk. Copy at least one recent dump to independent storage.

Check scheduled uploaded-file cleanup:

```bash
docker compose -f compose.yaml -f compose.prod.yaml logs --tail=50 cleanup
docker compose -f compose.yaml -f compose.prod.yaml exec web python manage.py cleanup_uploaded_files --dry-run
```

The `init` container is expected to finish with exit code `0`. Include stopped containers when inspecting it:

```bash
docker compose -f compose.yaml -f compose.prod.yaml ps --all
docker compose -f compose.yaml -f compose.prod.yaml logs init
```
