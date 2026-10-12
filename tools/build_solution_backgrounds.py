"""Extract approved vendor background photos from supplied PDFs; originals stay untouched.

Development-only dependencies: pypdf, Pillow.
Run from project root after adding background metadata to data_import/solutions.json.
"""
import json
from pathlib import Path

from pypdf import PdfReader


def main():
    root = Path(__file__).resolve().parent.parent
    static_root = (root / 'static').resolve()
    registry = json.loads((root / 'data_import/solutions.json').read_text(encoding='utf-8'))
    for vendor in registry['vendors']:
        background = vendor.get('background')
        if not background:
            continue
        source = (static_root / background['source_pdf']).resolve()
        output = (static_root / background['image']).resolve()
        if not source.is_relative_to(static_root) or not output.is_relative_to(static_root):
            raise ValueError('Background assets must stay inside static/')
        if output.exists():
            print(f"{vendor['slug']}: existing background retained")
            continue
        page = PdfReader(source).pages[background['page'] - 1]
        embedded = next(image for image in page.images if image.name == background['image_name'])
        photo = embedded.image.copy()
        photo.thumbnail((1600, 1000))
        if photo.mode not in ('RGB', 'RGBA'):
            photo = photo.convert('RGB')
        output.parent.mkdir(parents=True, exist_ok=True)
        photo.save(output, format='WEBP', quality=86, method=6)
        print(f"{vendor['slug']}: {photo.width}x{photo.height}, {output.stat().st_size} bytes")


if __name__ == '__main__':
    main()
