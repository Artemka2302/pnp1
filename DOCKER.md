# PNP Docker

## Local run

Docker Compose reads secrets and database credentials from the untracked `.env` file. `DB_USER` is the restricted Django role; `POSTGRES_ADMIN_PASSWORD` belongs only to PostgreSQL administration and must be different from `DB_PASSWORD` in production.

```powershell
docker compose -f compose.yaml -f compose.local.yaml config
docker compose -f compose.yaml -f compose.local.yaml up --build -d
docker compose -f compose.yaml -f compose.local.yaml ps
docker compose -f compose.yaml -f compose.local.yaml logs -f web
```

The local site is available at `http://127.0.0.1:8000/` by default. PostgreSQL is available to host tools on `127.0.0.1:5433`.

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

Create a server-side `.env` from `.env.example`, use new production secrets, and set at least `SITE_DOMAIN`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, and the PostgreSQL credentials.

```bash
docker compose -f compose.yaml -f compose.prod.yaml config
docker compose -f compose.yaml -f compose.prod.yaml up --build -d
docker compose -f compose.yaml -f compose.prod.yaml ps
```

Only Caddy publishes host ports in production. PostgreSQL, Redis, and Gunicorn remain inside the Compose network. Uploaded files are not publicly served at `/media/`.
