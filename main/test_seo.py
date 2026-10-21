import json
import re
from html.parser import HTMLParser
from xml.etree import ElementTree

from django.core.cache import cache
from django.test import TestCase

from .models import CatalogBlock, CatalogSystem, Direction, ProductGroup, ProductType
from .seo import script_json


class HeadParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def select(self, tag, **attrs):
        return [
            values for name, values in self.elements
            if name == tag and all(values.get(key) == value for key, value in attrs.items())
        ]


class CatalogSeoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.block = CatalogBlock.objects.create(slug="engineering", title="Инженерные системы")
        cls.direction = Direction.objects.create(block=cls.block, slug="eom", title="ЭОМ")
        cls.system = CatalogSystem.objects.create(
            direction=cls.direction, slug="indoor-lighting", title="Внутреннее освещение")
        cls.group = ProductGroup.objects.create(
            system=cls.system, slug="luminaires", title="Светильники",
            crm_comment_hint="Подбор светильников по проекту.")
        ProductType.objects.create(product_group=cls.group, title="светильники для офиса")

    def setUp(self):
        cache.clear()

    def get_html(self, path):
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        return response, response.content.decode()

    def test_root_and_every_catalog_level_have_real_html_links_and_one_h1(self):
        rows = [
            ("/catalog/", self.direction.get_absolute_url(), "Каталог"),
            (self.block.get_absolute_url(), self.direction.get_absolute_url(), self.block.title),
            (self.direction.get_absolute_url(), self.system.get_absolute_url(), self.direction.title),
            (self.system.get_absolute_url(), self.group.get_absolute_url(), self.system.title),
        ]
        for path, child_url, heading in rows:
            with self.subTest(path=path):
                response, html = self.get_html(path)
                markup = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
                parser = HeadParser(markup)
                self.assertEqual(len(parser.select("h1")), 1)
                self.assertRegex(markup, rf"<h1\b[^>]*>{re.escape(heading)}</h1>")
                self.assertTrue(parser.select("a", href=child_url))
                self.assertEqual(len(parser.select("link", rel="canonical")), 1)
                self.assertEqual(parser.select("link", rel="canonical")[0]["href"], "http://testserver" + path)
                description = parser.select("meta", name="description")[0]["content"]
                self.assertIn("Беларуси", description)
                self.assertIn(heading if path != "/catalog/" else "Материалы", description)
                self.assertEqual(response.context["catalog_initial_data"]["initialTarget"],
                                 response.context["catalog_node"]["id"])

    def test_group_content_types_and_breadcrumbs_are_rendered_without_javascript(self):
        response, html = self.get_html(self.group.get_absolute_url())
        markup = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
        self.assertIn("Светильники для офиса", markup)
        self.assertIn("Подбор светильников по проекту.", markup)
        self.assertEqual(len(HeadParser(markup).select("h1")), 1)
        schema = json.loads(re.search(
            r'id="catalogBreadcrumbData">(.*?)</script>', html, re.S).group(1))
        self.assertEqual(schema["@type"], "BreadcrumbList")
        self.assertEqual([row["position"] for row in schema["itemListElement"]], [1, 2, 3, 4])
        self.assertEqual(schema["itemListElement"][-1]["item"], "http://testserver" + self.group.get_absolute_url())
        self.assertNotIn("initial", response.context["catalog_initial_data"]["root"])

    def test_api_supplies_same_metadata_as_direct_page(self):
        response, _ = self.get_html(self.group.get_absolute_url())
        payload = self.client.get("/api/catalog-node/", {"id": "group:luminaires"}).json()
        self.assertEqual(payload["node"]["seo"], response.context["catalog_seo"])

    def test_same_group_and_system_names_in_different_directions_have_distinct_titles(self):
        other_direction = Direction.objects.create(block=self.block, slug="tech-equipment", title="ТХ")
        other_system = CatalogSystem.objects.create(
            direction=other_direction, slug="stage-lighting", title=self.system.title)
        other_group = ProductGroup.objects.create(
            system=other_system, slug="stage-luminaires", title=self.group.title)
        titles = []
        for group in [self.group, other_group]:
            response, _ = self.get_html(group.get_absolute_url())
            titles.append(response.context["catalog_seo"]["title"])
        self.assertNotEqual(*titles)

    def test_schema_and_metadata_escape_titles(self):
        self.group.title = '</script><script>alert("x")</script> & "свет"'
        self.group.save()
        _, html = self.get_html(self.group.get_absolute_url())
        raw = re.search(r'id="catalogBreadcrumbData">(.*?)</script>', html, re.S).group(1)
        self.assertNotIn("<", raw)
        self.assertEqual(json.loads(raw)["itemListElement"][-1]["name"], self.group.title)
        self.assertNotIn('<script>alert("x")</script>', html)
        self.assertEqual(json.loads(script_json(self.group.title)), self.group.title)

    def test_sitemap_contains_catalog_and_solutions_but_not_legacy_or_query_urls(self):
        CatalogSystem.objects.create(direction=self.direction, slug="wood-based-panel-materials", title="Legacy")
        response, _ = self.get_html("/sitemap.xml")
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = [row.text for row in ElementTree.fromstring(response.content).findall("s:url/s:loc", ns)]
        for path in ["/", "/about/", "/contacts/", "/catalog/", "/vendors/", "/partners/",
                     self.block.get_absolute_url(), self.direction.get_absolute_url(),
                     self.system.get_absolute_url(), self.group.get_absolute_url(),
                     "/solutions/", "/solutions/eltex/"]:
            self.assertIn("http://testserver" + path, urls)
        self.assertEqual(len(urls), len(set(urls)))
        self.assertFalse(any("?" in url or "wood-based-panel-materials" in url for url in urls))
        robots = self.client.get("/robots.txt").content.decode()
        self.assertIn("Sitemap: http://testserver/sitemap.xml", robots)
        self.assertIn("Disallow: /api/", robots)
        self.assertIn("User-agent: GPTBot\nDisallow: /", robots)

    def test_core_page_canonicals_exclude_tracking_parameters(self):
        for path in ["/", "/about/", "/contacts/"]:
            with self.subTest(path=path):
                _, html = self.get_html(path + "?utm_source=test")
                canonical = HeadParser(html).select("link", rel="canonical")
                self.assertEqual(canonical, [{"rel": "canonical", "href": "http://testserver" + path}])
