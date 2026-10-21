"""Reviewed duplicate only; identical titles in different sections are not aliases."""

from copy import deepcopy

GROUP_ALIASES = {
    "lighting-fixtures": "luminaires",
    "video-surveillance-systems": "video-surveillance-equipment",
    "gazovoe-pozharotushenie": "automatic-gas-fire-extinguishing",
    "avtomaticheskoe-sprinklernoe-pozharotushenie": "automatic-sprinkler-fire-extinguishing",
    "skud": "access-control-equipment",
    "sistemy-kontrolya-i-upravleniya-dostupom": "access-control-equipment",
    "profil-dlya-gipsokartona": "drywall-profile",
    "zapornaya-i-reguliruyuschaya-armatura": "water-valves-safety-control",
}

GROUP_MERGE_CONTEXT = {
    "lighting-fixtures": ("eom", "lighting-devices"),
    "video-surveillance-systems": ("low-current", "video-surveillance-and-network-equipment"),
    "gazovoe-pozharotushenie": ("fire", "automatic-fire-alarm"),
    "avtomaticheskoe-sprinklernoe-pozharotushenie": ("fire", "automatic-fire-alarm"),
    "skud": ("low-current", "access-control-systems"),
    "sistemy-kontrolya-i-upravleniya-dostupom": ("low-current", "access-control-systems"),
    "profil-dlya-gipsokartona": ("constructive", "partitions"),
    "zapornaya-i-reguliruyuschaya-armatura": ("water", "water-supply"),
}


def canonical_group_slug(slug):
    return GROUP_ALIASES.get(slug, slug)


def catalog_without_duplicate_groups(catalog):
    """Return import data with reviewed aliases folded into canonical groups."""
    catalog = deepcopy(catalog)
    groups = {}
    systems = {}
    for block in catalog.get("global_blocks", []):
        for direction in block.get("directions", []):
            for system in direction.get("systems", []):
                systems[system["id"]] = (direction["id"], system)
                groups.update({group["id"]: (system["id"], group) for group in system.get("product_groups", [])})
    for old_slug, new_slug in GROUP_ALIASES.items():
        old = groups.get(old_slug)
        target = groups.get(new_slug)
        if not old:
            continue
        direction_slug, system_slug = GROUP_MERGE_CONTEXT[old_slug]
        if not target or old[0] != system_slug or target[0] != system_slug or systems[system_slug][0] != direction_slug:
            raise ValueError(f"Unexpected source placement for catalogue alias: {old_slug}")
        source_group, target_group = old[1], target[1]
        for field in ("product_types", "attributes"):
            target_group[field] = list(dict.fromkeys([
                *(target_group.get(field) or []), *(source_group.get(field) or []),
            ]))
        target_ai = target_group.setdefault("ai", {})
        source_ai = source_group.get("ai") or {}
        for field in ("aliases", "must_ask"):
            target_ai[field] = list(dict.fromkeys([
                *(target_ai.get(field) or []), *(source_ai.get(field) or []),
            ]))
        systems[system_slug][1]["product_groups"] = [
            group for group in systems[system_slug][1]["product_groups"] if group["id"] != old_slug
        ]
    return catalog
