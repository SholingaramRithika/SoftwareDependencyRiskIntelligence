import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, upstream, downstream, shortestPath, findCycles, depthsFrom, riskyPaths, layeredLayout, GraphError, affectedBy } from '../src/algorithms/graph.ts';
import { DEMO_DATASET } from '../src/data/demoDataset.ts';
import { analyzeRelease } from '../src/state/analysis.ts';

const g = buildGraph(['a', 'b', 'c', 'd', 'x'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }, { from: 'c', to: 'd' }]);
test('nodes, directed edges and dedupe', () => {
  assert.equal(g.edgeCount, 4); assert.deepEqual(g.out.get('a'), ['b', 'c']); assert.deepEqual(g.inn.get('c'), ['b', 'a']);
  assert.equal(buildGraph(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'a', to: 'b' }]).edgeCount, 1);
  assert.deepEqual(g.out.get('d'), []); // direction: d depends on nothing
});
test('missing package references and duplicate ids throw', () => {
  assert.throws(() => buildGraph(['a'], [{ from: 'a', to: 'zzz' }]), GraphError);
  assert.throws(() => buildGraph(['a'], [{ from: 'q', to: 'a' }]), GraphError);
  assert.throws(() => buildGraph(['a', 'a'], []), GraphError);
  assert.throws(() => upstream(g, 'nope'), GraphError);
});
test('upstream / downstream / affected', () => {
  assert.deepEqual([...upstream(g, 'a')].sort(), ['b', 'c', 'd']);
  assert.deepEqual([...downstream(g, 'd')].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...affectedBy(g, 'c')].sort(), ['a', 'b']);
  assert.equal(downstream(g, 'a').size, 0); assert.equal(upstream(g, 'x').size, 0); // unreachable/isolated
});
test('cycles: detected, and traversal terminates', () => {
  const c = buildGraph(['p', 'q', 'r', 's'], [{ from: 'p', to: 'q' }, { from: 'q', to: 'r' }, { from: 'r', to: 'p' }, { from: 'r', to: 's' }]);
  const cyc = findCycles(c); assert.equal(cyc.length, 1); assert.deepEqual([...cyc[0]].sort(), ['p', 'q', 'r']);
  assert.deepEqual([...upstream(c, 'p')].sort(), ['p', 'q', 'r', 's']);
  assert.equal(findCycles(g).length, 0);
  assert.equal(findCycles(buildGraph(['z'], [{ from: 'z', to: 'z' }])).length, 1); // self loop
});
test('shortest path and unreachable', () => {
  assert.deepEqual(shortestPath(g, 'a', 'd'), ['a', 'c', 'd']);
  assert.equal(shortestPath(g, 'd', 'a'), null); assert.equal(shortestPath(g, 'a', 'x'), null);
  assert.deepEqual(shortestPath(g, 'a', 'a'), ['a']);
  const d = depthsFrom(g, 'a'); assert.equal(d.get('d'), 2); assert.equal(d.get('x'), -1);
});
test('risky paths: highest first, simple paths only', () => {
  const sc: Record<string, number> = { a: 0, b: 10, c: 80, d: 90, x: 0 };
  const rp = riskyPaths(g, 'a', id => sc[id], 75);
  assert.deepEqual(rp.map(p => p.path.join('>')), ['a>c>d', 'a>c']); // one fewest-edge path per target, highest score first
  const cyc = buildGraph(['p', 'q'], [{ from: 'p', to: 'q' }, { from: 'q', to: 'p' }]);
  assert.doesNotThrow(() => riskyPaths(cyc, 'p', () => 99, 0));
});
test('layout: unique positions, one layer per depth, unreachable nodes isolated on last layer', () => {
  const pos = layeredLayout(g, 'a');
  assert.equal(new Set(pos.map(p => `${p.x},${p.y}`)).size, pos.length);
  assert.equal(pos.find(p => p.id === 'a')!.layer, 0); assert.equal(pos.find(p => p.id === 'd')!.layer, 3); // longest path a>b>c>d
  assert.ok(pos.find(p => p.id === 'x')!.layer > 3);
  const L = new Map(pos.map(p => [p.id, p.layer]));
  for (const [u, vs] of g.out) for (const v of vs) assert.ok(L.get(v)! > L.get(u)!, `${u}->${v} points downward`);
});
test('layout falls back to BFS depth when the graph has a cycle (no crash, all nodes placed)', () => {
  const c = buildGraph(['p', 'q', 'r'], [{ from: 'p', to: 'q' }, { from: 'q', to: 'r' }, { from: 'r', to: 'p' }]);
  assert.equal(layeredLayout(c, 'p').length, 3);
});
test('demo dataset builds into acyclic graphs with a single root for every release', () => {
  for (const rel of DEMO_DATASET.releases) {
    const a = analyzeRelease(DEMO_DATASET, rel.id);
    assert.equal(findCycles(a.graph).length, 0); assert.equal(a.root, 'acme-app');
    assert.equal(a.graph.ids.filter(i => a.graph.inn.get(i)!.length === 0).length, 1, `only root has no dependents in ${rel.id}`);
    assert.equal(depthsFrom(a.graph, a.root).size, a.graph.ids.length);
    const L = new Map(layeredLayout(a.graph, a.root).map(p => [p.id, p.layer]));
    for (const [u, vs] of a.graph.out) for (const v of vs) assert.ok(L.get(v)! > L.get(u)!, `${rel.id}: ${u}->${v} points downward`);
  }
});
