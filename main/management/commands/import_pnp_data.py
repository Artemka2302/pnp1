import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from main.catalog import invalidate_catalog_cache
from main.models import (
    CatalogBlock,
    CatalogSystem,
    Direction,
    Partner,
    ProductAttribute,
    ProductGroup,
    ProductType,
    Vendor,
    VendorProductGroup,
)


def bool_value(value):
    return str(value).strip().lower() in {"1", "true", "yes", "да", "y"}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


class Command(BaseCommand):
    help = "Import PNP catalog, vendors and partners from source JSON/CSV into Django ORM."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default="data_import",
            help="Directory with catalog_master.json, vendors_master.csv, catalog_vendor_map.csv and partners.json.",
        )
        parser.add_argument(
            "--keep-existing",
            action="store_true",
            help="Do not truncate existing imported data before import.",
        )

    def handle(self, *args, **options):
        source_dir = Path(options["source"])
        if not source_dir.is_absolute():
            source_dir = Path.cwd() / source_dir
        if not source_dir.exists():
            raise CommandError(f"Source directory not found: {source_dir}")

        required = [
            "catalog_master.json",
            "catalog_product_group_images.json",
            "vendors_master.csv",
            "catalog_vendor_map.csv",
            "partners.json",
        ]
        missing = [name for name in required if not (source_dir / name).exists()]
        if missing:
            raise CommandError(f"Missing import files in {source_dir}: {', '.join(missing)}")

        with transaction.atomic():
            if not options["keep_existing"]:
                self.truncate_data()

            stats = {}
            catalog = read_json(source_dir / "catalog_master.json")
            product_images = read_json(source_dir / "catalog_product_group_images.json")
            stats.update(self.import_catalog(catalog, product_images))
            stats.update(self.import_vendors(source_dir / "vendors_master.csv"))
            stats.update(self.import_vendor_map(source_dir / "catalog_vendor_map.csv"))
            stats.update(self.import_partners(source_dir / "partners.json"))

        invalidate_catalog_cache()
        self.stdout.write(self.style.SUCCESS("PNP import completed"))
        for key, value in stats.items():
            self.stdout.write(f"{key}: {value}")

    def truncate_data(self):
        VendorProductGroup.objects.all().delete()
        Vendor.objects.all().delete()
        Partner.objects.all().delete()
        ProductAttribute.objects.all().delete()
        ProductType.objects.all().delete()
        ProductGroup.objects.all().delete()
        CatalogSystem.objects.all().delete()
        Direction.objects.all().delete()
        CatalogBlock.objects.all().delete()

    def import_catalog(self, catalog, product_images):
        blocks_count = directions_count = systems_count = groups_count = types_count = attributes_count = 0

        for block_order, block_data in enumerate(catalog.get("global_blocks", []), start=1):
            block = CatalogBlock.objects.create(
                slug=block_data["id"],
                title=block_data["title"],
                summary=block_data.get("summary", ""),
                image=block_data.get("image", ""),
                sort_order=block_order,
            )
            blocks_count += 1

            for direction_order, direction_data in enumerate(block_data.get("directions", []), start=1):
                direction = Direction.objects.create(
                    block=block,
                    slug=direction_data["id"],
                    title=direction_data["title"],
                    purpose=direction_data.get("purpose", ""),
                    image=direction_data.get("image", ""),
                    sort_order=direction_order,
                )
                directions_count += 1

                for system_order, system_data in enumerate(direction_data.get("systems", []), start=1):
                    system = CatalogSystem.objects.create(
                        direction=direction,
                        slug=system_data["id"],
                        title=system_data["title"],
                        image=system_data.get("image", ""),
                        sort_order=system_order,
                    )
                    systems_count += 1

                    for group_order, group_data in enumerate(system_data.get("product_groups", []), start=1):
                        crm = group_data.get("crm") or {}
                        ai = group_data.get("ai") or {}
                        group = ProductGroup.objects.create(
                            system=system,
                            slug=group_data["id"],
                            title=group_data["title"],
                            image=product_images.get(group_data["id"], ""),
                            crm_category=crm.get("category", ""),
                            crm_comment_hint=crm.get("comment_hint", ""),
                            ai_aliases=ai.get("aliases") or [],
                            ai_must_ask=ai.get("must_ask") or [],
                            sort_order=group_order,
                        )
                        groups_count += 1

                        product_types = group_data.get("product_types") or [group_data["title"]]
                        for type_order, title in enumerate(product_types, start=1):
                            ProductType.objects.create(
                                product_group=group,
                                title=str(title).strip(),
                                sort_order=type_order,
                            )
                            types_count += 1

                        for attr_order, title in enumerate(group_data.get("attributes", []), start=1):
                            ProductAttribute.objects.create(
                                product_group=group,
                                title=str(title).strip(),
                                sort_order=attr_order,
                            )
                            attributes_count += 1

        return {
            "catalog_blocks": blocks_count,
            "catalog_directions": directions_count,
            "catalog_systems": systems_count,
            "catalog_product_groups": groups_count,
            "catalog_product_types": types_count,
            "catalog_attributes": attributes_count,
        }

    def import_vendors(self, path):
        count = 0
        with path.open(encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file):
                slug = (row.get("slug") or "").strip()
                name = (row.get("vendor_name") or row.get("normalized_name") or "").strip()
                if not slug or not name:
                    continue
                Vendor.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "official_site": (row.get("official_site") or "").strip(),
                        "logo": (row.get("logo") or "").strip(),
                        "logo_source_url": (row.get("logo_source_url") or "").strip(),
                        "status": (row.get("status") or "").strip(),
                        "confidence": (row.get("confidence") or "").strip(),
                        "source": (row.get("source") or "").strip(),
                        "notes": (row.get("notes") or "").strip(),
                    },
                )
                count += 1
        return {"vendors": count}

    def import_vendor_map(self, path):
        count = skipped = 0
        with path.open(encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file):
                vendor_slug = (row.get("vendor_slug") or "").strip()
                group_slug = (row.get("product_group_id") or "").strip()
                if not vendor_slug or not group_slug:
                    skipped += 1
                    continue
                try:
                    vendor = Vendor.objects.get(slug=vendor_slug)
                    group = ProductGroup.objects.get(slug=group_slug)
                except (Vendor.DoesNotExist, ProductGroup.DoesNotExist):
                    skipped += 1
                    continue

                VendorProductGroup.objects.update_or_create(
                    vendor=vendor,
                    product_group=group,
                    defaults={
                        "show_in_catalog": bool_value(row.get("show_in_catalog")),
                        "show_in_vendors": bool_value(row.get("show_in_vendors")),
                        "show_on_home": bool_value(row.get("show_on_home")),
                        "show_in_partners": bool_value(row.get("show_in_partners")),
                        "status": (row.get("status") or "").strip(),
                        "confidence": (row.get("confidence") or "").strip(),
                        "matched_by": (row.get("matched_by") or "").strip(),
                        "source": (row.get("source") or "").strip(),
                        "notes": (row.get("notes") or "").strip(),
                    },
                )
                count += 1
        return {"vendor_product_links": count, "vendor_product_links_skipped": skipped}

    def import_partners(self, path):
        partners = read_json(path)
        count = 0
        for item in partners:
            slug = (item.get("slug") or item.get("id") or "").strip()
            name = (item.get("name") or "").strip()
            if not slug or not name:
                continue
            Partner.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "logo": item.get("logo", ""),
                    "logo_source_url": item.get("logo_source_url", ""),
                    "official_site": item.get("official_site", ""),
                    "category": item.get("category", ""),
                    "note": item.get("note", ""),
                    "status": item.get("status", ""),
                    "priority": int(item.get("priority") or 100),
                    "show_on_home": bool(item.get("show_on_home")),
                    "show_on_partners": bool(item.get("show_on_partners", True)),
                },
            )
            count += 1
        return {"partners": count}
