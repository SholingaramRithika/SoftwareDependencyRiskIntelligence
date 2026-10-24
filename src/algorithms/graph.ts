import type { Edge } from '../data/types.ts';

/** Directed dependency graph. Edge a -> b means "a depends on b".
 *  Upstream of X  = everything X depends on (transitively, following edges forward).
 *  Downstream of X = everything that depends on X (transitively, following edges backward). */
export class GraphError extends Error { constructor(m: string) { super(m); this.name = 'GraphError'; } }

export interface Graph {
  ids: string[];
  out: Map<string, string[]>; // dependencies (upstream, direct)
  inn: Map<string, string[]>; // dependents (downstream, direct)
  edgeCount: number;
}

export function buildGraph(ids: readonly string[], edges: readonly Edge[]): Graph {
  const out = new Map<string, string[]>(), inn = new Map<string, string[]>();
  const set = new Set<string>();
  for (const id of ids) {
    if (set.has(id)) throw new GraphError(`Duplicate node id "${id}".`);
    set.add(id); out.set(id, []); inn.set(id, []);
  }
  const seen = new Set<string>();
  let edgeCount = 0;
  for (const { from, to } of edges) {
    if (!set.has(from)) throw new GraphError(`Edge references unknown package "${from}".`);
    if (!set.has(to)) throw new GraphError(`Edge references unknown package "${to}".`);
    const key = `${from}\u0000${to}`;
    if (seen.has(key)) continue; // ignore duplicate edges
    seen.add(key);
    out.get(from)!.push(to); inn.get(to)!.push(from); edgeCount++;
  }
  return { ids: [...ids], out, inn, edgeCount };
}

function need(g: Graph, id: string) { if (!g.out.has(id)) throw new GraphError(`Unknown package "${id}".`); }

/** BFS closure; cycle-safe via the visited set. Excludes the start node itself unless it lies on a cycle through itself. */
export function reach(g: Graph, start: string, dir: 'upstream' | 'downstream'): Set<string> {
  need(g, start);
  const adj = dir === 'upstream' ? g.out : g.inn;
  const seen = new Set<string>();
  const queue = [start];
  for (let h = 0; h < queue.length; h++) {
    for (const nb of adj.get(queue[h])!) if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
  }
  return seen;
}
export const upstream = (g: Graph, id: string) => reach(g, id, 'upstream');
export const downstream = (g: Graph, id: string) => reach(g, id, 'downstream');
/** Packages that would be affected if `id` is compromised/changed = all transitive dependents. */
export const affectedBy = downstream;

/** Shortest dependency path (fewest edges) from a to b following "depends on" direction; null if unreachable. */
export function shortestPath(g: Graph, a: string, b: string): string[] | null {
  need(g, a); need(g, b);
  if (a === b) return [a];
  const prev = new Map<string, string>([[a, '']]);
  const queue = [a];
  for (let h = 0; h < queue.length; h++) {
    for (const nb of g.out.get(queue[h])!) {
      if (prev.has(nb)) continue;
      prev.set(nb, queue[h]);
      if (nb === b) { const p = [b]; let c = b; while (prev.get(c)) { c = prev.get(c)!; p.push(c); } return p.reverse(); }
      queue.push(nb);
    }
  }
  return null;
}

/** Strongly connected components (Tarjan, iterative). Components with >1 node (or a self-loop) are cycles. */
export function findCycles(g: Graph): string[][] {
  let index = 0;
  const idx = new Map<string, number>(), low = new Map<string, number>(), onStack = new Set<string>();
  const stack: string[] = [], result: string[][] = [];
  for (const root of g.ids) {
    if (idx.has(root)) continue;
    const work: { v: string; i: number }[] = [{ v: root, i: 0 }];
    idx.set(root, index); low.set(root, index); index++; stack.push(root); onStack.add(root);
    while (work.length) {
      const top = work[work.length - 1];
      const nbs = g.out.get(top.v)!;
      if (top.i < nbs.length) {
        const w = nbs[top.i++];
        if (!idx.has(w)) { idx.set(w, index); low.set(w, index); index++; stack.push(w); onStack.add(w); work.push({ v: w, i: 0 }); }
        else if (onStack.has(w)) low.set(top.v, Math.min(low.get(top.v)!, idx.get(w)!));
      } else {
        work.pop();
        if (work.length) { const p = work[work.length - 1].v; low.set(p, Math.min(low.get(p)!, low.get(top.v)!)); }
        if (low.get(top.v) === idx.get(top.v)) {
          const comp: string[] = []; let w: string;
          do { w = stack.pop()!; onStack.delete(w); comp.push(w); } while (w !== top.v);
          if (comp.length > 1 || g.out.get(comp[0])!.includes(comp[0])) result.push(comp.reverse());
        }
      }
    }
  }
  return result;
}

