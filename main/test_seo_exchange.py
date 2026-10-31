import json
import re
from urllib.robotparser import RobotFileParser

from django.core.cache import cache
from django.test import TestCase

from .models import CatalogBlock, CatalogSystem, Direction, Partner, ProductGroup, Vendor, VendorProductGroup
from .solutions import solution_documents, solution_vendors
from .test_seo import HeadParser
from .vendor_navigation import public_website, vendor_landing_url


class SeoExchangeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        block = CatalogBlock.objects.create(slug="it", title="ИТ")
        direction = Direction.objects.create(block=block, slug="it-infrastructure", title="ИТ-инфраструктура")
        system = CatalogSystem.objects.create(direction=direction, slug="networks", title="Сети")
        cls.group = ProductGroup.objects.create(system=system, slug="switches", title="Коммутаторы")
        cls.other_group = ProductGroup.objects.create(system=system, slug="hidden", title="Закрытая группа")
        cls.vendor = Vendor.objects.create(slug="eltex", name="Eltex", official_site="https://eltex.ru/",
                                          logo="assets/img/logos/approved-top/eltex.png", notes="PRIVATE_SOURCE_NOTE")
        VendorProductGroup.objects.create(vendor=cls.vendor, product_group=cls.group)
        VendorProductGroup.objects.create(vendor=cls.vendor, product_group=cls.other_group,
                                          show_in_catalog=False, show_in_vendors=False)
        hidden = Vendor.objects.create(slug="hidden-brand", name="Eltex hidden brand", notes="PRIVATE_HIDDEN_NOTE")
        VendorProductGroup.objects.create(vendor=hidden, product_group=cls.group,
                                          show_in_catalog=False, show_in_vendors=False)
        Partner.objects.create(slug="eltex", name="Eltex", show_on_partners=True)

    def setUp(self):
        cache.clear()

    def schema(self, response, element_id):
        raw = re.search(rf'id="{element_id}">(.*?)</script>', response.content.decode(), re.S).group(1)
        self.assertNotIn("<", raw)
        return json.loads(raw)

    def test_catalog_collection_and_og_match_canonical_at_every_level(self):
        for path in ["/catalog/", self.group.system.direction.block.get_absolute_url(),
                     self.group.system.direction.get_absolute_url(), self.group.system.get_absolute_url(),
                     self.group.get_absolute_url()]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                head = HeadParser(response.content.decode())
                schema = self.schema(response, "catalogCollectionData")
                self.assertEqual(schema["@type"], "CollectionPage")
                self.assertEqual(schema["url"], "http://testserver" + path)
                self.assertEqual(head.select("meta", property="og:url")[0]["content"], schema["url"])
                self.assertEqual(head.select("meta", property="og:description")[0]["content"], schema["description"])
                self.assertEqual(head.select("meta", name="robots")[0]["content"], "index,follow")

    def test_filters_are_crawlable_but_noindex_and_have_clean_canonical(self):
        robots = RobotFileParser()
        robots.parse(self.client.get("/robots.txt").content.decode().splitlines())
        for path in ["/catalog/", self.group.get_absolute_url(), "/vendors/", "/partners/", "/solutions/eltex/"]:
            with self.subTest(path=path):
                url = "http://testserver" + path + "?q=test"
                head = HeadParser(self.client.get(path + "?q=test").content.decode())
                self.assertEqual(head.select("meta", name="robots")[0]["content"], "noindex,follow")
                self.assertEqual(head.select("link", rel="canonical")[0]["href"], "http://testserver" + path)
                self.assertTrue(robots.can_fetch("Googlebot", url))
        self.assertFalse(robots.can_fetch("Googlebot", "http://testserver/api/catalog-node/?id=root"))
        self.assertFalse(robots.can_fetch("Googlebot", "http://testserver/admin/"))
        self.assertFalse(robots.can_fetch("GPTBot", "http://testserver/"))
        self.assertTrue(robots.can_fetch("Googlebot", "http://testserver/static/logo.png?v=2"))

    def test_existing_brand_hub_links_back_only_to_public_assortment(self):
        response = self.client.get("/solutions/eltex/")
        self.assertContains(response, f'href="{self.group.get_absolute_url()}"')
        self.assertNotContains(response, f'href="{self.other_group.get_absolute_url()}"')
        self.assertContains(response, 'href="https://eltex.ru/"')
        self.assertNotContains(response, "PRIVATE_SOURCE_NOTE")
        schema = self.schema(response, "pageStructuredData")
        page = schema["@graph"][0]
        self.assertEqual(page["about"]["@type"], "Brand")
        self.assertEqual(page["about"]["sameAs"], "https://eltex.ru/")
        self.assertEqual(schema["@graph"][1]["@type"], "BreadcrumbList")

    def test_catalog_search_and_partners_link_to_hub_without_internal_notes(self):
        response = self.client.get("/api/catalog-search/?q=Eltex")
        self.assertNotContains(response, "PRIVATE_SOURCE_NOTE")
        self.assertNotContains(response, "PRIVATE_HIDDEN_NOTE")
        items = [item for group in response.json()["groups"] for item in group["items"] if item["kind"] == "Производитель"]
        self.assertEqual([item["title"] for item in items], ["Eltex"])
        self.assertEqual(items[0]["url"], "/solutions/eltex/")
        self.assertNotIn("Закрытая группа", items[0]["summary"])
        payload = self.client.get("/api/catalog-node/?id=group:switches").json()
        self.assertEqual(payload["node"]["vendors"][0]["url"], "/solutions/eltex/")
        self.assertContains(self.client.get("/partners/"), 'href="/solutions/eltex/"')
        self.assertIn("?vendors=unknown", vendor_landing_url("unknown"))

    def test_all_existing_materials_pages_have_consistent_metadata_and_safe_schema(self):
        for vendor in solution_vendors():
            for path in [vendor["url"], *[doc["url"] for doc in solution_documents(vendor)]]:
                with self.subTest(path=path):
                    response = self.client.get(path)
                    self.assertEqual(response.status_code, 200)
                    head = HeadParser(response.content.decode())
                    self.assertEqual(len(head.select("h1")), 1)
                    page = self.schema(response, "pageStructuredData")["@graph"][0]
                    self.assertEqual(head.select("meta", property="og:url")[0]["content"], "http://testserver" + path)
                    self.assertEqual(page["url"], "http://testserver" + path)
                    self.assertNotIn("offers", json.dumps(page))
                    if path != vendor["url"]:
                        self.assertEqual(page["mainEntity"]["@type"], "DigitalDocument")
                        self.assertEqual(page["mainEntity"]["encoding"]["encodingFormat"], "application/pdf")

    def test_official_link_rejects_non_web_schemes_and_credentials(self):
        for url in ["javascript:alert(1)", "//example.com", "https://user:pass@example.com", "https://[broken"]:
            self.assertEqual(public_website(url), "")
        self.assertEqual(public_website("https://eltex.ru/"), "https://eltex.ru/")
