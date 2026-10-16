"""Approved material placements shared by targeted sync and legacy redirects."""
import json
from django.conf import settings

REVISION = json.loads((settings.BASE_DIR / 'data_import/catalog_material_revision.json').read_text(encoding='utf-8'))
MATERIAL_SLUGS = frozenset(row['slug'] for row in REVISION['moves'])
