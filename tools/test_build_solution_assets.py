"""Development-only tests: no production, real Poppler, or original PDF mutation."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image
import build_solution_assets as builder


class IncrementalAssetTests(unittest.TestCase):
    def run_builder(self, *, changed=False, rebuild=False, missing_cover=False):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'data_import').mkdir()
            (root / 'static').mkdir()
            pdf = root / 'static/doc.pdf'
            pdf.write_bytes(b'new PDF' if changed else b'old PDF')
            cover = root / 'static/cover.webp'
            if not missing_cover:
                Image.new('RGB', (10, 10), 'blue').save(cover)
            document = {'slug': 'doc', 'title': 'Updated title', 'pdf': 'doc.pdf',
                        'cover': 'cover.webp', 'pages': 1, 'source_filename': 'source.pdf'}
            manifest = {'vendors': [{'slug': 'vendor', 'documents': [document]}]}
            (root / 'data_import/solutions.json').write_text(json.dumps(manifest))
            cached = {'schema_version': 1, 'documents': [{
                'vendor_slug': 'vendor', 'document_slug': 'doc', 'pdf': 'doc.pdf',
                'sha256': hashlib.sha256(b'old PDF').hexdigest(),
                'pages': [{'number': 1, 'text': 'cached text'}],
            }]}
            destination = root / 'data_import/solutions_knowledge.json'
            destination.write_text(json.dumps(cached))
            page = Mock()
            page.extract_text.return_value = 'fresh text'
            reader = Mock(is_encrypted=False, pages=[page])

            def render(command, **kwargs):
                Image.new('RGB', (10, 10), 'white').save(Path(command[-1]).with_suffix('.png'))

            with patch.object(builder, '__file__', str(root / 'tools/builder.py')), \
                 patch.object(builder, 'PdfReader', return_value=reader), \
                 patch.object(builder.subprocess, 'run', side_effect=render) as poppler, \
                 patch.object(sys, 'argv', ['builder'] + (['--rebuild'] if rebuild else [])):
                builder.main()
            result = json.loads(destination.read_text())['documents'][0]
            return result, poppler.call_count, page.extract_text.call_count

    def test_unchanged_pdf_reuses_pages_and_cover_with_updated_metadata(self):
        result, renders, extractions = self.run_builder()
        self.assertEqual((renders, extractions), (0, 0))
        self.assertEqual(result['pages'][0]['text'], 'cached text')
        self.assertEqual(result['title'], 'Updated title')

    def test_changed_pdf_and_explicit_rebuild_regenerate(self):
        for options in ({'changed': True}, {'rebuild': True}):
            with self.subTest(options=options):
                result, renders, extractions = self.run_builder(**options)
                self.assertEqual((renders, extractions), (1, 1))
                self.assertEqual(result['pages'][0]['text'], 'fresh text')

    def test_missing_cover_is_restored_without_reextracting_same_pdf(self):
        _, renders, extractions = self.run_builder(missing_cover=True)
        self.assertEqual((renders, extractions), (1, 0))
