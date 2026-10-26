"""Build responsive WebP copies without replacing approved originals.

Run with the project Python. This is an offline asset build, not a DB import.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
WIDTHS = (480, 960)
RECIPE = b"pnp-webp-v1-quality82-method6-exif-transpose"
MISSION_PHOTOS = (
    "assets/img/association/mission/unite-market-participants.webp",
    "assets/img/association/mission/project-solution-selection-v2.webp",
    "assets/img/association/mission/project-supply.webp",
)
WORKFLOW_PHOTOS = (
    "assets/img/complectation/project.webp",
    "assets/img/complectation/analogs.webp",
    "assets/img/complectation/control.webp",
    "assets/img/complectation/delivery.webp",
)


def source_paths():
    """Return the approved catalog/home photos; logos are intentionally excluded."""
    master = json.loads((ROOT / "data_import/catalog_master.json").read_text(encoding="utf-8"))
    groups = json.loads((ROOT / "data_import/catalog_product_group_images.json").read_text(encoding="utf-8"))
    solutions = json.loads((ROOT / "data_import/solutions.json").read_text(encoding="utf-8"))

    paths = set(groups.values())
    for block in master["global_blocks"]:
        paths.add(block.get("image", ""))
        for direction in block.get("directions", []):
            paths.add(direction.get("image", ""))
            paths.update(system.get("image", "") for system in direction.get("systems", []))

    for registry in (ROOT / "data_import/vendor_products").glob("*.json"):
        payload = json.loads(registry.read_text(encoding="utf-8"))
        for family in payload.get("families", []):
            paths.update(product.get("image", "") for product in family.get("products", []))

    for vendor in solutions.get("vendors", []):
        for document in vendor.get("documents", []):
            paths.add(document.get("home_cover") or document.get("cover") or "")

    paths.update(MISSION_PHOTOS)
    paths.update(WORKFLOW_PHOTOS)
    return sorted(path for path in paths if path)


def main():
    destination = STATIC / "assets/img/catalog/optimized"
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {}
    original_bytes = 0
    output_bytes = {width: 0 for width in WIDTHS}

    for path in source_paths():
        source = STATIC / path
        digest = hashlib.sha256(source.read_bytes() + RECIPE).hexdigest()[:12]
        original_bytes += source.stat().st_size
        variants = []
        with Image.open(source) as opened:
            original = ImageOps.exif_transpose(opened).convert("RGB")
            for target_width in WIDTHS:
                image = original.copy()
                image.thumbnail((target_width, target_width), Image.Resampling.LANCZOS)
                target = destination / f"{source.stem}-{digest}-{target_width}.webp"
                if not target.exists():
                    image.save(target, "WEBP", quality=82, method=6)
                variants.append(
                    {
                        "path": target.relative_to(STATIC).as_posix(),
                        "target_width": target_width,
                        "width": image.width,
                        "height": image.height,
                    }
                )
                output_bytes[target_width] += target.stat().st_size
        manifest[path] = variants

    (ROOT / "data_import/catalog_image_variants.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "photos": len(manifest),
                "original_bytes": original_bytes,
                "webp_bytes_by_size": output_bytes,
            }
        )
    )


if __name__ == "__main__":
    main()
