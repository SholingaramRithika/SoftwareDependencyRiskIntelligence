import type { Dataset, PackageKind, Severity } from '../data/types.ts';
import { buildGraph, type Graph } from '../algorithms/graph.ts';
import { computeRisk, severityCounts, type RiskResult } from '../algorithms/risk.ts';
import { findRelease } from '../algorithms/release.ts';

export interface PackageRow {
  id: string; kind: PackageKind; description: string; version: string;
  vulnCount: number; risk: RiskResult; dependencies: number; dependents: number;
}
export interface Analysis {
  releaseId: string; root: string; graph: Graph; rows: PackageRow[]; byId: Map<string, PackageRow>;
  scores: number[]; counts: Record<Severity, number>; avgScore: number; vulnerable: number;
}

/** The root of a release = the package with no dependents (ties: first by id). Falls back to the first entry. */
export function pickRoot(graph: Graph): string {
  const roots = graph.ids.filter(i => graph.inn.get(i)!.length === 0).sort();
  return roots[0] ?? graph.ids[0];
}

export function analyzeRelease(ds: Dataset, releaseId: string): Analysis {
  const rel = findRelease(ds, releaseId);
  const meta = new Map(ds.packages.map(p => [p.id, p]));
  const graph = buildGraph(rel.entries.map(e => e.pkg), rel.edges);
  const rows: PackageRow[] = rel.entries.map(e => {
    const m = meta.get(e.pkg)!;
    return { id: e.pkg, kind: m.kind, description: m.description, version: e.version, vulnCount: e.risk.vulnCount, risk: computeRisk(e.risk), dependencies: graph.out.get(e.pkg)!.length, dependents: graph.inn.get(e.pkg)!.length };
  });
  const scores = rows.map(r => r.risk.score);
  return {
    releaseId, root: graph.ids.length ? pickRoot(graph) : '', graph, rows, byId: new Map(rows.map(r => [r.id, r])), scores,
    counts: severityCounts(scores), avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    vulnerable: rows.filter(r => r.vulnCount > 0).length,
  };
}
