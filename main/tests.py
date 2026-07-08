import json

from django.core.management import call_command
from django.test import Client, TestCase

from .models import CatalogBlock, CatalogSystem, Direction, Lead, LeadItem, ProductGroup, ProductType, Vendor


class PublicRouteSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("import_pnp_data", verbosity=0)

    def setUp(self):
        self.client = Client(HTTP_HOST="testserver")

    def test_public_routes_match_handoff_smoke(self):
        expected_statuses = {
            "/": 200,
            "/catalog/": 200,
            "/catalog/building-materials/": 200,
            "/catalog/building-materials/constructive/": 200,
            "/catalog/building-materials/constructive/wood-based-panel-materials/": 200,
            "/catalog/building-materials/constructive/wood-based-panel-materials/plywood/": 200,
            "/vendors/?q=kaspersky": 200,
            "/partners/": 200,
            "/solution-constructive-wood-based-panel-materials": 302,
            "/assets/img/logos/partners/prado.webp": 302,
        }
        for url, status_code in expected_statuses.items():
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status_code)

    def test_vendor_ajax_filter_updates_cloud_and_rows(self):
        response = self.client.get(
            "/vendors/",
            {"direction": "it-infrastructure", "q": "Eltex"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Найдено:", data["count_html"])
        self.assertIn("Eltex", data["cloud_html"])
        self.assertIn("data-vendor-chip", data["cloud_html"])
        self.assertIn("vendor-row", data["rows_html"])

    def test_vendor_ajax_filter_accepts_selected_vendors(self):
        vendors = list(Vendor.objects.filter(name__in=["Eltex", "Kaspersky"]).order_by("name"))
        self.assertEqual(len(vendors), 2)

        response = self.client.get(
            "/vendors/",
            {"vendors": [vendor.slug for vendor in vendors]},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Eltex", data["cloud_html"])
        self.assertIn("Kaspersky", data["cloud_html"])
        self.assertGreater(data["cloud_html"].count("data-vendor-chip"), 2)

    def test_catalog_search_api_returns_grouped_results(self):
        response = self.client.get(
            "/api/catalog-search/",
            {"q": "фанера"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["total_count"], 0)
        self.assertIn("Товарные группы", data["html"])
        self.assertIn("catalog-search-path", data["html"])
        self.assertIn("data-request-item", data["html"])

    def test_catalog_search_api_links_vendors_to_vendor_filter(self):
        response = self.client.get(
            "/api/catalog-search/",
            {"q": "Eltex"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["total_count"], 0)
        self.assertIn("Производители", data["html"])
        self.assertIn("vendorRowsSection", data["html"])

    def test_catalog_page_contains_level_navigator_data(self):
        response = self.client.get("/catalog/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "data-catalog-level-shell")
        self.assertContains(response, "catalogLevelData")
        self.assertContains(response, "Каталог по уровням")


class MiniRequestApiTests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="testserver")
        block = CatalogBlock.objects.create(slug="building-materials", title="Строительные материалы")
        direction = Direction.objects.create(block=block, slug="constructive", title="Конструктив")
        system = CatalogSystem.objects.create(
            direction=direction,
            slug="wood-based-panel-materials",
            title="Древесные плитные материалы",
        )
        self.group = ProductGroup.objects.create(system=system, slug="plywood", title="Фанера")
        self.product_type = ProductType.objects.create(product_group=self.group, title="Фанера ФСФ")

    def test_api_creates_lead_with_items(self):
        response = self.client.post(
            "/api/mini-request/",
            data={
                "source": "catalog_mini",
                "product_group_slug": self.group.slug,
                "contact_name": "Test User",
                "phone": "+7 900 000-00-00",
                "request_text": "Заявка из каталога:\nДревесные плитные материалы: Фанера\n- Фанера ФСФ",
                "items": json.dumps(["Древесные плитные материалы|Фанера|Фанера ФСФ"]),
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadItem.objects.count(), 1)
        item = LeadItem.objects.get()
        self.assertEqual(item.product_group, self.group)
        self.assertEqual(item.product_type, self.product_type)

    def test_api_requires_contact(self):
        response = self.client.post(
            "/api/mini-request/",
            data={
                "product_group_slug": self.group.slug,
                "request_text": "Нужна фанера",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)
