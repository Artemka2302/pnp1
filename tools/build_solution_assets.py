"""Validate presentation registry; build covers and page-level source knowledge.

Development-only dependencies: pypdf, Pillow, Poppler pdftoppm.
Run from the project root: python tools/build_solution_assets.py
Original PDFs are never rewritten.
"""

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from pypdf import PdfReader


def main():
    root = Path(__file__).resolve().parent.parent
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
            with tempfile.TemporaryDirectory() as scratch:
                prefix = Path(scratch) / "cover"
                subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-scale-to", "960", "-png", str(pdf), str(prefix)], check=True)
                with Image.open(prefix.with_suffix(".png")) as image:
                    image.save(cover, quality=88)
            knowledge["documents"].append({
                "vendor_slug": vendor["slug"],
                "document_slug": document["slug"],
                "title": document["title"],
                "source_filename": document["source_filename"],
                "pdf": document["pdf"],
                "sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
                "size_bytes": pdf.stat().st_size,
                "pages": [{"number": number, "text": page.extract_text() or ""} for number, page in enumerate(reader.pages, 1)],
            })
            print(f"{vendor['slug']}/{document['slug']}: {len(reader.pages)} pages, OK")
    destination = root / "data_import/solutions_knowledge.json"
    destination.write_text(json.dumps(knowledge, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
