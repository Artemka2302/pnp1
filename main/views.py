import hashlib
import json
from urllib.parse import urlencode

from django.contrib.staticfiles import finders
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.urls import reverse
from django.views.decorators.http import require_POST

from .models import (
    CatalogBlock,
    CatalogSystem,
    ConsentLog,
    CookieConsentLog,
    Direction,
    Lead,
    LeadItem,
    Partner,
    ProductGroup,
    ProductType,
    UploadedFile,
    Vendor,
)
from .compliance import (
    CONSENT_VERSION,
    COOKIE_CHOICES,
    COOKIE_TEXT_VERSION,
    PRIVACY_VERSION,
)


def first_existing_static_path(*paths):
    for path in paths:
        if finders.find(path):
            return path
    return ""


def catalog_queryset():
    return CatalogBlock.objects.prefetch_related(
        Prefetch(
            "directions",
            queryset=Direction.objects.prefetch_related(
                Prefetch(
                    "systems",
                    queryset=CatalogSystem.objects.prefetch_related("product_groups"),
                )
            ),
        )
    )


def catalog_tree_queryset():
    return CatalogBlock.objects.prefetch_related(
        Prefetch(
            "directions",
            queryset=Direction.objects.prefetch_related(
                Prefetch(
                    "systems",
                    queryset=CatalogSystem.objects.prefetch_related("product_groups"),
                )
            ),
        )
    ).order_by("sort_order", "title")


def block_cards_queryset():
    return CatalogBlock.objects.prefetch_related("directions").annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
        type_count=Count("directions__systems__product_groups__types", distinct=True),
        vendor_count=Count("directions__systems__product_groups__vendors", distinct=True),
    )


def direction_cards_queryset():
    return Direction.objects.select_related("block").prefetch_related("systems").annotate(
        system_count=Count("systems", distinct=True),
        group_count=Count("systems__product_groups", distinct=True),
        type_count=Count("systems__product_groups__types", distinct=True),
        vendor_count=Count("systems__product_groups__vendors", distinct=True),
    )


def system_cards_queryset():
    return CatalogSystem.objects.select_related("direction__block").prefetch_related("product_groups").annotate(
        group_count=Count("product_groups", distinct=True),
        type_count=Count("product_groups__types", distinct=True),
        vendor_count=Count("product_groups__vendors", distinct=True),
    )


def product_group_cards_queryset():
    return ProductGroup.objects.select_related("system__direction__block").prefetch_related("types", "vendors").annotate(
        type_count=Count("types", distinct=True),
        vendor_count=Count("vendors", distinct=True),
    )


def catalog_stats():
    return {
        "blocks": CatalogBlock.objects.count(),
        "directions": Direction.objects.count(),
        "systems": CatalogSystem.objects.count(),
        "groups": ProductGroup.objects.count(),
        "types": ProductType.objects.count(),
        "vendors": Vendor.objects.count(),
    }


def catalog_search_items():
    items = []

    for block in CatalogBlock.objects.all():
        items.append(
            {
                "level": "Блок",
                "title": block.title,
                "url": block.get_absolute_url(),
                "target": f"block:{block.slug}",
                "path": block.title,
                "aliases": [],
            }
        )

    for direction in Direction.objects.select_related("block"):
        aliases = []
        if direction.slug == "it-infrastructure":
            aliases.extend(["ит", "it"])
        if direction.slug == "eom":
            aliases.extend(["эом", "электрика"])
        if direction.slug == "hvac":
            aliases.extend(["овик", "овик и тепловые сети", "вентиляция", "кондиционирование"])
        items.append(
            {
                "level": "Направление",
                "title": direction.title,
                "url": direction.get_absolute_url(),
                "target": f"direction:{direction.slug}",
                "path": f"{direction.block.title} / {direction.title}",
                "aliases": aliases,
            }
        )

    for system in CatalogSystem.objects.select_related("direction__block"):
        aliases = []
        if "ПО" in system.title or "Программ" in system.title:
            aliases.extend(["по", "software", "программное обеспечение"])
        if "ОВиК" in system.title:
            aliases.extend(["овик"])
        items.append(
            {
                "level": "Система",
                "title": system.title,
                "url": system.get_absolute_url(),
                "target": f"system:{system.slug}",
                "path": f"{system.direction.block.title} / {system.direction.title} / {system.title}",
                "aliases": aliases,
            }
        )

    for group in ProductGroup.objects.select_related("system__direction__block").prefetch_related("types"):
        type_titles = [item.title for item in group.types.all()]
        aliases = list(group.ai_aliases or []) + type_titles
        if "ПО" in group.title or "Программ" in group.title:
            aliases.extend(["по", "software", "программное обеспечение"])
        items.append(
            {
                "level": "Товарная группа",
                "title": group.title,
                "url": group.get_absolute_url(),
                "target": f"group:{group.slug}",
                "path": group.catalog_path,
                "aliases": aliases,
            }
        )

    return items


def catalog_image_url(path):
    if path:
        return static(path)
    return static("assets/img/catalog/empty-photo-placeholder.svg")


def catalog_display_title(value):
    value = str(value or "")
    if not value:
        return value
    return value[:1].upper() + value[1:]


