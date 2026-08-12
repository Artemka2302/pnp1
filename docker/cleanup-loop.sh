#!/bin/sh
set -eu

retention_days="${FILE_RETENTION_DAYS:-30}"
interval_seconds="${CLEANUP_INTERVAL_SECONDS:-86400}"

case "$retention_days:$interval_seconds" in
    *[!0-9:]*|0:*|*:0)
        echo "FILE_RETENTION_DAYS and CLEANUP_INTERVAL_SECONDS must be positive integers" >&2
        exit 1
        ;;
esac

while true; do
    if ! python manage.py cleanup_uploaded_files --days "$retention_days"; then
        echo "Uploaded-file cleanup failed; retrying after ${interval_seconds}s" >&2
    fi
    sleep "$interval_seconds"
done
