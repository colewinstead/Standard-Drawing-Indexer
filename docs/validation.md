# Validation — initial offline HTML build

Verified November 14, 2026.

- Build: `npm run build` produced the single self-contained HTML (56.7 MiB).
- Catalog: 217 unique sheet identifiers, 217 index titles, all drawing pages mapped exactly once, ten categories, and four complete explicitly numbered multipart sets.
- Unit checks: five passing cases cover catalog/source defects, project round trips, ordering, migration/export gates, and malformed project rejection.
- Final artifact: opened with `file://` and networking disabled in Playwright Chromium on macOS and installed Microsoft Edge on the Windows test PC. No HTTP requests or browser runtime errors occurred.
- Browser scenarios: search, complete-set selection, keyboard selection and focus retention, manual reordering, Save As/project reopen, canceled dialogs, failed writes, duplicate-file rejection, revised/missing drawing migration, all-sheet export, keyboard panel resizing followed by window shrink, and desktop/mobile overflow checks passed.
- Native dialogs: interactively saved an actual project and exported CRP-1 through Chrome's real macOS system dialogs; verified the JSON and one-page PDF on disk. Windows Edge file APIs were available, but its system dialogs were stubbed for unattended automation, not manually exercised.
- PDF fidelity: every page in the 217-sheet export matched source dimensions, rotation, normalized extracted text, and rendered RGB pixels at 18 dpi. The reordered two-sheet export retained CMB-1B before CMB-1A.
- UI review: desktop 1440×960, laptop 1280×800, and 390px mobile fallback inspected. Independent Impeccable reviewer scored package focus and responsive-width fixes resolved with a ship disposition at that scope.
- Detector: one flat-type-hierarchy warning inferred 16px roles from the unbuilt HTML template. Actual linked-at-build CSS uses 13px base, 16px application heading, and 14px panel headings; reviewer accepted the compact utility hierarchy.

Screenshots and output PDFs are local ignored test artifacts in `.impeccable/review/` and `test-results/`. The isolated Windows test copy is `C:\Users\colew\StandardDrawingIndexerTest`.

Limitations: no manual Windows-dialog or screen-reader acceptance test; no engineering review of drawing applicability; library updates, crash recovery, custom PDF imports, and annotations are intentionally absent. Browser or organization policies can restrict file-system APIs. Keep the HTML library snapshot alongside project records for archival reproduction.
