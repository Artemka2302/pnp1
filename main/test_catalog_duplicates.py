import csv
import json
import tempfile
from collections import defaultdict
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import (
    CatalogBlock, CatalogSystem, Direction, Lead, LeadItem, ProductAttribute,
    ProductGroup, ProductType, Vendor, VendorProductGroup,
)
from .catalog_duplicates import GROUP_ALIASES, catalog_without_duplicate_groups


class CatalogDuplicateTests(TestCase):
    def setUp(self):
        cache.clear()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.backup = Path(self.temp.name) / "before.json"
        block = CatalogBlock.objects.create(slug="energy", title="Энергетика")
        direction = Direction.objects.create(block=block, slug="eom", title="ЭОМ")
        self.system = CatalogSystem.objects.create(direction=direction, slug="lighting-devices", title="Световые приборы")
        self.target = ProductGroup.objects.create(
            system=self.system, slug="luminaires", title="Светильники",
            crm_category="ЭОМ", crm_comment_hint="Original hint", ai_aliases=["свет"], ai_must_ask=["мощность"])
        self.source = ProductGroup.objects.create(
            system=self.system, slug="lighting-fixtures", title="Светильники",
            crm_category="ЭОМ", ai_aliases=["свет", "led"], ai_must_ask=["количество"])
        self.target_type = ProductType.objects.create(product_group=self.target, title="Общий тип")
        self.shared_type = ProductType.objects.create(product_group=self.source, title="Общий тип")
        self.unique_type = ProductType.objects.create(product_group=self.source, title="Дополнительный тип")
        ProductAttribute.objects.create(product_group=self.target, title="Мощность")
        ProductAttribute.objects.create(product_group=self.source, title="Мощность")
        ProductAttribute.objects.create(product_group=self.source, title="Цвет")
        shared = Vendor.objects.create(slug="shared", name="Shared")
        extra = Vendor.objects.create(slug="extra", name="Extra")
        VendorProductGroup.objects.create(product_group=self.target, vendor=shared, notes="Keep", show_in_catalog=False)
        VendorProductGroup.objects.create(product_group=self.source, vendor=shared, notes="Keep", show_in_catalog=False)
        self.unique_link = VendorProductGroup.objects.create(product_group=self.source, vendor=extra, notes="Unique")
        self.lead = Lead.objects.create(product_group=self.source, message="Preserve history")
        self.item = LeadItem.objects.create(
            lead=self.lead, product_group=self.source, product_type=self.shared_type,
            product_group_title="Светильники", raw_item={"legacy": "lighting-fixtures"})
        self.other_item = LeadItem.objects.create(
            lead=self.lead, product_group=self.source, product_type=self.unique_type,
            product_group_title="Светильники")
        # Same title in another system is not a duplicate.
        other_system = CatalogSystem.objects.create(direction=direction, slug="outdoor", title="Наружное освещение")
        self.other = ProductGroup.objects.create(system=other_system, slug="outdoor-luminaires", title="Светильники")

    def run_merge(self, **options):
        call_command("sync_catalog_duplicates", stdout=StringIO(), **options)

    def test_preview_and_missing_backup_do_not_change_database(self):
        self.run_merge()
        self.assertTrue(ProductGroup.objects.filter(pk=self.source.pk).exists())
        with self.assertRaises(CommandError):
            self.run_merge(apply=True)
        self.assertTrue(ProductGroup.objects.filter(pk=self.source.pk).exists())

    def test_merge_preserves_relations_ids_history_and_is_repeatable(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.run_merge(apply=True, backup=str(self.backup))
        self.assertFalse(ProductGroup.objects.filter(slug="lighting-fixtures").exists())
        self.assertTrue(ProductGroup.objects.filter(pk=self.other.pk).exists())
        self.target.refresh_from_db()
        self.assertEqual(self.target.ai_aliases, ["свет", "led"])
        self.assertEqual(self.target.ai_must_ask, ["мощность", "количество"])
        self.assertEqual(self.target.crm_comment_hint, "Original hint")
        self.assertEqual(set(self.target.types.values_list("title", flat=True)), {"Общий тип", "Дополнительный тип"})
        self.assertEqual(set(self.target.attributes.values_list("title", flat=True)), {"Мощность", "Цвет"})
        self.unique_type.refresh_from_db()
        self.unique_link.refresh_from_db()
        self.assertEqual(self.unique_type.product_group_id, self.target.pk)
        self.assertEqual(self.unique_link.product_group_id, self.target.pk)
        self.assertEqual(self.target.vendorproductgroup_set.count(), 2)
        self.lead.refresh_from_db()
        self.item.refresh_from_db()
        self.other_item.refresh_from_db()
        self.assertEqual(self.lead.product_group_id, self.target.pk)
        self.assertEqual(self.lead.message, "Preserve history")
        self.assertEqual(self.item.product_group_id, self.target.pk)
        self.assertEqual(self.item.product_type_id, self.target_type.pk)
        self.assertEqual(self.other_item.product_type_id, self.unique_type.pk)
        self.assertEqual(self.item.raw_item, {"legacy": "lighting-fixtures"})
        self.assertTrue(json.loads(self.backup.read_text(encoding="utf-8")))
        before = self.backup.read_bytes()
        self.run_merge(apply=True, backup=str(self.backup))
        self.assertEqual(self.backup.read_bytes(), before)

    def test_backup_can_restore_removed_rows_and_original_relations(self):
        self.run_merge(apply=True, backup=str(self.backup))
        call_command("loaddata", str(self.backup), stdout=StringIO())
        self.assertTrue(ProductGroup.objects.filter(pk=self.source.pk).exists())
        self.item.refresh_from_db()
        self.lead.refresh_from_db()
        self.assertEqual(self.item.product_type_id, self.shared_type.pk)
        self.assertEqual(self.item.product_group_id, self.source.pk)
        self.assertEqual(self.lead.product_group_id, self.source.pk)
        self.assertEqual(self.target.types.count(), 1)
        self.assertEqual(self.source.types.count(), 2)

    def test_existing_backup_is_not_overwritten(self):
        self.backup.touch()
        with self.assertRaises(CommandError):
            self.run_merge(apply=True, backup=str(self.backup))
        self.assertTrue(ProductGroup.objects.filter(pk=self.source.pk).exists())
        self.assertEqual(self.backup.stat().st_size, 0)

    def test_conflicting_vendor_settings_stop_before_any_changes(self):
        self.source.vendorproductgroup_set.filter(vendor__slug="shared").update(show_in_catalog=True)
        with self.assertRaises(CommandError):
            self.run_merge(apply=True, backup=str(self.backup))
        self.assertTrue(ProductGroup.objects.filter(pk=self.source.pk).exists())
        self.assertFalse(self.backup.exists())

    def test_unexpected_placement_stops(self):
        self.source.system = self.other.system
        self.source.save()
        with self.assertRaises(CommandError):
            self.run_merge(apply=True, backup=str(self.backup))
        self.assertFalse(self.backup.exists())

    def test_old_urls_api_and_sitemap(self):
        old_url = self.source.get_absolute_url()
        with self.captureOnCommitCallbacks(execute=True):
            self.run_merge(apply=True, backup=str(self.backup))
        self.assertRedirects(self.client.get(old_url), self.target.get_absolute_url(), status_code=301)
        self.assertRedirects(self.client.get("/solution-eom-lighting-fixtures"),
                             self.target.get_absolute_url(), status_code=301)
        self.assertEqual(self.client.get("/catalog/wrong/eom/lighting-devices/lighting-fixtures/").status_code, 404)
        data = self.client.get("/api/catalog-node/", {"id": "group:lighting-fixtures"}).json()
        self.assertEqual(data["node"]["id"], "group:luminaires")
        sitemap = self.client.get("/sitemap.xml")
        self.assertContains(sitemap, self.target.get_absolute_url())
        self.assertNotContains(sitemap, old_url)
        system = self.client.get("/api/catalog-node/", {"id": "system:lighting-devices"}).json()
        self.assertEqual([row["id"] for row in system["children"]], ["group:luminaires"])

    def test_source_registry_has_no_same_parent_duplicate_groups(self):
        source = settings.BASE_DIR / "data_import"
        master = json.loads((source / "catalog_master.json").read_text(encoding="utf-8"))
        ids = set()
        for block in master["global_blocks"]:
            for direction in block["directions"]:
                for system in direction["systems"]:
                    names = defaultdict(list)
                    for group in system["product_groups"]:
                        ids.add(group["id"])
                        names[" ".join(group["title"].casefold().replace("ё", "е").split())].append(group["id"])
                    self.assertFalse([slugs for slugs in names.values() if len(slugs) > 1], system["id"])
        self.assertNotIn("lighting-fixtures", ids)
        normalized = catalog_without_duplicate_groups(master)
        normalized_ids = {
            group["id"] for block in normalized["global_blocks"]
            for direction in block["directions"] for system in direction["systems"]
            for group in system["product_groups"]
        }
        self.assertFalse(set(GROUP_ALIASES) & normalized_ids)
        video = next(
            group for block in normalized["global_blocks"] for direction in block["directions"]
            for system in direction["systems"] for group in system["product_groups"]
            if group["id"] == "video-surveillance-equipment"
        )
        self.assertIn("коммутаторы PoE", video["product_types"])
        self.assertIn("системы видеонаблюдения", video["ai"]["aliases"])
        with (source / "catalog_vendor_map.csv").open(encoding="utf-8-sig", newline="") as stream:
            rows = list(csv.DictReader(stream))
        self.assertFalse(any(row["product_group_id"] in GROUP_ALIASES for row in rows))
        self.assertEqual(sum(row["product_group_id"] == "luminaires" for row in rows), 12)
        self.assertFalse({
            "pvc-windows", "gml-paneli", "kraska", "sml-paneli", "vrf-vrv-i-split-sistemy",
        } & {row["product_group_id"] for row in rows})
