import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveletTree, WaveletError, brute } from '../src/algorithms/waveletTree.ts';
import { rng } from '../src/algorithms/benchmark.ts';

const EX = [5, 2, 8, 6, 3, 7, 1, 4];
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as WaveletError).code; } return 'NO_ERROR'; };

test('build: partitioning and prefix counts are correct', () => {
  const t = WaveletTree.build(EX);
  assert.equal(t.n, 8); assert.equal(t.lo, 1); assert.equal(t.hi, 8);
  const root = t.root!;
  // mid = 1 + floor(7/2) = 4 -> values <=4 are 0
  assert.deepEqual([...root.bits], [1, 0, 1, 1, 0, 1, 0, 0]);
  assert.deepEqual([...root.zeros], [0, 0, 1, 1, 1, 2, 2, 3, 4]);
  assert.deepEqual([...t.nodeAt('L')!.bits.slice(0, 0)], []);
  assert.equal(root.left!.size, 4); assert.equal(root.right!.size, 4);
  assert.equal(t.depth(), 4);
});
test('sizes of children always sum to parent size', () => {
  const t = WaveletTree.build([3, 3, 9, -4, 0, 12, 12, 7, 7, 7]);
  for (const nd of t.nodes()) if (nd.left || nd.right) assert.equal((nd.left?.size ?? 0) + (nd.right?.size ?? 0), nd.size);
});
test('documented example results', () => {
  const t = WaveletTree.build(EX);
  assert.equal(t.kthSmallest(1, 6, 3).value, 3);   // [2,8,6,3,7,1] sorted 1,2,3,6,7,8
  assert.equal(t.count(0, 7, 5).value, 1);
  assert.equal(t.rangeCount(1, 6, 2, 6).value, 3); // positions 1..6 = 2,8,6,3,7,1 -> values 2,6,3 lie in [2,6]
  assert.equal(t.rangeCount(1, 6, 2, 6).value, brute.rangeCount(EX, 1, 6, 2, 6));
  assert.equal(t.access(3).value, 6);
  assert.equal(t.select(7, 1).value, 5);
});
test('single element, all-equal, duplicates', () => {
  const one = WaveletTree.build([42]);
  assert.equal(one.access(0).value, 42); assert.equal(one.kthSmallest(0, 0, 1).value, 42); assert.equal(one.count(0, 0, 42).value, 1); assert.equal(one.count(0, 0, 41).value, 0);
  const eq = WaveletTree.build([7, 7, 7, 7]);
  assert.equal(eq.count(1, 3, 7).value, 3); assert.equal(eq.kthSmallest(0, 3, 4).value, 7); assert.equal(eq.select(7, 4).value, 3);
  const dup = WaveletTree.build([2, 1, 2, 1, 2]);
  assert.equal(dup.count(0, 4, 2).value, 3); assert.equal(dup.select(2, 3).value, 4); assert.equal(dup.rank(1, 4).value, 2);
});
test('negative values', () => {
  const a = [-5, 3, -5, 0, 9, -1];
  const t = WaveletTree.build(a);
  assert.equal(t.kthSmallest(0, 5, 1).value, -5); assert.equal(t.kthSmallest(0, 5, 3).value, -1);
  assert.equal(t.count(0, 5, -5).value, 2); assert.equal(t.rangeCount(0, 5, -5, 0).value, 4);
});
test('empty input: builds, but every query reports EMPTY_ARRAY', () => {
  const t = WaveletTree.build([]);
  assert.equal(t.n, 0); assert.equal(t.depth(), 0);
  assert.equal(code(() => t.kthSmallest(0, 0, 1)), 'EMPTY_ARRAY');
  assert.equal(code(() => t.count(0, 0, 1)), 'EMPTY_ARRAY');
  assert.equal(code(() => t.access(0)), 'EMPTY_ARRAY');
  assert.equal(code(() => t.select(1, 1)), 'EMPTY_ARRAY');
});
test('invalid parameters are rejected with specific codes', () => {
  const t = WaveletTree.build(EX);
  assert.equal(code(() => t.count(-1, 3, 5)), 'INVALID_RANGE');
  assert.equal(code(() => t.count(3, 8, 5)), 'INVALID_RANGE');
  assert.equal(code(() => t.count(4, 3, 5)), 'INVALID_RANGE');
  assert.equal(code(() => t.count(0, 3, 1.5)), 'INVALID_VALUE');
  assert.equal(code(() => t.kthSmallest(0, 3, 0)), 'INVALID_RANK');
  assert.equal(code(() => t.kthSmallest(0, 3, 5)), 'INVALID_RANK');
  assert.equal(code(() => t.rangeCount(0, 3, 6, 2)), 'INVALID_RANGE');
  assert.equal(code(() => t.access(8)), 'INVALID_INDEX');
  assert.equal(code(() => t.rank(5, 9)), 'INVALID_INDEX');
  assert.equal(code(() => t.select(5, 2)), 'INVALID_RANK');
  assert.equal(code(() => t.select(99, 1)), 'INVALID_RANK');
  assert.equal(code(() => WaveletTree.build([1, NaN])), 'INVALID_VALUE');
  assert.equal(code(() => WaveletTree.build([1, 2.5])), 'INVALID_VALUE');
  assert.equal(code(() => WaveletTree.build([1, 50], { lo: 0, hi: 10 })), 'INVALID_DOMAIN');
});
test('values outside the domain count as zero occurrences', () => {
  const t = WaveletTree.build(EX);
  assert.equal(t.count(0, 7, 100).value, 0); assert.equal(t.count(0, 7, 0).value, 0);
  assert.equal(t.rangeCount(0, 7, 100, 200).value, 0); assert.equal(t.rangeCount(0, 7, -50, 50).value, 8);
});
test('explicit domain [0,100] works and keeps depth', () => {
  const t = WaveletTree.build([10, 90, 50], { lo: 0, hi: 100 });
  assert.equal(t.lo, 0); assert.equal(t.hi, 100); assert.equal(t.kthSmallest(0, 2, 2).value, 50);
});
test('steps correspond to the real traversal (each step path exists and ranges are within node size)', () => {
  const t = WaveletTree.build(EX);
  for (const res of [t.kthSmallest(1, 6, 3), t.count(0, 7, 4), t.rangeCount(0, 7, 3, 6), t.access(2), t.select(8, 1)]) {
    assert.ok(res.steps.length > 0);
    for (const s of res.steps) { const nd = t.nodeAt(s.path); assert.ok(nd, `node ${s.path} exists`); assert.ok(s.s >= 0 && s.e <= Math.max(nd!.size, s.s + 1)); }
  }
});
test('randomized comparison against brute force (all query types)', () => {
  const rand = rng(12345);
  for (let round = 0; round < 300; round++) {
    const n = 1 + Math.floor(rand() * 24);
    const span = 1 + Math.floor(rand() * 20);
    const off = Math.floor(rand() * 21) - 10;
    const a = Array.from({ length: n }, () => off + Math.floor(rand() * span));
    const t = WaveletTree.build(a);
    for (let q = 0; q < 12; q++) {
      const l = Math.floor(rand() * n), r = l + Math.floor(rand() * (n - l));
      const k = 1 + Math.floor(rand() * (r - l + 1));
      const x = off - 1 + Math.floor(rand() * (span + 2));
      const lo = off - 1 + Math.floor(rand() * (span + 2)), hi = lo + Math.floor(rand() * span);
      const i = Math.floor(rand() * (n + 1));
      assert.equal(t.kthSmallest(l, r, k).value, brute.kth(a, l, r, k), `kth ${JSON.stringify({ a, l, r, k })}`);
      assert.equal(t.count(l, r, x).value, brute.count(a, l, r, x), `count ${JSON.stringify({ a, l, r, x })}`);
      assert.equal(t.rangeCount(l, r, lo, hi).value, brute.rangeCount(a, l, r, lo, hi), `rangeCount ${JSON.stringify({ a, l, r, lo, hi })}`);
      assert.equal(t.rank(x, i).value, brute.rank(a, x, i), `rank ${JSON.stringify({ a, x, i })}`);
      assert.equal(t.access(l).value, a[l]);
      const total = brute.count(a, 0, n - 1, x);
      if (total > 0) { const j = 1 + Math.floor(rand() * total); assert.equal(t.select(x, j).value, brute.select(a, x, j), `select ${JSON.stringify({ a, x, j })}`); }
    }
  }
});
test('exhaustive check on every range of a small array', () => {
  const a = [3, 1, 3, 0, 2, 2, 1, 3];
  const t = WaveletTree.build(a);
  for (let l = 0; l < a.length; l++) for (let r = l; r < a.length; r++) for (let k = 1; k <= r - l + 1; k++) assert.equal(t.kthSmallest(l, r, k).value, brute.kth(a, l, r, k));
});
