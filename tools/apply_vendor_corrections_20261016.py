"""Apply the approved 16 October vendor-list corrections to import sources.

This is deliberately scoped to named vendors and product groups. It does not
re-import the catalog or infer new commercial relationships from web research.
"""

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data_import"
LOGOS = "assets/img/logos/vendor-list-20261016/"
NEW = {
    "armpanel": ("ArmPanel", "https://armpanel.ru/", LOGOS + "armpanel.svg",
                 "https://armpanel.ru/local/templates/armpanel/static/img/5bf30c4053927620dc87545b_blue-logo.svg",
                 "architecture", "Архитектурные решения", "facades", "Фасады", "acpl", "АЦПЛ"),
    "beltermo": ("Белтермо", "https://beltermo.ru/", LOGOS + "beltermo.svg",
                 "https://beltermo.ru/upload/iblock/fa1/jf2nsizc5hi0s6fip32gxuoitk6k1zyp.svg",
                 "architecture", "Архитектурные решения", "floors", "Полы", "mdvp-soft-fiberboard", "МДВП"),
    "quick-deck": ("Quick Deck", "https://qdeck.ru/", LOGOS + "quick-deck.png",
                   "https://qdeck.ru/main/i/main-logo.png",
                   "constructive", "Конструктивные решения", "floor-and-partition-structures",
                   "Конструкции полов и перегородок", "vdsp-sh", "ВДСПШ"),
    "ultralam": ("ULTRALAM", "https://ultralam.com/lvl", LOGOS + "ultralam.svg",
                  "https://static.tildacdn.com/tild3464-6334-4732-a334-353135626165/Frame_1321314553.svg",
                  "constructive", "Конструктивные решения", "wooden-structures", "Древесно-плитные материалы", "lvl", "ЛВЛ"),
}
GROUP_URLS = {
    "acpl": "https://pnp1.ru/catalog/building-materials/architecture/facades/acpl/",
    "mdvp-soft-fiberboard": "https://pnp1.ru/catalog/building-materials/architecture/floors/mdvp-soft-fiberboard/",
    "vdsp-sh": "https://pnp1.ru/catalog/building-materials/constructive/floor-and-partition-structures/vdsp-sh/",
    "lvl": "https://pnp1.ru/catalog/building-materials/constructive/wooden-structures/lvl/",
    "santehnicheskie-peregorodki": "https://pnp1.ru/catalog/building-materials/architecture/interior-wall-panels/santehnicheskie-peregorodki/",
    "drywall": "https://pnp1.ru/catalog/building-materials/constructive/partitions/drywall/",
    "gypsum-partition-blocks": "https://pnp1.ru/catalog/building-materials/constructive/partitions/gypsum-partition-blocks/",
    "gsp": "https://pnp1.ru/catalog/building-materials/architecture/interior-wall-panels/gsp/",
}
REMOVE_PAIRS = {
    ("grand-line", "ventilated-facade-systems"),
    ("saint-gobain", "suhie-smesi"),
    ("saint-gobain", "drywall"),
    ("htl", "commercial-interior-linear-recessed-lighting"),
    ("htl", "luminaires"),
    ("htl", "lighting-fixtures"),
    ("vektor", "active-lan-equipment"),
    ("pak-bastion", "ssoi-software-hardware-complexes"),
}
SHOW_PAIRS = {
    (vendor, group)
    for vendor, groups in {
        "volma": ("drywall", "gypsum-partition-blocks"),
        "knauf": ("drywall", "gypsum-partition-blocks"),
        "magma": ("drywall", "gypsum-partition-blocks"),
        "gyproc": ("drywall",),
        "peshelan": ("gsp",),
        "twinpro": ("ssoi-software-hardware-complexes",),
    }.items()
    for group in groups
}


def read_csv(name):
    with (DATA / name).open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        return reader.fieldnames, list(reader)