def catalog_interactive_data():
    blocks = CatalogBlock.objects.prefetch_related(
        Prefetch(
            "directions",
            queryset=Direction.objects.prefetch_related(
                Prefetch(
                    "systems",
                    queryset=CatalogSystem.objects.prefetch_related(
                        Prefetch(
                            "product_groups",
                            queryset=ProductGroup.objects.prefetch_related(
                                "types",
                                Prefetch("vendors", queryset=Vendor.objects.order_by("name")),
                            ),
                        )
                    ),
                )
            ),
        )
    ).order_by("sort_order", "title")

    nodes = {}
    root_children = []

    def node_id(kind, slug):
        return f"{kind}:{slug}"

    def type_count_for_groups(groups):
        return sum(len(list(group.types.all())) for group in groups)

    def vendor_count_for_groups(groups):
        vendor_ids = set()
        for group in groups:
            vendor_ids.update(vendor.id for vendor in group.vendors.all())
        return len(vendor_ids)

    for block in blocks:
        block_directions = list(block.directions.all())
        block_systems = [system for direction in block_directions for system in direction.systems.all()]
        block_groups = [group for system in block_systems for group in system.product_groups.all()]
        block_id = node_id("block", block.slug)
        root_children.append(block_id)
        nodes[block_id] = {
            "id": block_id,
            "kind": "block",
            "level": "Блок",
            "title": block.title,
            "summary": block.summary,
            "image": catalog_image_url(block.image),
            "url": block.get_absolute_url(),
            "parent": "root",
            "children": [node_id("direction", direction.slug) for direction in block_directions],
            "chips": [direction.title for direction in block_directions[:4]],
            "stats": [
                {"label": "направлений", "value": len(block_directions)},
                {"label": "систем", "value": len(block_systems)},
                {"label": "групп", "value": len(block_groups)},
            ],
            "breadcrumbs": [{"title": "Каталог", "target": "root"}, {"title": block.title, "target": block_id}],
        }

        for direction in block_directions:
            direction_systems = list(direction.systems.all())
            direction_groups = [group for system in direction_systems for group in system.product_groups.all()]
            direction_id = node_id("direction", direction.slug)
            nodes[direction_id] = {
                "id": direction_id,
                "kind": "direction",
                "level": "Направление",
                "title": direction.title,
                "summary": direction.purpose,
                "image": catalog_image_url(direction.image),
                "url": direction.get_absolute_url(),
                "parent": block_id,
                "children": [node_id("system", system.slug) for system in direction_systems],
                "chips": [system.title for system in direction_systems[:4]],
                "stats": [
                    {"label": "систем", "value": len(direction_systems)},
                    {"label": "групп", "value": len(direction_groups)},
                    {"label": "типов", "value": type_count_for_groups(direction_groups)},
                ],
                "breadcrumbs": [
                    {"title": "Каталог", "target": "root"},
                    {"title": block.title, "target": block_id},
                    {"title": direction.title, "target": direction_id},
                ],
            }

            for system in direction_systems:
                system_groups = list(system.product_groups.all())
                system_id = node_id("system", system.slug)
                nodes[system_id] = {
                    "id": system_id,
                    "kind": "system",
                    "level": "Система",
                    "title": system.title,
                    "summary": f"Откройте товарные группы внутри системы «{system.title}».",
                    "image": catalog_image_url(system.image),
                    "url": system.get_absolute_url(),
                    "parent": direction_id,
                    "children": [node_id("group", group.slug) for group in system_groups],
                    "chips": [group.title for group in system_groups[:4]],
                    "stats": [
                        {"label": "групп", "value": len(system_groups)},
                        {"label": "типов", "value": type_count_for_groups(system_groups)},
                        {"label": "брендов", "value": vendor_count_for_groups(system_groups)},
                    ],
                    "breadcrumbs": [
                        {"title": "Каталог", "target": "root"},
                        {"title": block.title, "target": block_id},
                        {"title": direction.title, "target": direction_id},
                        {"title": system.title, "target": system_id},
                    ],
                }

                for group in system_groups:
                    group_id = node_id("group", group.slug)
                    group_types = list(group.types.all())
                    group_vendors = list(group.vendors.all())
                    nodes[group_id] = {
                        "id": group_id,
                        "kind": "group",
                        "slug": group.slug,
                        "level": "Товарная группа",
                        "title": group.title,
                        "summary": f"Товарная группа внутри системы «{system.title}». Помогаем уточнить исполнение, формат, объём, сроки и требования проекта.",
                        "image": catalog_image_url(group.image),
                        "url": group.get_absolute_url(),
                        "parent": system_id,
                        "children": [],
                        "chips": [catalog_display_title(product_type.title) for product_type in group_types[:4]],
                        "stats": [
                            {"label": "типов", "value": len(group_types) or 1},
                            {"label": "брендов", "value": len(group_vendors)},
                        ],
                        "breadcrumbs": [
                            {"title": "Каталог", "target": "root"},
                            {"title": block.title, "target": block_id},
                            {"title": direction.title, "target": direction_id},
                            {"title": system.title, "target": system_id},
                            {"title": group.title, "target": group_id},
                        ],
                        "systemTitle": system.title,
                        "types": [
                            {"id": product_type.id, "title": catalog_display_title(product_type.title)}
                            for product_type in group_types
                        ] or [{"id": f"group-{group.id}", "title": group.title}],
                        "vendors": [
                            {
                                "name": vendor.name,
                                "slug": vendor.slug,
                                "logo": catalog_image_url(vendor.logo) if vendor.logo else "",
                                "url": f"{reverse('vendors')}?vendors={vendor.slug}#allManufacturers",
                            }
                            for vendor in group_vendors[:12]
                        ],
                    }

    return {
        "root": {
            "id": "root",
            "kind": "root",
            "level": "Каталог",
            "title": "Основные направления поставки",
            "summary": "Каталог построен по разделам проекта: от глобального блока до товарной группы, типа продукции и производителей.",
            "children": root_children,
            "breadcrumbs": [{"title": "Каталог", "target": "root"}],
        },
        "nodes": nodes,
    }


def catalog_base_context(active=None, breadcrumbs=None):
    return {
        "catalog_tree": catalog_tree_queryset(),
        "catalog_search_items": catalog_search_items(),
        "catalog_interactive_data": catalog_interactive_data(),
        "active_catalog": active or {},
        "breadcrumbs": breadcrumbs or [{"title": "Каталог", "url": reverse("catalog")}],
        "stats": catalog_stats(),
    }


def level_context(*, request, level, object_, children, child_level, breadcrumbs, active):
    context = catalog_base_context(active=active, breadcrumbs=breadcrumbs)
    context.update(
        {
            "level": level,
            "object": object_,
            "children": children,
            "child_level": child_level,
        }
    )
    return context


def index(request):
    blocks = catalog_queryset().annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
    )
    partners_qs = Partner.objects.order_by("-show_on_home", "name")

    context = {
        "blocks": blocks,
        "featured_partners": partners_qs,
        "featured_vendors": Vendor.objects.filter(vendorproductgroup__show_on_home=True).distinct()[:24],
        "stats": {
            "blocks": CatalogBlock.objects.count(),
            "directions": Direction.objects.count(),
            "systems": CatalogSystem.objects.count(),
            "groups": ProductGroup.objects.count(),
            "vendors": Vendor.objects.count(),
        },
    }
    return render(request, "main/home.html", context)


def about(request):
    context = {
        "stats": {
            "blocks": CatalogBlock.objects.count(),
            "directions": Direction.objects.count(),
            "systems": CatalogSystem.objects.count(),
            "groups": ProductGroup.objects.count(),
            "vendors": Vendor.objects.count(), 
        },
        "blocks": CatalogBlock.objects.all(),
    }
    return render(request, "main/about.html", context)


def contacts(request):
    return render(
        request,
        "main/contacts.html",
        {
            "directions": Direction.objects.select_related("block"),
        },
    )


def catalog_node_image(image, fallback="assets/img/catalog/empty-photo-placeholder.svg"):
    return static(image or fallback)


