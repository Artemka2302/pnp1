import csv
import json
import tempfile
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import CatalogBlock, CatalogSystem, Direction, Partner, ProductGroup, Vendor, VendorProductGroup
from .vendor_cleanup import VENDORS_TO_REMOVE


class VendorRegistryCleanupTests(TestCase):
    def setUp(self):
        block = CatalogBlock.objects.create(slug="engineering-equipment", title="Инженерное оборудование")
        direction = Direction.objects.create(block=block, slug="water", title="ВК")
        system = CatalogSystem.objects.create(direction=direction, slug="wastewater-and-drainage", title="Водоотведение")
        self.group = ProductGroup.objects.create(system=system, slug="cast-iron-drainage", title="Чугунная канализация")
        self.target = Vendor.objects.create(slug="sanline", name="Sanline")
        self.source = Vendor.objects.create(slug="sanline-sml", name="Sanline SML")
        self.hidden = Vendor.objects.create(
            slug="ao-zki-ao-zavod-keramicheskih-izdeliy-g-ekaterinburg", name="АО ЗКИ")
        self.link = VendorProductGroup.objects.create(
            vendor=self.source, product_group=self.group, show_in_catalog=True, show_in_vendors=True)
        VendorProductGroup.objects.create(
            vendor=self.hidden, product_group=self.group, show_in_catalog=False, show_in_vendors=False)
        Partner.objects.create(slug="sanline", name="Sanline")
        Partner.objects.create(slug="sanline-sml", name="Sanline SML")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.backup = Path(self.temp.name) / "vendors.json"

    def run_cleanup(self, **options):
        call_command("sync_vendor_registry_cleanup", stdout=StringIO(), **options)

    def test_preview_apply_and_repeat(self):
        self.run_cleanup()
        self.assertTrue(Vendor.objects.filter(pk=self.source.pk).exists())
        self.run_cleanup(apply=True, backup=str(self.backup))
        self.assertFalse(Vendor.objects.filter(pk=self.source.pk).exists())
        self.assertFalse(Vendor.objects.filter(pk=self.hidden.pk).exists())
        self.assertFalse(Partner.objects.filter(slug="sanline-sml").exists())
        self.link.refresh_from_db()
        self.assertEqual(self.link.vendor_id, self.target.pk)
        self.assertTrue(json.loads(self.backup.read_text(encoding="utf-8")))
        before = self.backup.read_bytes()
        self.run_cleanup(apply=True, backup=str(self.backup))
        self.assertEqual(self.backup.read_bytes(), before)

    def test_public_removal_is_blocked(self):
        self.hidden.vendorproductgroup_set.update(show_in_catalog=True)
        with self.assertRaises(CommandError):
            self.run_cleanup(apply=True, backup=str(self.backup))
        self.assertTrue(Vendor.objects.filter(pk=self.hidden.pk).exists())
        self.assertFalse(self.backup.exists())

    def test_source_registries_do_not_recreate_removed_vendors(self):
        source = settings.BASE_DIR / "data_import"
        forbidden = VENDORS_TO_REMOVE | {"sanline-sml"}
        for filename in (
            "vendors_master.csv", "catalog_vendor_map.csv",
            "vendor_list_20261015.csv", "vendor_product_group_list_20261015.csv",
        ):
            with (source / filename).open(encoding="utf-8-sig", newline="") as stream:
                rows = list(csv.DictReader(stream))
            slugs = {row.get("vendor_slug") or row.get("slug") for row in rows}
            self.assertFalse(forbidden & slugs, filename)
        partners = json.loads((source / "partners.json").read_text(encoding="utf-8"))
        self.assertFalse(forbidden & {partner["slug"] for partner in partners})
        with (source / "catalog_vendor_map.csv").open(encoding="utf-8-sig", newline="") as stream:
            mapping = list(csv.DictReader(stream))
        self.assertTrue(any(
            row["vendor_slug"] == "sanline" and row["product_group_id"] == "cast-iron-drainage"
            for row in mapping
        ))
