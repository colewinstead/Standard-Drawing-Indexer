export const PROJECT_VERSION = 1;
const hash = /^[a-f0-9]{64}$/;
export function validateProject(value) {
  if (!value || value.schemaVersion !== PROJECT_VERSION) throw new Error('This project format is not supported. Open a version 1 project file.');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 150) throw new Error('The project needs a name of 1–150 characters.');
  if (typeof value.libraryId !== 'string' || !hash.test(value.libraryId) || !Array.isArray(value.drawings) || value.drawings.length > 1000 || typeof value.customOrder !== 'boolean') throw new Error('The project library or drawing list is invalid.');
  const seen = new Set();
  for (const entry of value.drawings) {
    if (!entry || typeof entry.id !== 'string' || !/^[A-Z0-9-]{1,60}$/.test(entry.id) || seen.has(entry.id) || typeof entry.fingerprint !== 'string' || !hash.test(entry.fingerprint) || typeof entry.title !== 'string' || entry.title.length > 2000 || !/^\d{4}$/.test(entry.sheet)) throw new Error('The project contains an invalid or duplicate drawing.');
    seen.add(entry.id);
  }
  return value;
}
export function migrateProject(project, catalog) {
  validateProject(project);
  const byId = new Map(catalog.drawings.map(d => [d.id, d]));
  return project.drawings.map(saved => {
    const current = byId.get(saved.id);
    if (current?.fingerprint === saved.fingerprint && current.sheet === saved.sheet) return selectedEntry(current);
    return { ...saved, status: current ? 'revised' : 'missing' };
  });
}
export function selectedEntry(drawing) {
  const { id, sheet, title, fingerprint } = drawing;
  return { id, sheet, title, fingerprint, status: 'unchanged' };
}
export function serializeProject(name, libraryId, entries, customOrder) {
  const project = { schemaVersion: PROJECT_VERSION, name: name.trim(), libraryId, customOrder,
    drawings: entries.map(({ id, sheet, title, fingerprint }) => ({ id, sheet, title, fingerprint })) };
  return validateProject(project);
}
export function addEntries(entries, drawings, customOrder, catalog) {
  const ids = new Set(entries.map(d => d.id));
  const next = [...entries, ...drawings.filter(d => !ids.has(d.id)).map(selectedEntry)];
  if (!customOrder) {
    const order = new Map(catalog.drawings.map((d, i) => [d.id, i]));
    next.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
  }
  return next;
}
export function exportIndices(entries, catalog) {
  if (!entries.length) throw new Error('Select at least one drawing to export.');
  const byId = new Map(catalog.drawings.map(d => [d.id, d]));
  return entries.map(entry => {
    const current = byId.get(entry.id);
    if (entry.status !== 'unchanged' || !current || current.fingerprint !== entry.fingerprint) throw new Error('Review revised or missing drawings before exporting.');
    return current.page;
  });
}
export function safeFilename(name) {
  return name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100) || 'Drawing package';
}
