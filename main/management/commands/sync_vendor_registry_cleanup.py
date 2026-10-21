"""Merge or remove vendor records explicitly rejected from the approved list."""
import json
from pathlib import Path

from django.core import serializers
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from main.catalog import invalidate_catalog_cache
from main.models import Partner, Vendor, VendorProductGroup
from main.vendor_cleanup import VENDOR_ALIASES, VENDORS_TO_REMOVE


class Command(BaseCommand):
    help = "Preview or apply the reviewed vendor registry cleanup. No bulk import."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--backup", help="New JSON fixture path; required for changes.")

    def handle(self, *args, **options):
        affected = set(VENDOR_ALIASES) | set(VENDOR_ALIASES.values()) | VENDORS_TO_REMOVE
        with transaction.atomic():
            vendors = {
                vendor.slug: vendor for vendor in Vendor.objects.select_for_update().filter(slug__in=affected)
            }
            partners = {
                partner.slug: partner for partner in Partner.objects.select_for_update().filter(slug__in=affected)
            }
            alias_plans = []
            fields = [
                field.name for field in VendorProductGroup._meta.fields
                if field.name not in ("id", "created_at", "updated_at", "vendor", "product_group")
            ]
            for old_slug, new_slug in VENDOR_ALIASES.items():
                source = vendors.get(old_slug)
                if not source:
                    continue
                target = vendors.get(new_slug)
                if not target:
                    raise CommandError(f"Missing canonical vendor: {new_slug}; nothing changed.")
                target_links = {link.product_group_id: link for link in target.vendorproductgroup_set.select_for_update()}
                for link in source.vendorproductgroup_set.select_for_update():
                    existing = target_links.get(link.product_group_id)
                    if existing and any(getattr(existing, field) != getattr(link, field) for field in fields):
                        raise CommandError(
                            f"Conflicting vendor relation {old_slug} -> {link.product_group.slug}; nothing changed."
                        )
                alias_plans.append((source, target))
                self.stdout.write(
                    f"{old_slug} -> {new_slug}: links={source.vendorproductgroup_set.count()}, "
                    f"partner={old_slug in partners}"
                )

            removals = [vendors[slug] for slug in sorted(VENDORS_TO_REMOVE) if slug in vendors]
            for vendor in removals:
                if vendor.vendorproductgroup_set.filter(
                    show_in_catalog=True
                ).exists() or vendor.vendorproductgroup_set.filter(show_in_vendors=True).exists():
                    raise CommandError(f"Vendor unexpectedly public: {vendor.slug}; nothing changed.")
                self.stdout.write(
                    f"remove {vendor.slug}: hidden_links={vendor.vendorproductgroup_set.count()}, "
                    f"partner={vendor.slug in partners}"
                )

            if not alias_plans and not removals and not (set(partners) & VENDORS_TO_REMOVE):
                self.stdout.write("Already cleaned; no changes.")
                return
            if not options["apply"]:
                self.stdout.write("Dry run. Use --apply --backup NEW_FILE.json to change only these vendors.")
                return
            if not options["backup"]:
                raise CommandError("--backup is required; nothing changed.")

            source_vendors = [source for source, _ in alias_plans]
            records = [
                *source_vendors,
                *removals,
                *VendorProductGroup.objects.filter(vendor__in=[*source_vendors, *removals]),
                *Partner.objects.filter(slug__in=set(VENDOR_ALIASES) | VENDORS_TO_REMOVE),
            ]
            backup = Path(options["backup"]).resolve()
            payload = serializers.serialize("json", records, ensure_ascii=False, indent=2)
            try:
                with backup.open("x", encoding="utf-8") as stream:
                    stream.write(payload)
                if len(json.loads(backup.read_text(encoding="utf-8"))) != len(records):
                    raise CommandError("Backup validation failed; nothing changed.")
            except OSError as error:
                raise CommandError(f"Cannot create a new backup: {error}; nothing changed.") from error

            for source, target in alias_plans:
                for link in source.vendorproductgroup_set.all():
                    if target.vendorproductgroup_set.filter(product_group_id=link.product_group_id).exists():
                        link.delete()
                    else:
                        link.vendor = target
                        link.save(update_fields=["vendor", "updated_at"])
                Partner.objects.filter(slug=source.slug).delete()
                source.delete()
            Partner.objects.filter(slug__in=VENDORS_TO_REMOVE).delete()
            Vendor.objects.filter(slug__in=VENDORS_TO_REMOVE).delete()
            transaction.on_commit(invalidate_catalog_cache)
        self.stdout.write(self.style.SUCCESS(f"Vendor registry cleaned. Recovery fixture: {backup}"))
