import { useMemo, useState } from 'react';
import { Link } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { compareReleases, findRelease, type ChangeType, type Comparison } from '../algorithms/release.ts';
import { severityCounts } from '../algorithms/risk.ts';
import { Badge, Empty, ErrorBox, Metric, Panel, PanelTitle, PageHead, Spinner, SyntheticBadge, Table } from '../components/ui.tsx';
import { Donut, GroupedBars, Legend } from '../components/charts.tsx';
import { computeRisk } from '../algorithms/risk.ts';

const COL: Record<ChangeType, string> = { added: '#22C55E', removed: '#EF4444', upgraded: '#00D9FF', downgraded: '#F59E0B', unchanged: '#64748B' };
type Filter = 'all' | ChangeType;

export default function ReleaseComparison() {
  const { dataset, datasets, setDatasetId, log } = useApp();
  const rels = dataset.releases;
  const [baseId, setBaseId] = useState(rels[0].id);
  const [targetId, setTargetId] = useState(rels[rels.length - 1].id);
  const [result, setResult] = useState<{ c: Comparison; base: string; target: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  // keep selectors valid when the dataset changes
  const base = rels.some(r => r.id === baseId) ? baseId : rels[0].id;
  const target = rels.some(r => r.id === targetId) ? targetId : rels[rels.length - 1].id;

  const compare = () => {
    setLoading(true); setError(null);
    requestAnimationFrame(() => { // let the spinner paint before the (synchronous) computation
      try { const c = compareReleases(findRelease(dataset, base), findRelease(dataset, target)); setResult({ c, base, target }); setFilter('all'); log(`Compared ${base} → ${target}`); }
      catch (e) { setResult(null); setError((e as Error).message); }
      finally { setLoading(false); }
    });
  };
  const sev = useMemo(() => {
    if (!result) return null;
    const r = (id: string) => severityCounts(findRelease(dataset, id).entries.map(e => computeRisk(e.risk).score));
    return { b: r(result.base), t: r(result.target) };
  }, [result, dataset]);
  const rows = result?.c.rows.filter(r => (filter === 'all' || r.change === filter) && (!q.trim() || r.pkg.toLowerCase().includes(q.trim().toLowerCase()))) ?? [];
  const delta = result ? result.c.avgScoreTarget - result.c.avgScoreBase : 0;

  return (
    <>
      <PageHead icon="swap" title="Release Comparison" sub="Compare two releases to identify dependency and risk changes.">{dataset.synthetic && <SyntheticBadge />}</PageHead>
      <Panel>
        <div className="row" style={{ alignItems: 'end' }}>
          <label className="f">Dataset<select value={dataset.id} onChange={e => { setDatasetId(e.target.value); setResult(null); }} aria-label="Dataset">{datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="f">Base release<select value={base} onChange={e => setBaseId(e.target.value)} aria-label="Baseline release">{rels.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <label className="f">Target release<select value={target} onChange={e => setTargetId(e.target.value)} aria-label="Target release">{rels.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <button className="btn primary" onClick={compare} disabled={loading}>Compare Releases</button>
          {loading && <Spinner label="Comparing…" />}
        </div>
        {rels.length < 2 && <div className="notice" style={{ marginTop: 10 }}>This dataset has only one release, so there is nothing meaningful to compare. You can still compare it with itself.</div>}
      </Panel>
      {error && <div style={{ marginTop: 16 }}><ErrorBox title="Comparison failed">{error}</ErrorBox></div>}
      {!result && !error && !loading && <div style={{ marginTop: 16 }}><Empty title="No comparison yet">Choose a baseline and a target release, then press “Compare Releases”.</Empty></div>}
      {result && sev && (<>
        <div className="grid g5" style={{ marginTop: 16 }}>
          <Metric icon="chart" tone="green" value={result.c.counts.added} label="Added" />
          <Metric icon="warn" tone="red" value={result.c.counts.removed} label="Removed" />
          <Metric icon="arrow" tone="cyan" value={result.c.counts.upgraded} label="Upgraded" />
          <Metric icon="arrow" tone="amber" value={result.c.counts.downgraded} label="Downgraded" />
          <Metric icon="box" tone="blue" value={result.c.counts.unchanged} label="Unchanged" />
        </div>
        {result.base === result.target || result.c.rows.every(r => r.change === 'unchanged') ? <div className="notice ok" style={{ marginTop: 16 }}>These two releases have identical package versions. {result.c.addedEdges.length + result.c.removedEdges.length === 0 ? 'Their dependency edges are identical too.' : 'Their dependency edges differ (see below).'}</div> : null}
        <div className="grid g-main-side" style={{ marginTop: 16 }}>
          <Panel>
            <PanelTitle title="Version Comparison" sub={`${result.base} → ${result.target}`} right={<div className="row"><input type="search" placeholder="Search packages…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search packages" /></div>} />
            <div className="tabs" role="tablist" style={{ marginBottom: 10 }}>{(['all', 'added', 'removed', 'upgraded', 'downgraded', 'unchanged'] as Filter[]).map(f => <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? `All (${result.c.rows.length})` : `${f[0].toUpperCase() + f.slice(1)} (${result.c.counts[f]})`}</button>)}</div>
            <Table head={['Package', 'Base', 'Target', 'Change', 'Base risk', 'Target risk', 'Δ']} empty={rows.length === 0 ? <Empty title="No rows">No packages match this filter.</Empty> : null}>
              {rows.map(r => <tr key={r.pkg}><td>{r.change === 'removed' ? r.pkg : <Link to={`/dependencies?pkg=${r.pkg}`}>{r.pkg}</Link>}</td><td className="mono">{r.baseVersion ?? '—'}</td><td className="mono">{r.targetVersion ?? '—'}</td><td><Badge kind={r.change} /></td><td>{r.baseScore ?? '—'}</td><td>{r.targetScore ?? '—'}</td><td className={r.scoreDelta === null ? '' : r.scoreDelta > 0 ? 'red' : r.scoreDelta < 0 ? 'green' : ''}>{r.scoreDelta === null ? '—' : r.scoreDelta > 0 ? `+${r.scoreDelta}` : r.scoreDelta}</td></tr>)}
            </Table>
            <div className="tiny muted" style={{ marginTop: 6 }}>Removed packages have no page in the target release, so they are not linked. Risk is on a 0–100 scale (see Risk Intelligence).</div>
          </Panel>
          <div className="stack">
            <Panel>
              <PanelTitle title="Change Distribution" />
              <div className="row" style={{ justifyContent: 'space-around' }}><Donut size={130} segments={(['added', 'removed', 'upgraded', 'downgraded', 'unchanged'] as ChangeType[]).map(k => ({ label: k[0].toUpperCase() + k.slice(1), value: result.c.counts[k], color: COL[k] }))} center={String(result.c.rows.length - result.c.counts.unchanged)} sub="changed" /><Legend segments={(['added', 'removed', 'upgraded', 'downgraded', 'unchanged'] as ChangeType[]).map(k => ({ label: k[0].toUpperCase() + k.slice(1), value: result.c.counts[k], color: COL[k] }))} /></div>
            </Panel>
            <Panel>
              <PanelTitle title="Risk Impact Analysis" sub={`Mean risk ${result.c.avgScoreBase.toFixed(1)} → ${result.c.avgScoreTarget.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`} />
              <GroupedBars groups={['Critical', 'High', 'Medium', 'Low']} series={[{ name: result.base, color: '#3B82F6', values: [sev.b.critical, sev.b.high, sev.b.medium, sev.b.low] }, { name: result.target, color: '#F59E0B', values: [sev.t.critical, sev.t.high, sev.t.medium, sev.t.low] }]} />
            </Panel>
          </div>
        </div>
        <Panel variant="subtle" style={{ marginTop: 16 }}>
          <PanelTitle title="Dependency edge changes" sub={`${result.c.addedEdges.length} added · ${result.c.removedEdges.length} removed`} />
          {result.c.addedEdges.length + result.c.removedEdges.length === 0 ? <div className="small muted">No edge changes.</div> : <div className="grid g2"><div><strong className="small green">Added edges</strong><div className="chips" style={{ marginTop: 6 }}>{result.c.addedEdges.map(([a, b]) => <span key={a + b} className="chip mono">{a} → {b}</span>)}</div></div><div><strong className="small red">Removed edges</strong><div className="chips" style={{ marginTop: 6 }}>{result.c.removedEdges.map(([a, b]) => <span key={a + b} className="chip mono">{a} → {b}</span>)}</div></div></div>}
        </Panel>
      </>)}
    </>
  );
}
