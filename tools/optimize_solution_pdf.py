"""Create a smaller web PDF without overwriting its source (development only).

Requires Ghostscript and pypdf. Text remains text; only oversized raster images
are downsampled. Always visually inspect representative pages before publishing.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from pypdf import PdfReader


def optimize(source, destination, dpi=150):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or destination.exists():
        raise ValueError('Use a new destination; source and existing outputs are never overwritten')
    gs = shutil.which('gswin64c') or shutil.which('gs')
    if not gs:
        raise RuntimeError('Ghostscript is required')
    original = PdfReader(source)
    if original.is_encrypted or original.get_fields():
        raise ValueError('Encrypted or interactive PDFs require separate review')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as scratch:
        candidate = Path(scratch) / 'web.pdf'
        subprocess.run([
            gs, '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.6', '-dPDFSETTINGS=/ebook',
            '-dAutoRotatePages=/None', '-dDetectDuplicateImages=true',
            '-dCompressFonts=true', '-dSubsetFonts=true', '-dJPEGQ=85',
            '-dDownsampleColorImages=true', '-dColorImageDownsampleType=/Bicubic',
            f'-dColorImageResolution={dpi}', '-dColorImageDownsampleThreshold=1.1',
            '-dDownsampleGrayImages=true', '-dGrayImageDownsampleType=/Bicubic',
            f'-dGrayImageResolution={dpi}', '-dGrayImageDownsampleThreshold=1.1',
            '-dMonoImageResolution=300',
            f'-sOutputFile={candidate}', str(source),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        compressed = PdfReader(candidate)
        if len(compressed.pages) != len(original.pages):
            raise ValueError('Page count changed')
        ratios = []
        for page_number, (before, after) in enumerate(zip(original.pages, compressed.pages), 1):
            if any(abs(float(a) - float(b)) > 0.2 for a, b in zip(before.mediabox, after.mediabox)):
                raise ValueError('Page geometry changed')
            # Font rewriting may change extraction whitespace without changing text.
            words_before = Counter(re.findall(r'\w', (before.extract_text() or '').casefold()))
            words_after = Counter(re.findall(r'\w', (after.extract_text() or '').casefold()))
            retained = sum((words_before & words_after).values()) / max(1, sum(words_before.values()))
            if words_before and retained < 0.99:
                raise ValueError(f'Page {page_number}: text extraction changed: {retained:.1%}; review needed')
            ratios.append(retained if words_before else 1)
        selected = candidate if candidate.stat().st_size < source.stat().st_size else source
        shutil.copy2(selected, destination)
    return {'source_filename': source.name, 'source_bytes': source.stat().st_size,
            'web_bytes': destination.stat().st_size, 'pages': len(original.pages),
            'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'web_sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'minimum_text_retention': min(ratios), 'image_dpi': dpi,
            'optimized': selected != source}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--dpi', type=int, default=150)
    args = parser.parse_args()
    print(json.dumps(optimize(args.source, args.destination, args.dpi), ensure_ascii=True))
