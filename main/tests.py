import json

from django.core.management import call_command
from django.test import Client, TestCase

from .models import CatalogBlock, CatalogSystem, Direction, Lead, LeadItem, ProductGroup, ProductType


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
