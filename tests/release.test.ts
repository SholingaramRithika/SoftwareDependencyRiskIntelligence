import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, compareReleases, findRelease, ReleaseError } from '../src/algorithms/release.ts';
import { DEMO_DATASET, TINY_DATASET } from '../src/data/demoDataset.ts';
import { analyzeRelease } from '../src/state/analysis.ts';
import type { Release } from '../src/data/types.ts';

const R = (id: string, ents: [string, string, number][], edges: [string, string][] = []): Release => ({ id, label: id, date: '', edges: edges.map(([from, to]) => ({ from, to })), entries: ents.map(([pkg, version, cvss]) => ({ pkg, version, risk: { cvss, vulnCount: 0, majorsBehind: 0, maintenance: 1 } })) });

test('compareVersions', () => {
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0); assert.ok(compareVersions('2.0', '2.0.0') === 0); assert.ok(compareVersions('v1.2.3', '1.2.3') === 0);
  assert.ok(compareVersions('1.0.0-beta', '1.0.0') < 0); assert.ok(compareVersions('1.0.0', '1.0.1') < 0);
  assert.throws(() => compareVersions('', '1.0.0'), ReleaseError);
});
test('added / removed / upgraded / downgraded / unchanged', () => {
  const a = R('a', [['p', '1.0.0', 0], ['q', '2.0.0', 0], ['r', '1.0.0', 0], ['s', '3.1.0', 0]], [['p', 'q']]);
  const b = R('b', [['p', '1.1.0', 5], ['q', '1.9.0', 0], ['r', '1.0.0', 0], ['t', '0.1.0', 0]], [['p', 't']]);
  const c = compareReleases(a, b);
  assert.deepEqual(c.counts, { added: 1, removed: 1, upgraded: 1, downgraded: 1, unchanged: 1 });
  const row = (p: string) => c.rows.find(r => r.pkg === p)!;
  assert.equal(row('t').change, 'added'); assert.equal(row('s').change, 'removed'); assert.equal(row('p').change, 'upgraded'); assert.equal(row('q').change, 'downgraded');
  assert.equal(row('p').scoreDelta, 25); assert.equal(row('t').scoreDelta, null);
  assert.deepEqual(c.addedEdges, [['p', 't']]); assert.deepEqual(c.removedEdges, [['p', 'q']]);
});
test('identical releases produce no differences', () => {
  const a = R('a', [['p', '1.0.0', 3], ['q', '1.0.0', 4]], [['p', 'q']]);
  const c = compareReleases(a, a);
  assert.deepEqual(c.counts, { added: 0, removed: 0, upgraded: 0, downgraded: 0, unchanged: 2 });
  assert.equal(c.addedEdges.length + c.removedEdges.length, 0); assert.equal(c.avgScoreBase, c.avgScoreTarget);
});
test('empty release vs populated release', () => {
  const c = compareReleases(R('e', []), R('b', [['p', '1.0.0', 0]]));
  assert.equal(c.counts.added, 1); assert.equal(c.avgScoreBase, 0);
});
test('demo dataset: v1.0.0 -> v2.0.0 matches independently computed expectations', () => {
  const [v1, , v3] = DEMO_DATASET.releases;
  const c = compareReleases(v1, v3);
  assert.deepEqual(c.rows.filter(r => r.change === 'added').map(r => r.pkg), ['cache-layer', 'chart-kit', 'form-forge', 'telemetry-opt']);
  assert.deepEqual(c.rows.filter(r => r.change === 'removed').map(r => r.pkg), ['md-render', 'mock-server']);
  assert.equal(c.rows.reduce((s, r) => s + 1, 0), c.counts.added + c.counts.removed + c.counts.upgraded + c.counts.downgraded + c.counts.unchanged);
  assert.equal(c.rows.find(r => r.pkg === 'crypto-lite')!.change, 'upgraded'); // 2.4.0 -> 2.6.0
  assert.equal(compareReleases(v1, DEMO_DATASET.releases[1]).rows.find(r => r.pkg === 'crypto-lite')!.change, 'downgraded'); // 2.4.0 -> 2.3.9
});
test('risk impact after a dependency change: upgrading http-lite lowers its score and the release average', () => {
  const a = analyzeRelease(DEMO_DATASET, 'v1.5.0'), b = analyzeRelease(DEMO_DATASET, 'v2.0.0');
  assert.ok(b.byId.get('http-lite')!.risk.score < a.byId.get('http-lite')!.risk.score);
  assert.ok(b.counts.critical <= a.counts.critical);
});
test('findRelease errors on unknown id; tiny dataset analyses', () => {
  assert.throws(() => findRelease(DEMO_DATASET, 'nope'), ReleaseError);
  const t = analyzeRelease(TINY_DATASET, 'r1'); assert.equal(t.root, 'app'); assert.equal(t.rows.length, 4);
});
