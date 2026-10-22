"""Portable, file-backed library of manufacturer and supplier presentations."""

import json
from itertools import zip_longest
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


def homepage_solution_showcase():
    """Interleave brands; optional home_cover affects only the homepage preview."""
    vendors = []
    batches = []
    for vendor in solution_vendors():
        if vendor.get("published", True) is False:
            continue
        documents = [doc for doc in solution_documents(vendor)
                     if doc.get("published", True) is not False and doc.get("pdf")]
        if not documents:
            continue
        vendors.append({**vendor, "document_count": len(documents)})
        batches.append([{**doc, "vendor_slug": vendor["slug"],
                         "vendor_name": vendor["name"], "vendor_url": vendor["url"],
                         "vendor_logo": vendor.get("logo", ""),
                         "vendor_logo_on_dark": vendor.get("logo_on_dark", False)}
                        for doc in documents])
    documents = [doc for row in zip_longest(*batches) for doc in row if doc is not None]
    return {"vendors": vendors, "documents": documents}


def solution_sections(vendor):
    """Optional two-level grouping; preserve all existing document URLs."""
    sections = vendor.get("sections", [])
    if not sections:
        return []
    documents = {document["slug"]: document for document in solution_documents(vendor)}
    used_documents = set()
    used_anchors = set()

    def resolve(section, parent="", depth=0):
        if depth > 1:
            raise ValueError("Solution sections support at most two levels")
        anchor = f"{parent}-{section['slug']}" if parent else f"solution-{vendor['slug']}-{section['slug']}"
        if anchor in used_anchors:
            raise ValueError(f"Duplicate solution section: {anchor}")
        used_anchors.add(anchor)
        resolved = []
        for slug in section.get("documents", []):
            if slug not in documents or slug in used_documents:
                raise ValueError(f"Unknown or repeated section document: {slug}")
            used_documents.add(slug)
            resolved.append(documents[slug])
        children = [resolve(child, anchor, depth + 1) for child in section.get("children", [])]
        return {**section, "anchor": anchor, "documents": resolved, "children": children,
                "document_count": len(resolved) + sum(child["document_count"] for child in children)}

    result = [resolve(section) for section in sections]
    if used_documents != set(documents):
        raise ValueError("Every presentation must belong to exactly one section")
    return result


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
