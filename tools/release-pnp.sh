#!/bin/sh
# Invoked only by an explicitly approved -Deploy run. Never migrates or edits .env.
set -eu
cd /home/silaopt/pnp1-django
commit=${1:?Expected commit required}
smoke=${2:-/solutions/}
case "$commit" in *[!0-9a-f]*|'') exit 2;; esac
test "${#commit}" = 40
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain)"
previous_commit=$(git rev-parse HEAD)
previous_image=$(docker inspect pnp1-web-1 --format '{{.Config.Image}}')
case "$previous_image" in pnp1-web:*) previous_tag=${previous_image#pnp1-web:};; *) echo 'Unexpected live image'; exit 2;; esac
docker image inspect "$previous_image" --format '{{.Id}}'
git fetch origin main
test "$(git rev-parse origin/main)" = "$commit"
if git diff --name-only "$previous_commit" "$commit" | grep -Eq '(^main/(migrations/|models\.py$|views\.py$|urls\.py$|bitrix\.py$|ai\.py$)|^config/|^docker/|^compose|^Dockerfile$|^requirements.txt$|^\.env)'; then
    echo 'STOP: critical changes require manual deployment'; exit 2
fi
git diff --check "$previous_commit" "$commit"
git merge --ff-only "$commit"
export APP_IMAGE_TAG="$commit"
compose_release() { docker compose -f compose.yaml -f compose.prod.yaml "$@"; }
compose_release build web
compose_release run --rm --no-deps -e RUN_MIGRATIONS=0 -e RUN_COLLECTSTATIC=0 --entrypoint python web manage.py check
rollback_web() {
    export APP_IMAGE_TAG="$previous_tag"
    compose_release run --rm --no-deps -e RUN_MIGRATIONS=0 -e RUN_COLLECTSTATIC=0 --entrypoint python web manage.py collectstatic --noinput
    compose_release up -d --no-deps --wait --wait-timeout 120 web
    echo "Rollback: $previous_image restored; Git remains at $commit"
}
if ! compose_release run --rm --no-deps -e RUN_MIGRATIONS=0 -e RUN_COLLECTSTATIC=0 --entrypoint python web manage.py collectstatic --noinput; then
    rollback_web; exit 1
fi
if ! compose_release up -d --no-deps --wait --wait-timeout 120 web; then
    rollback_web; exit 1
fi
if ! curl --fail --silent --show-error --max-time 20 --output /dev/null https://pnp1.ru/health/ ||
   ! curl --fail --silent --show-error --max-time 20 --output /dev/null "https://pnp1.ru$smoke"; then
    rollback_web; exit 1
fi
docker inspect pnp1-web-1 --format '{{.Config.Image}} {{.State.Health.Status}}'
echo "Previous image retained: $previous_image"
echo "For future Compose commands: APP_IMAGE_TAG=$commit"
git status --short --branch
