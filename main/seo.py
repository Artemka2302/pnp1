"""Public catalogue metadata; no changes to catalogue IDs or CRM mappings."""

import json

from django.urls import reverse

from .catalog_sections import PROJECT_DIRECTIONS
from .catalog_duplicates import GROUP_ALIASES
from .models import CatalogBlock, CatalogSystem, Direction, ProductGroup
from .solutions import solution_documents, solution_vendors


def catalog_metadata(node):
    if node["kind"] == "root":
        return {
            "title": "Каталог материалов и оборудования для комплектации объектов — ПНП",
            "description": (
                "Материалы и оборудование по разделам проекта: АР, КР, инженерные системы, "
                "ИТ, технологические решения и безопасность. Подбор по спецификации, "
                "комплектация и поставки по России и Беларуси."
            ),
        }
    context = ""
    if node["kind"] in ("system", "group"):
        context = " · ".join(row["title"] for row in node["breadcrumbs"][1:-1])
    title = node["title"]
    if context:
        title = f"{title} — {context}"
    return {
        "title": f"{title} — подбор и поставка | ПНП",
        "description": (
            f'{node["title"]}{f" ({context})" if context else ""}. '
            "Подбор материалов и оборудования по спецификации для проектных организаций "
            "и строительных компаний. Комплектация объектов в России и Беларуси."
        ),
    }


def script_json(value):
    """JSON safe inside an HTML script element, including untrusted DB titles."""
    return json.dumps(value, ensure_ascii=False).translate(
        {ord("<"): r"\u003C", ord(">"): r"\u003E", ord("&"): r"\u0026"}
    )


def breadcrumb_data(request, node):
    rows = node.get("breadcrumbs", [])
    if not rows:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index,
                "name": row["title"],
                "item": request.build_absolute_uri(row["url"]),
            }
            for index, row in enumerate(rows, 1)
        ],
    }


def catalog_template_context(request, initial):
    current = initial.get("initial", initial["root"])
    node = current["node"]
    groups = {}
    for direction in initial["root"]["children"]:
        section = direction.get("projectSection") or {}
        key = section.get("group", "additional")
        group = groups.setdefault(key, {
            "key": key, "title": section.get("groupTitle", "Другие направления"),
            "directions": [],
        })
        group["directions"].append(direction)
    return {
        "catalog_node": node,
        "catalog_children": current["children"],
        "catalog_project_groups": list(groups.values()),
        "catalog_seo": node["seo"],
        "catalog_breadcrumbs": node.get("breadcrumbs", [])[:-1],
        "catalog_breadcrumb_json": script_json(breadcrumb_data(request, node)),
        "catalog_content_heading": {
            "block": "Направления", "direction": "Системы",
            "system": "Товарные группы", "group": "Подбор по товарной группе",
        }.get(node["kind"], ""),
    }


def sitemap_paths():
    paths = [reverse(name) for name in (
        "index", "about", "contacts", "catalog", "vendors", "partners", "solutions",
    )]
    # Only published project directions; exclude old records left for redirects.
    paths.extend(block.get_absolute_url() for block in CatalogBlock.objects.filter(
        directions__slug__in=PROJECT_DIRECTIONS).distinct().order_by("pk"))
    paths.extend(row.get_absolute_url() for row in Direction.objects.filter(
        slug__in=PROJECT_DIRECTIONS).select_related("block").order_by("pk"))
    paths.extend(row.get_absolute_url() for row in CatalogSystem.objects.filter(
        direction__slug__in=PROJECT_DIRECTIONS
    ).exclude(slug="wood-based-panel-materials").select_related("direction__block").order_by("pk"))
    paths.extend(row.get_absolute_url() for row in ProductGroup.objects.filter(
        system__direction__slug__in=PROJECT_DIRECTIONS
    ).exclude(system__slug="wood-based-panel-materials").exclude(slug__in=GROUP_ALIASES).select_related(
        "system__direction__block").order_by("pk"))
    for vendor in solution_vendors():
        paths.append(vendor["url"])
        paths.extend(item["url"] for item in solution_documents(vendor))
    return list(dict.fromkeys(paths))
