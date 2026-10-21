"""Read-only catalogue/vendor consistency audit, callable from manage.py shell."""
import csv
import json
import re
import unicodedata
from collections import defaultdict
from urllib.parse import urlsplit

from django.conf import settings
from django.test import RequestFactory

from main.catalog_duplicates import catalog_without_duplicate_groups
from main.models import CatalogBlock, CatalogSystem, Direction, ProductGroup, ProductType, Vendor, VendorProductGroup
from main.views import vendor_page_context


def normalize(text):
    return " ".join(unicodedata.normalize("NFKC", text).casefold().replace("ё", "е").split())


def audit_catalog_vendors():
    groups = list(ProductGroup.objects.select_related("system__direction__block"))
    vendors = list(Vendor.objects.all())
    links = list(VendorProductGroup.objects.select_related("vendor", "product_group"))
    by_slug = {group.slug: group for group in groups}
    vendor_ids = {vendor.id: vendor for vendor in vendors}
    source = settings.BASE_DIR / "data_import"
    raw_master = json.loads((source / "catalog_master.json").read_text(encoding="utf-8"))
    master = catalog_without_duplicate_groups(raw_master)
    source_groups = {
        group["id"]: (system["id"], group["title"])
        for block in master["global_blocks"] for direction in block["directions"]
        for system in direction["systems"] for group in system["product_groups"]
    }
    with (source / "catalog_vendor_map.csv").open(encoding="utf-8-sig", newline="") as stream:
        mapping = list(csv.DictReader(stream))
    with (source / "vendors_master.csv").open(encoding="utf-8-sig", newline="") as stream:
        source_vendors = list(csv.DictReader(stream))
    repeated = []
    for model, parent in (
        (CatalogBlock, None), (Direction, "block_id"), (CatalogSystem, "direction_id"),
        (ProductGroup, "system_id"), (ProductType, "product_group_id"),
    ):
        bucket = defaultdict(list)
        for row in model.objects.all():
            bucket[(getattr(row, parent) if parent else None, normalize(row.title))].append(
                getattr(row, "slug", str(row.pk)))
        repeated.extend({"model": model.__name__, "name": key[1], "ids": ids}
                        for key, ids in bucket.items() if len(ids) > 1)
    names, domains, loose_names = defaultdict(list), defaultdict(list), defaultdict(list)
    for vendor in vendors:
        names[normalize(vendor.name)].append(vendor.slug)
        loose = re.sub(r"[^\w]+", "", re.sub(r"\b(ооо|оао|пао|ао|зао)\b", "", normalize(vendor.name)))
        loose_names[loose].append(vendor.slug)
        domain = (urlsplit(vendor.official_site).hostname or "").removeprefix("www.")
        if domain:
            domains[domain].append(vendor.slug)
    group_names = defaultdict(list)
    for group in groups:
        group_names[normalize(group.title)].append({
            "slug": group.slug, "direction": group.system.direction.title, "system": group.system.title})
    missing_map_groups = defaultdict(list)
    db_keys = {(link.vendor.slug, link.product_group.slug): link for link in links}
    source_keys = {(row["vendor_slug"], row["product_group_id"]): row for row in mapping}
    source_link_counts = defaultdict(int)
    for row in mapping:
        source_link_counts[(row["vendor_slug"], row["product_group_id"])] += 1
    for row in mapping:
        if row["product_group_id"] not in by_slug:
            missing_map_groups[row["product_group_id"]].append(row["vendor_slug"])
    fields = ("show_in_catalog", "show_in_vendors", "show_on_home", "show_in_partners")
    flag_drift = []
    for key, link in db_keys.items():
        row = source_keys.get(key)
        if row:
            differences = {field: {"db": getattr(link, field), "source": row[field]}
                           for field in fields if getattr(link, field) != (row[field].lower() == "true")}
            if differences:
                flag_drift.append({"vendor": key[0], "group": key[1], "fields": differences})
    visible_vendor_ids = {link.vendor_id for link in links if link.show_in_vendors}
    leaks = [link for link in links if not link.show_in_vendors and link.vendor_id in visible_vendor_ids]
    mismatch = [link for link in links if link.show_in_catalog != link.show_in_vendors]
    # Confirm the actual page queryset, not only the theoretical join behaviour.
    leak_evidence = []
    for link in leaks[:10]:
        context = vendor_page_context(RequestFactory().get("/vendors/", {"group": link.product_group.slug}))
        row = next((row for row in context["group_rows"] if row.pk == link.product_group_id), None)
        if row and link.vendor_id in {vendor.pk for vendor in row.vendors.all()}:
            leak_evidence.append({"group": link.product_group.slug, "vendor": link.vendor.name})
    return {
        "counts": {"groups": len(groups), "source_groups": len(source_groups), "vendors": len(vendors),
                   "source_vendors": len(source_vendors), "links": len(links),
                   "source_links": len(mapping),
                   "catalog_visible_links": sum(link.show_in_catalog for link in links),
                   "vendor_visible_links": sum(link.show_in_vendors for link in links),
                   "public_vendor_count": len(visible_vendor_ids),
                   "groups_without_catalog_brands": len(set(by_slug) - {link.product_group.slug for link in links if link.show_in_catalog}),
                   "groups_without_vendor_brands": len(set(by_slug) - {link.product_group.slug for link in links if link.show_in_vendors})},
        "same_parent_duplicates": repeated,
        "repeated_names_different_parents": {name: rows for name, rows in group_names.items() if len(rows) > 1},
        "vendor_name_duplicates": {name: ids for name, ids in names.items() if len(ids) > 1},
        "vendor_loose_name_candidates": {name: ids for name, ids in loose_names.items() if len(ids) > 1},
        "shared_domain_candidates": {domain: ids for domain, ids in domains.items() if len(ids) > 1},
        "missing_db_groups": sorted(set(source_groups) - set(by_slug)),
        "extra_db_groups": sorted(set(by_slug) - set(source_groups)),
        "group_title_or_placement_drift": [
            {"slug": slug, "source": source_groups[slug], "db": (group.system.slug, group.title)}
            for slug, group in by_slug.items() if slug in source_groups
            and source_groups[slug] != (group.system.slug, group.title)
        ],
        "source_map_missing_groups": dict(missing_map_groups),
        "source_map_missing_vendors": sorted({row["vendor_slug"] for row in mapping} - {vendor.slug for vendor in vendors}),
        "source_link_duplicates": [
            {"vendor": vendor, "group": group, "count": count}
            for (vendor, group), count in sorted(source_link_counts.items()) if count > 1
        ],
        "source_links_missing_in_db": sorted(set(source_keys) - set(db_keys)),
        "db_links_missing_in_source": sorted(set(db_keys) - set(source_keys)),
        "publication_flags_drift": flag_drift,
        "catalog_vs_vendor_flags": [{"vendor": link.vendor.name, "group": link.product_group.slug,
                                     "catalog": link.show_in_catalog, "vendors": link.show_in_vendors} for link in mismatch],
        "hidden_vendor_links_potentially_leaked": len(leaks),
        "hidden_vendor_links_confirmed_examples": leak_evidence,
    }
