import type { Dataset, Release, ReleaseEntry } from '../data/types.ts';
import { computeRisk } from './risk.ts';

export class ReleaseError extends Error { constructor(m: string) { super(m); this.name = 'ReleaseError'; } }

/** Compare dotted versions numerically segment by segment ("1.10.0" > "1.9.9"). A pre-release suffix ("-beta")
 *  sorts before the same numeric version. Non-numeric segments fall back to string comparison.
 *  Returns negative, 0, or positive. Throws on empty strings. */
export function compareVersions(a: string, b: string): number {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') throw new ReleaseError('Versions must be non-empty strings.');
  const split = (v: string) => { const [core, ...pre] = v.trim().replace(/^v/i, '').split('-'); return { parts: core.split('.'), pre: pre.join('-') }; };
  const A = split(a), B = split(b);
  const n = Math.max(A.parts.length, B.parts.length);
  for (let i = 0; i < n; i++) {
    const x = A.parts[i] ?? '0', y = B.parts[i] ?? '0';
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { const d = Number(x) - Number(y); if (d !== 0) return d; }
    else if (x !== y) return x < y ? -1 : 1;
  }
  if (A.pre === B.pre) return 0;
  if (!A.pre) return 1; if (!B.pre) return -1;
  return A.pre < B.pre ? -1 : 1;
}

export type ChangeType = 'added' | 'removed' | 'upgraded' | 'downgraded' | 'unchanged';
export interface ChangeRow {
  pkg: string; change: ChangeType; baseVersion: string | null; targetVersion: string | null;
  baseScore: number | null; targetScore: number | null; scoreDelta: number | null;
}
export interface Comparison {
  rows: ChangeRow[];
  counts: Record<ChangeType, number>;
  addedEdges: [string, string][]; removedEdges: [string, string][];
  avgScoreBase: number; avgScoreTarget: number;
  totalScoreBase: number; totalScoreTarget: number;
}

const byPkg = (r: Release) => new Map<string, ReleaseEntry>(r.entries.map(e => [e.pkg, e]));
const score = (e: ReleaseEntry | undefined) => (e ? computeRisk(e.risk).score : null);

/** O(P_a + P_b + E_a + E_b) with hash maps/sets (P = packages, E = edges). Rows sorted by package id. */
export function compareReleases(base: Release, target: Release): Comparison {
  if (!base || !target) throw new ReleaseError('Both releases are required.');
  const A = byPkg(base), B = byPkg(target);
  const ids = [...new Set([...A.keys(), ...B.keys()])].sort();
  const counts: Record<ChangeType, number> = { added: 0, removed: 0, upgraded: 0, downgraded: 0, unchanged: 0 };
  const rows: ChangeRow[] = ids.map(pkg => {
    const a = A.get(pkg), b = B.get(pkg);
    let change: ChangeType;
    if (!a) change = 'added';
    else if (!b) change = 'removed';
    else { const c = compareVersions(a.version, b.version); change = c < 0 ? 'upgraded' : c > 0 ? 'downgraded' : 'unchanged'; }
    counts[change]++;
    const bs = score(a), ts = score(b);
    return { pkg, change, baseVersion: a?.version ?? null, targetVersion: b?.version ?? null, baseScore: bs, targetScore: ts, scoreDelta: bs !== null && ts !== null ? ts - bs : null };
  });
  const ek = (e: { from: string; to: string }) => `${e.from}\u0000${e.to}`;
  const EA = new Set(base.edges.map(ek)), EB = new Set(target.edges.map(ek));
  const split = (k: string) => k.split('\u0000') as [string, string];
  const sum = (m: Map<string, ReleaseEntry>) => [...m.values()].reduce((s, e) => s + computeRisk(e.risk).score, 0);
  const tb = sum(A), tt = sum(B);
  return {
    rows, counts,
    addedEdges: [...EB].filter(k => !EA.has(k)).sort().map(split),
    removedEdges: [...EA].filter(k => !EB.has(k)).sort().map(split),
    totalScoreBase: tb, totalScoreTarget: tt,
    avgScoreBase: A.size ? tb / A.size : 0, avgScoreTarget: B.size ? tt / B.size : 0,
  };
}

export function findRelease(ds: Dataset, id: string): Release {
  const r = ds.releases.find(x => x.id === id);
  if (!r) throw new ReleaseError(`Release "${id}" not found in dataset "${ds.id}".`);
  return r;
}