/** BFS depth from root (unreachable nodes get -1). */
export function depthsFrom(g: Graph, root: string): Map<string, number> {
  need(g, root);
  const d = new Map<string, number>(g.ids.map(i => [i, -1]));
  d.set(root, 0);
  const q = [root];
  for (let h = 0; h < q.length; h++) for (const nb of g.out.get(q[h])!) if (d.get(nb) === -1) { d.set(nb, d.get(q[h])! + 1); q.push(nb); }
  return d;
}

/** Root→target dependency paths for every target with score >= minScore, highest score first.
 *  One path per target (the fewest-edge simple path found). Simple paths only (no repeated node on a path),
 *  so cycles cannot cause infinite loops. Worst case is exponential in pathological DAGs, so `maxPaths` bounds the output
 *  and a visit budget bounds the search (documented in docs/COMPLEXITY.md). */
export function riskyPaths(g: Graph, root: string, score: (id: string) => number, minScore: number, maxPaths = 20, budget = 200000): { path: string[]; score: number }[] {
  need(g, root);
  const best = new Map<string, string[]>();
  const onPath = new Set<string>([root]);
  const cur = [root];
  let visits = 0;
  const dfs = (v: string) => {
    for (const nb of g.out.get(v)!) {
      if (onPath.has(nb) || ++visits > budget) continue;
      onPath.add(nb); cur.push(nb);
      if (score(nb) >= minScore) { const old = best.get(nb); if (!old || cur.length < old.length) best.set(nb, [...cur]); }
      dfs(nb);
      cur.pop(); onPath.delete(nb);
    }
  };
  dfs(root);
  return [...best].map(([id, path]) => ({ path, score: score(id) })).sort((a, b) => b.score - a.score || a.path.length - b.path.length || a.path.join().localeCompare(b.path.join())).slice(0, maxPaths);
}

/** Layer index per node: longest path from the root (so shared dependencies sit below ALL their dependents),
 *  falling back to BFS depth if the reachable part contains a cycle. Unreachable nodes get -1. */
export function layersFrom(g: Graph, root: string): Map<string, number> {
  const depth = depthsFrom(g, root);
  const reachable = g.ids.filter(i => depth.get(i)! >= 0);
  const indeg = new Map(reachable.map(i => [i, 0]));
  for (const u of reachable) for (const v of g.out.get(u)!) indeg.set(v, indeg.get(v)! + 1);
  const layer = new Map(reachable.map(i => [i, 0]));
  const queue = reachable.filter(i => indeg.get(i) === 0);
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h];
    for (const v of g.out.get(u)!) { layer.set(v, Math.max(layer.get(v)!, layer.get(u)! + 1)); indeg.set(v, indeg.get(v)! - 1); if (indeg.get(v) === 0) queue.push(v); }
  }
  if (queue.length !== reachable.length) return depth; // cycle: use BFS depth
  const out = new Map<string, number>(g.ids.map(i => [i, -1]));
  for (const [k, v] of layer) out.set(k, v);
  return out;
}

/** Deterministic layered layout. Layers by longest path from the root; unreachable nodes go to an extra bottom layer;
 *  crowded layers zig-zag vertically so labels do not collide. */
export interface Positioned { id: string; x: number; y: number; layer: number }
export function layeredLayout(g: Graph, root: string, dx = 104, dy = 100): Positioned[] {
  const depth = layersFrom(g, root);
  let maxD = 0; for (const v of depth.values()) maxD = Math.max(maxD, v);
  const layers: string[][] = Array.from({ length: maxD + 2 }, () => []);
  for (const id of g.ids) { const d = depth.get(id)!; layers[d === -1 ? maxD + 1 : d].push(id); }
  const order = new Map<string, number>();
  layers.forEach((layer, li) => {
    if (li > 0) {
      const bary = (id: string) => { const ps = g.inn.get(id)!.filter(p => order.has(p)); return ps.length ? ps.reduce((s, p) => s + order.get(p)!, 0) / ps.length : 1e9; };
      layer.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
    } else layer.sort();
    layer.forEach((id, i) => order.set(id, i));
  });
  const widest = Math.max(...layers.map(l => l.length), 1);
  const out: Positioned[] = [];
  layers.forEach((layer, li) => layer.forEach((id, i) => out.push({ id, layer: li, y: li * dy + (layer.length > 6 ? (i % 2) * 30 : 0), x: (i - (layer.length - 1) / 2) * dx + (widest * dx) / 2 })));
  return out;
}
