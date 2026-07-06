from django.db.models import Count, Prefetch, Q
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.templatetags.static import static

from .models import CatalogBlock, CatalogSystem, Direction, Partner, ProductGroup, Vendor


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
    context = {
        "blocks": blocks,
        "featured_partners": Partner.objects.filter(show_on_home=True)[:18],
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
    return render(request, "main/simple_page.html", {"title": "О компании"})


def contacts(request):
    return render(request, "main/simple_page.html", {"title": "Контакты"})


def catalog(request):
    blocks = catalog_queryset().annotate(
        direction_count=Count("directions", distinct=True),
        system_count=Count("directions__systems", distinct=True),
        group_count=Count("directions__systems__product_groups", distinct=True),
    )
    return render(request, "main/catalog.html", {"blocks": blocks})


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


def vendors(request):
    query = request.GET.get("q", "").strip()
    vendors_qs = Vendor.objects.prefetch_related("product_groups__system__direction__block")
    if query:
        vendors_qs = vendors_qs.filter(
            Q(name__icontains=query)
            | Q(product_groups__title__icontains=query)
            | Q(product_groups__system__title__icontains=query)
            | Q(product_groups__system__direction__title__icontains=query)
        ).distinct()
    return render(request, "main/vendors.html", {"vendors": vendors_qs[:500], "query": query})


def partners(request):
    query = request.GET.get("q", "").strip()
    partners_qs = Partner.objects.filter(show_on_partners=True)
    if query:
        partners_qs = partners_qs.filter(Q(name__icontains=query) | Q(category__icontains=query))
    return render(request, "main/partners.html", {"partners": partners_qs, "query": query})


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
