"""Connect approved library pages to public catalogue links; never infer aliases."""

from urllib.parse import urlencode, urlsplit

from django.urls import reverse

from .catalog_duplicates import GROUP_ALIASES
from .catalog_sections import PROJECT_DIRECTIONS
from .models import ProductGroup, Vendor
from .solutions import find_solution_vendor


def public_product_groups():
    return ProductGroup.objects.filter(
        system__direction__slug__in=PROJECT_DIRECTIONS,
    ).exclude(system__slug="wood-based-panel-materials").exclude(slug__in=GROUP_ALIASES)


def vendor_landing_url(slug):
    library_vendor = find_solution_vendor(slug)
    if library_vendor and library_vendor.get("published", True) and any(
        doc.get("pdf") and doc.get("published", True)
        for doc in library_vendor.get("documents", [])
    ):
        return reverse("solution_vendor", args=[slug])
    return f"{reverse('vendors')}?{urlencode({'vendors': slug})}#vendorRowsSection"


def public_website(value):
    try:
        parts = urlsplit(value or "")
        if parts.scheme in ("http", "https") and parts.hostname and not parts.username and not parts.password:
            return value
    except ValueError:
        pass
    return ""


def solution_catalog_context(library_vendor):
    """Exact slug match only. Internal notes/status/provenance stay private."""
    vendor = Vendor.objects.filter(slug=library_vendor["slug"]).first()
    groups = []
    if vendor:
        groups = list(public_product_groups().filter(
            vendorproductgroup__vendor=vendor,
            vendorproductgroup__show_in_catalog=True,
            vendorproductgroup__show_in_vendors=True,
        ).select_related("system__direction__block").order_by(
            "system__direction__sort_order", "system__sort_order", "sort_order", "title",
        ).distinct())
    return {
        "solution_catalog_groups": groups,
        "solution_official_site": public_website(
            library_vendor.get("official_site") or (vendor.official_site if vendor else "")
        ),
    }
