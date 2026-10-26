import json
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from django.test import SimpleTestCase

from .vendor_products import search_vendor_products, vendor_catalog_for_group


class EltexCatalogRegistryTests(SimpleTestCase):
    def setUp(self):
        self.registry_path = Path(settings.BASE_DIR) / "data_import" / "vendor_products" / "eltex_switches.json"
        self.registry = json.loads(self.registry_path.read_text(encoding="utf-8"))

    def test_registry_contains_all_official_switch_families(self):
        self.assertEqual(self.registry["product_count"], 108)
        self.assertEqual(
            {family["slug"]: family["count"] for family in self.registry["families"]},
            {"access": 31, "poe": 21, "industrial": 14, "aggregation": 31, "datacenter": 11},
        )
        self.assertEqual(sum(family["count"] for family in self.registry["families"]), 108)

    def test_every_product_has_a_local_readable_image_and_no_price_fields(self):
        forbidden = {"price", "cost", "цена", "стоимость"}

        def assert_no_price_keys(value):
            if isinstance(value, dict):
                self.assertFalse(forbidden.intersection(key.casefold() for key in value))
                for nested in value.values():
                    assert_no_price_keys(nested)
            elif isinstance(value, list):
                for nested in value:
                    assert_no_price_keys(nested)

        assert_no_price_keys(self.registry)
        products = [product for family in self.registry["families"] for product in family["products"]]
        self.assertEqual(len(products), 108)
        for product in products:
            image = Path(settings.BASE_DIR) / "static" / product["image"]
            self.assertTrue(image.is_file(), product["model"])
            self.assertGreater(image.stat().st_size, 0, product["model"])

    def test_loader_searches_models_and_template_renders_request_controls(self):
        catalog = vendor_catalog_for_group("network-switches")
        self.assertEqual(catalog["product_count"], 108)

        matches = search_vendor_products("MES2300-24")
        self.assertTrue(matches)
        self.assertEqual(matches[0]["product"]["model"], "MES2300-24")

        html = render_to_string(
            "main/partials/catalog_vendor_products.html",
            {
                "catalog_node": {
                    "title": "Коммутаторы",
                    "systemTitle": "Сетевое оборудование",
                    "vendorCatalog": catalog,
                }
            },
        )
        self.assertIn("Коммутаторы ELTEX", html)
        self.assertIn("MES2300-24", html)
        self.assertIn("data-request-item", html)
        self.assertNotIn("₽", html)
