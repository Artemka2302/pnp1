import copy
import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.templatetags.static import static

from .catalog_images import catalog_image_payload


REGISTRY_DIR = Path(settings.BASE_DIR) / "data_import" / "vendor_products"
REGISTRY_FILES = (REGISTRY_DIR / "eltex_switches.json",)


def _models_label(count):
    count = int(count or 0)
    if count % 10 == 1 and count % 100 != 11:
        noun = "модель"
    elif count % 10 in {2, 3, 4} and count % 100 not in {12, 13, 14}:
        noun = "модели"
    else:
        noun = "моделей"
    return f"{count} {noun}"


@lru_cache(maxsize=1)
def _catalogs_by_group():
    catalogs = {}
    for path in REGISTRY_FILES:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        group_slug = str(payload.get("product_group_slug") or "").strip()
        if not group_slug:
            continue
        payload["vendor"]["logo"] = static(payload["vendor"].get("logo") or "")
        for family in payload.get("families") or []:
            family["count_label"] = _models_label(family.get("count"))
            for product in family.get("products") or []:
                if product.get("image"):
                    product.update(catalog_image_payload(product["image"]))
                else:
                    product["image"] = ""
        catalogs[group_slug] = payload
    return catalogs


def vendor_catalog_for_group(group_slug):
    catalog = _catalogs_by_group().get(str(group_slug or ""))
    return copy.deepcopy(catalog) if catalog else None


def search_vendor_products(query, *, limit=8):
    needle = str(query or "").strip().casefold()
    if len(needle) < 2:
        return []

    results = []
    for catalog in _catalogs_by_group().values():
        for family in catalog.get("families") or []:
            for product in family.get("products") or []:
                haystack = " ".join(
                    str(product.get(field) or "")
                    for field in ("model", "name", "code")
                ).casefold()
                if needle not in haystack:
                    continue
                results.append(
                    {
                        "vendor": catalog.get("vendor") or {},
                        "product_group_slug": catalog.get("product_group_slug") or "",
                        "family": {
                            "title": family.get("title") or "",
                            "short_title": family.get("short_title") or "",
                        },
                        "product": copy.deepcopy(product),
                    }
                )
                if len(results) >= limit:
                    return results
    return results
