/**
 * Wavelet Tree over an integer array (value-domain splitting, "wavelet tree on values").
 *
 * Conventions (shown to the user in the Wavelet Tree Lab):
 *  - Array positions are ZERO-BASED. Query ranges [l, r] are INCLUSIVE.
 *  - k in kthSmallest and j in select are ONE-BASED (k = 1 is the minimum).
 *  - Values are integers with |v| <= 1e9 (negative values are supported).
 *  - A node covers the value interval [lo, hi]. mid = lo + floor((hi - lo) / 2).
 *    Elements with value <= mid are marked 0 and go to the LEFT child [lo, mid];
 *    elements with value > mid are marked 1 and go to the RIGHT child [mid+1, hi].
 *    Both children keep the original relative order (stable partition).
 *  - Each internal node stores a bit-vector plus a prefix array `zeros`, where
 *    zeros[i] = number of 0-bits among the first i bits. This gives O(1) rank.
 *    Internally ranges are half-open [s, e).
 *  - Equal values always follow the same path, so duplicates are handled naturally;
 *    a leaf (lo == hi) simply stores how many copies it holds.
 */

export type WaveletErrorCode = 'EMPTY_ARRAY' | 'INVALID_VALUE' | 'INVALID_RANGE' | 'INVALID_RANK' | 'INVALID_INDEX' | 'INVALID_DOMAIN';

export class WaveletError extends Error {
  code: WaveletErrorCode;
  constructor(code: WaveletErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'WaveletError';
  }
}

export interface WaveletNode {
  path: string; // '' = root, then 'L' / 'R' per level
  lo: number;
  hi: number;
  size: number;
  bits: Uint8Array; // empty for leaves
  zeros: Int32Array; // prefix count of zeros, length size+1 (empty for leaves)
  left: WaveletNode | null;
  right: WaveletNode | null;
}

export interface Step {
  path: string;
  lo: number;
  hi: number;
  s: number; // half-open range [s, e) mapped into this node
  e: number;
  note: string;
}

export interface QueryResult<T = number> {
  value: T;
  steps: Step[];
  explanation: string;
}

export const MAX_ABS_VALUE = 1_000_000_000;
const midOf = (lo: number, hi: number) => lo + Math.floor((hi - lo) / 2);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= MAX_ABS_VALUE;

export class WaveletTree {
  readonly n: number;
  readonly lo: number;
  readonly hi: number;
  readonly root: WaveletNode | null;

  private constructor(n: number, lo: number, hi: number, root: WaveletNode | null) {
    this.n = n; this.lo = lo; this.hi = hi; this.root = root;
  }

  /** Build the tree in O(n log sigma) time, sigma = hi - lo + 1. */
  static build(values: readonly number[], domain?: { lo: number; hi: number }): WaveletTree {
    if (!Array.isArray(values)) throw new WaveletError('INVALID_VALUE', 'Input must be an array of integers.');
    for (let i = 0; i < values.length; i++) {
      if (!isInt(values[i])) throw new WaveletError('INVALID_VALUE', `Value at position ${i} is not an integer within ±${MAX_ABS_VALUE}.`);
    }
    if (values.length === 0) return new WaveletTree(0, 0, -1, null);
    let lo = values[0], hi = values[0];
    for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (domain) {
      if (!isInt(domain.lo) || !isInt(domain.hi) || domain.lo > domain.hi) throw new WaveletError('INVALID_DOMAIN', 'Domain must satisfy lo <= hi (integers).');
      if (lo < domain.lo || hi > domain.hi) throw new WaveletError('INVALID_DOMAIN', `Values must lie inside the domain [${domain.lo}, ${domain.hi}].`);
      lo = domain.lo; hi = domain.hi;
    }
    const root = WaveletTree.buildNode(values, lo, hi, '');
    return new WaveletTree(values.length, lo, hi, root);
  }

