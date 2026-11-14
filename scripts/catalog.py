"""Build and validate the catalog against the supplied PDF, never bookmark destinations alone."""
import hashlib
import json
import re
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'fixtures/Roadway Design Standard Drawings.pdf'


def build():
    assert fitz.VersionBind == '1.26.7', 'Install requirements-build.txt before generating stable fingerprints.'
    doc = fitz.open(SOURCE)
    labels = {p.get_label(): p.number for p in doc}
    entries = []
    category = None
    names = {'PavementMarking': 'Pavement Marking', 'ErosionControl': 'Erosion Control',
             'ProtectiveBarriers': 'Protective Barriers', 'TrafficControlPlans': 'Traffic Control Plans',
             'TCP': 'Traffic Control Plans', 'Miscellaneous': 'Miscellaneous Roadway Details'}
    for level, title, destination in doc.get_toc():
        match = re.fullmatch(r'(6\d{3})\s*-\s*(\S+)', title.strip())
        if not match:
            if level == 1:
                category = names.get(title, title)
            continue
        sheet, working = match.groups()
        # Source bookmark says TW-1L; both index and actual title block say RW-1L.
        if sheet == '6402':
            working = 'RW-1L'
        page = labels[sheet]
        assert page >= 3 and category not in ('Cover', 'Index')
        text = doc[page].get_text()
        assert working in text, f'{sheet}: working number missing from drawing'
        # ECD-3 visibly says 6103; its scanned OCR layer misreads the 6 as 5.
        assert sheet in text or (sheet == '6103' and '5103' in text), f'{sheet}: sheet number missing'
        entries.append({'id': working, 'sheet': sheet, 'category': category, 'page': page})
    assert len(entries) == 217 and len({e['id'] for e in entries}) == 217
    assert {e['page'] for e in entries} == set(range(3, len(doc)))

    # The index has three fixed columns. Working-number baselines delimit wrapped titles.
    titles = {}
    for page in (doc[1], doc[2]):
        words = page.get_text('words')
        for column in range(3):
            left = (90 + column * 775) if page.number == 1 else (35 + column * 790)
            anchors = sorted([w for w in words if left < w[0] < left + 85
                              and any(w[4] == e['id'] for e in entries)], key=lambda w: w[1])
            for i, anchor in enumerate(anchors):
                end = anchors[i + 1][1] - 2 if i + 1 < len(anchors) else page.rect.height
                selected = [w for w in words if left + 95 < w[0] < left + 660
                            and anchor[1] - 2 <= w[1] < end and w[3] - w[1] < 16]
                selected.sort(key=lambda w: (round(w[1] / 3), w[0]))
                title = ' '.join(w[4] for w in selected if not re.fullmatch(r'\d{1,2}/\d{1,2}/\d{2}', w[4])).replace('0F', 'OF')
                assert title, anchor[4]
                assert anchor[4] not in titles
                titles[anchor[4]] = title
    assert len(titles) == 217, f'Index titles: {len(titles)}'
    groups = {}
    for e in entries:
        e['title'] = titles[e['id']]
        page = doc[e['page']]
        pix = page.get_pixmap(matrix=fitz.Matrix(.5, .5), alpha=False)
        normalized = ' '.join(page.get_text().split()).encode()
        e['fingerprint'] = hashlib.sha256(normalized + pix.samples).hexdigest()
        e['width'], e['height'] = page.rect.width, page.rect.height
        match = re.search(r'\(\s*(\d)\s+OF\s+(\d)\s*\)', e['title'])
        if match:
            group = re.sub(r'\(\s*\d\s+OF\s+\d\s*\)', '', e['title']).strip()
            e['group'] = group
            groups.setdefault(group, []).append((int(match[1]), int(match[2]), e['id']))
    for name, parts in groups.items():
        assert sorted(p[0] for p in parts) == list(range(1, parts[0][1] + 1)), (name, parts)
    catalog = {'schemaVersion': 1, 'name': 'MDOT Roadway Design Standard Drawings',
               'sourceFile': SOURCE.name, 'libraryId': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               'fingerprintMethod': 'sha256-normalized-text-and-pymupdf-0.5-rgb-v1',
               'pageCount': len(doc), 'drawings': entries}
    path = ROOT / 'catalog/drawings.json'
    path.parent.mkdir(exist_ok=True)
    output = json.dumps(catalog, indent=2) + '\n'
    if not path.exists() or path.read_text() != output:
        path.write_text(output)
    print(f'Validated {len(entries)} sheet mappings, {len(titles)} index titles, {len(groups)} complete multipart groups.')

if __name__ == '__main__':
    build()
