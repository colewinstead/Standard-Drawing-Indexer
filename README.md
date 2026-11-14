# Standard Drawing Indexer

An offline drawing-package workspace for the supplied Mississippi DOT Roadway Design standard drawings.

## Run

Open **dist/Standard Drawing Indexer.html** in desktop **Google Chrome or Microsoft Edge**. The HTML contains the complete drawing library, application, PDF engine, and fonts. It needs no installation, local server, or internet access. You can copy that single file to another computer.

1. Search by working number, sheet number, or title; optionally filter by category.
2. Click a drawing to preview it; check its box to include it. Multipart drawings offer **Select complete set** beneath the preview.
3. Arrange selected sheets using drag-and-drop or the up/down buttons.
4. Choose **Export combined PDF** and select its filename and location in the system dialog.
5. Use **Save**, **Save as**, and **Open project** for `.sdi-project.json` project files. These are small selection files, not copies of the PDFs.

The bundled library is a fixed snapshot of the supplied 220-page PDF: 217 drawing sheets plus an excluded cover and two index pages. Drawing issue and revision dates vary. Verify applicable agency requirements independently. This version has no update checker.

## Build from source

Requires Node.js 22.13+ and Python with the pinned catalog dependency. Run these commands from the repository folder.

### macOS / Linux

Use Python 3.10 or later supported by the pinned PyMuPDF package (CI uses Python 3.12).

```sh
npm ci
python3 -m pip install -r requirements-build.txt
npm run build
```

### Windows (PowerShell)

Install Node.js and Python 3.14, including the Python launcher (`py`). Use a local virtual environment; activation and PowerShell execution-policy changes are not required.

```powershell
npm ci
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-build.txt
.\.venv\Scripts\python.exe scripts\catalog.py
node scripts/build.mjs
```

These last two commands perform the same catalog-generation and HTML-build steps as `npm run build`, using the virtual environment directly instead of relying on a Windows `python3` alias.

The output is `dist/Standard Drawing Indexer.html` (about 57 MB). Build output and test PDFs are ignored by Git; the original source PDF and generated catalog are versioned. Third-party notices are embedded in the app's **Library & help** dialog and copied into `dist`.

## Checks

```sh
npm test
npx playwright install chromium
npm run test:browser
python3 scripts/verify-export.py
```

On Windows, use the virtual environment created above for the PDF verification step:

```powershell
npm test
npx playwright install chromium
npm run test:browser
.\.venv\Scripts\python.exe scripts\verify-export.py
```

The browser suite opens the final HTML using `file://` with networking disabled. It exercises selection, groups, ordering, project validation and migration, canceled dialogs, failed writes, and all-sheet export. Its file dialogs are stubbed to automate file writes and failure cases; native dialogs require an additional interactive check. `EDGE_PATH` can select an installed Edge executable for the same suite.

`verify-export.py` checks every exported drawing against the source, including dimensions, rotation, extracted text, and rendered pixels. Browser-test PDFs and screenshots are written under `test-results/` and `.impeccable/review/`.

## Project compatibility

Projects use schema version 1 and store a project name, source-library SHA-256, custom-order flag, and ordered sheet identifiers, titles, sheet numbers, and content fingerprints. Opening against another library retains unchanged sheets, flags revised drawings for explicit acceptance, and blocks export until missing drawings are replaced or removed. Opening invalid files leaves the current project intact.

Sheet fingerprints combine normalized text and rendered RGB pixels using the pinned PyMuPDF version. They conservatively detect visual/text changes; keep that fingerprint method stable when preparing future libraries. Projects do not preserve old PDF pages: retain the corresponding HTML for archival reproduction.

## Source catalog

`scripts/catalog.py` extracts index titles and categories, checks each working number against the actual drawing, and maps pages using PDF page labels. It fixes three broken bookmark destinations and the source bookmark typo `TW-1L` → `RW-1L`, without changing the source drawings. Only explicitly numbered multipart sets are grouped; similar drawing names do not imply a required set.

Saving is explicit. The app requests unsaved-change warnings before New/Open and when closing where the browser permits; it has no autosave or crash recovery. System file access can also be restricted by an organization's browser policies.

## Automated releases

Code, drawing-library, dependency, test, or release-workflow changes pushed to `main` (including merged pull requests) trigger `.github/workflows/release.yml`. Documentation-only changes do not create a release. You can also run **Build and release** manually from GitHub Actions on `main`.

Each run builds the HTML, checks the committed catalog for unexpected changes, runs project and offline browser tests, and compares all exported drawing pages with the source before publishing. A failed check prevents publication. Releases contain the standalone HTML, third-party notices, and SHA-256 checksums. Browser screenshots are retained as Actions artifacts for 14 days.

Tags use the package version plus the workflow run number, for example `v1.0.0+build.1`; rerunning a workflow updates that run’s release instead of creating a duplicate. The release targets the exact tested commit. Only a run for the current `main` commit is marked Latest, preventing a slower older build from superseding a newer one. No additional repository secret is required.
