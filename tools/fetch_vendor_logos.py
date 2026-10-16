#!/usr/bin/env python3
"""Fetch vendor logos from official websites listed in a CSV manifest.

The input CSV must contain ``vendor_name``, ``slug`` and ``official_site``.
An optional ``logo_source_url`` can point directly at the preferred asset.
The output CSV adds the local ``logo`` path and the exact downloaded source URL.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import ssl
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
)
MAX_BYTES = 20 * 1024 * 1024


@dataclass(frozen=True)
class Candidate:
    score: int
    url: str


class LogoHTMLParser(HTMLParser):
    def __init__(self, base_url: str, vendor_name: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.vendor_terms = {
            term.casefold()
            for term in re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", vendor_name)
            if len(term) > 2
        }
        self.candidates: list[Candidate] = []

    def handle_starttag(self, tag: str, attrs):
        values = {str(key).casefold(): value or "" for key, value in attrs}
        haystack = " ".join(values.values()).casefold()

        if tag in {"img", "source"}:
            src = (
                values.get("src")
                or values.get("data-src")
                or values.get("data-lazy-src")
                or values.get("srcset", "").split(",")[0].split(" ")[0]
            )
            if not src:
                return
            score = 0
            if "logo" in haystack:
                score += 100
            if any(term in haystack for term in self.vendor_terms):
                score += 55
            if any(token in haystack for token in ("header", "brand", "navbar")):
                score += 20
            if any(token in haystack for token in ("footer", "white", "inverse", "lazy")):
                score -= 8
            if score:
                self._append(score, src)

        if tag == "link":
            rel = values.get("rel", "").casefold()
            href = values.get("href", "")
            if href and "icon" in rel:
                score = 45 if "apple" in rel else 35
                self._append(score, href)

        if tag == "meta":
            prop = (values.get("property") or values.get("name", "")).casefold()
            content = values.get("content", "")
            if content and prop in {"og:image", "twitter:image"}:
                self._append(15, content)

    def _append(self, score: int, url: str):
        if url.startswith("data:"):
            return
        absolute = urllib.parse.urljoin(self.base_url, url.strip())
        parsed = urllib.parse.urlsplit(absolute)
        if parsed.scheme in {"http", "https"}:
            self.candidates.append(Candidate(score, absolute))


def fetch(url: str, timeout: int = 20) -> tuple[bytes, str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        length = response.headers.get("Content-Length")
        if length and int(length) > MAX_BYTES:
            raise ValueError(f"asset is larger than {MAX_BYTES} bytes")
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError(f"asset is larger than {MAX_BYTES} bytes")
        content_type = response.headers.get_content_type()
        return data, content_type, response.geturl()


def detect_format(data: bytes, content_type: str, url: str) -> str | None:
    sample = data[:4096].lstrip().lower()
    if b"<svg" in sample or content_type in {"image/svg+xml", "text/svg"}:
        return "svg"
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
            image_format = (image.format or "").lower()
        if image_format == "png":
            return "png"
        if image_format in {"jpeg", "jpg", "webp", "gif", "bmp", "tiff", "ico"}:
            return "raster"
    except Exception:
        pass
    suffix = Path(urllib.parse.urlsplit(url).path).suffix.casefold()
    if suffix == ".svg" and b"<svg" in sample:
        return "svg"
    return None


def save_asset(data: bytes, kind: str, target_stem: Path) -> Path:
    target_stem.parent.mkdir(parents=True, exist_ok=True)
    if kind == "svg":
        target = target_stem.with_suffix(".svg")
        target.write_bytes(data)
        return target

    target = target_stem.with_suffix(".png")
    if kind == "png":
        with Image.open(io.BytesIO(data)) as image:
            if image.width < 16 or image.height < 16:
                raise ValueError("image is smaller than 16x16")
        target.write_bytes(data)
        return target

    with Image.open(io.BytesIO(data)) as image:
        if image.width < 16 or image.height < 16:
            raise ValueError("image is smaller than 16x16")
        image.convert("RGBA").save(target, "PNG", optimize=True)
    return target


def candidate_urls(row: dict[str, str]) -> list[Candidate]:
    preferred = (row.get("logo_source_url") or "").strip()
    site = (row.get("official_site") or "").strip()
    candidates: list[Candidate] = []
    if preferred:
        candidates.append(Candidate(1000, preferred))
    if not site:
        return candidates

    try:
        html, content_type, final_url = fetch(site)
        if content_type in {"text/html", "application/xhtml+xml"}:
            parser = LogoHTMLParser(final_url, row["vendor_name"])
            parser.feed(html.decode("utf-8", errors="ignore"))
            candidates.extend(parser.candidates)
    except Exception as exc:
        print(f"WARN {row['vendor_name']}: official site unavailable: {exc}", file=sys.stderr)

    parsed = urllib.parse.urlsplit(site)
    if parsed.hostname:
        favicon = "https://www.google.com/s2/favicons?" + urllib.parse.urlencode(
            {"domain_url": f"https://{parsed.hostname}", "sz": "256"}
        )
        candidates.append(Candidate(1, favicon))

    unique: dict[str, Candidate] = {}
    for candidate in sorted(candidates, key=lambda item: item.score, reverse=True):
        unique.setdefault(candidate.url, candidate)
    return list(unique.values())


def fetch_logo(row: dict[str, str], output_dir: Path, static_root: Path):
    errors: list[str] = []
    for candidate in candidate_urls(row):
        try:
            data, content_type, final_url = fetch(candidate.url)
            kind = detect_format(data, content_type, final_url)
            if not kind:
                raise ValueError(f"unsupported content type {content_type}")
            target = save_asset(data, kind, output_dir / row["slug"])
            return target.relative_to(static_root).as_posix(), final_url
        except Exception as exc:
            errors.append(f"{candidate.url}: {exc}")
    raise RuntimeError("; ".join(errors) or "no candidate logo URLs")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--asset-dir",
        type=Path,
        default=Path("static/assets/img/logos/vendor-list-20261015"),
    )
    parser.add_argument("--static-root", type=Path, default=Path("static"))
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    with args.manifest.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
        fieldnames = list(source.seek(0) or csv.DictReader(source).fieldnames or [])
    if not rows:
        raise SystemExit("manifest contains no vendor rows")
    fieldnames = list(rows[0].keys())
    for field in ("logo", "logo_source_url", "fetch_status"):
        if field not in fieldnames:
            fieldnames.append(field)

    static_root = args.static_root.resolve()
    asset_dir = args.asset_dir.resolve()
    pending = []
    for index, row in enumerate(rows, start=1):
        if (row.get("logo") or "").strip():
            row["fetch_status"] = "existing"
        else:
            pending.append((index, row))

    failed = 0
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(fetch_logo, row, asset_dir, static_root): (index, row)
            for index, row in pending
        }
        for future in as_completed(futures):
            index, row = futures[future]
            try:
                row["logo"], row["logo_source_url"] = future.result()
                row["fetch_status"] = "downloaded"
                print(f"[{index}/{len(rows)}] {row['vendor_name']}: {row['logo']}")
            except Exception as exc:
                failed += 1
                row["fetch_status"] = f"failed: {exc}"
                print(f"ERROR {row['vendor_name']}: {exc}", file=sys.stderr)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"completed: {len(rows) - failed} ok, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