def catalog_block_node_id(block):
    return f"block:{block.slug}"


def catalog_direction_node_id(direction):
    return f"direction:{direction.slug}"


def catalog_system_node_id(direction, system):
    return f"system:{direction.slug}:{system.slug}"


def catalog_group_node_id(direction, system, group):
    return f"group:{direction.slug}:{system.slug}:{group.slug}"


def catalog_vendor_payload(vendor):
    return {
        "name": vendor.name,
        "slug": vendor.slug,
        "logo": static(vendor.logo) if vendor.logo else "",
        "site": vendor.official_site,
        "url": f"{reverse('vendors')}?{urlencode([('vendors', vendor.slug)])}#vendorRowsSection",
    }


def catalog_tree_data():
    product_group_qs = ProductGroup.objects.prefetch_related(
        "types",
        "attributes",
        Prefetch("vendors", queryset=Vendor.objects.order_by("name")),
    )
    system_qs = CatalogSystem.objects.prefetch_related(
        Prefetch("product_groups", queryset=product_group_qs),
    )
    direction_qs = Direction.objects.prefetch_related(
        Prefetch("systems", queryset=system_qs),
    )
    blocks = CatalogBlock.objects.prefetch_related(
        Prefetch("directions", queryset=direction_qs),
    ).order_by("sort_order", "title")

    roots = []
    nodes = {}

    for block in blocks:
        block_id = catalog_block_node_id(block)
        roots.append(block_id)
        directions = list(block.directions.all())
        block_systems = [system for direction in directions for system in direction.systems.all()]
        block_groups = [group for system in block_systems for group in system.product_groups.all()]
        nodes[block_id] = {
            "children": [catalog_direction_node_id(direction) for direction in directions],
            "productTypes": [],
            "brands": [],
            "manufacturers": [],
            "attributes": [],
            "aliases": [],
            "stats": [
                {"value": len(directions), "label": "направлений"},
                {"value": len(block_systems), "label": "систем"},
                {"value": len(block_groups), "label": "групп"},
            ],
            "id": block_id,
            "level": "global_block",
            "label": "Блок",
            "title": block.title,
            "summary": block.summary,
            "image": catalog_node_image(block.image, "assets/img/hero-cover.webp"),
            "url": reverse("catalog_block", args=[block.slug]),
            "path": [block.title],
        }

        for direction in directions:
            direction_id = catalog_direction_node_id(direction)
            systems = list(direction.systems.all())
            direction_groups = [group for system in systems for group in system.product_groups.all()]
            direction_type_count = sum(group.types.count() for group in direction_groups)
            nodes[direction_id] = {
                "children": [catalog_system_node_id(direction, system) for system in systems],
                "productTypes": [],
                "brands": [],
                "manufacturers": [],
                "attributes": [],
                "aliases": [],
                "stats": [
                    {"value": len(systems), "label": "систем"},
                    {"value": len(direction_groups), "label": "групп"},
                    {"value": direction_type_count, "label": "типов"},
                ],
                "id": direction_id,
                "parent": block_id,
                "level": "direction",
                "label": "Направление",
                "title": direction.title,
                "summary": direction.purpose or block.title,
                "image": catalog_node_image(direction.image, "assets/img/hero-cover.webp"),
                "url": reverse("catalog_direction", args=[block.slug, direction.slug]),
                "path": [block.title, direction.title],
            }

            for system in systems:
                system_id = catalog_system_node_id(direction, system)
                groups = list(system.product_groups.all())
                system_vendors = {}
                for group in groups:
                    for vendor in group.vendors.all():
                        system_vendors.setdefault(vendor.slug, vendor)
                nodes[system_id] = {
                    "children": [catalog_group_node_id(direction, system, group) for group in groups],
                    "productTypes": [],
                    "brands": [vendor.name for vendor in system_vendors.values()],
                    "manufacturers": [catalog_vendor_payload(vendor) for vendor in list(system_vendors.values())[:12]],
                    "attributes": [],
                    "aliases": [],
                    "stats": [
                        {"value": len(groups), "label": "групп"},
                        {"value": sum(group.types.count() for group in groups), "label": "типов"},
                        {"value": len(system_vendors), "label": "брендов"},
                    ],
                    "id": system_id,
                    "parent": direction_id,
                    "level": "system",
                    "label": "Система",
                    "title": system.title,
                    "summary": f"Подбор внутри раздела «{direction.title}»: проверяем назначение, совместимость, сроки и требования проекта.",
                    "image": catalog_node_image(system.image),
                    "url": reverse("catalog_system", args=[block.slug, direction.slug, system.slug]),
                    "path": [block.title, direction.title, system.title],
                }

                for group in groups:
                    group_id = catalog_group_node_id(direction, system, group)
                    types = [product_type.title for product_type in group.types.all()]
                    attributes = [attribute.title for attribute in group.attributes.all()]
                    vendors = list(group.vendors.all())
                    nodes[group_id] = {
                        "children": [],
                        "productTypes": types,
                        "brands": [vendor.name for vendor in vendors],
                        "manufacturers": [catalog_vendor_payload(vendor) for vendor in vendors[:12]],
                        "attributes": attributes,
                        "aliases": group.ai_aliases or [],
                        "stats": [
                            {"value": len(types), "label": "типов"},
                            {"value": len(vendors), "label": "брендов"},
                            {"value": len(attributes), "label": "характеристик"},
                        ],
                        "id": group_id,
                        "parent": system_id,
                        "level": "product_group",
                        "label": "Товарная группа",
                        "title": group.title,
                        "summary": group.crm_comment_hint
                        or f"Товарная группа внутри системы «{system.title}». Помогаем уточнить исполнение, формат, объём, сроки и требования проекта.",
                        "image": catalog_node_image(group.image),
                        "url": reverse("product_group", args=[block.slug, direction.slug, system.slug, group.slug]),
                        "path": [block.title, direction.title, system.title, group.title],
                    }

    return {
        "roots": roots,
        "nodes": nodes,
        "initialActiveId": roots[0] if roots else "",
    }


def privacy(request):
    return render(request, "main/privacy.html")


def consent(request):
    return render(request, "main/consent.html")


def catalog(request):
    blocks = block_cards_queryset()
    context = catalog_base_context()
    context.update({"blocks": blocks})
    return render(
        request,
        "main/catalog.html",
        context,
    )


def group_path_parts(group):
    return [
        group.system.direction.block.title,
        group.system.direction.title,
        group.system.title,
        group.title,
    ]


def group_url(group):
    return reverse(
        "product_group",
        args=[
            group.system.direction.block.slug,
            group.system.direction.slug,
            group.system.slug,
            group.slug,
        ],
    )


