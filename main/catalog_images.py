"""Shared responsive photo URLs for the home page and catalog API."""

import json
from functools import lru_cache

from django.conf import settings
from django.templatetags.static import static


PLACEHOLDER = "assets/img/catalog/empty-photo-placeholder.svg"


@lru_cache(maxsize=1)
def image_variants():
    manifest = settings.BASE_DIR / "data_import/catalog_image_variants.json"
    if not manifest.is_file():
        return {}
    return json.loads(manifest.read_text(encoding="utf-8"))


def catalog_image_payload(path):
    variants = image_variants().get(path)
    if not variants:
        return {"image": static(path or PLACEHOLDER)}

    largest = variants[-1]
    unique_widths = {}
    for item in variants:
        unique_widths[item["width"]] = item
    responsive = [unique_widths[width] for width in sorted(unique_widths)]
    return {
        "image": static(largest["path"]),
        "image_srcset": ", ".join(
            f'{static(item["path"])} {item["width"]}w' for item in responsive
        ),
        "image_width": largest["width"],
        "image_height": largest["height"],
    }
