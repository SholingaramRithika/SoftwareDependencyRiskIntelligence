# Time- and space-complexity analysis

Notation: **n** array length · **σ** = hi − lo + 1 (value-domain size) · **L = ⌈log₂ σ⌉** levels · **P** packages · **E** dependency edges · m = range length (r − l + 1).

## Wavelet Tree (`waveletTree.ts`)
| Operation | Time | Justification |
|---|---|---|
| `build` | **O(n log σ)** | Recursion depth ≤ L+1. At every level the elements of all nodes sum to ≤ n and each is read once for partitioning. (`Math.min/max` scan to find the domain: O(n).) |
| Space | **O(n log σ)** words | Each element appears in at most L node vectors; each position stores 1 byte of bit + one 32-bit prefix count (plus one extra count per node). Leaves store only a size. |
| `access(i)` | **O(log σ)** | One bit and one prefix lookup per level, L levels |
| `count(l,r,x)`, `rank(x,i)` | **O(log σ)** | Per level: two O(1) prefix lookups to map `[s,e)` to the child |
| `kthSmallest(l,r,k)` | **O(log σ)** | Per level: compare `k` with `zeros[e]−zeros[s]`, then go left or right |
| `rangeCount(l,r,a,b)` | **O(log σ)** | Nodes fully inside `[a,b]` return immediately; nodes disjoint return 0; only nodes partially overlapping split, and at most 2 such nodes exist per level (the two boundaries a and b) |
| `select(x,j)` | **O(log σ · log n)** | Descend L levels, then at each of L levels run a binary search on a prefix array of size ≤ n |

Independent of the range length m (unlike the O(m) / O(m log m) linear alternatives).

## Graph algorithms (`graph.ts`)
| Operation | Time | Notes |
|---|---|---|
| `buildGraph` | O(P + E) | Hash maps; duplicate edges skipped |
| `upstream` / `downstream` / `affectedBy` | O(P + E) | BFS with a visited set; terminates on cycles |
| `shortestPath` | O(P + E) | BFS |
| `findCycles` | O(P + E) | Iterative Tarjan SCC |
| `layersFrom` / `layeredLayout` | O(P + E) layering + O(P log P) sorting | Kahn-style longest-path layering; BFS fallback when cyclic |
| `riskyPaths` | **worst case exponential** in the number of simple paths | DFS over simple paths with a visit budget (200 000) and an output cap; one fewest-edge path per target. Fine for realistic dependency graphs; the budget guards pathological ones |

## Release and risk (`release.ts`, `risk.ts`, `analysis.ts`)
| Operation | Time |
|---|---|
| `compareVersions` | O(len) |
| `compareReleases` | O(P₁ + P₂ + E₁ + E₂) (+ O((P₁+P₂) log(P₁+P₂)) to sort rows) |
| `computeRisk` | O(1) |
| `analyzeRelease` | O(P + E) |

## Theory vs measurement
The home page and lab can **measure** k-th smallest (Wavelet Tree vs sorting the slice) with `performance.now()`. These numbers vary by machine, browser and JIT warm-up, exclude build time, and are illustrations — not proofs. The asymptotic bounds above are the justification.
