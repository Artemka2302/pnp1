"""Portable, file-backed library of manufacturer presentations (no DB changes)."""

import json
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from django.conf import settings
from django.urls import reverse


@lru_cache(maxsize=1)
def solution_library():
    source = Path(settings.BASE_DIR) / "data_import" / "solutions.json"
    return json.loads(source.read_text(encoding="utf-8"))["vendors"]


def solution_vendors():
    return [
        {**vendor, "url": reverse("solution_vendor", args=[vendor["slug"]])}
        for vendor in solution_library()
        if vendor["documents"]
    ]


def find_solution_vendor(slug):
    return next((vendor for vendor in solution_library() if vendor["slug"] == slug), None)


def solution_documents(vendor):
    return [
        {
            **document,
            "url": reverse("solution_document", args=[vendor["slug"], document["slug"]]),
        }
        for document in vendor["documents"]
    ]


def solution_ai_context(page):
    """Only curated descriptions are sent to AI; PDF text is treated as source data."""
    parts = urlsplit(page).path.strip("/").split("/")
    if not parts or parts[0] != "solutions":
        return None
    vendors = solution_library() if len(parts) == 1 else [find_solution_vendor(parts[1])]
    materials = []
    for vendor in vendors:
        if vendor is None:
            continue
        for document in solution_documents(vendor):
            if len(parts) > 2 and document["slug"] != parts[2]:
                continue
            materials.append({
                "manufacturer": vendor["name"],
                "title": document["title"],
                "summary": document["summary"],
                "page_count": document["pages"],
                "url": document["url"],
            })
    return materials or None