  private static buildNode(values: readonly number[], lo: number, hi: number, path: string): WaveletNode | null {
    const size = values.length;
    if (size === 0) return null;
    if (lo === hi) return { path, lo, hi, size, bits: new Uint8Array(0), zeros: new Int32Array(0), left: null, right: null };
    const mid = midOf(lo, hi);
    const bits = new Uint8Array(size);
    const zeros = new Int32Array(size + 1);
    const leftVals: number[] = [], rightVals: number[] = [];
    for (let i = 0; i < size; i++) {
      const goesRight = values[i] > mid;
      bits[i] = goesRight ? 1 : 0;
      zeros[i + 1] = zeros[i] + (goesRight ? 0 : 1);
      (goesRight ? rightVals : leftVals).push(values[i]);
    }
    return {
      path, lo, hi, size, bits, zeros,
      left: WaveletTree.buildNode(leftVals, lo, mid, path + 'L'),
      right: WaveletTree.buildNode(rightVals, mid + 1, hi, path + 'R'),
    };
  }

  // ---------- helpers ----------
  private requireNonEmpty() {
    if (this.n === 0 || !this.root) throw new WaveletError('EMPTY_ARRAY', 'The array is empty; build a tree from at least one value.');
  }
  private checkRange(l: number, r: number) {
    this.requireNonEmpty();
    if (!Number.isInteger(l) || !Number.isInteger(r)) throw new WaveletError('INVALID_RANGE', 'l and r must be integers.');
    if (l < 0 || r >= this.n || l > r) throw new WaveletError('INVALID_RANGE', `Range [${l}, ${r}] is invalid: need 0 ≤ l ≤ r ≤ ${this.n - 1}.`);
  }
  nodeAt(path: string): WaveletNode | null {
    let node = this.root;
    for (const c of path) { if (!node) return null; node = c === 'L' ? node.left : node.right; }
    return node;
  }
  *nodes(): Generator<WaveletNode> {
    const stack: WaveletNode[] = this.root ? [this.root] : [];
    while (stack.length) {
      const nd = stack.pop()!;
      yield nd;
      if (nd.right) stack.push(nd.right);
      if (nd.left) stack.push(nd.left);
    }
  }
  /** Number of levels (root = 1). 0 for an empty tree. */
  depth(): number {
    let d = 0;
    for (const nd of this.nodes()) d = Math.max(d, nd.path.length + 1);
    return d;
  }
  /** Total number of stored bits + prefix-count integers (for space reporting). */
  storedWords(): number {
    let w = 0;
    for (const nd of this.nodes()) w += nd.bits.length + nd.zeros.length;
    return w;
  }

  // ---------- queries ----------

  /** Value stored at position i. O(log sigma). */
  access(i: number): QueryResult {
    this.requireNonEmpty();
    if (!Number.isInteger(i) || i < 0 || i >= this.n) throw new WaveletError('INVALID_INDEX', `Index ${i} is out of bounds (valid: 0..${this.n - 1}).`);
    const steps: Step[] = [];
    let node = this.root!, idx = i;
    while (node.lo !== node.hi) {
      const bit = node.bits[idx];
      const z = node.zeros[idx];
      steps.push({ path: node.path, lo: node.lo, hi: node.hi, s: idx, e: idx + 1, note: `Node [${node.lo}, ${node.hi}]: bit at position ${idx} is ${bit} → go ${bit ? 'right' : 'left'}; new position = ${bit ? `${idx} − zeros(${idx}) = ${idx - z}` : `zeros(${idx}) = ${z}`}.` });
      idx = bit ? idx - z : z;
      node = (bit ? node.right : node.left)!;
    }
    steps.push({ path: node.path, lo: node.lo, hi: node.hi, s: idx, e: idx + 1, note: `Leaf [${node.lo}]: the value is ${node.lo}.` });
    return { value: node.lo, steps, explanation: `access(${i}) = ${node.lo}: followed the bit of position ${i} down ${steps.length - 1} level(s) until a leaf.` };
  }

