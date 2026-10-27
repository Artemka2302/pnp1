from django.test import TestCase

from .home_brands import homepage_brand_cards
from .models import CatalogBlock, CatalogSystem, Direction, Partner, ProductGroup, Vendor, VendorProductGroup


class HomepageBrandTests(TestCase):
    def link(self, vendor, direction_slug, **flags):
        block, _ = CatalogBlock.objects.get_or_create(slug="test", defaults={"title": "Test"})
        direction, _ = Direction.objects.get_or_create(slug=direction_slug, defaults={"title": direction_slug, "block": block})
        system, _ = CatalogSystem.objects.get_or_create(slug=direction_slug, defaults={"title": direction_slug, "direction": direction})
        group, _ = ProductGroup.objects.get_or_create(slug=direction_slug, defaults={"title": direction_slug, "system": system})
        return VendorProductGroup.objects.create(vendor=vendor, product_group=group, **flags)

    def test_catalog_membership_deduplication_and_public_visibility(self):
        brand = Vendor.objects.create(slug="visitorcontrol", name="VisitorControl", logo="visitor.png")
        self.link(brand, "low-current")
        self.link(brand, "it-infrastructure")
        hidden = Vendor.objects.create(slug="insai-res", name="Legal entity", logo="entity.png")
        self.link(hidden, "low-current", show_in_catalog=False, show_in_vendors=False)
        no_logo = Vendor.objects.create(slug="review", name="Under review")
        self.link(no_logo, "water")
        unrelated = Vendor.objects.create(slug="architecture", name="Architecture", logo="ar.png")
        self.link(unrelated, "architecture")
        cards = homepage_brand_cards()
        self.assertEqual(len(cards), 2)
        self.assertEqual(
            {card["slug"]: card["groups"] for card in cards},
            {"architecture": "architecture", "visitorcontrol": "engineering"},
        )

    def test_showcase_keeps_all_public_brands_and_featured_priority(self):
        for slug in ("aaa", "zzz"):
            brand = Vendor.objects.create(slug=slug, name=slug, logo=slug + ".png")
            self.link(brand, "water")
        Partner.objects.create(slug="zzz", name="zzz", show_on_home=True, priority=1)
        cards = homepage_brand_cards()
        self.assertEqual([card["slug"] for card in cards], ["zzz", "aaa"])
        self.assertTrue(all(card["groups"] == "engineering" for card in cards))

    def test_architecture_constructive_and_all_engineering_directions(self):
        direction_groups = {
            "architecture": "architecture",
            "constructive": "constructive",
            "eom": "engineering",
            "ev-charging-infrastructure": "engineering",
            "water": "engineering",
            "hvac": "engineering",
            "low-current": "engineering",
            "it-infrastructure": "engineering",
            "gas": "engineering",
        }
        for index, direction_slug in enumerate(direction_groups):
            vendor = Vendor.objects.create(
                slug=f"vendor-{index}",
                name=f"Vendor {index}",
                logo=f"vendor-{index}.svg",
            )
            self.link(vendor, direction_slug)

        cards = homepage_brand_cards()

        self.assertEqual(len(cards), len(direction_groups))
        self.assertEqual(
            {card["slug"]: card["groups"] for card in cards},
            {f"vendor-{index}": group for index, group in enumerate(direction_groups.values())},
        )

    def test_about_reuses_homepage_brand_cards(self):
        brand = Vendor.objects.create(slug="about-brand", name="About brand", logo="about-brand.png")
        self.link(brand, "it-infrastructure")

        response = self.client.get("/about/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-brand-slug="about-brand"')
