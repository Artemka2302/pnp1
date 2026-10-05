import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree

from django.conf import settings
from django.test import SimpleTestCase

from .ai import build_ai_messages
from .solutions import solution_documents, solution_vendors


class SolutionLibraryTests(SimpleTestCase):
    def test_landing_uses_approved_hero_icons_and_cards(self):
        response = self.client.get('/solutions/')
        self.assertContains(response, 'solutions-hero pnp-mobile-standard-hero')
        self.assertContains(response, '<i aria-hidden="true"><svg viewBox="0 0 24 24">', count=3)
        self.assertContains(response, 'partner-card partner-card-link solution-vendor-card')
        self.assertContains(response, 'pnp-btn-primary" href="/contacts/#request-form">Отправить заявку</a>')
        self.assertContains(response, 'pnp-btn-secondary" href="#solutionManufacturers">Посмотреть решения</a>')
        self.assertNotContains(response, '<aside class="solution-help">')
        self.assertNotContains(response, '<span class="site-footer-eyebrow">Клиентам</span>')
        self.assertContains(response, 'id="siteFooterCtaTitle"')
        self.assertNotContains(response, '<i aria-hidden="true">01</i>')
        self.assertNotContains(response, '↓')
        response = self.client.get('/solutions/eltex/retail/')
        self.assertContains(response, '<span class="site-footer-eyebrow">Клиентам</span>')
        self.assertContains(response, 'data-solution-download>Скачать PDF</a>')
        self.assertNotContains(response, '↓')

    def test_pages_and_shared_navigation(self):
        response = self.client.get("/solutions/")
        self.assertContains(response, 'data-nav="solutions" class="active"')
        self.assertContains(response, '/solutions/eltex/')
        response = self.client.get("/solutions/eltex/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-solution-document=', count=4)
        self.assertContains(response, '27 стр.')
        for document in solution_documents(solution_vendors()[0]):
            with self.subTest(document=document["slug"]):
                response = self.client.get(document["url"])
                self.assertContains(response, 'data-pdf-reader')
                self.assertContains(response, document["pdf"])
                self.assertContains(response, 'download="Eltex-')

    def test_unknown_documents_and_manufacturers_are_404(self):
        for path in ("/solutions/missing/", "/solutions/eltex/missing/", "/solutions/missing/retail/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)

    def test_search_is_server_side_and_escaped(self):
        self.assertContains(self.client.get("/solutions/", {"q": "банки"}), '/solutions/eltex/')
        response = self.client.get("/solutions/", {"q": '<script>alert(1)</script>'})
        self.assertContains(response, 'Материалы не найдены')
        self.assertNotContains(response, '<script>alert(1)</script>')
        self.assertContains(response, 'noindex,follow')

    def test_sitemap_contains_real_pages(self):
        response = self.client.get("/solutions/sitemap.xml")
        self.assertEqual(response.status_code, 200)
        root = ElementTree.fromstring(response.content)
        locations = root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        self.assertEqual(len(locations), 6)

    def test_originals_and_knowledge_have_matching_hashes(self):
        root = Path(settings.BASE_DIR)
        knowledge = json.loads((root / 'data_import/solutions_knowledge.json').read_text(encoding='utf-8'))
        self.assertEqual(len(knowledge['documents']), 4)
        for document in knowledge['documents']:
            pdf = root / 'static' / document['pdf']
            self.assertTrue(pdf.read_bytes().startswith(b'%PDF-'))
            self.assertEqual(hashlib.sha256(pdf.read_bytes()).hexdigest(), document['sha256'])
            manifest = next(item for item in solution_vendors()[0]['documents'] if item['slug'] == document['document_slug'])
            self.assertEqual(len(document['pages']), manifest['pages'])
            self.assertTrue((root / 'static' / manifest['cover']).is_file())

    def test_ai_context_is_restricted_to_current_document(self):
        messages = build_ai_messages('Подобрать сеть', page='/solutions/eltex/retail/#page=5')
        context = messages[0]['content']
        self.assertIn('Ритейл', context)
        self.assertNotIn('Банковский сектор', context)
        context = build_ai_messages('Подобрать сеть', page='/catalog/')[0]['content']
        self.assertNotIn('manufacturer_presentations', context)