def catalog_result_item(kind, title, path_parts, url, summary="", request_item="", vendors=None, related_groups=None, logo_url=""):
    return {
        "kind": kind,
        "title": title,
        "path": " / ".join(part for part in path_parts if part),
        "url": url,
        "summary": summary,
        "request_item": request_item,
        "vendors": vendors or [],
        "related_groups": related_groups or [],
        "logo_url": logo_url,
    }


def catalog_group_result(group):
    vendors = [
        {
            "name": vendor.name,
            "url": f"{reverse('vendors')}?{urlencode([('vendors', vendor.slug)])}#vendorRowsSection",
            "logo_url": static(vendor.logo) if vendor.logo else "",
        }
        for vendor in list(group.vendors.all())[:4]
    ]
    return catalog_result_item(
        "Товарная группа",
        group.title,
        group_path_parts(group),
        group_url(group),
        summary=group.crm_comment_hint or group.system.title,
        request_item=f"{group.system.title}|{group.title}|{group.title}",
        vendors=vendors,
    )


def catalog_type_result(product_type):
    group = product_type.product_group
    return catalog_result_item(
        "Тип продукции",
        product_type.title.capitalize(),
        group_path_parts(group),
        group_url(group),
        summary=f"{group.system.title} / {group.title}",
        request_item=f"{group.system.title}|{group.title}|{product_type.title.capitalize()}",
    )


def catalog_vendor_result(vendor):
    groups = list(vendor.product_groups.all())
    related_groups = []
    for group in groups[:3]:
        related_groups.append(
            {
                "title": group.title,
                "path": " / ".join(group_path_parts(group)),
                "url": group_url(group),
            }
        )
    return catalog_result_item(
        "Производитель",
        vendor.name,
        [group_path_parts(groups[0])[1] if groups else "Производители"],
        f"{reverse('vendors')}?{urlencode([('vendors', vendor.slug)])}#vendorRowsSection",
        summary=vendor.notes or "Связанный производитель из базы каталога.",
        related_groups=related_groups,
        logo_url=static(vendor.logo) if vendor.logo else "",
    )


def catalog_search_groups(query):
    query = (query or "").strip()
    if not query:
        return []

    section_items = []
    blocks = (
        CatalogBlock.objects.filter(Q(title__icontains=query) | Q(summary__icontains=query))
        .annotate(child_count=Count("directions", distinct=True))
        .order_by("sort_order", "title")[:3]
    )
    for block in blocks:
        section_items.append(
            catalog_result_item(
                "Блок",
                block.title,
                [block.title],
                reverse("catalog_block", args=[block.slug]),
                summary=block.summary,
            )
        )

    directions = (
        Direction.objects.select_related("block")
        .filter(Q(title__icontains=query) | Q(purpose__icontains=query) | Q(block__title__icontains=query))
        .distinct()
        .order_by("block__sort_order", "sort_order", "title")[:4]
    )
    for direction in directions:
        section_items.append(
            catalog_result_item(
                "Направление",
                direction.title,
                [direction.block.title, direction.title],
                reverse("catalog_direction", args=[direction.block.slug, direction.slug]),
                summary=direction.purpose or direction.block.title,
            )
        )

    systems = (
        CatalogSystem.objects.select_related("direction__block")
        .filter(
            Q(title__icontains=query)
            | Q(direction__title__icontains=query)
            | Q(direction__block__title__icontains=query)
        )
        .distinct()
        .order_by("direction__block__sort_order", "direction__sort_order", "sort_order", "title")[:5]
    )
    for system in systems:
        section_items.append(
            catalog_result_item(
                "Система",
                system.title,
                [system.direction.block.title, system.direction.title, system.title],
                reverse(
                    "catalog_system",
                    args=[system.direction.block.slug, system.direction.slug, system.slug],
                ),
                summary=system.direction.title,
            )
        )

    product_groups = (
        ProductGroup.objects.select_related("system__direction__block")
        .prefetch_related("vendors")
        .filter(
            Q(title__icontains=query)
            | Q(crm_category__icontains=query)
            | Q(crm_comment_hint__icontains=query)
            | Q(system__title__icontains=query)
            | Q(system__direction__title__icontains=query)
            | Q(system__direction__block__title__icontains=query)
            | Q(types__title__icontains=query)
            | Q(attributes__title__icontains=query)
            | Q(vendors__name__icontains=query)
        )
        .distinct()
        .order_by("system__direction__block__sort_order", "system__direction__sort_order", "system__sort_order", "sort_order", "title")[:7]
    )
    group_items = [catalog_group_result(group) for group in product_groups]

    product_types = (
        ProductType.objects.select_related("product_group__system__direction__block")
        .filter(
            Q(title__icontains=query)
            | Q(product_group__title__icontains=query)
            | Q(product_group__system__title__icontains=query)
            | Q(product_group__system__direction__title__icontains=query)
        )
        .distinct()
        .order_by(
            "product_group__system__direction__block__sort_order",
            "product_group__system__direction__sort_order",
            "product_group__system__sort_order",
            "product_group__sort_order",
            "sort_order",
            "title",
        )[:7]
    )
    type_items = [catalog_type_result(product_type) for product_type in product_types]

    vendors = (
        Vendor.objects.prefetch_related(
            Prefetch(
                "product_groups",
                queryset=ProductGroup.objects.select_related("system__direction__block").order_by("system__direction__title", "system__title", "title"),
            )
        )
        .filter(
            Q(name__icontains=query)
            | Q(notes__icontains=query)
            | Q(product_groups__title__icontains=query)
            | Q(product_groups__system__title__icontains=query)
            | Q(product_groups__system__direction__title__icontains=query)
        )
        .distinct()
        .order_by("name")[:7]
    )
    vendor_items = [catalog_vendor_result(vendor) for vendor in vendors]

    result_groups = [
        {"title": "Разделы каталога", "items": section_items},
        {"title": "Товарные группы", "items": group_items},
        {"title": "Типы продукции", "items": type_items},
        {"title": "Производители", "items": vendor_items},
    ]
    return [group for group in result_groups if group["items"]]


def catalog_search_api(request):
    query = request.GET.get("q", "").strip()
    result_groups = catalog_search_groups(query)
    total_count = sum(len(group["items"]) for group in result_groups)
    context = {
        "query": query,
        "result_groups": result_groups,
        "total_count": total_count,
    }
    return JsonResponse(
        {
            "html": render_to_string("main/partials/catalog_search_results.html", context, request=request),
            "total_count": total_count,
        }
    )


