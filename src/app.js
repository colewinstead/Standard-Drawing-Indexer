import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { addEntries, exportIndices, migrateProject, safeFilename, selectedEntry, serializeProject, validateProject } from './project.js';

const $ = id => document.getElementById(id);
const catalog = JSON.parse($('catalog-data').textContent);
const byId = new Map(catalog.drawings.map(d => [d.id, d]));
const state = { entries: [], customOrder: false, dirty: false, handle: null, preview: catalog.drawings[0].id, zoom: null, busy: false, ready: false };
let previewPdf, sourcePdfPromise, renderTask, renderSequence = 0;
const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
let sourceBytes;
const fonts = JSON.parse($('font-data').textContent);
class EmbeddedFonts {
  async fetch({ filename }) {
    if (!fonts[filename]) throw new Error(`Bundled PDF font not found: ${filename}`);
    return decode(fonts[filename]);
  }
}
pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([JSON.parse($('worker-data').textContent)], { type: 'text/javascript' }));
const supported = typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';
$('support-warning').hidden = supported;
$('library-fingerprint').textContent = `Library SHA-256: ${catalog.libraryId}`;
$('license-text').textContent = LICENSE_TEXT;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function message(text = '', error = false) {
  $('message').textContent = text;
  $('message').className = error ? 'error' : '';
  $('message').hidden = !text;
}
function changed() { state.dirty = true; renderSaveState(); }
function renderSaveState() {
  $('save-state').textContent = state.dirty ? 'Unsaved changes' : state.handle ? 'Saved' : 'Not saved';
  $('save-state').classList.toggle('dirty', state.dirty);
  document.title = `${state.dirty ? '• ' : ''}${$('project-name').value || 'Untitled project'} — Standard Drawing Indexer`;
}
function filtered() {
  const query = $('search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.drawings.filter(d => (!$('category').value || d.category === $('category').value) && query.every(word => `${d.id} ${d.sheet} ${d.title}`.toLowerCase().includes(word)));
}
function renderCatalog() {
  const active = document.activeElement;
  const focusId = $('catalog-list').contains(active) ? active.dataset.select || active.dataset.preview : null;
  const focusKind = active?.dataset.select ? 'select' : 'preview';
  const selected = new Set(state.entries.map(d => d.id));
  const drawings = filtered();
  const fragment = document.createDocumentFragment();
  for (const d of drawings) {
    const row = element('div', `drawing-row${state.preview === d.id ? ' previewed' : ''}`);
    const checkbox = element('input');
    checkbox.type = 'checkbox'; checkbox.checked = selected.has(d.id); checkbox.dataset.select = d.id;
    checkbox.setAttribute('aria-label', `Include ${d.id}, sheet ${d.sheet}`);
    const button = element('button', 'drawing-preview');
    button.dataset.preview = d.id;
    button.setAttribute('aria-pressed', String(state.preview === d.id));
    const top = element('span', 'drawing-top');
    top.append(element('span', 'drawing-id', d.id), element('span', 'drawing-sheet', `SHEET ${d.sheet}`));
    button.append(top, element('span', 'drawing-title', d.title));
    if (d.group) button.append(element('span', 'group-tag', `${catalog.drawings.filter(x => x.group === d.group).length}-sheet set`));
    row.append(checkbox, button); fragment.append(row);
  }
  if (!drawings.length) fragment.append(element('p', 'no-results', 'No drawings match. Try another number or title, or choose All categories.'));
  $('catalog-list').replaceChildren(fragment);
  if (focusId) Array.from($('catalog-list').querySelectorAll(`[data-${focusKind}]`)).find(n => n.dataset[focusKind] === focusId)?.focus({ preventScroll: true });
  $('result-count').textContent = `${drawings.length} drawing${drawings.length === 1 ? '' : 's'}`;
  $('select-filtered').disabled = !drawings.some(d => !selected.has(d.id));
}
function arrow(direction) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('fill', 'none'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', direction === 'up' ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'); svg.append(path); return svg;
}
function renderPackage(focusId, action) {
  const active = document.activeElement;
  const focusedRow = active?.closest('#package-list .package-row');
  if (!focusId && focusedRow) {
    const index = Array.from($('package-list').children).indexOf(focusedRow);
    focusId = state.entries.some(e => e.id === focusedRow.dataset.id) ? focusedRow.dataset.id : state.entries[Math.min(index, state.entries.length - 1)]?.id;
    action = active.dataset.preview || active.dataset.accept ? 'preview' : active.dataset.remove ? 'remove' : active.dataset.direction;
  }
  const fragment = document.createDocumentFragment();
  state.entries.forEach((entry, index) => {
    const row = element('li', 'package-row'); row.dataset.id = entry.id; row.draggable = true;
    row.append(element('span', 'package-number', String(index + 1).padStart(2, '0')));
    const details = element('div');
    const preview = element('button', 'sheet-link', `${entry.id} · ${entry.sheet}`); preview.dataset.preview = entry.id;
    preview.disabled = entry.status === 'missing';
    details.append(preview, element('span', 'drawing-title', entry.title));
    if (entry.status !== 'unchanged') {
      const review = element('div', 'review-actions', entry.status === 'missing' ? 'Missing from this library. Replace or remove this sheet.' : 'Drawing changed. Preview the current sheet before accepting it.');
      if (entry.status === 'revised') {
        const accept = element('button', '', 'Accept current drawing'); accept.dataset.accept = entry.id; review.append(accept);
      }
      details.append(review);
    }
    const tools = element('div', 'row-tools');
    for (const [direction, disabled] of [['up', index === 0], ['down', index === state.entries.length - 1]]) {
      const button = element('button'); button.dataset.move = entry.id; button.dataset.direction = direction;
      button.setAttribute('aria-label', `Move ${entry.id} ${direction}`); button.disabled = disabled; button.append(arrow(direction)); tools.append(button);
    }
    const remove = element('button', 'remove', 'Remove'); remove.dataset.remove = entry.id; remove.setAttribute('aria-label', `Remove ${entry.id}`); tools.append(remove);
    details.append(tools); row.append(details); fragment.append(row);
  });
  $('package-list').replaceChildren(fragment);
  $('package-count').textContent = state.entries.length;
  $('package-empty').hidden = !!state.entries.length;
  $('package-list').hidden = !state.entries.length;
  $('clear-selection').disabled = !state.entries.length;
  $('source-order').disabled = !state.customOrder;
  const unresolved = state.entries.filter(e => e.status !== 'unchanged').length;
  $('migration-notice').hidden = !unresolved;
  $('migration-notice').textContent = `${unresolved} sheet${unresolved === 1 ? '' : 's'} need review before export. Revised sheets show the current library preview; saved projects do not contain the old PDF.`;
  $('export-summary').textContent = state.entries.length ? `${state.entries.length} sheet${state.entries.length === 1 ? '' : 's'} · ${state.customOrder ? 'custom order' : 'source order'}` : 'No sheets selected';
  $('export-pdf').disabled = !state.entries.length || !!unresolved || !supported || !state.ready;
  $('save-project').disabled = !supported; $('save-as').disabled = !supported; $('open-project').disabled = !supported;
  const d = byId.get(state.preview);
  $('add-preview').disabled = !d;
  $('add-preview').textContent = state.entries.some(e => e.id === state.preview) ? 'Remove from package' : 'Add to package';
  if (focusId) {
    const buttons = Array.from($('package-list').querySelectorAll('button'));
    const target = (action === 'preview' ? buttons.find(b => b.dataset.preview === focusId) : action === 'remove' ? buttons.find(b => b.dataset.remove === focusId) : null) || buttons.find(b => b.dataset.move === focusId && b.dataset.direction === action && !b.disabled) || buttons.find(b => b.dataset.move === focusId && !b.disabled) || buttons.find(b => b.dataset.remove === focusId);
    target?.focus({ preventScroll: true });
  } else if (focusedRow && !state.entries.length) {
    $('package-heading').setAttribute('tabindex', '-1'); $('package-heading').focus();
  }
}
function refresh() { renderCatalog(); renderPackage(); renderSaveState(); }
function add(drawings) {
  const next = addEntries(state.entries, drawings, state.customOrder, catalog);
  if (next.length !== state.entries.length) { state.entries = next; changed(); refresh(); }
}
function remove(id) { state.entries = state.entries.filter(e => e.id !== id); changed(); refresh(); }
function toggle(id) { state.entries.some(e => e.id === id) ? remove(id) : add([byId.get(id)]); }
async function preview(id) {
  if (!byId.has(id)) return;
  state.preview = id; state.zoom = null;
  renderCatalog(); renderPackage();
  await renderPreview();
}
async function renderPreview() {
  const sequence = ++renderSequence;
  renderTask?.cancel();
  const d = byId.get(state.preview);
  $('preview-heading').textContent = d.id;
  $('preview-category').textContent = d.category;
  $('preview-sheet').textContent = `Sheet ${d.sheet}`;
  $('preview-title').textContent = d.title;
  $('group-info').hidden = !d.group;
  $('group-label').textContent = d.group ? `${catalog.drawings.filter(x => x.group === d.group).length} sheets in this set` : '';
  $('preview-canvas').hidden = true;
  $('preview-loading').hidden = false;
  $('preview-loading').textContent = 'Rendering drawing…';
  if (!previewPdf) return;
  try {
    const page = await previewPdf.getPage(d.page + 1);
    if (sequence !== renderSequence) return;
    const box = $('preview-viewport');
    const base = page.getViewport({ scale: 1 });
    const fit = Math.min((box.clientWidth - 42) / base.width, (box.clientHeight - 55) / base.height);
    const scale = Math.max(.025, state.zoom ?? fit);
    $('zoom-label').textContent = state.zoom === null ? 'Fit' : `${Math.round(scale * 100)}%`;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: scale * ratio });
    // Render offscreen so a canceled task never shares the visible canvas with its replacement.
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    await renderTask.promise;
    if (sequence !== renderSequence) return;
    const visible = $('preview-canvas');
    visible.width = canvas.width; visible.height = canvas.height;
    visible.style.width = `${viewport.width / ratio}px`; visible.style.height = `${viewport.height / ratio}px`;
    visible.getContext('2d').drawImage(canvas, 0, 0);
    visible.setAttribute('aria-label', `${d.id}, sheet ${d.sheet}: ${d.title}`);
    visible.hidden = false; $('preview-loading').hidden = true;
  } catch (error) {
    if (error.name === 'RenderingCancelledException' || sequence !== renderSequence) return;
    $('preview-loading').textContent = `Could not preview ${d.id}. ${error.message}`;
  }
}
function move(id, targetIndex, direction) {
  const index = state.entries.findIndex(e => e.id === id);
  if (index < 0 || targetIndex < 0 || targetIndex >= state.entries.length || index === targetIndex) return;
  const [entry] = state.entries.splice(index, 1); state.entries.splice(targetIndex, 0, entry);
  state.customOrder = true; changed(); renderPackage(id, direction);
}
function confirmReplace() { return !state.dirty || window.confirm('Discard unsaved project changes? Save the project first if you want to keep them.'); }
function requireName() {
  if (!$('project-name').value.trim()) { $('project-name').focus(); throw new Error('Enter a project name before saving or exporting.'); }
}
async function operation(label, work) {
  if (state.busy) return;
  state.busy = true; document.body.classList.add('busy');
  $('workspace').inert = true; $('project-name').disabled = true;
  document.querySelectorAll('.file-actions button').forEach(b => b.disabled = true);
  message(label);
  try { await work(); }
  catch (error) { error.name === 'AbortError' ? message('Canceled. Your project is unchanged.') : message(`${label.replace(/…$/, '')} failed. ${error.message} Try again; your project remains open.`, true); }
  finally {
    state.busy = false; document.body.classList.remove('busy'); $('workspace').inert = false; $('project-name').disabled = false;
    document.querySelectorAll('.file-actions button').forEach(b => b.disabled = false);
    renderPackage();
  }
}
const projectType = { description: 'Standard Drawing Indexer project', accept: { 'application/json': ['.json'] } };
async function writeFile(handle, data) {
  let writable;
  try { writable = await handle.createWritable(); await writable.write(data); await writable.close(); }
  catch (error) { if (writable) await writable.abort().catch(() => {}); throw error; }
}
function save(as = false) {
  if (!supported) return;
  return operation('Saving project…', async () => {
    requireName();
    const project = serializeProject($('project-name').value, catalog.libraryId, state.entries, state.customOrder);
    // Pick before asynchronous PDF or file work consumes the browser's user activation.
    const handle = as || !state.handle ? await window.showSaveFilePicker({ suggestedName: `${safeFilename(project.name)}.sdi-project.json`, types: [projectType] }) : state.handle;
    await writeFile(handle, JSON.stringify(project, null, 2) + '\n');
    state.handle = handle; state.dirty = false; renderSaveState(); message(`Saved ${handle.name}.`);
  });
}
function openProject() {
  if (!supported || !confirmReplace()) return;
  return operation('Opening project…', async () => {
    const [handle] = await window.showOpenFilePicker({ multiple: false, types: [projectType] });
    const file = await handle.getFile();
    if (file.size > 2 * 1024 * 1024) throw new Error('Project files must be smaller than 2 MB. Choose a project JSON file, not a PDF or HTML.');
    const project = validateProject(JSON.parse(await file.text()));
    const entries = migrateProject(project, catalog);
    state.entries = entries; state.customOrder = project.customOrder; state.handle = handle;
    state.dirty = project.libraryId !== catalog.libraryId;
    $('project-name').value = project.name;
    refresh();
    const first = entries.find(e => byId.has(e.id));
    if (first) void preview(first.id);
    const unresolved = entries.some(e => e.status !== 'unchanged');
    message(unresolved ? 'Project opened. Review revised or missing drawings in the selected package before export.' : state.dirty ? 'Project migrated to this library. Save to keep the migration.' : `Opened ${handle.name}.`);
  });
}
function exportPdf() {
  if (!supported) return;
  return operation('Exporting PDF…', async () => {
    requireName();
    const indices = exportIndices(state.entries, catalog);
    const handle = await window.showSaveFilePicker({ suggestedName: `${safeFilename($('project-name').value)}.pdf`, types: [{ description: 'Combined drawing PDF', accept: { 'application/pdf': ['.pdf'] } }] });
    sourcePdfPromise ??= PDFDocument.load(sourceBytes, { updateMetadata: false }).catch(error => { sourcePdfPromise = undefined; throw error; });
    const source = await sourcePdfPromise;
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    output.setTitle($('project-name').value.trim());
    const bytes = await output.save();
    await writeFile(handle, bytes);
    message(`Exported ${indices.length} sheet${indices.length === 1 ? '' : 's'} to ${handle.name}.`);
  });
}
$('search').addEventListener('input', renderCatalog);
$('category').addEventListener('change', renderCatalog);
for (const category of new Set(catalog.drawings.map(d => d.category))) {
  const option = element('option', '', category); option.value = category; $('category').append(option);
}
$('catalog-list').addEventListener('change', event => { if (event.target.dataset.select) toggle(event.target.dataset.select); });
$('catalog-list').addEventListener('click', event => { const id = event.target.closest('[data-preview]')?.dataset.preview; if (id) void preview(id); });
$('select-filtered').addEventListener('click', () => add(filtered()));
$('add-preview').addEventListener('click', () => toggle(state.preview));
$('select-group').addEventListener('click', () => add(catalog.drawings.filter(d => d.group && d.group === byId.get(state.preview).group)));
$('package-list').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.preview) void preview(button.dataset.preview);
  if (button.dataset.remove) remove(button.dataset.remove);
  if (button.dataset.accept) { const index = state.entries.findIndex(e => e.id === button.dataset.accept); state.entries[index] = selectedEntry(byId.get(button.dataset.accept)); changed(); refresh(); }
  if (button.dataset.move) move(button.dataset.move, state.entries.findIndex(e => e.id === button.dataset.move) + (button.dataset.direction === 'up' ? -1 : 1), button.dataset.direction);
});
let dragged;
$('package-list').addEventListener('dragstart', event => {
  const row = event.target.closest('[data-id]'); if (!row) return;
  dragged = row.dataset.id; event.dataTransfer.setData('text/plain', dragged); event.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging');
});
$('package-list').addEventListener('dragover', event => {
  const row = event.target.closest('[data-id]'); if (!row || !dragged) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'move';
  $('package-list').querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over')); row.classList.add('drag-over');
});
$('package-list').addEventListener('drop', event => {
  const row = event.target.closest('[data-id]'); if (!row || !dragged) return;
  event.preventDefault(); move(dragged, state.entries.findIndex(e => e.id === row.dataset.id)); dragged = null;
});
$('package-list').addEventListener('dragend', () => { dragged = null; $('package-list').querySelectorAll('.dragging,.drag-over').forEach(n => n.classList.remove('dragging', 'drag-over')); });
$('clear-selection').addEventListener('click', () => { if (window.confirm(`Remove all ${state.entries.length} selected sheets?`)) { state.entries = []; state.customOrder = false; changed(); refresh(); } });
$('source-order').addEventListener('click', () => { state.customOrder = false; state.entries = addEntries(state.entries, [], false, catalog); changed(); refresh(); });
$('project-name').addEventListener('input', changed);
$('new-project').addEventListener('click', () => {
  if (!confirmReplace()) return;
  Object.assign(state, { entries: [], customOrder: false, dirty: false, handle: null }); $('project-name').value = 'Untitled project'; refresh(); message();
});
$('open-project').addEventListener('click', openProject);
$('save-project').addEventListener('click', () => save());
$('save-as').addEventListener('click', () => save(true));
$('export-pdf').addEventListener('click', exportPdf);
$('fit').addEventListener('click', () => { state.zoom = null; void renderPreview(); });
for (const [id, factor] of [['zoom-in', 1.3], ['zoom-out', 1 / 1.3]]) $(id).addEventListener('click', () => {
  const base = byId.get(state.preview);
  const fit = Math.min(($('preview-viewport').clientWidth - 42) / base.width, ($('preview-viewport').clientHeight - 55) / base.height);
  state.zoom = Math.max(.025, Math.min(2, (state.zoom ?? fit) * factor)); void renderPreview();
});
$('about').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
window.addEventListener('beforeunload', event => { if (state.dirty || state.busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || state.busy || $('help-dialog').open) return;
  if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(event.shiftKey); }
  if (event.key.toLowerCase() === 'o') { event.preventDefault(); void openProject(); }
});
for (const [id, variable, panel, min, max, sign] of [
  ['catalog-resizer', '--catalog-width', 'catalog-panel', 270, 560, 1],
  ['package-resizer', '--package-width', 'package-panel', 260, 520, -1],
]) {
  const handle = $(id);
  const resize = width => {
    const other = $(panel === 'catalog-panel' ? 'package-panel' : 'catalog-panel').getBoundingClientRect().width;
    const limit = Math.min(max, $('workspace').clientWidth - other - 292);
    const value = Math.max(min, Math.min(limit, width));
    document.documentElement.style.setProperty(variable, `${value}px`); handle.setAttribute('aria-valuenow', Math.round(value));
  };
  handle.addEventListener('pointerdown', event => {
    const start = event.clientX, width = $(panel).getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    const move = e => resize(width + (e.clientX - start) * sign);
    const stop = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', stop); handle.removeEventListener('pointercancel', stop); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop);
  });
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); resize($(panel).getBoundingClientRect().width + (event.key === 'ArrowRight' ? 15 : -15) * sign);
  });
}
let resizeTimer;
new ResizeObserver(() => { clearTimeout(resizeTimer); if (state.zoom === null && previewPdf) resizeTimer = setTimeout(() => void renderPreview(), 150); }).observe($('preview-viewport'));
refresh();
(async () => {
  try {
    sourceBytes = decode($('source-data').textContent.trim());
    $('source-data').remove();
    previewPdf = await pdfjs.getDocument({ data: sourceBytes.slice(), StandardFontDataFactory: EmbeddedFonts, useWasm: false, isEvalSupported: false }).promise;
    if (previewPdf.numPages !== catalog.pageCount) throw new Error('Bundled library page count does not match its catalog.');
    state.ready = true; renderPackage(); await renderPreview();
  } catch (error) {
    message(`The bundled drawing library could not load. Reopen an intact copy of the HTML file. ${error.message}`, true);
    $('preview-loading').textContent = 'Drawing library unavailable.';
  }
})();
