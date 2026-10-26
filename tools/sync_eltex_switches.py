#!/usr/bin/env python3
"""Build the local ELTEX switch registry from the manufacturer's public API.

The generated catalog deliberately contains no prices. Product imagery and
technical values are copied from official ELTEX endpoints and kept locally so
the public catalog does not depend on third-party hotlinks.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_JSON = BASE_DIR / "data_import" / "vendor_products" / "eltex_switches.json"
OUTPUT_IMAGES = BASE_DIR / "static" / "assets" / "img" / "catalog" / "vendor-products" / "eltex-switches"
API_BASE = "https://api.eltex.ru/api/catalog"
MEDIA_BASE = "https://eltex.ru"
PRODUCT_BASE = "https://eltex.ru/product"
USER_AGENT = "PNP1 catalog sync/1.0 (+https://pnp1.ru/)"


def ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context()
    if hasattr(ssl, "enum_certificates"):
        for certificate, encoding, _trust in ssl.enum_certificates("ROOT"):
            if encoding == "x509_asn":
                context.load_verify_locations(cadata=ssl.DER_cert_to_PEM_cert(certificate))
    return context


SSL_CONTEXT = ssl_context()

FAMILIES = (
    {
        "source_id": 36,
        "slug": "access",
        "title": "Коммутаторы доступа",
        "short_title": "Доступ",
        "summary": "Подключение рабочих мест, абонентских устройств и офисных сетей.",
    },
    {
        "source_id": 516,
        "slug": "poe",
        "title": "Коммутаторы доступа PoE",
        "short_title": "PoE",
        "summary": "Подключение и питание IP-телефонов, точек доступа, камер и IoT-устройств.",
    },
    {
        "source_id": 558,
        "slug": "industrial",
        "title": "Промышленные коммутаторы",
        "short_title": "Промышленные",
        "summary": "Сетевое оборудование для АСУ ТП и эксплуатации в сложных условиях.",
    },
    {
        "source_id": 792,
        "slug": "aggregation",
        "title": "Коммутаторы агрегации",
        "short_title": "Агрегация",
        "summary": "Объединение уровней доступа и построение отказоустойчивой магистрали.",
    },
    {
        "source_id": 758,
        "slug": "datacenter",
        "title": "Коммутаторы ЦОД",
        "short_title": "ЦОД",
        "summary": "Высокопроизводительные решения для серверных и IP-фабрик центров обработки данных.",
    },
)


def fetch_json(url: str) -> dict:
    return json.loads(fetch_bytes(url, accept="application/json"))


def fetch_bytes(url: str, *, accept: str = "image/*") -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    try:
        with urllib.request.urlopen(request, timeout=45, context=SSL_CONTEXT) as response:
            return response.read()
    except urllib.error.URLError:
        if os.name == "nt":
            powershell = shutil.which("powershell.exe") or shutil.which("powershell")
            if powershell:
                descriptor, temporary_name = tempfile.mkstemp(prefix="pnp-eltex-", suffix=".download")
                os.close(descriptor)
                temporary = Path(temporary_name)
                try:
                    def ps_quote(value: str) -> str:
                        return value.replace("'", "''")

                    script = (
                        "$ProgressPreference='SilentlyContinue';"
                        f"Invoke-WebRequest -UseBasicParsing -Uri '{ps_quote(url)}' "
                        f"-Headers @{{'Accept'='{ps_quote(accept)}';'User-Agent'='{ps_quote(USER_AGENT)}'}} "
                        f"-OutFile '{ps_quote(str(temporary))}'"
                    )
                    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
                    subprocess.run(
                        [powershell, "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
                        check=True,
                        capture_output=True,
                    )
                    return temporary.read_bytes()
                finally:
                    temporary.unlink(missing_ok=True)
        curl = shutil.which("curl.exe") or shutil.which("curl")
        if not curl:
            raise
        result = subprocess.run(
            [
                curl,
                "--fail",
                "--location",
                "--silent",
                "--show-error",
                "--max-time",
                "45",
                "--user-agent",
                USER_AGENT,
                "--header",
                f"Accept: {accept}",
                url,
            ],
            check=True,
            capture_output=True,
        )
        return result.stdout


def model_name(name: str) -> str:
    match = re.search(r"\bMES[\w./-]*(?:\s+rev\.[\w./-]+)?", name or "", flags=re.IGNORECASE)
    return match.group(0) if match else str(name or "").strip()


def filename_for(product: dict) -> str:
    code = re.sub(r"[^a-z0-9-]+", "-", str(product.get("code") or "product").lower()).strip("-")
    return f"{int(product['id']):04d}-{code}.webp"


def image_source(product: dict) -> str:
    images = product.get("images") or []
    selected = next((image for image in images if image.get("logo")), None)
    selected = selected or (images[0] if images else None)
    path = str((selected or {}).get("url") or "").strip()
    if not path:
        return ""
    url = path if path.startswith(("http://", "https://")) else f"{MEDIA_BASE}{path}"
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, urllib.parse.quote(parts.path, safe="/%:@"), parts.query, parts.fragment)
    )


def save_webp(source_url: str, destination: Path) -> None:
    payload = fetch_bytes(source_url)
    with Image.open(io.BytesIO(payload)) as source:
        source.load()
        if source.mode not in {"RGB", "RGBA"}:
            source = source.convert("RGBA" if "transparency" in source.info else "RGB")
        source.thumbnail((720, 300), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        source.save(destination, "WEBP", quality=86, method=6, exact=True)


def normalized_specs(product: dict) -> list[dict[str, str]]:
    preferred = ("Интерфейсы", "Пропускная способность", "Уровень", "Питание")
    source = {
        str(row.get("name") or "").strip().rstrip(":"): str(row.get("value") or "").strip()
        for row in product.get("short_attributes") or []
        if str(row.get("value") or "").strip()
    }
    return [{"label": label, "value": source[label]} for label in preferred if label in source]


def product_payload(product: dict, *, refresh_images: bool) -> dict:
    source_url = image_source(product)
    filename = filename_for(product)
    destination = OUTPUT_IMAGES / filename
    if source_url and (refresh_images or not destination.exists()):
        save_webp(source_url, destination)
    return {
        "id": int(product["id"]),
        "model": model_name(product.get("name") or ""),
        "name": str(product.get("name") or "").strip(),
        "code": str(product.get("code") or "").strip(),
        "image": f"assets/img/catalog/vendor-products/eltex-switches/{filename}" if destination.exists() else "",
        "image_source": source_url,
        "official_url": f"{PRODUCT_BASE}/{product.get('code')}/",
        "specs": normalized_specs(product),
        "source_updated_at": str(product.get("updated_at") or ""),
    }


def build_registry(*, refresh_images: bool) -> dict:
    families = []
    source_updates = []
    for family in FAMILIES:
        url = (
            f"{API_BASE}/goods?filter%5Bgroup_id%5D={family['source_id']}"
            "&per_page=100&page=1"
        )
        response = fetch_json(url)
        products = response.get("data") or []
        expected = int((response.get("pagination") or {}).get("totalQuantity") or len(products))
        if len(products) != expected:
            raise RuntimeError(f"ELTEX family {family['slug']}: expected {expected}, received {len(products)}")
        rows = [product_payload(product, refresh_images=refresh_images) for product in products]
        source_updates.extend(row["source_updated_at"] for row in rows if row["source_updated_at"])
        families.append(
            {
                **family,
                "count": len(rows),
                "source_url": f"https://eltex.ru/catalog/ethernet-kommutatory-mes/",
                "products": rows,
            }
        )

    return {
        "schema_version": 1,
        "vendor": {
            "slug": "eltex",
            "name": "ELTEX",
            "official_site": "https://eltex.ru/",
            "logo": "assets/img/logos/approved-top/eltex.png",
        },
        "product_group_slug": "network-switches",
        "title": "Коммутаторы ELTEX",
        "summary": "Подбор по проектным требованиям · стоимость и наличие по запросу",
        "source": {
            "name": "Официальный каталог ELTEX",
            "catalog_url": "https://eltex.ru/catalog/ethernet-kommutatory-mes/",
            "api_url": f"{API_BASE}/goods",
            "retrieved_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "latest_product_update": max(source_updates, default=""),
        },
        "product_count": sum(family["count"] for family in families),
        "families": families,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-images", action="store_true", help="Download images even when a local file exists.")
    args = parser.parse_args()
    try:
        registry = build_registry(refresh_images=args.refresh_images)
    except (OSError, RuntimeError, subprocess.SubprocessError, urllib.error.URLError) as error:
        print(f"ELTEX sync failed: {error}", file=sys.stderr)
        return 1

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"ELTEX switches synced: {registry['product_count']} products, {len(registry['families'])} families")
    print(f"Registry: {OUTPUT_JSON}")
    print(f"Images: {OUTPUT_IMAGES}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
