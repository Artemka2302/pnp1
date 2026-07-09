from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from main.compliance import FILE_RETENTION_DAYS
from main.models import UploadedFile


class Command(BaseCommand):
    help = "Delete lead upload files older than the configured retention period."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=FILE_RETENTION_DAYS)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        queryset = UploadedFile.objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        bytes_total = sum(item.size for item in queryset)

        if options["dry_run"]:
            self.stdout.write(
                f"DRY RUN: would delete {count} uploaded files older than {options['days']} days "
                f"({bytes_total} bytes)."
            )
            return

        deleted_files = 0
        for item in queryset.iterator():
            if item.file:
                item.file.delete(save=False)
            item.delete()
            deleted_files += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted_files} uploaded files older than {options['days']} days ({bytes_total} bytes)."
            )
        )