def catalog_block(request, block_slug):
    block = get_object_or_404(block_cards_queryset(), slug=block_slug)
    children = direction_cards_queryset().filter(block=block)
    return render(
        request,
        "main/catalog_level.html",
        level_context(
            request=request,
            level="Блок",
            object_=block,
            children=children,
            child_level="Направление",
            breadcrumbs=[{"title": "Каталог", "url": reverse("catalog")}, {"title": block.title, "url": ""}],
            active={"block": block.slug},
        ),
    )


def catalog_direction(request, block_slug, direction_slug):
    direction = get_object_or_404(
        direction_cards_queryset(),
        slug=direction_slug,
        block__slug=block_slug,
    )
    children = system_cards_queryset().filter(direction=direction)
    return render(
        request,
        "main/catalog_level.html",
        level_context(
            request=request,
            level="Направление",
            object_=direction,
            children=children,
            child_level="Система",
            breadcrumbs=[
                {"title": "Каталог", "url": reverse("catalog")},
                {"title": direction.block.title, "url": direction.block.get_absolute_url()},
                {"title": direction.title, "url": ""},
            ],
            active={"block": direction.block.slug, "direction": direction.slug},
        ),
    )


def catalog_system(request, block_slug, direction_slug, system_slug):
    system = get_object_or_404(
        system_cards_queryset(),
        slug=system_slug,
        direction__slug=direction_slug,
        direction__block__slug=block_slug,
    )
    children = product_group_cards_queryset().filter(system=system)
    return render(
        request,
        "main/catalog_level.html",
        level_context(
            request=request,
            level="Система",
            object_=system,
            children=children,
            child_level="Товарная группа",
            breadcrumbs=[
                {"title": "Каталог", "url": reverse("catalog")},
                {"title": system.direction.block.title, "url": system.direction.block.get_absolute_url()},
                {"title": system.direction.title, "url": system.direction.get_absolute_url()},
                {"title": system.title, "url": ""},
            ],
            active={
                "block": system.direction.block.slug,
                "direction": system.direction.slug,
                "system": system.slug,
            },
        ),
    )


def product_group(request, block_slug, direction_slug, system_slug, group_slug):
    group = get_object_or_404(
        ProductGroup.objects.select_related("system__direction__block").prefetch_related(
            "types",
            "attributes",
            Prefetch("vendors", queryset=Vendor.objects.order_by("name")),
        ),
        slug=group_slug,
        system__slug=system_slug,
        system__direction__slug=direction_slug,
        system__direction__block__slug=block_slug,
    )
    context = catalog_base_context(
        active={
            "block": group.system.direction.block.slug,
            "direction": group.system.direction.slug,
            "system": group.system.slug,
            "group": group.slug,
        },
        breadcrumbs=[
            {"title": "Каталог", "url": reverse("catalog")},
            {"title": group.system.direction.block.title, "url": group.system.direction.block.get_absolute_url()},
            {"title": group.system.direction.title, "url": group.system.direction.get_absolute_url()},
            {"title": group.system.title, "url": group.system.get_absolute_url()},
            {"title": group.title, "url": ""},
        ],
    )
    context.update({"group": group})
    return render(request, "main/product_group.html", context)


def request_param(request, *names):
    for name in names:
        value = request.GET.get(name, "").strip()
        if value:
            return value
    return ""


def vendor_filter_params(request):
    vendor_values = []
    for name in ("vendors", "vendor", "vendor_slug"):
        vendor_values.extend(value.strip() for value in request.GET.getlist(name) if value.strip())

    return {
        "query": request_param(request, "q", "vendorSearch"),
        "block": request_param(request, "block", "vendorBlock"),
        "direction": request_param(request, "direction", "vendorDirection"),
        "system": request_param(request, "system", "vendorSystem"),
        "group": request_param(request, "group", "product_group", "vendorProduct"),
        "vendors": list(dict.fromkeys(vendor_values)),
    }


def apply_vendor_filters(queryset, filters):
    query = filters["query"]
    if query:
        queryset = queryset.filter(
            Q(name__icontains=query)
            | Q(notes__icontains=query)
            | Q(product_groups__title__icontains=query)
            | Q(product_groups__types__title__icontains=query)
            | Q(product_groups__system__title__icontains=query)
            | Q(product_groups__system__direction__title__icontains=query)
            | Q(product_groups__system__direction__block__title__icontains=query)
        )
    if filters["block"]:
        queryset = queryset.filter(
            Q(product_groups__system__direction__block__slug=filters["block"])
            | Q(product_groups__system__direction__block__title=filters["block"])
        )
    if filters["direction"]:
        queryset = queryset.filter(
            Q(product_groups__system__direction__slug=filters["direction"])
            | Q(product_groups__system__direction__title=filters["direction"])
        )
    if filters["system"]:
        queryset = queryset.filter(
            Q(product_groups__system__slug=filters["system"])
            | Q(product_groups__system__title=filters["system"])
        )
    if filters["group"]:
        queryset = queryset.filter(
            Q(product_groups__slug=filters["group"])
            | Q(product_groups__title=filters["group"])
        )
    if filters["vendors"]:
        queryset = queryset.filter(Q(slug__in=filters["vendors"]) | Q(name__in=filters["vendors"]))
    return queryset.distinct()


