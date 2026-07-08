import json
from urllib.parse import urlencode

from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.views.decorators.http import require_POST

from .models import (
    CatalogBlock,
    CatalogSystem,
    Direction,
    Lead,
    LeadItem,
    Partner,
    ProductGroup,
    ProductType,
    UploadedFile,
    Vendor,
)


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


def catalog(request):
    blocks = catalog_queryset().annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
    )
    return render(
        request,
        "main/catalog.html",
        {
            "blocks": blocks,
            "stats": {
                "blocks": CatalogBlock.objects.count(),
                "directions": Direction.objects.count(),
                "systems": CatalogSystem.objects.count(),
                "groups": ProductGroup.objects.count(),
            },
        },
    )


def catalog_block(request, block_slug):
    block = get_object_or_404(catalog_queryset(), slug=block_slug)
    return render(
        request,
        "main/catalog_level.html",
        {
            "level": "Блок",
            "object": block,
            "children": block.directions.all(),
            "child_level": "Направление",
            "breadcrumbs": [(block.title, None)],
        },
    )


def catalog_direction(request, block_slug, direction_slug):
    direction = get_object_or_404(
        Direction.objects.select_related("block").prefetch_related("systems"),
        slug=direction_slug,
        block__slug=block_slug,
    )
    return render(
        request,
        "main/catalog_level.html",
        {
            "level": "Направление",
            "object": direction,
            "children": direction.systems.all(),
            "child_level": "Система",
            "breadcrumbs": [
                (direction.block.title, direction.block.get_absolute_url() if hasattr(direction.block, "get_absolute_url") else None),
                (direction.title, None),
            ],
        },
    )


def catalog_system(request, block_slug, direction_slug, system_slug):
    system = get_object_or_404(
        CatalogSystem.objects.select_related("direction__block").prefetch_related("product_groups"),
        slug=system_slug,
        direction__slug=direction_slug,
        direction__block__slug=block_slug,
    )
    return render(
        request,
        "main/catalog_level.html",
        {
            "level": "Система",
            "object": system,
            "children": system.product_groups.all(),
            "child_level": "Товарная группа",
            "breadcrumbs": [
                (system.direction.block.title, None),
                (system.direction.title, None),
                (system.title, None),
            ],
        },
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
    return render(request, "main/product_group.html", {"group": group})


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
        "partners": page_obj.object_list,
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

    allowed_sources = {choice[0] for choice in Lead.SOURCE_CHOICES}
    if source not in allowed_sources:
        source = Lead.SOURCE_CATALOG_REQUEST

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
            message=message,
            request_text=request_text,
            consent=payload_bool(payload, "consent"),
            product_group=product_group,
            catalog_path=product_group.catalog_path if product_group else "",
            raw_payload=raw_payload,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            ip_address=client_ip(request),
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
