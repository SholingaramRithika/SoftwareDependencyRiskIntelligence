import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDataset } from '../src/data/validate.ts';
import { BUILTIN_DATASETS } from '../src/data/demoDataset.ts';
import { ROUTES, isKnownPath } from '../src/routes.ts';
import { benchmark } from '../src/algorithms/benchmark.ts';
import { readFileSync, readdirSync } from 'node:fs';

const good = () => JSON.parse(JSON.stringify(BUILTIN_DATASETS[1]));
test('built-in datasets validate', () => { for (const d of BUILTIN_DATASETS) { const r = validateDataset(JSON.parse(JSON.stringify(d))); assert.ok(r.ok, r.errors.join('; ')); } });
test('malformed datasets are rejected with clear messages', () => {
  assert.equal(validateDataset(null).ok, false); assert.equal(validateDataset([]).ok, false); assert.equal(validateDataset('x').ok, false);
  const cases: [string, (d: any) => void][] = [
    ['missing synthetic flag', d => { delete d.synthetic; }],
    ['duplicate package', d => { d.packages.push({ ...d.packages[0] }); }],
    ['bad kind', d => { d.packages[0].kind = 'weird'; }],
    ['unknown package in entry', d => { d.releases[0].entries[0].pkg = 'ghost'; }],
    ['edge to package outside release', d => { d.releases[0].edges.push({ from: 'app', to: 'lib-e' }); }],
    ['risk out of range', d => { d.releases[0].entries[0].risk.cvss = 42; }],
    ['empty releases', d => { d.releases = []; }],
    ['empty version', d => { d.releases[0].entries[0].version = ''; }],
    ['duplicate entry', d => { d.releases[0].entries.push({ ...d.releases[0].entries[0] }); }],
  ];
  for (const [name, mutate] of cases) { const d = good(); mutate(d); const r = validateDataset(d); assert.equal(r.ok, false, name); assert.ok(r.errors.length > 0, name); assert.equal(r.dataset, undefined); }
});
test('routes: unique paths, every route has a page file entry in App.tsx', () => {
  assert.equal(new Set(ROUTES.map(r => r.path)).size, ROUTES.length);
  assert.ok(isKnownPath('/wavelet-lab')); assert.ok(!isKnownPath('/nope'));
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  for (const r of ROUTES) assert.ok(app.includes(`'${r.path}'`), `App.tsx handles ${r.path}`);
});
test('every internal link target in the source code is a known route', () => {
  const dir = new URL('../src/', import.meta.url);
  const files = ['pages', 'components'].flatMap(d => readdirSync(new URL(`${d}/`, dir)).map(f => new URL(`${d}/${f}`, dir)));
  const re = /\bto=(?:"|\{?['"`])(\/[a-z-]*)/g;
  for (const f of files) { const src = readFileSync(f, 'utf8'); for (const m of src.matchAll(re)) assert.ok(isKnownPath(m[1]), `${f.pathname}: link to ${m[1]}`); }
});
test('benchmark returns positive timings for each size', () => {
  let t = 0; const fake = () => (t += 1);
  const rows = benchmark([50, 200], 3, fake);
  assert.equal(rows.length, 2); for (const r of rows) { assert.ok(r.waveletUs > 0 && r.linearUs > 0); }
});
