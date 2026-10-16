"""Homepage logo groups follow public catalog links, not a second brand taxonomy."""

from .models import Partner, VendorProductGroup


HOME_BRAND_LIMIT = 24
HOME_BRAND_DIRECTIONS = {
    "it-infrastructure": "it",
    "low-current": "security",
    "eom": "engineering",
    "ev-charging-infrastructure": "engineering",
    "water": "engineering",
    "hvac": "engineering",
    "gas": "engineering",
}


def homepage_brand_cards():
    featured = dict(Partner.objects.filter(show_on_home=True).values_list("slug", "priority"))
    links = (
        VendorProductGroup.objects.filter(
            show_in_catalog=True,
            show_in_vendors=True,
            product_group__system__direction__slug__in=HOME_BRAND_DIRECTIONS,
        )
        .exclude(vendor__logo="")
        .values_list("vendor__slug", "vendor__name", "vendor__logo", "product_group__system__direction__slug")
        .order_by()
        .distinct()
    )
    brands = {}
    for slug, name, logo, direction in links:
        brand = brands.setdefault(slug, {"slug": slug, "name": name, "logo": logo, "groups": set()})
        brand["groups"].add(HOME_BRAND_DIRECTIONS[direction])

    # Keep a bounded homepage showcase; the complete pool remains in the vendor list.
    counts = dict.fromkeys(("it", "security", "engineering"), 0)
    cards = []
    for brand in sorted(brands.values(), key=lambda b: (featured.get(b["slug"], 10000), b["name"].casefold())):
        groups = [key for key in counts if key in brand["groups"] and counts[key] < HOME_BRAND_LIMIT]
        if groups:
            for key in groups:
                counts[key] += 1
            cards.append({**brand, "groups": " ".join(groups)})
    return cards
