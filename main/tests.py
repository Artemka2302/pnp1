import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.http import HttpResponse
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.test import RequestFactory

from .ai import (
    AiConfigurationError,
    AiResponseError,
    normalize_ai_history,
    normalize_lead_draft,
    parse_ai_result,
)
from .bitrix import build_bitrix_comment, build_bitrix_payload
from .middleware import CatalogCrawlThrottleMiddleware
from .models import (
    CatalogBlock,
    CatalogSystem,
    ConsentLog,
    CookieConsentLog,
    Direction,
    Lead,
    LeadItem,
    ProductGroup,
    ProductType,
    Vendor,
)


class PublicRouteSmokeTests(TestCase):
    def test_healthcheck_reports_database_availability(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})

    @classmethod
    def setUpTestData(cls):
        call_command("import_pnp_data", verbosity=0)

    def setUp(self):
        cache.clear()
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

    @override_settings(BITRIX_SITE_BUTTON_URL="https://example.bitrix24.ru/upload/crm/site_button/loader_test.js")
    def test_base_exposes_public_bitrix_livechat_loader(self):
        response = self.client.get("/")

        self.assertContains(
            response,
            'data-bitrix-livechat-src="https://example.bitrix24.ru/upload/crm/site_button/loader_test.js"',
        )

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
        vendors = list(Vendor.objects.filter(name__in=["Eltex", "YADRO"]).order_by("name"))
        self.assertEqual(len(vendors), 2)

        response = self.client.get(
            "/vendors/",
            {"vendors": [vendor.slug for vendor in vendors]},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Eltex", data["cloud_html"])
        self.assertIn("YADRO", data["cloud_html"])
        self.assertNotIn("Kaspersky", data["cloud_html"])
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
        self.assertTrue(data["groups"])
        self.assertTrue(any(item.get("target") for group in data["groups"] for item in group["items"]))

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

    def test_catalog_page_contains_only_lazy_catalog_data(self):
        response = self.client.get("/catalog/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "catalogInitialData")
        self.assertContains(response, "data-catalog-v2")
        self.assertNotContains(response, "catalogInteractiveData")
        self.assertNotContains(response, "catalogSearchData")
        self.assertNotContains(response, "catalog-legacy-only")
        self.assertLess(len(response.content), 100_000)

    def test_catalog_node_api_loads_one_level_at_a_time(self):
        root_response = self.client.get("/api/catalog-node/", {"id": "root"})

        self.assertEqual(root_response.status_code, 200)
        root_data = root_response.json()
        self.assertEqual(root_data["node"]["id"], "root")
        self.assertEqual(len(root_data["children"]), 5)
        self.assertTrue(all(child["kind"] == "block" for child in root_data["children"]))
        self.assertTrue(all(child["children"] == [] for child in root_data["children"]))

        block_response = self.client.get("/api/catalog-node/", {"id": "block:building-materials"})
        self.assertEqual(block_response.status_code, 200)
        block_data = block_response.json()
        self.assertEqual(block_data["node"]["kind"], "block")
        self.assertTrue(block_data["children"])
        self.assertTrue(all(child["kind"] == "direction" for child in block_data["children"]))

    def test_product_group_uses_the_same_lightweight_catalog_shell(self):
        response = self.client.get(
            "/catalog/building-materials/constructive/wood-based-panel-materials/plywood/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "catalogInitialData")
        self.assertContains(response, "group:plywood")
        self.assertNotContains(response, "catalogSearchData")
        self.assertLess(len(response.content), 150_000)

    def test_robots_file_blocks_api_filters_and_gptbot(self):
        response = self.client.get("/robots.txt")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/plain; charset=utf-8")
        self.assertContains(response, "User-agent: GPTBot")
        self.assertContains(response, "Disallow: /api/")
        self.assertContains(response, "Disallow: /*?")

    def test_filtered_vendor_page_is_noindex_with_clean_canonical(self):
        response = self.client.get("/vendors/", {"q": "Eltex"})

        self.assertContains(response, '<meta name="robots" content="noindex,follow">', html=True)
        self.assertContains(response, '<link rel="canonical" href="http://testserver/vendors/">', html=True)


class CatalogCrawlThrottleTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = RequestFactory()
        self.middleware = CatalogCrawlThrottleMiddleware(lambda request: HttpResponse("ok"))

    def tearDown(self):
        cache.clear()

    def test_repeated_crawler_requests_are_throttled(self):
        for _ in range(self.middleware.crawler_limit):
            request = self.factory.get("/catalog/", HTTP_USER_AGENT="GPTBot/1.0", REMOTE_ADDR="203.0.113.8")
            self.assertEqual(self.middleware(request).status_code, 200)

        request = self.factory.get("/catalog/", HTTP_USER_AGENT="GPTBot/1.0", REMOTE_ADDR="203.0.113.8")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], str(self.middleware.window_seconds))


class MiniRequestApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(HTTP_HOST="testserver")
        self.media_root = tempfile.mkdtemp()
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, ignore_errors=True)
        self.addCleanup(cache.clear)
        self.bitrix_patcher = patch(
            "main.views.send_lead_to_bitrix",
            return_value={"configured": False, "sent": False},
        )
        self.bitrix_patcher.start()
        self.addCleanup(self.bitrix_patcher.stop)
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
                "consent": "1",
                "request_text": "Заявка из каталога:\nДревесные плитные материалы: Фанера\n- Фанера ФСФ",
                "items": json.dumps(["Древесные плитные материалы|Фанера|Фанера ФСФ"]),
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadItem.objects.count(), 1)
        self.assertEqual(ConsentLog.objects.count(), 1)
        item = LeadItem.objects.get()
        self.assertEqual(item.product_group, self.group)
        self.assertEqual(item.product_type, self.product_type)

    def test_api_requires_consent(self):
        response = self.client.post(
            "/api/mini-request/",
            data={
                "source": "catalog_mini",
                "product_group_slug": self.group.slug,
                "contact_name": "Test User",
                "phone": "+7 900 000-00-00",
                "request_text": "Нужна фанера",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ConsentLog.objects.count(), 0)

    def test_api_rejects_invalid_email(self):
        response = self.client.post(
            "/api/mini-request/",
            data={
                "source": "catalog_mini",
                "contact_name": "Test User",
                "phone": "+7 900 000-00-00",
                "email": "bad-email",
                "consent": "1",
                "request_text": "Нужна фанера",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)

    def test_api_rejects_disallowed_upload_extension(self):
        bad_file = SimpleUploadedFile(
            "payload.exe",
            b"MZ fake executable",
            content_type="application/x-msdownload",
        )
        response = self.client.post(
            "/api/mini-request/",
            data={
                "source": "catalog_mini",
                "contact_name": "Test User",
                "phone": "+7 900 000-00-00",
                "consent": "1",
                "request_text": "Проверьте файл",
                "specification": bad_file,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)

    def test_api_accepts_pdf_upload_and_randomizes_storage_name(self):
        pdf_file = SimpleUploadedFile(
            "specification.pdf",
            b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF",
            content_type="application/pdf",
        )
        response = self.client.post(
            "/api/mini-request/",
            data={
                "source": "ai_chat",
                "contact_name": "Test User",
                "phone": "+7 900 000-00-00",
                "direction": "Быстрая помощь",
                "category": "AI-помощник",
                "consent": "1",
                "request_text": "Проверьте спецификацию",
                "specification": pdf_file,
            },
        )

        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get()
        upload = lead.uploads.get()
        self.assertEqual(lead.source, Lead.SOURCE_AI_CHAT)
        self.assertEqual(lead.direction, "Быстрая помощь")
        self.assertEqual(upload.original_name, "specification.pdf")
        self.assertTrue(upload.file.name.startswith(f"lead_uploads/{lead.pk}/"))
        self.assertTrue(upload.file.name.endswith(".pdf"))
        self.assertNotIn("specification.pdf", upload.file.name)

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

    def test_cookie_consent_is_logged(self):
        response = self.client.post(
            "/api/cookie-consent/",
            data=json.dumps({"choice": "rejected", "page_url": "http://testserver/catalog/"}),
            content_type="application/json",
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CookieConsentLog.objects.count(), 1)
        self.assertEqual(CookieConsentLog.objects.get().choice, "rejected")


class BitrixPayloadTests(TestCase):
    def test_comment_does_not_duplicate_contact_fields_or_file_paths(self):
        lead = Lead.objects.create(
            contact_name="Test User",
            phone="+79000000000",
            direction="Быстрая помощь",
            message="Нужно подобрать панели",
        )

        comment = build_bitrix_comment(lead)
        payload = build_bitrix_payload(lead)

        self.assertIn("Направление: Быстрая помощь", comment)
        self.assertIn("Нужно подобрать панели", comment)
        self.assertNotIn("Test User", comment)
        self.assertNotIn("+79000000000", comment)
        self.assertNotIn("lead_uploads/", comment)
        self.assertEqual(payload["fields"]["NAME"], "Test User")
        self.assertEqual(payload["fields"]["PHONE"][0]["VALUE"], "+79000000000")


class AiServiceTests(SimpleTestCase):
    def test_normalize_history_filters_invalid_items_and_keeps_last_ten(self):
        history = [
            {"role": "user" if index % 2 == 0 else "assistant", "content": f" message {index} "}
            for index in range(12)
        ]
        history.extend(
            [
                {"role": "system", "content": "ignore"},
                {"role": "user", "content": "   "},
                {"role": "user", "content": 123},
                "invalid",
            ]
        )

        normalized = normalize_ai_history(history)

        self.assertEqual(len(normalized), 10)
        self.assertEqual(normalized[0]["content"], "message 2")
        self.assertEqual(normalized[-1]["content"], "message 11")
        self.assertTrue(all(item["role"] in {"user", "assistant"} for item in normalized))

    def test_normalize_lead_draft_accepts_frontend_aliases(self):
        draft = normalize_lead_draft(
            {
                "category": "Ceiling systems",
                "object": "Moscow warehouse",
                "summary": "Need 800 square meters of panels",
                "missingFields": ["deadline", "deadline", 123],
            }
        )

        self.assertEqual(draft["direction"], "Ceiling systems")
        self.assertEqual(draft["category"], "Ceiling systems")
        self.assertEqual(draft["object_name"], "Moscow warehouse")
        self.assertEqual(draft["message"], "Need 800 square meters of panels")
        self.assertEqual(draft["missing_fields"], ["deadline"])

    def test_parse_result_merges_omitted_fields_from_previous_draft(self):
        content = json.dumps(
            {
                "answer": "The request is ready.",
                "ready": True,
                "lead_draft": {
                    "message": "Need 1000 square meters of panels",
                    "missing_fields": [],
                },
            }
        )

        result = parse_ai_result(
            content,
            previous_draft={
                "direction": "Architecture",
                "category": "Ceiling systems",
                "object_name": "Moscow warehouse",
                "message": "Need 800 square meters of panels",
                "missing_fields": ["deadline"],
            },
        )

        self.assertTrue(result["ready"])
        self.assertEqual(result["lead_draft"]["direction"], "Architecture")
        self.assertEqual(result["lead_draft"]["category"], "Ceiling systems")
        self.assertEqual(result["lead_draft"]["object_name"], "Moscow warehouse")
        self.assertEqual(result["lead_draft"]["message"], "Need 1000 square meters of panels")
        self.assertEqual(result["lead_draft"]["missing_fields"], [])

    def test_parse_result_rejects_non_json_response(self):
        with self.assertRaises(AiResponseError):
            parse_ai_result("not json")

    def test_parse_result_keeps_empty_draft_as_null(self):
        result = parse_ai_result(
            json.dumps({"answer": "How can I help?", "ready": False, "lead_draft": None})
        )

        self.assertFalse(result["ready"])
        self.assertIsNone(result["lead_draft"])


class AiChatApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(HTTP_HOST="testserver")

    def tearDown(self):
        cache.clear()

    @patch("main.views.call_deepseek")
    def test_api_returns_normalized_draft_without_creating_lead(self, mocked_call):
        mocked_call.return_value = json.dumps(
            {
                "answer": "Please specify the deadline.",
                "ready": False,
                "lead_draft": {
                    "direction": "Architecture",
                    "category": "Ceiling systems",
                    "object_name": "Moscow warehouse",
                    "message": "Need 800 square meters of panels",
                    "missing_fields": ["deadline"],
                },
            }
        )

        response = self.client.post(
            "/api/ai-chat/",
            data=json.dumps(
                {
                    "message": "We need ceiling panels.",
                    "consent": True,
                    "history": [],
                    "catalog_items": ["Ceilings|Panels"],
                    "page": "/catalog/",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(response.json()["provider"], "deepseek")
        self.assertEqual(response.json()["lead_draft"]["missing_fields"], ["deadline"])
        self.assertEqual(Lead.objects.count(), 0)
        mocked_call.assert_called_once()

    def test_api_rejects_invalid_json(self):
        response = self.client.post(
            "/api/ai-chat/",
            data="{invalid",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "invalid_json")

    def test_api_requires_csrf_token(self):
        csrf_client = Client(HTTP_HOST="testserver", enforce_csrf_checks=True)

        response = csrf_client.post(
            "/api/ai-chat/",
            data=json.dumps({"message": "Test message", "consent": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    @patch("main.views.call_deepseek")
    def test_api_requires_ai_processing_consent(self, mocked_call):
        response = self.client.post(
            "/api/ai-chat/",
            data=json.dumps({"message": "Test message"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "consent_required")
        mocked_call.assert_not_called()

    @patch("main.views.call_deepseek", side_effect=AiConfigurationError("secret diagnostic"))
    def test_api_hides_configuration_details(self, mocked_call):
        response = self.client.post(
            "/api/ai-chat/",
            data=json.dumps({"message": "Test message", "consent": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"], "ai_not_configured")
        self.assertNotIn("secret diagnostic", response.content.decode("utf-8"))
        mocked_call.assert_called_once()

    @patch("main.views.call_deepseek", return_value="not json")
    def test_api_returns_safe_error_for_invalid_provider_response(self, mocked_call):
        response = self.client.post(
            "/api/ai-chat/",
            data=json.dumps({"message": "Test message", "consent": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["error"], "ai_unavailable")
        mocked_call.assert_called_once()

    @patch("main.views.AI_RATE_LIMIT_MAX", 1)
    @patch("main.views.call_deepseek")
    def test_api_rate_limits_repeated_requests(self, mocked_call):
        mocked_call.return_value = json.dumps(
            {"answer": "Draft updated.", "ready": False, "lead_draft": None}
        )
        payload = json.dumps({"message": "Test message", "consent": True})

        first_response = self.client.post(
            "/api/ai-chat/",
            data=payload,
            content_type="application/json",
            REMOTE_ADDR="192.0.2.10",
        )
        second_response = self.client.post(
            "/api/ai-chat/",
            data=payload,
            content_type="application/json",
            REMOTE_ADDR="192.0.2.10",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)
        self.assertEqual(mocked_call.call_count, 1)
