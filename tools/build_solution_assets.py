"""Validate presentation registry; build covers and page-level source knowledge.

Development-only dependencies: pypdf, Pillow, Poppler pdftoppm.
Run from the project root: python tools/build_solution_assets.py
Original PDFs are never rewritten.
"""

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from pypdf import PdfReader


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rebuild', action='store_true', help='Regenerate all covers and extracted pages')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    destination = root / 'data_import/solutions_knowledge.json'
    cached = {}
    if destination.exists() and not args.rebuild:
        previous = json.loads(destination.read_text(encoding='utf-8'))
        cached = {(item['vendor_slug'], item['document_slug']): item for item in previous['documents']}
    manifest = json.loads((root / "data_import/solutions.json").read_text(encoding="utf-8"))
    knowledge = {"schema_version": 1, "documents": []}
    slugs = set()
    for vendor in manifest["vendors"]:
        if vendor["slug"] in slugs:
            raise ValueError("Duplicate manufacturer slug")
        slugs.add(vendor["slug"])
        document_slugs = set()
        for document in vendor["documents"]:
            if document["slug"] in document_slugs:
                raise ValueError("Duplicate document slug")
            document_slugs.add(document["slug"])
            pdf = (root / "static" / document["pdf"]).resolve()
            cover = (root / "static" / document["cover"]).resolve()
            if not pdf.is_relative_to(root / "static") or not cover.is_relative_to(root / "static"):
                raise ValueError("Assets must be inside static/")
            reader = PdfReader(pdf)
            if reader.is_encrypted or len(reader.pages) != document["pages"]:
                raise ValueError(f"Unexpected page count or encrypted PDF: {pdf.name}")
            digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
            old = cached.get((vendor['slug'], document['slug']), {})
            unchanged = (old.get('sha256') == digest and old.get('pdf') == document['pdf']
                         and len(old.get('pages', [])) == document['pages'])
            if args.rebuild or not unchanged or not cover.exists() or not cover.stat().st_size:
                with tempfile.TemporaryDirectory() as scratch:
                    prefix = Path(scratch) / "cover"
                    subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-scale-to", "960", "-png", str(pdf), str(prefix)], check=True)
                    with Image.open(prefix.with_suffix(".png")) as image:
                        image.save(cover, quality=88)
            pages = old['pages'] if unchanged else [
                {"number": number, "text": page.extract_text() or ""}
                for number, page in enumerate(reader.pages, 1)
            ]
            knowledge["documents"].append({
                "vendor_slug": vendor["slug"],
                "document_slug": document["slug"],
                "title": document["title"],
                "source_filename": document["source_filename"],
                "pdf": document["pdf"],
                "sha256": digest,
                "size_bytes": pdf.stat().st_size,
                "pages": pages,
            })
            print(f"{vendor['slug']}/{document['slug']}: {len(reader.pages)} pages, {'cached' if unchanged else 'built'}, OK")
    output = json.dumps(knowledge, ensure_ascii=False, indent=2) + "\n"
    if not destination.exists() or destination.read_text(encoding='utf-8') != output:
        destination.write_text(output, encoding='utf-8')


if __name__ == "__main__":
    main()