def vendor_page_context(request):
    filters = vendor_filter_params(request)
    vendor_base_qs = Vendor.objects.filter(vendorproductgroup__show_in_vendors=True)
    vendors_qs = apply_vendor_filters(vendor_base_qs, filters).order_by("name")
    cloud_filters = {**filters, "vendors": []}
    cloud_vendors_qs = apply_vendor_filters(vendor_base_qs, cloud_filters).order_by("name")

    group_rows_qs = ProductGroup.objects.filter(vendorproductgroup__show_in_vendors=True)
    query = filters["query"]
    if query:
        group_rows_qs = group_rows_qs.filter(
            Q(title__icontains=query)
            | Q(types__title__icontains=query)
            | Q(system__title__icontains=query)
            | Q(system__direction__title__icontains=query)
            | Q(system__direction__block__title__icontains=query)
            | Q(vendors__name__icontains=query)
            | Q(vendors__notes__icontains=query)
        )
    if filters["block"]:
        group_rows_qs = group_rows_qs.filter(
            Q(system__direction__block__slug=filters["block"])
            | Q(system__direction__block__title=filters["block"])
        )
    if filters["direction"]:
        group_rows_qs = group_rows_qs.filter(
            Q(system__direction__slug=filters["direction"])
            | Q(system__direction__title=filters["direction"])
        )
    if filters["system"]:
        group_rows_qs = group_rows_qs.filter(
            Q(system__slug=filters["system"])
            | Q(system__title=filters["system"])
        )
    if filters["group"]:
        group_rows_qs = group_rows_qs.filter(Q(slug=filters["group"]) | Q(title=filters["group"]))
    if filters["vendors"]:
        group_rows_qs = group_rows_qs.filter(Q(vendors__slug__in=filters["vendors"]) | Q(vendors__name__in=filters["vendors"]))

    group_rows_qs = (
        group_rows_qs.select_related("system__direction__block")
        .prefetch_related(Prefetch("vendors", queryset=vendors_qs))
        .distinct()
        .order_by(
            "system__direction__block__sort_order",
            "system__direction__sort_order",
            "system__sort_order",
            "sort_order",
            "title",
        )
    )

    group_rows_paginator = Paginator(group_rows_qs, 10)
    group_rows_page_obj = group_rows_paginator.get_page(request.GET.get("rows_page"))
    group_rows_query_params = request.GET.copy()
    group_rows_query_params.pop("rows_page", None)

    blocks = CatalogBlock.objects.annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
        vendor_count=Count("directions__systems__product_groups__vendors", distinct=True),
    )
    directions = Direction.objects.select_related("block").order_by("block__sort_order", "sort_order", "title")
    direction_cards = list(directions.annotate(
        system_count=Count("systems", distinct=True),
        group_count=Count("systems__product_groups", distinct=True),
        vendor_count=Count("systems__product_groups__vendors", distinct=True),
    ))
    preview_vendor_rows = (
        Vendor.objects.filter(
            product_groups__system__direction__in=direction_cards,
            vendorproductgroup__show_in_vendors=True,
        )
        .exclude(logo="")
        .values(
            "product_groups__system__direction_id",
            "name",
            "logo",
        )
        .distinct()
        .order_by("product_groups__system__direction_id", "name")
    )
    preview_vendors_by_direction = {}
    for vendor in preview_vendor_rows:
        direction_id = vendor["product_groups__system__direction_id"]
        preview_vendors_by_direction.setdefault(direction_id, [])
        if len(preview_vendors_by_direction[direction_id]) < 3:
            preview_vendors_by_direction[direction_id].append(vendor)
    for direction in direction_cards:
        direction.preview_vendors = preview_vendors_by_direction.get(direction.id, [])
        direction.vendor_icon = first_existing_static_path(
            f"assets/img/vendors/directions/{direction.slug}.svg",
            f"assets/img/vendors/mini-cards/{direction.slug}.svg",
        )
    selected_vendors = Vendor.objects.none()
    if filters["vendors"]:
        selected_vendors = Vendor.objects.filter(Q(slug__in=filters["vendors"]) | Q(name__in=filters["vendors"])).order_by("name")
    vendor_options = list(
        Vendor.objects.filter(vendorproductgroup__show_in_vendors=True)
        .distinct()
        .order_by("name")
        .values("slug", "name")
    )

    return {
        "filters": filters,
        "query": filters["query"],
        "selected_vendors": selected_vendors,
        "vendor_options": vendor_options,
        "blocks": blocks,
        "directions": directions,
        "direction_cards": direction_cards,
        "systems": CatalogSystem.objects.select_related("direction__block").order_by(
            "direction__block__sort_order",
            "direction__sort_order",
            "sort_order",
            "title",
        ),
        "product_groups": ProductGroup.objects.select_related("system__direction__block").order_by(
            "system__direction__block__sort_order",
            "system__direction__sort_order",
            "system__sort_order",
            "sort_order",
            "title",
        ),
        "vendors": cloud_vendors_qs[:500],
        "group_rows": group_rows_page_obj.object_list,
        "group_rows_page_obj": group_rows_page_obj,
        "group_rows_querystring": group_rows_query_params.urlencode(),
        "filtered_vendor_count": vendors_qs.count(),
        "filtered_group_count": group_rows_qs.count(),
        "vendor_count": Vendor.objects.filter(vendorproductgroup__show_in_vendors=True).distinct().count(),
        "group_count": ProductGroup.objects.filter(vendorproductgroup__show_in_vendors=True).distinct().count(),
    }


def vendors(request):
    context = vendor_page_context(request)
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse(
            {
                "count_html": render_to_string("main/partials/vendor_count.html", context, request=request),
                "cloud_html": render_to_string("main/partials/vendor_cloud.html", context, request=request),
                "rows_html": render_to_string("main/partials/vendor_rows.html", context, request=request),
            }
        )
    return render(request, "main/vendors.html", context)


def partner_parent_category(category):
    return (category or "").split("/", 1)[0].strip()


def partner_parent_category_filter(category):
    return (
        Q(category=category)
        | Q(category__startswith=f"{category}/")
        | Q(category__startswith=f"{category} /")
    )


def normalize_partner_vendor_key(value):
    return "".join(char for char in (value or "").casefold().replace("ё", "е") if char.isalnum())


def attach_partner_vendor_urls(partners):
    partner_list = list(partners)
    if not partner_list:
        return partner_list

    vendors = list(
        Vendor.objects
        .filter(vendorproductgroup__show_in_vendors=True)
        .distinct()
        .only("slug", "name")
    )
    vendors_by_slug = {vendor.slug: vendor for vendor in vendors}
    vendors_by_name = {}
    for vendor in vendors:
        key = normalize_partner_vendor_key(vendor.name)
        if key and key not in vendors_by_name:
            vendors_by_name[key] = vendor

    vendors_url = reverse("vendors")
    for partner in partner_list:
        vendor = (
            vendors_by_slug.get(partner.slug)
            or vendors_by_name.get(normalize_partner_vendor_key(partner.name))
        )
        if vendor:
            partner.vendor_filter_url = f"{vendors_url}?{urlencode({'vendors': vendor.slug})}#allManufacturers"
            partner.vendor_filter_match = vendor.name
        else:
            partner.vendor_filter_url = f"{vendors_url}?{urlencode({'q': partner.name})}#allManufacturers"
            partner.vendor_filter_match = ""
    return partner_list


