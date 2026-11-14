import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addEntries, exportIndices, migrateProject, selectedEntry, serializeProject, validateProject, safeFilename } from '../src/project.js';
const catalog = JSON.parse(await readFile(new URL('../catalog/drawings.json', import.meta.url)));
const [a,b,c] = catalog.drawings;
const project = entries => serializeProject('Highway 19', catalog.libraryId, entries, false);

test('catalog maps each drawing page exactly once and repairs source bookmark defects', () => {
  assert.equal(catalog.drawings.length,217);
  assert.deepEqual(catalog.drawings.map(d=>d.page),Array.from({length:217},(_,i)=>i+3));
  assert.equal(catalog.drawings.find(d=>d.id==='RW-1L').sheet,'6402');
  for (const [id,page] of [['RS-1',27],['RS-2',28],['B-9',194]]) assert.equal(catalog.drawings.find(d=>d.id===id).page,page);
  assert.equal(new Set(catalog.drawings.map(d=>d.category)).size,10);
  assert.equal(new Set(catalog.drawings.map(d=>d.group).filter(Boolean)).size,4);
  assert.ok(catalog.drawings.every(d=>d.title && !/\d{1,2}\/\d{1,2}\/\d{2}/.test(d.title)));
});
test('projects round trip with selection and order, including empty selections', () => {
  for (const entries of [[],[selectedEntry(c),selectedEntry(a)]]) {
    const saved=JSON.parse(JSON.stringify(project(entries)));
    assert.deepEqual(migrateProject(saved,catalog),entries);
  }
});
test('source ordering and custom ordering do not duplicate sheets', () => {
  const entries=[selectedEntry(c)];
  assert.deepEqual(addEntries(entries,[a,c,b],false,catalog).map(d=>d.id),[a.id,b.id,c.id]);
  assert.deepEqual(addEntries(entries,[a,c,b],true,catalog).map(d=>d.id),[c.id,a.id,b.id]);
});
test('migration retains order and blocks revised/missing sheets until resolved', () => {
  const saved=project([selectedEntry(c),selectedEntry(a),selectedEntry(b)]);
  const next={...catalog,drawings:catalog.drawings.filter(d=>d.id!==b.id).map(d=>d.id===a.id?{...d,fingerprint:'f'.repeat(64)}:d)};
  const migrated=migrateProject(saved,next);
  assert.deepEqual(migrated.map(d=>d.status),['unchanged','revised','missing']);
  assert.throws(()=>exportIndices(migrated,next),/Review/);
  const accepted=[migrated[0],selectedEntry(next.drawings.find(d=>d.id===a.id))];
  assert.deepEqual(exportIndices(accepted,next),[c.page,a.page]);
  assert.deepEqual(migrateProject(project(migrated),next).map(d=>d.status),['unchanged','revised','missing']);
});
test('malformed, unsupported, duplicate, or incomplete project files are rejected', () => {
  for (const value of [null,{}, {...project([]),schemaVersion:99},{...project([]),name:''},{...project([]),libraryId:'bad'},{...project([]),libraryId:[catalog.libraryId]}, {...project([]),customOrder:undefined},{...project([]),drawings:[selectedEntry(a),selectedEntry(a)]},{...project([]),drawings:[{id:'A'}]}]) {
    assert.throws(()=>validateProject(value));
  }
  assert.throws(()=>exportIndices([],catalog),/at least one/);
  assert.equal(safeFilename('Road/19: Package.'),'Road-19- Package');
});