  /** Occurrences of value x in positions [l, r] (inclusive). O(log sigma). */
  count(l: number, r: number, x: number): QueryResult {
    this.checkRange(l, r);
    if (!isInt(x)) throw new WaveletError('INVALID_VALUE', 'x must be an integer.');
    const steps: Step[] = [];
    if (x < this.lo || x > this.hi) {
      return { value: 0, steps, explanation: `count = 0: ${x} is outside the value domain [${this.lo}, ${this.hi}], so it cannot occur.` };
    }
    let node: WaveletNode | null = this.root, s = l, e = r + 1;
    let lastPath = '';
    while (node && node.lo !== node.hi) {
      const mid = midOf(node.lo, node.hi);
      const goRight = x > mid;
      const ns = goRight ? s - node.zeros[s] : node.zeros[s];
      const ne = goRight ? e - node.zeros[e] : node.zeros[e];
      steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Node [${node.lo}, ${node.hi}], range [${s}, ${e}): ${x} ${goRight ? '>' : '≤'} mid ${mid} → go ${goRight ? 'right' : 'left'}; range becomes [${ns}, ${ne}).` });
      lastPath = node.path;
      s = ns; e = ne;
      node = goRight ? node.right : node.left;
      if (s >= e) break;
    }
    const value = node && s < e ? e - s : 0;
    if (node && node.lo === node.hi && s < e) {
      steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Leaf [${node.lo}]: mapped range [${s}, ${e}) holds ${value} copy/copies.` });
    } else {
      const p = node ? node.path : lastPath;
      steps.push({ path: p, lo: node?.lo ?? x, hi: node?.hi ?? x, s, e, note: 'The mapped range became empty (or the child does not exist), so the value does not occur in [l, r].' });
    }
    return { value, steps, explanation: `count(l=${l}, r=${r}, x=${x}) = ${value}: the range was mapped through ${steps.length - 1} level(s) with O(1) prefix-zero lookups each; the leaf range size is the answer.` };
  }

  /** Occurrences of x in the prefix [0, i) (i from 0 to n). */
  rank(x: number, i: number): QueryResult {
    this.requireNonEmpty();
    if (!isInt(x)) throw new WaveletError('INVALID_VALUE', 'x must be an integer.');
    if (!Number.isInteger(i) || i < 0 || i > this.n) throw new WaveletError('INVALID_INDEX', `Prefix length ${i} is out of bounds (valid: 0..${this.n}).`);
    if (i === 0) return { value: 0, steps: [], explanation: 'rank(x, 0) = 0: the prefix is empty.' };
    const res = this.count(0, i - 1, x);
    return { ...res, explanation: `rank(x=${x}, i=${i}) = ${res.value}: this is count over the prefix [0, ${i - 1}]. ${res.explanation.split(': ').slice(1).join(': ')}` };
  }

  /** k-th smallest (k is 1-based) in positions [l, r]. O(log sigma). */
  kthSmallest(l: number, r: number, k: number): QueryResult {
    this.checkRange(l, r);
    const len = r - l + 1;
    if (!Number.isInteger(k) || k < 1 || k > len) throw new WaveletError('INVALID_RANK', `k=${k} is invalid: need 1 ≤ k ≤ ${len} (range length).`);
    const steps: Step[] = [];
    let node = this.root!, s = l, e = r + 1, kk = k;
    while (node.lo !== node.hi) {
      const zs = node.zeros[s], ze = node.zeros[e];
      const leftCount = ze - zs;
      const goLeft = kk <= leftCount;
      steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Node [${node.lo}, ${node.hi}], range [${s}, ${e}): ${leftCount} element(s) go left. k=${kk} ${goLeft ? '≤' : '>'} ${leftCount} → go ${goLeft ? 'left' : `right with k = ${kk} − ${leftCount} = ${kk - leftCount}`}.` });
      if (goLeft) { s = zs; e = ze; node = node.left!; }
      else { kk -= leftCount; s = s - zs; e = e - ze; node = node.right!; }
    }
    steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Leaf [${node.lo}]: the ${k}-th smallest value is ${node.lo}.` });
    return { value: node.lo, steps, explanation: `kthSmallest(l=${l}, r=${r}, k=${k}) = ${node.lo}: at each level the number of elements going left decides whether the answer lies in the lower or upper half of the value interval.` };
  }

  /** Number of positions in [l, r] whose value lies in [a, b]. */
  rangeCount(l: number, r: number, a: number, b: number): QueryResult {
    this.checkRange(l, r);
    if (!isInt(a) || !isInt(b)) throw new WaveletError('INVALID_VALUE', 'a and b must be integers.');
    if (a > b) throw new WaveletError('INVALID_RANGE', `Value interval [${a}, ${b}] is invalid: need a ≤ b.`);
    const steps: Step[] = [];
    const visit = (node: WaveletNode | null, s: number, e: number): number => {
      if (!node || s >= e || b < node.lo || a > node.hi) return 0;
      if (a <= node.lo && node.hi <= b) {
        steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Node [${node.lo}, ${node.hi}] lies fully inside [${a}, ${b}] → add ${e - s}.` });
        return e - s;
      }
      // partial overlap => node is internal (a leaf is either fully inside or fully outside)
      steps.push({ path: node.path, lo: node.lo, hi: node.hi, s, e, note: `Node [${node.lo}, ${node.hi}] partially overlaps [${a}, ${b}] → split range [${s}, ${e}) between both children.` });
      const zs = node.zeros[s], ze = node.zeros[e];
      return visit(node.left, zs, ze) + visit(node.right, s - zs, e - ze);
    };
    const value = visit(this.root, l, r + 1);
    return { value, steps, explanation: `rangeCount(l=${l}, r=${r}, values ${a}..${b}) = ${value}: nodes fully inside the value interval contribute their whole mapped range; only nodes on the two boundary paths are split (O(log σ) nodes).` };
  }

  /** Position (0-based) of the j-th (1-based) occurrence of x. O(log sigma * log n). */
  select(x: number, j: number): QueryResult {
    this.requireNonEmpty();
    if (!isInt(x)) throw new WaveletError('INVALID_VALUE', 'x must be an integer.');
    if (!Number.isInteger(j) || j < 1) throw new WaveletError('INVALID_RANK', 'j must be an integer ≥ 1.');
    const total = x < this.lo || x > this.hi ? 0 : this.count(0, this.n - 1, x).value;
    if (j > total) throw new WaveletError('INVALID_RANK', `Value ${x} occurs ${total} time(s); occurrence j=${j} does not exist.`);
    const chain: WaveletNode[] = [];
    let node = this.root!;
    while (node.lo !== node.hi) {
      chain.push(node);
      node = (x > midOf(node.lo, node.hi) ? node.right : node.left)!;
    }
    const steps: Step[] = [{ path: node.path, lo: node.lo, hi: node.hi, s: j - 1, e: j, note: `Descend to the leaf of ${x} (${chain.length} level(s)); the ${j}-th copy sits at leaf position ${j - 1}.` }];
    let pos = j - 1;
    for (let c = chain.length - 1; c >= 0; c--) {
      const parent = chain[c];
      const fromRight = x > midOf(parent.lo, parent.hi);
      const before = pos;
      pos = selectBit(parent, fromRight ? 1 : 0, pos + 1);
      steps.push({ path: parent.path, lo: parent.lo, hi: parent.hi, s: pos, e: pos + 1, note: `Ascend to [${parent.lo}, ${parent.hi}]: position of the ${before + 1}-th ${fromRight ? '1' : '0'}-bit (binary search on prefix counts) = ${pos}.` });
    }
    return { value: pos, steps, explanation: `select(x=${x}, j=${j}) = ${pos}: descend to the leaf of ${x}, then map the position back up through each bit-vector using select on the prefix counts.` };
  }
}

/** Index of the j-th (1-based) bit equal to `bit` in a node's bit-vector (binary search on prefix zeros). */
function selectBit(node: WaveletNode, bit: 0 | 1, j: number): number {
  let loI = 1, hiI = node.size;
  const countUpTo = (i: number) => (bit === 0 ? node.zeros[i] : i - node.zeros[i]);
  while (loI < hiI) {
    const m = (loI + hiI) >> 1;
    if (countUpTo(m) >= j) hiI = m; else loI = m + 1;
  }
  return loI - 1;
}

// ---------- brute-force references (used by tests and by the lab's cross-check) ----------
export const brute = {
  access: (a: readonly number[], i: number) => a[i],
  count: (a: readonly number[], l: number, r: number, x: number) => a.slice(l, r + 1).filter(v => v === x).length,
  rank: (a: readonly number[], x: number, i: number) => a.slice(0, i).filter(v => v === x).length,
  kth: (a: readonly number[], l: number, r: number, k: number) => [...a.slice(l, r + 1)].sort((p, q) => p - q)[k - 1],
  rangeCount: (a: readonly number[], l: number, r: number, lo: number, hi: number) => a.slice(l, r + 1).filter(v => v >= lo && v <= hi).length,
  select: (a: readonly number[], x: number, j: number) => { let c = 0; for (let i = 0; i < a.length; i++) if (a[i] === x && ++c === j) return i; return -1; },
};
