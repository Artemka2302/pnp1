from unittest.mock import patch

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
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0]["slug"], "visitorcontrol")
        self.assertEqual(cards[0]["groups"], "it security")

    @patch("main.home_brands.HOME_BRAND_LIMIT", 1)
    def test_showcase_limit_and_existing_featured_priority(self):
        for slug in ("aaa", "zzz"):
            brand = Vendor.objects.create(slug=slug, name=slug, logo=slug + ".png")
            self.link(brand, "water")
        Partner.objects.create(slug="zzz", name="zzz", show_on_home=True, priority=1)
        cards = homepage_brand_cards()
        self.assertEqual([card["slug"] for card in cards], ["zzz"])
        self.assertEqual(cards[0]["groups"], "engineering")