def write_csv(name, fields, rows):
    with (DATA / name).open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    master_fields, masters = read_csv("vendors_master.csv")
    map_fields, links = read_csv("catalog_vendor_map.csv")
    manifest_fields, manifest = read_csv("vendor_list_20261015.csv")
    group_fields, group_manifest = read_csv("vendor_product_group_list_20261015.csv")
    partners_path = DATA / "partners.json"
    partners = json.loads(partners_path.read_text(encoding="utf-8"))

    for slug, spec in NEW.items():
        name, site, logo, logo_source, direction, direction_title, system, system_title, group, group_title = spec
        if not (ROOT / "static" / logo).is_file():
            raise FileNotFoundError(logo)
        if not any(row["slug"] == slug for row in masters):
            row = dict.fromkeys(master_fields, "")
            row.update(direction=direction_title, group=system_title, area=group_title, type=group_title,
                       vendor_name=name, normalized_name=name, slug=slug, official_site=site,
                       logo=logo, logo_source_url=logo_source, status="logo_ready", confidence="high",
                       source="vendor_corrections_20261016", notes="Официальный знак и профиль продукции проверены 16.10.2026.")
            masters.append(row)
        elif slug == "armpanel":
            next(row for row in masters if row["slug"] == slug)["logo_source_url"] = logo_source
        if not any(row["slug"] == slug for row in manifest):
            manifest.append(dict(vendor_name=name, slug=slug, official_site=site, logo=logo,
                                 logo_source_url=logo_source, match_type="new", fetch_status="downloaded"))
        elif slug == "armpanel":
            next(row for row in manifest if row["slug"] == slug)["logo_source_url"] = logo_source
        if not any(row["slug"] == slug for row in partners):
            partners.append(dict(id=slug, name=name, slug=slug, status="logo_ready", priority=200,
                                 show_on_home=False, show_on_partners=True, logo=logo,
                                 logo_source_url=logo_source, official_site=site,
                                 category=f"{direction_title} / {system_title}", note=""))
        elif slug == "armpanel":
            next(row for row in partners if row["slug"] == slug)["logo_source_url"] = logo_source
        if not any(row["vendor_slug"] == slug and row["product_group_id"] == group for row in links):
            row = dict.fromkeys(map_fields, "")
            row.update(vendor_slug=slug, vendor_name=name, official_site=site, logo=logo,
                       logo_source_url=logo_source, global_block_id="building-materials",
                       global_block_title="Строительные материалы", direction_id=direction,
                       direction_title=direction_title, system_id=system, system_title=system_title,
                       product_group_id=group, product_group_title=group_title,
                       source_direction=direction_title, source_group=system_title,
                       source_area=group_title, source_type=group_title,
                       show_in_catalog="true", show_in_vendors="true", show_on_home="false",
                       show_in_partners="true", status="published", confidence="high",
                       matched_by="official_product_scope", source="vendor_corrections_20261016",
                       notes="Группа и логотип подтверждены официальным сайтом производителя.")
            links.append(row)
        elif slug == "armpanel":
            next(row for row in links if row["vendor_slug"] == slug and row["product_group_id"] == group)["logo_source_url"] = logo_source
        if not any(row["vendor_slug"] == slug and row["product_group_id"] == group for row in group_manifest):
            group_manifest.append(dict(vendor_name=name, vendor_slug=slug, product_group_id=group,
                                       product_group_title=group_title, catalog_url=GROUP_URLS[group],
                                       logo=logo))

    if not any(row["vendor_slug"] == "krafter" and row["product_group_id"] == "santehnicheskie-peregorodki" for row in links):
        row = dict.fromkeys(map_fields, "")
        row.update(vendor_slug="krafter", vendor_name="Krafter", official_site="https://hpl-krafter.ru/",
                   logo="assets/img/logos/vendor-list-20261015/krafter.svg",
                   logo_source_url="https://hpl-krafter.ru/wp-content/uploads/2025/03/krafter-logo-2.svg",
                   global_block_id="building-materials", global_block_title="Строительные материалы",
                   direction_id="architecture", direction_title="Архитектурные решения",
                   system_id="interior-wall-panels", system_title="Стены / интерьерные панели",
                   product_group_id="santehnicheskie-peregorodki", product_group_title="Сантехнические перегородки",
                   source_direction="Архитектурные решения", source_group="Стены / интерьерные панели",
                   source_area="Сантехнические перегородки", source_type="Сантехнические перегородки",
                   show_in_catalog="true", show_in_vendors="true", show_on_home="false",
                   show_in_partners="true", status="published", confidence="high",
                   matched_by="official_product_scope", source="vendor_corrections_20261016",
                   notes="На сайте производителя подтверждены HPL-сантехнические перегородки.")
        links.append(row)
    if not any(row["vendor_slug"] == "krafter" and row["product_group_id"] == "santehnicheskie-peregorodki" for row in group_manifest):
        group_manifest.append(dict(vendor_name="Krafter", vendor_slug="krafter",
                                   product_group_id="santehnicheskie-peregorodki",
                                   product_group_title="Сантехнические перегородки",
                                   catalog_url=GROUP_URLS["santehnicheskie-peregorodki"],
                                   logo="assets/img/logos/vendor-list-20261015/krafter.svg"))
    if not any(row["vendor_slug"] == "lemark" and row["product_group_id"] == "santehnicheskie-peregorodki" for row in links):
        master = next(row for row in masters if row["slug"] == "lemark")
        row = dict.fromkeys(map_fields, "")
        row.update(vendor_slug="lemark", vendor_name="Lemark", official_site=master["official_site"],
                   logo=master["logo"], logo_source_url=master["logo_source_url"],
                   global_block_id="building-materials", global_block_title="Строительные материалы",
                   direction_id="architecture", direction_title="Архитектурные решения",
                   system_id="interior-wall-panels", system_title="Стены / интерьерные панели",
                   product_group_id="santehnicheskie-peregorodki", product_group_title="Сантехнические перегородки",
                   source_direction="Архитектурные решения", source_group="Стены / интерьерные панели",
                   source_area="Сантехнические перегородки", source_type="HPL-материал для перегородок",
                   show_in_catalog="true", show_in_vendors="true", show_on_home="false", show_in_partners="true",
                   status="published", confidence="high", matched_by="official_application_case",
                   source="vendor_corrections_20261016",
                   notes="Производитель HPL-материала для сантехнических кабин, не заявлен как изготовитель готовой системы.")
        links.append(row)
    if not any(row["vendor_slug"] == "lemark" and row["product_group_id"] == "santehnicheskie-peregorodki" for row in group_manifest):
        master = next(row for row in masters if row["slug"] == "lemark")
        group_manifest.append(dict(vendor_name="Lemark", vendor_slug="lemark",
                                   product_group_id="santehnicheskie-peregorodki",
                                   product_group_title="Сантехнические перегородки",
                                   catalog_url=GROUP_URLS["santehnicheskie-peregorodki"],
                                   logo=master["logo"]))

    manifest = [row for row in manifest if row["slug"] not in {"htl", "vektor", "pak-bastion"}]
    group_manifest = [row for row in group_manifest if (row["vendor_slug"], row["product_group_id"]) not in REMOVE_PAIRS]
    for row in links:
        pair = row["vendor_slug"], row["product_group_id"]
        if pair in REMOVE_PAIRS:
            for field in ("show_in_catalog", "show_in_vendors", "show_on_home", "show_in_partners"):
                row[field] = "false"
        elif pair in SHOW_PAIRS:
            row.update(show_in_catalog="true", show_in_vendors="true", show_in_partners="true")
        if pair == ("peshelan", "gsp"):
            row.update(vendor_name="ООО «Пешеланский гипсовый завод»", direction_id="architecture",
                       direction_title="Архитектурные решения", system_id="interior-wall-panels",
                       system_title="Стены / интерьерные панели", logo="assets/img/logos/vendors/import-20260630/peshelan.svg",
                       matched_by="official_product_scope", source="vendor_corrections_20261016")
        if pair == ("twinpro", "ssoi-software-hardware-complexes"):
            row["vendor_name"] = "ТвинПро / Бастион-3 / ПАК Бастион"
    for row in masters:
        if row["slug"] == "peshelan":
            row["vendor_name"] = "ООО «Пешеланский гипсовый завод»"
        elif row["slug"] == "twinpro":
            row["vendor_name"] = "ТвинПро / Бастион-3 / ПАК Бастион"
    for row in partners:
        if row["slug"] in {"htl", "vektor", "pak-bastion"}:
            row["show_on_partners"] = False
        elif row["slug"] == "peshelan":
            row["name"] = "ООО «Пешеланский гипсовый завод»"
        elif row["slug"] == "twinpro":
            row["name"] = "ТвинПро / Бастион-3 / ПАК Бастион"
    if not any(row["slug"] == "peshelan" for row in partners):
        partners.append(dict(id="peshelan", name="ООО «Пешеланский гипсовый завод»",
                             slug="peshelan", status="logo_ready", priority=200,
                             show_on_home=False, show_on_partners=True,
                             logo="assets/img/logos/vendors/import-20260630/peshelan.svg",
                             logo_source_url="https://pgz-dekor.ru/", official_site="https://pgz-dekor.ru/",
                             category="Архитектурные решения / Стены / интерьерные панели", note=""))

    approved_existing = {
        "volma": ("drywall", "gypsum-partition-blocks"),
        "knauf": ("drywall", "gypsum-partition-blocks"),
        "magma": ("drywall", "gypsum-partition-blocks"),
        "gyproc": ("drywall",),
        "peshelan": ("gsp",),
    }
    masters_by_slug = {row["slug"]: row for row in masters}
    for slug, groups in approved_existing.items():
        master = masters_by_slug[slug]
        if not any(row["slug"] == slug for row in manifest):
            manifest.append(dict(vendor_name=master["vendor_name"], slug=slug,
                                 official_site=master["official_site"], logo=master["logo"],
                                 logo_source_url=master["logo_source_url"],
                                 match_type="existing", fetch_status="existing"))
        for group in groups:
            if not any(row["vendor_slug"] == slug and row["product_group_id"] == group for row in group_manifest):
                title = {"drywall": "Гипсокартон", "gypsum-partition-blocks": "ПГП", "gsp": "ГСП"}[group]
                group_manifest.append(dict(vendor_name=master["vendor_name"], vendor_slug=slug,
                                           product_group_id=group, product_group_title=title,
                                           catalog_url=GROUP_URLS[group], logo=master["logo"]))

    write_csv("vendors_master.csv", master_fields, masters)
    write_csv("catalog_vendor_map.csv", map_fields, links)
    write_csv("vendor_list_20261015.csv", manifest_fields, manifest)
    write_csv("vendor_product_group_list_20261015.csv", group_fields, group_manifest)
    partners_path.write_text(json.dumps(partners, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
