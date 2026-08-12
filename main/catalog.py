from django.core.cache import cache
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.http import Http404
from django.templatetags.static import static
from django.urls import reverse

from .models import CatalogBlock, CatalogSystem, Direction, ProductGroup, VendorProductGroup


CATALOG_CACHE_TTL = 15 * 60
CATALOG_CACHE_VERSION_KEY = "pnp:catalog:public-v2:version"

PUBLIC_DIRECTION_SLUGS = (
    "architecture",
    "constructive",
    "it-infrastructure",
    "low-current",
    "tech-equipment",
    "eom",
    "hvac",
    "water",
    "gas",
    "fire",
    "accessibility",
    "vertical-transport",
    "landscaping-and-site-improvement",
    "ev-charging-infrastructure",
)


def public_direction_order_expression(field_name="slug"):
    return Case(
        *[
            When(**{field_name: slug}, then=Value(position))
            for position, slug in enumerate(PUBLIC_DIRECTION_SLUGS)
        ],
        default=Value(len(PUBLIC_DIRECTION_SLUGS)),
        output_field=IntegerField(),
    )


def catalog_cache_version():
    version = cache.get(CATALOG_CACHE_VERSION_KEY)
    if version is None:
        cache.add(CATALOG_CACHE_VERSION_KEY, 1, timeout=None)
        version = cache.get(CATALOG_CACHE_VERSION_KEY) or 1
    return version


def catalog_cache_key(namespace, value=""):
    return f"pnp:catalog:v{catalog_cache_version()}:{namespace}:{value}"


def invalidate_catalog_cache():
    try:
        return cache.incr(CATALOG_CACHE_VERSION_KEY)
    except ValueError:
        cache.set(CATALOG_CACHE_VERSION_KEY, 2, timeout=None)
        return 2


def catalog_node_id(kind, slug):
    return f"{kind}:{slug}"


def catalog_image_url(path):
    return static(path or "assets/img/catalog/empty-photo-placeholder.svg")


def catalog_display_title(value):
    value = str(value or "")
    return value[:1].upper() + value[1:] if value else value


def root_node():
    return {
        "id": "root",
        "kind": "root",
        "level": "Каталог",
        "title": "Каталог",
        "summary": "Выберите раздел проекта, затем систему и товарную группу.",
        "url": reverse("catalog"),
        "parent": "",
        "breadcrumbs": [],
        "children": [],
        "hasChildren": True,
    }


def block_payload(block):
    directions = list(getattr(block, "catalog_directions", []))
    return {
        "id": catalog_node_id("block", block.slug),
        "kind": "block",
        "level": "Блок",
        "title": block.title,
        "summary": block.summary,
        "image": catalog_image_url(block.image),
        "url": block.get_absolute_url(),
        "parent": "root",
        "breadcrumbs": [
            {"title": "Каталог", "target": "root", "url": reverse("catalog")},
            {"title": block.title, "target": catalog_node_id("block", block.slug), "url": block.get_absolute_url()},
        ],
        "children": [],
        "hasChildren": bool(getattr(block, "direction_count", len(directions))),
        "chips": [direction.title for direction in directions[:4]],
        "stats": [
            {"label": "направлений", "value": getattr(block, "direction_count", 0)},
            {"label": "систем", "value": getattr(block, "system_count", 0)},
            {"label": "групп", "value": getattr(block, "group_count", 0)},
        ],
    }


def direction_payload(direction):
    systems = list(getattr(direction, "catalog_systems", []))
    target = catalog_node_id("direction", direction.slug)
    return {
        "id": target,
        "kind": "direction",
        "level": "Раздел проекта",
        "title": direction.title,
        "summary": direction.purpose,
        "image": catalog_image_url(direction.image),
        "url": direction.get_absolute_url(),
        "parent": "root",
        "breadcrumbs": [
            {"title": "Каталог", "target": "root", "url": reverse("catalog")},
            {"title": direction.title, "target": target, "url": direction.get_absolute_url()},
        ],
        "children": [],
        "hasChildren": bool(getattr(direction, "system_count", len(systems))),
        "chips": [system.title for system in systems[:4]],
        "stats": [
            {"label": "систем", "value": getattr(direction, "system_count", 0)},
            {"label": "групп", "value": getattr(direction, "group_count", 0)},
            {"label": "типов", "value": getattr(direction, "type_count", 0)},
        ],
    }


