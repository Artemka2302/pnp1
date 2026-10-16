#!/usr/bin/env python3
"""Publish approved vendor-list brands on the partners page.

The manufacturers and partners pages use separate database models.  This tool
keeps ``data_import/partners.json`` in sync with the approved vendor manifest
without exposing unrelated legacy partner rows that are still under review.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def partner_category(master: dict[str, str]) -> str:
    parts = []
    for key in ("direction", "group"):
        value = (master.get(key) or "").strip()
        if value and value not in parts:
            parts.append(value)
    return " / ".join(parts)


def sync_partners(
    manifest_path: Path,
    master_path: Path,
    partners_path: Path,
    static_root: Path,
) -> tuple[int, int, int]:
    manifest_rows = read_csv(manifest_path)
    master_rows = read_csv(master_path)
    partners = json.loads(partners_path.read_text(encoding="utf-8"))

    approved: dict[str, dict[str, str]] = {}
    for row in manifest_rows:
        slug = (row.get("slug") or "").strip()
        if slug:
            approved.setdefault(slug, row)

    masters = {
        row["slug"].strip(): row
        for row in master_rows
        if (row.get("slug") or "").strip()
    }
    partners_by_slug = {partner["slug"]: partner for partner in partners}
    added = 0
    updated = 0

    for slug, vendor in approved.items():
        logo = (vendor.get("logo") or "").strip()
        if not logo or not (static_root / logo).is_file():
            raise ValueError(f"Missing approved logo for {slug}: {logo}")

        master = masters.get(slug, {})
        partner = partners_by_slug.get(slug)
        if partner is None:
            partner = {
                "id": slug,
                "name": (master.get("vendor_name") or vendor["vendor_name"]).strip(),
                "slug": slug,
                "status": "logo_ready",
                "priority": 200,
                "show_on_home": False,
                "show_on_partners": True,
                "logo": logo,
                "logo_source_url": (vendor.get("logo_source_url") or "").strip(),
                "official_site": (vendor.get("official_site") or "").strip(),
                "category": partner_category(master),
                "note": "",
            }
            partners.append(partner)
            partners_by_slug[slug] = partner
            added += 1
            continue

        partner.update(
            {
                "status": "logo_ready",
                "show_on_partners": True,
            }
        )
        if not (partner.get("logo") or "").strip():
            partner["logo"] = logo
        if not (partner.get("logo_source_url") or "").strip():
            partner["logo_source_url"] = (vendor.get("logo_source_url") or "").strip()
        if not (partner.get("official_site") or "").strip():
            partner["official_site"] = (vendor.get("official_site") or "").strip()
        if not (partner.get("category") or "").strip():
            partner["category"] = partner_category(master)
        updated += 1

    partners_path.write_text(
        json.dumps(partners, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    visible = sum(bool(partner.get("show_on_partners", True)) for partner in partners)
    return added, updated, visible


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ROOT / "data_import/vendor_list_20261015.csv",
    )
    parser.add_argument(
        "--master",
        type=Path,
        default=ROOT / "data_import/vendors_master.csv",
    )
    parser.add_argument(
        "--partners",
        type=Path,
        default=ROOT / "data_import/partners.json",
    )
    parser.add_argument("--static-root", type=Path, default=ROOT / "static")
    args = parser.parse_args()

    added, updated, visible = sync_partners(
        args.manifest,
        args.master,
        args.partners,
        args.static_root,
    )
    print(f"approved partners added: {added}")
    print(f"approved partners updated: {updated}")
    print(f"partners visible: {visible}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