def partners(request):
    query = request.GET.get("q", "").strip()
    categories = [
        value.strip()
        for value in request.GET.getlist("category")
        if value.strip()
    ]

    base_qs = Partner.objects.filter(show_on_partners=True)

    if query:
        base_qs = base_qs.filter(
            Q(name__icontains=query)
            | Q(category__icontains=query)
            | Q(note__icontains=query)
        )

    category_counts = {}
    for item in base_qs.exclude(category="").values_list("category", flat=True):
        title = partner_parent_category(item)
        if not title:
            continue
        category_counts[title] = category_counts.get(title, 0) + 1

    partner_categories = [
        {"title": title, "count": count}
        for title, count in sorted(category_counts.items())
    ]

    partners_qs = base_qs
    if categories:
        category_filter = Q()
        for category in categories:
            category_filter |= partner_parent_category_filter(category)
        partners_qs = partners_qs.filter(category_filter)

    paginator = Paginator(partners_qs.order_by("priority", "name"), 9)
    page_obj = paginator.get_page(request.GET.get("page"))
    pagination_params = []
    if query:
        pagination_params.append(("q", query))
    pagination_params.extend(("category", category) for category in categories)

    def partner_page_url(page_number):
        params = [*pagination_params, ("page", page_number)]
        return f"?{urlencode(params)}"

    page_items = []
    for page_number in paginator.get_elided_page_range(page_obj.number, on_each_side=1, on_ends=1):
        if page_number == paginator.ELLIPSIS:
            page_items.append({"ellipsis": True})
        else:
            page_items.append(
                {
                    "number": page_number,
                    "url": partner_page_url(page_number),
                    "is_current": page_number == page_obj.number,
                }
            )

    context = {
        "partners": attach_partner_vendor_urls(page_obj.object_list),
        "page_obj": page_obj,
        "pagination": {
            "has_pages": page_obj.has_other_pages(),
            "previous_url": partner_page_url(page_obj.previous_page_number()) if page_obj.has_previous() else "",
            "next_url": partner_page_url(page_obj.next_page_number()) if page_obj.has_next() else "",
            "items": page_items,
        },
        "filters": {
            "q": query,
            "categories": categories,
        },
        "partner_categories": partner_categories,
        "total_count": base_qs.count(),
    }
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse(
            {
                "categories_html": render_to_string("main/partials/partner_category_chips.html", context, request=request),
                "results_html": render_to_string("main/partials/partner_results.html", context, request=request),
            }
        )
    return render(request, "main/partners.html", context)


def payload_value(payload, key, default=""):
    if hasattr(payload, "get"):
        value = payload.get(key, default)
    else:
        value = default
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip()
    return value


def payload_bool(payload, key, default=False):
    value = payload_value(payload, key, "")
    if value == "":
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on", "да"}


def payload_to_dict(payload):
    if hasattr(payload, "lists"):
        return {
            key: values if len(values) > 1 else values[0]
            for key, values in payload.lists()
            if key != "csrfmiddlewaretoken"
        }
    if isinstance(payload, dict):
        return {key: value for key, value in payload.items() if key != "csrfmiddlewaretoken"}
    return {}


def request_page_url(request, payload):
    page_url = payload_value(payload, "page_url")
    if page_url:
        return str(page_url)[:1200]
    referer = request.META.get("HTTP_REFERER", "")
    if referer:
        return referer[:1200]
    return request.build_absolute_uri()[:1200]