def system_payload(system):
    groups = list(getattr(system, "catalog_groups", []))
    direction = system.direction
    target = catalog_node_id("system", system.slug)
    return {
        "id": target,
        "kind": "system",
        "level": "Система",
        "title": system.title,
        "summary": f"Выберите товарную группу внутри системы «{system.title}».",
        "image": catalog_image_url(system.image),
        "url": system.get_absolute_url(),
        "parent": catalog_node_id("direction", direction.slug),
        "breadcrumbs": [
            {"title": "Каталог", "target": "root", "url": reverse("catalog")},
            {"title": direction.title, "target": catalog_node_id("direction", direction.slug), "url": direction.get_absolute_url()},
            {"title": system.title, "target": target, "url": system.get_absolute_url()},
        ],
        "children": [],
        "hasChildren": bool(getattr(system, "group_count", len(groups))),
        "chips": [group.title for group in groups[:4]],
        "stats": [
            {"label": "групп", "value": getattr(system, "group_count", 0)},
            {"label": "типов", "value": getattr(system, "type_count", 0)},
            {"label": "брендов", "value": getattr(system, "vendor_count", 0)},
        ],
    }


def group_payload(group):
    system = group.system
    direction = system.direction
    product_types = list(group.types.all())
    vendor_links = list(getattr(group, "catalog_vendor_links", []))
    vendors = [link.vendor for link in vendor_links]
    target = catalog_node_id("group", group.slug)
    return {
        "id": target,
        "kind": "group",
        "slug": group.slug,
        "level": "Товарная группа",
        "title": group.title,
        "summary": group.crm_comment_hint or f"Товарная группа внутри системы «{system.title}».",
        "image": catalog_image_url(group.image),
        "url": group.get_absolute_url(),
        "parent": catalog_node_id("system", system.slug),
        "breadcrumbs": [
            {"title": "Каталог", "target": "root", "url": reverse("catalog")},
            {"title": direction.title, "target": catalog_node_id("direction", direction.slug), "url": direction.get_absolute_url()},
            {"title": system.title, "target": catalog_node_id("system", system.slug), "url": system.get_absolute_url()},
            {"title": group.title, "target": target, "url": group.get_absolute_url()},
        ],
        "children": [],
        "hasChildren": False,
        "systemTitle": system.title,
        "types": [
            {"id": product_type.id, "title": catalog_display_title(product_type.title)}
            for product_type in product_types
        ] or [{"id": f"group-{group.id}", "title": group.title}],
        "attributes": [attribute.title for attribute in group.attributes.all()],
        "vendors": [
            {
                "name": vendor.name,
                "slug": vendor.slug,
                "logo": catalog_image_url(vendor.logo) if vendor.logo else "",
                "url": f"{reverse('vendors')}?vendors={vendor.slug}#vendorRowsSection",
            }
            for vendor in vendors[:12]
        ],
        "stats": [
            {"label": "типов", "value": len(product_types) or 1},
            {"label": "брендов", "value": len(vendors)},
        ],
    }


def group_card_payload(group):
    system = group.system
    direction = system.direction
    target = catalog_node_id("group", group.slug)
    return {
        "id": target,
        "kind": "group",
        "slug": group.slug,
        "level": "Товарная группа",
        "title": group.title,
        "summary": group.crm_comment_hint or f"Товарная группа внутри системы «{system.title}».",
        "image": catalog_image_url(group.image),
        "url": group.get_absolute_url(),
        "parent": catalog_node_id("system", system.slug),
        "breadcrumbs": [
            {"title": "Каталог", "target": "root", "url": reverse("catalog")},
            {"title": direction.title, "target": catalog_node_id("direction", direction.slug), "url": direction.get_absolute_url()},
            {"title": system.title, "target": catalog_node_id("system", system.slug), "url": system.get_absolute_url()},
            {"title": group.title, "target": target, "url": group.get_absolute_url()},
        ],
        "children": [],
        "hasChildren": False,
        "systemTitle": system.title,
        "stats": [
            {"label": "типов", "value": getattr(group, "type_count", 0) or 1},
            {"label": "брендов", "value": getattr(group, "vendor_count", 0)},
        ],
    }


def block_queryset():
    return CatalogBlock.objects.annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
    ).prefetch_related(
        Prefetch(
            "directions",
            queryset=Direction.objects.only("id", "block_id", "slug", "title", "sort_order").order_by("sort_order", "title"),
            to_attr="catalog_directions",
        )
    )


def direction_queryset():
    return Direction.objects.select_related("block").annotate(
        system_count=Count("systems", distinct=True),
        group_count=Count("systems__product_groups", distinct=True),
        type_count=Count("systems__product_groups__types", distinct=True),
    ).prefetch_related(
        Prefetch(
            "systems",
            queryset=CatalogSystem.objects.only("id", "direction_id", "slug", "title", "sort_order").order_by("sort_order", "title"),
            to_attr="catalog_systems",
        )
    )


