#!/bin/sh
set -eu

retention_days="${BACKUP_RETENTION_DAYS:-7}"
interval_seconds="${BACKUP_INTERVAL_SECONDS:-86400}"

case "$retention_days:$interval_seconds" in
    *[!0-9:]*|0:*|*:0)
        echo "BACKUP_RETENTION_DAYS and BACKUP_INTERVAL_SECONDS must be positive integers" >&2
        exit 1
        ;;
esac

if [ "$(id -u)" = "0" ]; then
    mkdir -p /backups
    chown postgres:postgres /backups
    exec gosu postgres "$0" "$@"
fi

while true; do
    timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
    temporary_path="/backups/.pnp1-${timestamp}.dump.tmp"
    backup_path="/backups/pnp1-${timestamp}.dump"

    if pg_dump --format=custom --no-owner --no-acl --file="$temporary_path"; then
        mv "$temporary_path" "$backup_path"
        chmod 600 "$backup_path"
        find /backups -type f -name 'pnp1-*.dump' -mtime "+$retention_days" -exec rm -f {} \;
        echo "PostgreSQL backup created: $backup_path"
    else
        rm -f "$temporary_path"
        echo "PostgreSQL backup failed; retrying after ${interval_seconds}s" >&2
    fi

    sleep "$interval_seconds"
done
