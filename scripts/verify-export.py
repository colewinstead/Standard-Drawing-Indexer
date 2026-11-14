"""Compare browser-test exports with the original drawings, including actual rendered content."""
from pathlib import Path
import json
import fitz

root = Path(__file__).resolve().parent.parent
source = fitz.open(root / 'fixtures/Roadway Design Standard Drawings.pdf')
output = fitz.open(root / 'test-results/all-drawings.pdf')
catalog = json.loads((root / 'catalog/drawings.json').read_text())
assert len(output) == len(catalog['drawings']) == 217
for i, drawing in enumerate(catalog['drawings']):
    a, b = source[drawing['page']], output[i]
    assert a.rect == b.rect and a.rotation == b.rotation, drawing['id']
    assert ' '.join(a.get_text().split()) == ' '.join(b.get_text().split()), drawing['id']
    matrix = fitz.Matrix(.25, .25)
    assert a.get_pixmap(matrix=matrix, alpha=False).samples == b.get_pixmap(matrix=matrix, alpha=False).samples, drawing['id']
selected = fitz.open(root / 'test-results/selected.pdf')
assert len(selected) == 2
for i, identifier in enumerate(['CMB-1B', 'CMB-1A']):
    assert identifier in selected[i].get_text(), identifier
print('PASS: all 217 exported pages retain dimensions, rotation, text, and rendered pixels (18 dpi); selected multipart pages retain custom order.')