def public_direction_queryset():
    return (
        direction_queryset()
        .filter(slug__in=PUBLIC_DIRECTION_SLUGS)
        .annotate(public_order=public_direction_order_expression())
        .order_by("public_order", "title")
    )


def system_queryset():
    return CatalogSystem.objects.select_related("direction__block").annotate(
        group_count=Count("product_groups", distinct=True),
        type_count=Count("product_groups__types", distinct=True),
        vendor_count=Count(
            "product_groups__vendorproductgroup__vendor",
            filter=Q(product_groups__vendorproductgroup__show_in_catalog=True),
            distinct=True,
        ),
    ).prefetch_related(
        Prefetch(
            "product_groups",
            queryset=ProductGroup.objects.only("id", "system_id", "slug", "title", "sort_order").order_by("sort_order", "title"),
            to_attr="catalog_groups",
        )
    )


def group_queryset():
    return ProductGroup.objects.select_related("system__direction__block").prefetch_related(
        "types",
        "attributes",
        Prefetch(
            "vendorproductgroup_set",
            queryset=VendorProductGroup.objects.filter(show_in_catalog=True).select_related("vendor").order_by("vendor__name"),
            to_attr="catalog_vendor_links",
        ),
    )


def group_card_queryset():
    return ProductGroup.objects.select_related("system__direction__block").annotate(
        type_count=Count("types", distinct=True),
        vendor_count=Count(
            "vendorproductgroup__vendor",
            filter=Q(vendorproductgroup__show_in_catalog=True),
            distinct=True,
        ),
    )


def _with_children(node, children):
    node["children"] = [child["id"] for child in children]
    node["hasChildren"] = bool(children)
    return node


def _ancestor_chain(node):
    ancestors = []
    rows = node.get("breadcrumbs", [])[1:-1]
    for index, row in enumerate(rows):
        next_target = rows[index + 1]["target"] if index + 1 < len(rows) else node["id"]
        ancestors.append(
            {
                "id": row["target"],
                "title": row["title"],
                "url": row["url"],
                "kind": row["target"].split(":", 1)[0],
                "parent": "root" if index == 0 else rows[index - 1]["target"],
                "children": [next_target],
                "hasChildren": True,
            }
        )
    return ancestors


def build_catalog_node(target):
    if target == "root":
        children = [direction_payload(direction) for direction in public_direction_queryset()]
        return {"node": _with_children(root_node(), children), "children": children, "ancestors": []}

    kind, separator, slug = target.partition(":")
    if not separator or not slug:
        raise Http404("Unknown catalog node")

    if kind == "block":
        block = block_queryset().filter(slug=slug).first()
        if not block:
            raise Http404("Catalog block not found")
        children = [
            direction_payload(direction)
            for direction in direction_queryset().filter(block=block).order_by("sort_order", "title")
        ]
        node = _with_children(block_payload(block), children)
    elif kind == "direction":
        direction = direction_queryset().filter(slug=slug).first()
        if not direction:
            raise Http404("Catalog direction not found")
        children = [
            system_payload(system)
            for system in system_queryset().filter(direction=direction).order_by("sort_order", "title")
        ]
        node = _with_children(direction_payload(direction), children)
    elif kind == "system":
        system = system_queryset().filter(slug=slug).first()
        if not system:
            raise Http404("Catalog system not found")
        children = [
            group_card_payload(group)
            for group in group_card_queryset().filter(system=system).order_by("sort_order", "title")
        ]
        node = _with_children(system_payload(system), children)
    elif kind == "group":
        group = group_queryset().filter(slug=slug).first()
        if not group:
            raise Http404("Catalog group not found")
        children = []
        node = group_payload(group)
    else:
        raise Http404("Unknown catalog node")

    return {"node": node, "children": children, "ancestors": _ancestor_chain(node)}


def get_catalog_node(target):
    cache_key = catalog_cache_key("node", target)
    payload = cache.get(cache_key)
    if payload is None:
        payload = build_catalog_node(target)
        cache.set(cache_key, payload, timeout=CATALOG_CACHE_TTL)
    return payload


def catalog_initial_data(initial_target="root"):
    payload = {
        "initialTarget": initial_target,
        "root": get_catalog_node("root"),
        "nodeEndpoint": reverse("api_catalog_node"),
        "searchEndpoint": reverse("api_catalog_search"),
    }
    if initial_target != "root":
        payload["initial"] = get_catalog_node(initial_target)
    return payload
