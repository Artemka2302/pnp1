"""Public catalogue metadata; no changes to catalogue IDs or CRM mappings."""

import json

from django.urls import reverse
from django.templatetags.static import static

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
        "@id": request.build_absolute_uri(node["url"]) + "#breadcrumbs",
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


def catalog_collection_data(request, node):
    canonical = request.build_absolute_uri(node["url"])
    data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": canonical + "#webpage",
        "url": canonical,
        "name": node["title"],
        "description": node["seo"]["description"],
        "inLanguage": "ru-RU",
    }
    if node.get("breadcrumbs"):
        data["breadcrumb"] = {"@id": canonical + "#breadcrumbs"}
    return data


def solution_page_context(request, vendor=None, document=None, official_site=""):
    """Metadata comes from the same curated records as visible page content."""
    canonical = request.build_absolute_uri(request.path)
    title = "Решения для вашего бизнеса — ПНП"
    description = (
        "Решения производителей для строительных объектов: материалы, ИТ-инфраструктура, "
        "инженерные системы, безопасность и вертикальный транспорт. Презентации и PDF."
    )
    rows = [{"title": "Главная", "url": reverse("index")},
            {"title": "Решения", "url": reverse("solutions")}]
    page = {"@type": "CollectionPage"}
    image = ""
    if vendor:
        title = f"{vendor['name']} — решения и подбор продукции | ПНП"
        description = f"{vendor['description']} Материалы {vendor['name']}, товарные группы и подбор по требованиям проекта."
        rows.append({"title": vendor["name"], "url": reverse("solution_vendor", args=[vendor["slug"]])})
        image = request.build_absolute_uri(static(vendor["logo"])) if vendor.get("logo") else ""
        brand = {"@type": "Brand", "name": vendor["name"]}
        if image:
            brand["logo"] = image
        if official_site:
            brand["sameAs"] = official_site
        page = {"@type": "WebPage", "about": brand}
    if document:
        title = f"{document['title']} — презентация {vendor['name']} — ПНП"
        description = f"{document['description']} Презентация {vendor['name']}, {document['pages']} страниц. Просмотр и скачивание PDF."
        rows.append({"title": document["title"], "url": document["url"]})
        if document.get("cover"):
            image = request.build_absolute_uri(static(document["cover"]))
        page["mainEntity"] = {
            "@type": "DigitalDocument", "name": document["title"],
            "description": document["description"], "url": canonical,
            "encoding": {"@type": "MediaObject", "encodingFormat": "application/pdf",
                         "contentUrl": request.build_absolute_uri(static(document["pdf"]))},
        }
    page.update({"@id": canonical + "#webpage", "url": canonical, "name": title,
                 "description": description, "inLanguage": "ru-RU",
                 "breadcrumb": {"@id": canonical + "#breadcrumbs"}})
    breadcrumbs = breadcrumb_data(request, {"url": request.path, "breadcrumbs": rows})
    breadcrumbs.pop("@context")
    return {
        "page_seo": {"title": title, "description": description, "url": canonical, "image": image},
        "page_schema_json": script_json({"@context": "https://schema.org", "@graph": [page, breadcrumbs]}),
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
        "catalog_collection_json": script_json(catalog_collection_data(request, node)),
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
