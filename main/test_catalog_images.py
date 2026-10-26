from types import SimpleNamespace

from django.conf import settings
from django.test import SimpleTestCase
from PIL import Image

from tools.build_catalog_image_variants import WIDTHS, source_paths

from .catalog import direction_payload
from .catalog_images import catalog_image_payload, image_variants
from .vendor_products import vendor_catalog_for_group


class CatalogPhotoTests(SimpleTestCase):
    def test_every_public_catalog_and_home_photo_has_valid_webp_variants(self):
        manifest = image_variants()
        self.assertEqual(set(manifest), set(source_paths()))
        self.assertGreater(len(manifest), 450)

        for original, variants in manifest.items():
            with self.subTest(original=original):
                source = settings.BASE_DIR / "static" / original
                self.assertTrue(source.is_file())
                self.assertEqual([item["target_width"] for item in variants], list(WIDTHS))
                for variant in variants:
                    path = settings.BASE_DIR / "static" / variant["path"]
                    self.assertTrue(path.is_file())
                    self.assertLessEqual(variant["width"], variant["target_width"])
                    with Image.open(path) as image:
                        self.assertEqual(image.format, "WEBP")
                        self.assertEqual(image.size, (variant["width"], variant["height"]))
                        image.verify()

    def test_payload_exposes_responsive_fields_and_logos_keep_fallback(self):
        original = next(iter(image_variants()))
        payload = catalog_image_payload(original)
        self.assertTrue(payload["image"].endswith(".webp"))
        self.assertIn("image_srcset", payload)
        self.assertGreater(payload["image_width"], 0)
        self.assertGreater(payload["image_height"], 0)

        logo = "assets/img/vendor-logos/example.svg"
        self.assertEqual(catalog_image_payload(logo), {"image": "/static/" + logo})

    def test_catalog_api_payloads_include_responsive_photo_fields(self):
        original = next(path for path in image_variants() if "/catalog/" in path)
        direction = SimpleNamespace(
            slug="architecture",
            title="Архитектурные решения",
            purpose="",
            image=original,
            catalog_systems=[],
            system_count=0,
            group_count=0,
            type_count=0,
            get_absolute_url=lambda: "/catalog/building-materials/architecture/",
        )
        payload = direction_payload(direction)
        self.assertTrue({"image", "image_srcset", "image_width", "image_height"}.issubset(payload))

        vendor_catalog = vendor_catalog_for_group("network-switches")
        product = vendor_catalog["families"][0]["products"][0]
        self.assertTrue({"image", "image_srcset", "image_width", "image_height"}.issubset(product))