def submitted_fields_hash(payload, uploaded_files=None):
    safe_payload = payload_to_dict(payload)
    safe_payload.pop("csrfmiddlewaretoken", None)
    files = [
        {
            "name": uploaded_file.name,
            "size": uploaded_file.size,
            "content_type": uploaded_file.content_type or "",
        }
        for uploaded_file in (uploaded_files or [])
    ]
    fingerprint = json.dumps(
        {"fields": safe_payload, "files": files},
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()


def parse_payload(request):
    if request.content_type == "application/json":
        try:
            return json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return None
    return request.POST


def parse_request_items(raw_items):
    if not raw_items:
        return []
    if isinstance(raw_items, str):
        try:
            raw_items = json.loads(raw_items)
        except json.JSONDecodeError:
            raw_items = [raw_items]
    if isinstance(raw_items, dict):
        raw_items = [raw_items]
    if not isinstance(raw_items, list):
        return []

    parsed_items = []
    for item in raw_items:
        if isinstance(item, str):
            parts = [part.strip() for part in item.split("|") if part.strip()]
            system_title = parts[0] if len(parts) == 3 else ""
            group_title = parts[1] if len(parts) == 3 else parts[0] if parts else ""
            type_title = parts[2] if len(parts) == 3 else parts[1] if len(parts) > 1 else ""
            parsed_items.append(
                {
                    "system_title": system_title,
                    "product_group_title": group_title,
                    "product_type_title": type_title,
                    "raw_item": item,
                }
            )
            continue

        if isinstance(item, dict):
            parsed_items.append(
                {
                    "product_group_slug": str(item.get("product_group_slug") or item.get("group_slug") or "").strip(),
                    "product_type_id": str(item.get("product_type_id") or "").strip(),
                    "system_title": str(item.get("system_title") or item.get("system") or "").strip(),
                    "product_group_title": str(
                        item.get("product_group_title") or item.get("group_title") or item.get("group") or ""
                    ).strip(),
                    "product_type_title": str(
                        item.get("product_type_title") or item.get("type_title") or item.get("type") or ""
                    ).strip(),
                    "quantity": str(item.get("quantity") or "").strip(),
                    "comment": str(item.get("comment") or "").strip(),
                    "raw_item": item,
                }
            )

    return [item for item in parsed_items if item.get("product_group_title") or item.get("product_group_slug")]


def resolve_product_group(group_slug="", group_title="", system_title=""):
    groups = ProductGroup.objects.select_related("system__direction__block")
    if group_slug:
        group = groups.filter(slug=group_slug).first()
        if group:
            return group
    if not group_title:
        return None
    groups = groups.filter(title__iexact=group_title)
    if system_title:
        groups = groups.filter(system__title__iexact=system_title)
    return groups.first()


def resolve_product_type(product_group, item):
    if not product_group:
        return None
    product_type_id = item.get("product_type_id")
    if product_type_id:
        product_type = ProductType.objects.filter(pk=product_type_id, product_group=product_group).first()
        if product_type:
            return product_type
    product_type_title = item.get("product_type_title")
    if product_type_title:
        return ProductType.objects.filter(product_group=product_group, title__iexact=product_type_title).first()
    return None


def client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR") or None


def request_files(request):
    files = []
    for field_name in request.FILES:
        files.extend(request.FILES.getlist(field_name))
    return files


@require_POST
def catalog_request_api(request):
    payload = parse_payload(request)
    if payload is None:
        return JsonResponse({"ok": False, "error": "Некорректный JSON."}, status=400)

    contact_name = payload_value(payload, "contact_name") or payload_value(payload, "name")
    phone = payload_value(payload, "phone")
    email = payload_value(payload, "email")
    company = payload_value(payload, "company")
    message = payload_value(payload, "message") or payload_value(payload, "comment")
    category = payload_value(payload, "category")
    object_name = payload_value(payload, "object")
    if category or object_name:
        details = []
        if category:
            details.append(f"Направление: {category}")
        if object_name:
            details.append(f"Объект: {object_name}")
        if message:
            details.append(message)
        message = "\n".join(details)
    request_text = payload_value(payload, "request_text")
    source = payload_value(payload, "source", Lead.SOURCE_CATALOG_MINI)
    product_group_slug = payload_value(payload, "product_group_slug")
    product_group_title = payload_value(payload, "product_group_title")
    items = parse_request_items(payload_value(payload, "items"))
    uploaded_files = request_files(request)
    consent_value = payload_bool(payload, "consent")

    allowed_sources = {choice[0] for choice in Lead.SOURCE_CHOICES}
    if source not in allowed_sources:
        source = Lead.SOURCE_CATALOG_REQUEST

    if not consent_value:
        return JsonResponse({"ok": False, "error": "Подтвердите согласие на обработку данных."}, status=400)
    if not phone and not email:
        return JsonResponse({"ok": False, "error": "Укажите телефон или email."}, status=400)
    if not items and not request_text and not message and not uploaded_files:
        return JsonResponse({"ok": False, "error": "Добавьте позицию или комментарий к заявке."}, status=400)

    product_group = resolve_product_group(product_group_slug, product_group_title)
    raw_payload = payload_to_dict(payload)

    with transaction.atomic():
        lead = Lead.objects.create(
            source=source,
            contact_name=contact_name,
            phone=phone,
            email=email,
            company=company,
            category=category,
            object_name=object_name,
            message=message,
            request_text=request_text,
            consent=consent_value,
            product_group=product_group,
            catalog_path=product_group.catalog_path if product_group else "",
            raw_payload=raw_payload,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            ip_address=client_ip(request),
            user=request.user if request.user.is_authenticated else None,
        )

        created_items = 0
        for sort_order, item in enumerate(items, start=1):
            item_group = resolve_product_group(
                item.get("product_group_slug", ""),
                item.get("product_group_title", ""),
                item.get("system_title", ""),
            ) or product_group
            product_type = resolve_product_type(item_group, item)
            LeadItem.objects.create(
                lead=lead,
                product_group=item_group,
                product_type=product_type,
                system_title=item.get("system_title") or (item_group.system.title if item_group else ""),
                product_group_title=item.get("product_group_title") or (item_group.title if item_group else ""),
                product_type_title=item.get("product_type_title") or (product_type.title if product_type else ""),
                quantity=item.get("quantity", ""),
                comment=item.get("comment", ""),
                raw_item=item.get("raw_item") if isinstance(item.get("raw_item"), dict) else item,
                sort_order=sort_order,
            )
            created_items += 1

        if not created_items and product_group:
            LeadItem.objects.create(
                lead=lead,
                product_group=product_group,
                system_title=product_group.system.title,
                product_group_title=product_group.title,
                raw_item={"product_group_slug": product_group.slug},
            )
            created_items = 1

        uploaded_count = 0
        for uploaded_file in uploaded_files:
            UploadedFile.objects.create(
                lead=lead,
                file=uploaded_file,
                original_name=uploaded_file.name[:255],
                content_type=(uploaded_file.content_type or "")[:120],
                size=uploaded_file.size,
            )
            uploaded_count += 1

        ConsentLog.objects.create(
            lead=lead,
            request_id=str(lead.pk),
            form_type=source,
            consent_version=CONSENT_VERSION,
            privacy_version=PRIVACY_VERSION,
            page_url=request_page_url(request, payload),
            ip_address=client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            checkbox_value=consent_value,
            file_upload_fact=bool(uploaded_files),
            submitted_fields_hash=submitted_fields_hash(payload, uploaded_files),
        )

    return JsonResponse(
        {
            "ok": True,
            "lead_id": lead.pk,
            "status": lead.status,
            "items_count": created_items,
            "uploaded_files_count": uploaded_count,
        },
        status=201,
    )


@require_POST
def cookie_consent_api(request):
    payload = parse_payload(request)
    if payload is None:
        return JsonResponse({"ok": False, "error": "Некорректный JSON."}, status=400)

    choice = payload_value(payload, "choice")
    if choice not in COOKIE_CHOICES:
        return JsonResponse({"ok": False, "error": "Некорректное значение cookie-согласия."}, status=400)

    log = CookieConsentLog.objects.create(
        consent_version=CONSENT_VERSION,
        privacy_version=PRIVACY_VERSION,
        cookie_text_version=COOKIE_TEXT_VERSION,
        choice=choice,
        page_url=request_page_url(request, payload),
        ip_address=client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        raw_payload=payload_to_dict(payload),
    )
    return JsonResponse(
        {
            "ok": True,
            "consent_id": str(log.consent_id),
            "choice": log.choice,
            "consent_version": CONSENT_VERSION,
            "privacy_version": PRIVACY_VERSION,
            "cookie_text_version": COOKIE_TEXT_VERSION,
            "timestamp": log.timestamp.isoformat(),
        },
        status=201,
    )


def legacy_asset_redirect(request, path):
    """Redirect old exported-site asset URLs to Django static assets."""
    return redirect(static(f"assets/{path}"))


def legacy_page(request, page):
    """Keep human-readable old slugs working without keeping old huge HTML files."""
    if page in {"catalog", "vendors", "partners", "about", "contacts"}:
        return redirect(page)

    if page.startswith("catalog-"):
        block_slug = page.removeprefix("catalog-")
        block = get_object_or_404(CatalogBlock, slug=block_slug)
        return redirect("catalog_block", block_slug=block.slug)

    if page.startswith("solution-"):
        suffix = page.removeprefix("solution-")
        directions = Direction.objects.select_related("block").order_by("-slug")
        for direction in directions:
            if suffix == direction.slug:
                return redirect("catalog_direction", block_slug=direction.block.slug, direction_slug=direction.slug)
            prefix = f"{direction.slug}-"
            if not suffix.startswith(prefix):
                continue
            child_slug = suffix.removeprefix(prefix)
            system = CatalogSystem.objects.filter(direction=direction, slug=child_slug).first()
            if system:
                return redirect(
                    "catalog_system",
                    block_slug=direction.block.slug,
                    direction_slug=direction.slug,
                    system_slug=system.slug,
                )
            group = ProductGroup.objects.filter(system__direction=direction, slug=child_slug).select_related(
                "system__direction__block"
            ).first()
            if group:
                return redirect(
                    "product_group",
                    block_slug=group.system.direction.block.slug,
                    direction_slug=group.system.direction.slug,
                    system_slug=group.system.slug,
                    group_slug=group.slug,
                )

    raise Http404(page)


def base(request):
    return redirect("index")
