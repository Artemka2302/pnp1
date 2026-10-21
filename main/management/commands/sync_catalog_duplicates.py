"""Merge the reviewed duplicate; never infer deletion from matching titles alone."""
import json
from pathlib import Path

from django.core import serializers
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from main.catalog import invalidate_catalog_cache
from main.catalog_duplicates import GROUP_ALIASES, GROUP_MERGE_CONTEXT
from main.models import Lead, LeadItem, ProductAttribute, ProductGroup, ProductType, VendorProductGroup


class Command(BaseCommand):
    help = "Preview or merge approved catalogue duplicates, preserving relations. No bulk import."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--backup", help="New JSON fixture path; required for changes. Existing files are never overwritten.")

    def handle(self, *args, **options):
        with transaction.atomic():
            groups = {
                group.slug: group for group in ProductGroup.objects.select_for_update().select_related(
                    "system__direction").filter(slug__in=[*GROUP_ALIASES, *GROUP_ALIASES.values()])
            }
            plans = []
            for old_slug, new_slug in GROUP_ALIASES.items():
                source, target = groups.get(old_slug), groups.get(new_slug)
                if not source:
                    continue
                if not target:
                    raise CommandError(f"Missing canonical group: {new_slug}; nothing changed.")
                direction_slug, system_slug = GROUP_MERGE_CONTEXT[old_slug]
                if (
                    source.system_id != target.system_id
                    or target.system.slug != system_slug
                    or target.system.direction.slug != direction_slug
                    or source.crm_category != target.crm_category
                ):
                    raise CommandError("Unexpected group placement or CRM category; nothing changed.")
                relations = {relation.related_model for relation in ProductGroup._meta.related_objects
                             if not relation.many_to_many}
                if relations != {ProductType, ProductAttribute, VendorProductGroup, Lead, LeadItem}:
                    raise CommandError("Unreviewed group relation; nothing changed.")
                if {r.related_model for r in ProductType._meta.related_objects} != {LeadItem}:
                    raise CommandError("Unreviewed product type relation; nothing changed.")
                fields = [field.name for field in VendorProductGroup._meta.fields
                          if field.name not in ("id", "created_at", "updated_at", "vendor", "product_group")]
                targets = {link.vendor_id: link for link in target.vendorproductgroup_set.select_for_update()}
                for link in source.vendorproductgroup_set.select_for_update():
                    existing = targets.get(link.vendor_id)
                    if existing and any(getattr(existing, field) != getattr(link, field) for field in fields):
                        # The canonical relation is authoritative. The only reviewed difference is
                        # a legacy duplicate carrying fewer publication surfaces.
                        if not (
                            old_slug == "sistemy-kontrolya-i-upravleniya-dostupom"
                            and link.vendor.slug == "biosmart"
                            and all(
                                getattr(existing, field) == getattr(link, field)
                                for field in fields if field not in ("show_on_home", "show_in_partners")
                            )
                            and existing.show_on_home and existing.show_in_partners
                            and not link.show_on_home and not link.show_in_partners
                        ):
                            raise CommandError(f"Conflicting vendor relation {link.vendor_id}; nothing changed.")
                plans.append((source, target))
                self.stdout.write(
                    f"{old_slug} -> {new_slug}: types={source.types.count()}, "
                    f"attributes={source.attributes.count()}, vendor_links={source.vendorproductgroup_set.count()}, "
                    f"leads={source.leads.count()}, lead_items={source.lead_items.count()}"
                )

            if not plans:
                self.stdout.write("Already merged; no changes.")
                return
            if not options["apply"]:
                self.stdout.write("Dry run. Use --apply --backup NEW_FILE.json to merge only these groups.")
                return
            if not options["backup"]:
                raise CommandError("--backup is required; nothing changed.")
            ids = [group.pk for pair in plans for group in pair]
            types = list(ProductType.objects.filter(product_group_id__in=ids))
            from django.db.models import Q
            records = [
                *[group for pair in plans for group in pair], *types,
                *ProductAttribute.objects.filter(product_group_id__in=ids),
                *VendorProductGroup.objects.filter(product_group_id__in=ids),
                *Lead.objects.filter(product_group_id__in=ids),
                *LeadItem.objects.filter(Q(product_group_id__in=ids) | Q(product_type_id__in=[row.pk for row in types])),
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

            for source, target in plans:
                for model in (ProductType, ProductAttribute):
                    existing = {row.title: row for row in model.objects.filter(product_group=target)}
                    next_order = max((row.sort_order for row in existing.values()), default=0)
                    for row in model.objects.filter(product_group=source).order_by("sort_order", "pk"):
                        duplicate = existing.get(row.title)
                        if duplicate:
                            if model is ProductType:
                                LeadItem.objects.filter(product_type=row).update(product_type=duplicate)
                            row.delete()
                        else:
                            next_order += 1
                            row.product_group, row.sort_order = target, next_order
                            row.save(update_fields=["product_group", "sort_order", "updated_at"])
                            existing[row.title] = row
                for link in source.vendorproductgroup_set.all():
                    if target.vendorproductgroup_set.filter(vendor_id=link.vendor_id).exists():
                        link.delete()  # equality checked before the backup
                    else:
                        link.product_group = target
                        link.save(update_fields=["product_group", "updated_at"])
                Lead.objects.filter(product_group=source).update(product_group=target)
                LeadItem.objects.filter(product_group=source).update(product_group=target)
                target.ai_aliases = list(dict.fromkeys([*target.ai_aliases, *source.ai_aliases]))
                target.ai_must_ask = list(dict.fromkeys([*target.ai_must_ask, *source.ai_must_ask]))
                target.image = target.image or source.image
                target.save(update_fields=["ai_aliases", "ai_must_ask", "image", "updated_at"])
                source.delete()
            transaction.on_commit(invalidate_catalog_cache)
        self.stdout.write(self.style.SUCCESS(f"Merged approved duplicates. Recovery fixture: {backup}"))
