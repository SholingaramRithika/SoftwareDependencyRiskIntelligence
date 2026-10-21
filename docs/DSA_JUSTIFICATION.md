# Data-structure justification and implementation strategy

Source of truth: `src/algorithms/waveletTree.ts`. This document describes the code that exists.

## 1. Problem
Given a static array of integers (e.g. risk scores 0–100 of packages in some fixed order) answer many range questions over positions `[l, r]`:
k-th smallest, frequency of a value, how many values lie in `[a, b]`, plus access / rank / select.

## 2. Why a Wavelet Tree (and when not)
A Wavelet Tree halves the **value domain** at every level and records which elements go left or right. A position range at a node maps to a range at a child in O(1) using prefix counts, so each query follows a single path of length ⌈log₂σ⌉ regardless of range length.

| Approach | k-th smallest in range | Count in value interval | Extra space | Remarks |
|---|---|---|---|---|
| Linear scan / sort the slice | O(m) – O(m log m) | O(m) | O(1) | No preprocessing; slow for long ranges × many queries (m = range length) |
| Sorted copy + binary search | not for position ranges | whole array only | O(n) | Loses positional restriction |
| Merge-sort tree | O(log² n) | O(log² n) | O(n log n) | Simple, flexible |
| Persistent segment tree | O(log n) | O(log n) | O(n log n) nodes | Fast; pointer-heavy |
| **Wavelet Tree** | **O(log σ)** | **O(log σ)** | O(n log σ) | access/rank/select in one structure |

**Trade-offs / honest limits**
- Static structure: changing a value means a rebuild.
- Pays off when queries ≫ builds. For a handful of queries a linear scan can win once build time is counted (the in-app benchmark excludes build time and says so).
- σ matters: this build splits the raw integer interval `[min, max]`; very large sparse domains would first need rank-compression (not implemented).
- Performance depends on workload, representation and implementation; no claim of universal superiority is made.

**Supported operations:** `access(i)`, `count(l,r,x)`, `rank(x,i)`, `select(x,j)`, `kthSmallest(l,r,k)`, `rangeCount(l,r,a,b)`.

## 3. Implementation strategy
| Topic | Choice in this code |
|---|---|
| Array representation / indexing | JavaScript array of integers; **zero-based** positions; query ranges **inclusive** `[l, r]`; internally half-open `[s, e)`; `k` and `j` one-based |
| Value domain | integers, \|v\| ≤ 10⁹; negatives supported; optional explicit domain (the home page and lab use `[0, 100]` for risk scores) |
| Node representation | **Pointer-based** nodes `{path, lo, hi, size, bits, zeros, left, right}`; per-node data in **typed arrays**; empty children are `null` |
| Partitioning | `mid = lo + ⌊(hi−lo)/2⌋`; value ≤ mid → left (bit 0), else right (bit 1); stable partition |
| Bit-vector / rank | `bits: Uint8Array` + prefix zero counts `zeros: Int32Array` of length `size+1`. `rank₀(i)=zeros[i]`, `rank₁(i)=i−zeros[i]` in O(1). Chosen over a succinct bit-vector for clarity and exact explainability |
| Construction | Recursive stable partition, each level touches every element once |
| Traversal | Iterative descent for access/count/rank/k-th; recursive boundary split for value-range count; `select` descends to the leaf then ascends using binary search on prefix counts |
| Duplicates | Equal values always take the same path; the leaf size is the multiplicity |
| Validation | `WaveletError` with codes `EMPTY_ARRAY, INVALID_VALUE, INVALID_RANGE, INVALID_RANK, INVALID_INDEX, INVALID_DOMAIN`; values outside the domain count as 0 occurrences |
| Step trace | Every query records `{path, lo, hi, s, e, note}` **while executing**; the UI only replays this list, it never invents steps |

**Why pointer-based nodes with typed arrays rather than one level-wise array?** Node-per-subrange keeps each node's meaning (value range, size, bit-vector) inspectable in the UI and easy to explain in a viva; a level-wise concatenated layout is more cache-friendly and compact but harder to visualise. The trade-off is extra object overhead and non-contiguous memory.

**Why prefix-count arrays instead of bits only?** O(1) rank without popcount tricks and trivially correct; costs ~32 bits per stored position instead of ~1 bit.
