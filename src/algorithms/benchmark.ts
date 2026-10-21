import { WaveletTree, brute } from './waveletTree.ts';

export interface BenchRow { n: number; waveletUs: number; linearUs: number }

/** Deterministic PRNG (mulberry32) so test arrays and benchmarks are repeatable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** MEASURED runtime of k-th smallest on a half-length range: wavelet tree vs sort-the-slice baseline.
 *  Tree construction time is excluded (it is a one-off cost); results are machine/browser dependent. */
export function benchmark(sizes: number[], queries = 40, now: () => number = () => performance.now()): BenchRow[] {
  return sizes.map(n => {
    const rand = rng(n);
    const arr = Array.from({ length: n }, () => Math.floor(rand() * 101));
    const tree = WaveletTree.build(arr, { lo: 0, hi: 100 });
    const qs = Array.from({ length: queries }, () => { const l = Math.floor(rand() * (n / 2)); const r = l + Math.floor(n / 2) - 1; return [l, r, 1 + Math.floor(rand() * (r - l + 1))] as const; });
    let sink = 0;
    let t0 = now(); for (const [l, r, k] of qs) sink += tree.kthSmallest(l, r, k).value; const w = now() - t0;
    t0 = now(); for (const [l, r, k] of qs) sink += brute.kth(arr, l, r, k); const s = now() - t0;
    if (sink < 0) console.log(sink); // keep the loops observable
    return { n, waveletUs: (w / queries) * 1000, linearUs: (s / queries) * 1000 };
  });
}
