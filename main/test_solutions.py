import hashlib
import json
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree

from django.conf import settings
from django.test import SimpleTestCase
from django.template.loader import render_to_string

from .ai import build_ai_messages
from .solutions import find_solution_vendor, homepage_solution_showcase, solution_documents, solution_sections, solution_vendors


class SolutionLibraryTests(SimpleTestCase):
    def test_home_showcase_includes_all_current_materials_and_interleaves_brands(self):
        showcase = homepage_solution_showcase()
        vendors = solution_vendors()
        self.assertEqual(len(showcase['documents']), sum(len(v['documents']) for v in vendors))
        self.assertEqual([doc['vendor_slug'] for doc in showcase['documents'][:len(vendors)]],
                         [v['slug'] for v in vendors])
        html = render_to_string('main/partials/home_solutions.html', {'home_solutions': showcase})
        for document in showcase['documents']:
            self.assertIn(f'href="{document["url"]}"', html)
        for vendor in vendors:
            self.assertIn(f'data-solutions-filter="{vendor["slug"]}"', html)

    def test_home_showcase_automatically_includes_new_vendor_and_skips_unpublished(self):
        doc = {'slug': 'new-presentation', 'title': 'Новое решение', 'pdf': 'new.pdf'}
        vendor = {'slug': 'new-brand', 'name': 'Новый бренд', 'url': '/solutions/new-brand/', 'documents': [doc]}
        with patch('main.solutions.solution_vendors', return_value=[
            {**vendor, 'published': False},
            {**vendor, 'documents': [{**doc, 'published': False}, {**doc, 'pdf': ''}]},
            vendor,
        ]):
            showcase = homepage_solution_showcase()
        self.assertEqual(len(showcase['vendors']), 1)
        self.assertEqual(len(showcase['documents']), 1)
        self.assertEqual(showcase['documents'][0]['url'], '/solutions/new-brand/new-presentation/')
        html = render_to_string('main/partials/home_solutions.html', {'home_solutions': showcase})
        self.assertIn('data-solutions-filter="new-brand"', html)
        self.assertIn('Новое решение', html)

    def test_home_showcase_omits_empty_section(self):
        with patch('main.solutions.solution_vendors', return_value=[]):
            showcase = homepage_solution_showcase()
        self.assertEqual(showcase, {'vendors': [], 'documents': []})
        self.assertNotIn('id="homeSolutions"', render_to_string(
            'main/partials/home_solutions.html', {'home_solutions': showcase}))

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

    def test_no_duplicate_help_blocks_anywhere_in_solution_library(self):
        urls = ['/solutions/']
        for vendor in solution_vendors():
            urls.append(vendor['url'])
            urls.extend(document['url'] for document in solution_documents(vendor))
        for url in urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertNotContains(response, 'class="solution-help"')
                self.assertNotContains(response, 'Как применить решение на вашем объекте?')
                self.assertContains(response, 'id="siteFooterCtaTitle"')
        for template in (Path(settings.BASE_DIR) / 'templates').rglob('*.html'):
            with self.subTest(template=template.name):
                self.assertNotIn('class="solution-help"', template.read_text(encoding='utf-8'))

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
        expected = 1 + sum(1 + len(vendor['documents']) for vendor in solution_vendors())
        self.assertEqual(len(locations), expected)
        urls = [item.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text for item in locations]
        self.assertIn('http://testserver/solutions/yadro/', urls)
        self.assertIn('http://testserver/solutions/yadro/tatlin-afa/', urls)

    def test_originals_and_knowledge_have_matching_hashes(self):
        root = Path(settings.BASE_DIR)
        knowledge = json.loads((root / 'data_import/solutions_knowledge.json').read_text(encoding='utf-8'))
        manifest_documents = {
            (vendor['slug'], document['slug']): document
            for vendor in solution_vendors() for document in vendor['documents']
        }
        self.assertEqual(len(knowledge['documents']), len(manifest_documents))
        self.assertEqual(
            {(document['vendor_slug'], document['document_slug']) for document in knowledge['documents']},
            set(manifest_documents),
        )
        for document in knowledge['documents']:
            pdf = root / 'static' / document['pdf']
            self.assertTrue(pdf.read_bytes().startswith(b'%PDF-'))
            self.assertEqual(hashlib.sha256(pdf.read_bytes()).hexdigest(), document['sha256'])
            manifest = manifest_documents[(document['vendor_slug'], document['document_slug'])]
            self.assertEqual(len(document['pages']), manifest['pages'])
            self.assertTrue((root / 'static' / manifest['cover']).is_file())

    def test_yadro_materials_use_shared_pages_and_correct_download_names(self):
        vendor = find_solution_vendor('yadro')
        expected = {'borey': 31, 'kornfeld-se': 39, 'kvadra': 67, 'suprim': 17,
                    'h225-g4': 16, 'vegman-r215-g4': 25, 'tatlin-afa': 56}
        self.assertEqual({item['slug']: item['pages'] for item in vendor['documents']}, expected)
        self.assertEqual(sum(expected.values()), 251)
        self.assertEqual(vendor['logo'], 'assets/img/logos/approved-top/yadro.png')
        self.assertTrue((Path(settings.BASE_DIR) / 'static' / vendor['logo']).is_file())
        response = self.client.get('/solutions/yadro/')
        self.assertContains(response, 'data-solution-document=', count=7)
        self.assertContains(response, 'Решения для вашей инфраструктуры')
        self.assertNotContains(response, 'Eltex')
        for document in solution_documents(vendor):
            with self.subTest(document=document['slug']):
                response = self.client.get(document['url'])
                self.assertContains(response, 'data-pdf-reader')
                self.assertContains(response, document['pdf'])
                self.assertContains(response, f'download="YADRO-{document["slug"]}.pdf"')
                self.assertContains(response, 'class="solution-reader-logo-light"')
                self.assertNotContains(response, 'download="Eltex-')

    def test_yadro_search_and_ai_context(self):
        for query in ('YADRO', 'BOREY', 'СУПРИМ', 'NVMe', 'охлаждение'):
            with self.subTest(query=query):
                response = self.client.get('/solutions/', {'q': query})
                self.assertContains(response, '/solutions/yadro/')
                self.assertNotContains(response, 'href="/solutions/eltex/"')
        context = build_ai_messages('Подобрать охлаждение', page='/solutions/yadro/borey/')[0]['content']
        self.assertIn('BOREY', context)
        self.assertIn('охлаждения', context)
        self.assertNotIn('KORNFELD SE', context)
        self.assertNotIn('Eltex', context)

    def test_ai_context_is_restricted_to_current_document(self):
        messages = build_ai_messages('Подобрать сеть', page='/solutions/eltex/retail/#page=5')
        context = messages[0]['content']
        self.assertIn('Ритейл', context)
        self.assertNotIn('Банковский сектор', context)
        context = build_ai_messages('Подобрать сеть', page='/catalog/')[0]['content']
        self.assertNotIn('manufacturer_presentations', context)

    def test_iss_materials_preserve_supplied_order_and_use_shared_reader(self):
        vendor = find_solution_vendor('iss')
        expected = [('safe-city', 47), ('roads', 21), ('metro', 35), ('airport', 35),
                    ('soffit', 8), ('its', 8), ('avc', 4), ('its-crossroads', 4),
                    ('weigh-station', 12), ('helmet-detector', 10), ('food-industry', 13),
                    ('enterprise', 36), ('situation-center', 24)]
        self.assertEqual([(item['slug'], item['pages']) for item in vendor['documents']], expected)
        self.assertEqual(sum(pages for _, pages in expected), 257)
        self.assertEqual(vendor['logo'], 'assets/img/logos/approved-top/iss.png')
        response = self.client.get('/solutions/iss/')
        self.assertContains(response, 'data-solution-document=', count=13)
        self.assertContains(response, 'Отраслевые решения ISS')
        for document in solution_documents(vendor):
            with self.subTest(document=document['slug']):
                response = self.client.get(document['url'])
                self.assertContains(response, 'data-pdf-reader')
                self.assertContains(response, document['pdf'])
                self.assertContains(response, f'download="ISS-{document["slug"]}.pdf"')
                self.assertContains(response, 'class="solution-reader-logo-light"')
        response = self.client.get('/solutions/sitemap.xml')
        self.assertContains(response, 'http://testserver/solutions/iss/')
        self.assertContains(response, 'http://testserver/solutions/iss/situation-center/')

    def test_iss_search_and_ai_context(self):
        for query in ('ISS', 'SecurOS', 'Перекрёстки', 'Весовой контроль', 'Каски'):
            with self.subTest(query=query):
                response = self.client.get('/solutions/', {'q': query})
                self.assertContains(response, '/solutions/iss/')
                self.assertNotContains(response, 'href="/solutions/eltex/"')
                self.assertNotContains(response, 'href="/solutions/yadro/"')
        context = build_ai_messages('Контроль защитных касок', page='/solutions/iss/helmet-detector/')[0]['content']
        self.assertIn('SecurOS Helmet Detector', context)
        self.assertIn('защитных касок', context)
        self.assertNotIn('SecurOS AVC', context)
        self.assertNotIn('BOREY', context)

    def test_portrait_covers_keep_uniform_uncropped_card_area(self):
        css = (Path(settings.BASE_DIR) / 'static/css/solutions.css').read_text(encoding='utf-8')
        self.assertIn('aspect-ratio: 16 / 9;', css)
        self.assertIn('.solution-document-cover img { width: 100%; height: 100%; object-fit: contain;', css)

    def test_iss_hierarchy_has_three_sections_and_four_transport_subsections(self):
        vendor = find_solution_vendor('iss')
        sections = solution_sections(vendor)
        self.assertEqual([section['slug'] for section in sections], ['safe-city', 'road-transport', 'industry'])
        self.assertEqual([section['document_count'] for section in sections], [1, 7, 5])
        transport = sections[1]['children']
        self.assertEqual([section['slug'] for section in transport], ['its', 'roads', 'metro', 'airport'])
        self.assertEqual([doc['slug'] for doc in transport[0]['documents']], ['soffit', 'its', 'avc', 'its-crossroads'])
        self.assertEqual([doc['slug'] for doc in sections[2]['documents']],
                         ['weigh-station', 'helmet-detector', 'food-industry', 'enterprise', 'situation-center'])
        response = self.client.get('/solutions/iss/')
        self.assertContains(response, 'class="solution-topic"', count=3)
        self.assertContains(response, 'class="solution-subtopic"', count=4)
        self.assertContains(response, 'data-solution-document=', count=13)
        self.assertContains(response, 'href="#solution-iss-road-transport-its"')
        self.assertContains(response, 'id="solution-iss-industry"')

    def test_all_vendor_pages_use_iss_layout_without_section_counters(self):
        expected_sections = {'eltex': 4, 'yadro': 6, 'iss': 3}
        for slug, count in expected_sections.items():
            with self.subTest(vendor=slug):
                vendor = find_solution_vendor(slug)
                sections = solution_sections(vendor)
                self.assertEqual(len(sections), count)
                self.assertEqual(sum(section['document_count'] for section in sections), len(vendor['documents']))
                response = self.client.get(f'/solutions/{slug}/')
                self.assertContains(response, 'class="solution-section-nav"', count=1)
                self.assertContains(response, 'class="solution-topic"', count=count)
                self.assertContains(response, 'data-solution-document=', count=len(vendor['documents']))
                self.assertNotContains(response, 'class="solution-section-count"')
                self.assertContains(response, 'class="solution-document-meta"', count=len(vendor['documents']))
                for section in sections:
                    self.assertContains(response, f'href="#{section["anchor"]}"')
                    self.assertContains(response, f'id="{section["anchor"]}-title"')

    def test_solution_hierarchy_rejects_missing_unknown_and_repeated_documents(self):
        for groups in ([{'slug': 'section', 'documents': []}],
                       [{'slug': 'section', 'documents': ['missing']}],
                       [{'slug': 'section', 'documents': ['doc', 'doc']}],
                       [{'slug': 'section', 'documents': ['doc']}, {'slug': 'section', 'documents': []}],
                       [{'slug': 'section', 'children': [{'slug': 'child', 'children': [{'slug': 'grandchild', 'documents': ['doc']}]}]}]):
            with self.subTest(groups=groups), self.assertRaises(ValueError):
                solution_sections({'slug': 'test', 'documents': [{'slug': 'doc'}], 'sections': groups})

    def test_vendor_background_photos_are_local_and_source_tracked(self):
        for vendor in solution_vendors():
            with self.subTest(vendor=vendor['slug']):
                background = vendor['background']
                self.assertIn(background['source_pdf'], [doc['pdf'] for doc in vendor['documents']])
                self.assertGreater(background['page'], 0)
                image = Path(settings.BASE_DIR) / 'static' / background['image']
                self.assertTrue(image.is_file())
                self.assertLess(image.stat().st_size, 350_000)
                response = self.client.get(vendor['url'])
                self.assertContains(response, 'solution-vendor-intro--photo')
                self.assertContains(response, f'src="/static/{background["image"]}" alt="" aria-hidden="true"')
                self.assertNotContains(self.client.get(solution_documents(vendor)[0]['url']), 'class="solution-vendor-background"')
