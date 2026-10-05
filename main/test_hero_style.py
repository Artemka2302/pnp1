from html.parser import HTMLParser
from pathlib import Path

from django.conf import settings
from django.test import TestCase


class HeroStripParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.strips = []
        self.depth = 0
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if 'pnp-hero-features' in classes:
            self.current = {'items': 0, 'icons': 0}
            self.strips.append(self.current)
            self.depth = 1
        elif self.current is not None:
            if tag == 'div':
                self.depth += 1
            if 'feature-mini' in classes:
                self.current['items'] += 1
            if tag == 'svg':
                self.current['icons'] += 1

    def handle_endtag(self, tag):
        if tag == 'div' and self.current is not None:
            self.depth -= 1
            if self.depth == 0:
                self.current = None


class SharedHeroStyleTests(TestCase):
    def test_about_hero_project_coverage_copy(self):
        response = self.client.get('/about/')
        self.assertContains(response, '<span>Закрываем все<br>разделы проекта</span>', html=True)
        self.assertNotContains(response, '5 ключевых блоков')

    def test_hero_strips_have_three_line_icons_and_shared_styles(self):
        for url in ('/', '/about/', '/vendors/', '/partners/', '/solutions/'):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'css/pnp-hero-features.css')
                parser = HeroStripParser()
                parser.feed(response.content.decode())
                self.assertEqual(parser.strips, [{'items': 3, 'icons': 3}])

    def test_launcher_channels_are_hidden_without_removing_ai_or_manager(self):
        root = Path(settings.BASE_DIR)
        script = (root / 'static/js/site.js').read_text(encoding='utf-8')
        styles = (root / 'static/css/site.css').read_text(encoding='utf-8')
        self.assertIn('class="support-chat-channels" aria-label="Мессенджеры" hidden', script)
        self.assertIn('.support-chat-launcher .support-chat-channels[hidden]', styles)
        self.assertIn('data-support-toggle', script)
        self.assertIn('data-support-mode-option="manager"', script)
