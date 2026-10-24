import { useMemo } from 'react';
import { Link } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { analyzeRelease } from '../state/analysis.ts';
import { compareReleases } from '../algorithms/release.ts';
import { Metric, Panel, PanelTitle, PageHead, Table, Badge, Empty, ErrorBox, Icon } from '../components/ui.tsx';
import { Donut, Legend, LineChart, sevSegments } from '../components/charts.tsx';
import DataPicker from '../components/DataPicker.tsx';

export default function Dashboard() {
  const { analysis, analysisError, dataset, activity } = useApp();
  const trend = useMemo(() => { try { return dataset.releases.map(r => ({ id: r.label, a: analyzeRelease(dataset, r.id) })); } catch { return []; } }, [dataset]);
  const rels = dataset.releases;
  const cmp = useMemo(() => (rels.length >= 2 ? compareReleases(rels[rels.length - 2], rels[rels.length - 1]) : null), [rels]);
  if (analysisError) return <ErrorBox title="This release could not be analysed">{analysisError}</ErrorBox>;
  if (!analysis) return null;
  const top = [...analysis.rows].sort((a, b) => b.risk.score - a.risk.score).slice(0, 6);
  const changed = cmp?.rows.filter(r => r.change !== 'unchanged').slice(0, 6) ?? [];
  return (
    <>
      <PageHead icon="home" title="Dashboard" sub="Overview of your software dependency ecosystem"><DataPicker /></PageHead>
      <div className="grid g4">
        <Metric icon="box" tone="cyan" value={analysis.rows.length} label="Total Packages" sub={`release ${analysis.releaseId}`} />
        <Metric icon="graph" tone="blue" value={analysis.graph.edgeCount} label="Total Dependencies" sub="direct edges" />
        <Metric icon="warn" tone="red" value={analysis.vulnerable} label="Vulnerable Packages" sub={`${analysis.counts.critical + analysis.counts.high} high or critical risk`} />
        <Metric icon="swap" tone="green" value={rels.length} label="Releases in Dataset" sub={cmp ? `${rels.length - 1} comparison pair(s)` : 'add another to compare'} />
      </div>
      <div className="grid g-main-side" style={{ marginTop: 16 }}>
        <Panel>
          <PanelTitle title="Dependency Health Overview" sub="Packages per severity across releases (computed from the dataset)" />
          {trend.length < 2 ? <Empty title="Only one release">A trend needs at least two releases.</Empty> : <LineChart labels={trend.map(t => t.id)} series={(['low', 'medium', 'high', 'critical'] as const).map(k => ({ name: k, color: { low: '#22C55E', medium: '#3B82F6', high: '#F59E0B', critical: '#EF4444' }[k], values: trend.map(t => t.a.counts[k]) }))} />}
        </Panel>
        <Panel>
          <PanelTitle title="Risk Distribution" sub={`Mean score ${analysis.avgScore.toFixed(1)}`} />
          <div className="row" style={{ justifyContent: 'space-around' }}><Donut segments={sevSegments(analysis.counts)} center={String(Math.round(analysis.avgScore))} sub="/100 mean" /><Legend segments={sevSegments(analysis.counts)} /></div>
        </Panel>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel>
          <PanelTitle title="Top Risky Packages" right={<Link to="/risk-impact" className="small">View all →</Link>} />
          <Table head={['Package', 'Risk', 'Severity']}>{top.map(r => <tr key={r.id}><td><Link to={`/dependencies?pkg=${r.id}`}>{r.id}</Link> <span className="tiny muted">v{r.version}</span></td><td>{r.risk.score}</td><td><Badge kind={r.risk.severity} /></td></tr>)}</Table>
        </Panel>
        <Panel>
          <PanelTitle title="Recent Release Changes" sub={cmp ? `${rels[rels.length - 2].label} → ${rels[rels.length - 1].label}` : undefined} right={<Link to="/release-comparison" className="small">Compare →</Link>} />
          {!cmp ? <Empty title="No release pair">This dataset has a single release.</Empty> : changed.length === 0 ? <Empty title="No differences">The two latest releases are identical.</Empty> :
            <Table head={['Package', 'Change', 'Δ risk']}>{changed.map(r => <tr key={r.pkg}><td>{r.pkg}</td><td><Badge kind={r.change} /></td><td>{r.scoreDelta === null ? '—' : r.scoreDelta > 0 ? `+${r.scoreDelta}` : r.scoreDelta}</td></tr>)}</Table>}
        </Panel>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel variant="subtle">
          <PanelTitle title="Session Activity" sub="Actions taken since this page was opened" />
          {activity.length === 0 ? <Empty title="No activity yet">Select a dataset, import a file, or run a query and it will appear here.</Empty> : <ul className="plain">{activity.map((a, i) => <li key={i} className="small"><span className="muted">{a.at}</span> · {a.text}</li>)}</ul>}
        </Panel>
        <Panel variant="subtle">
          <PanelTitle title="Jump to a module" />
          <div className="chips">{[['/dependencies', 'Graph Explorer'], ['/wavelet-lab', 'Wavelet Tree Lab'], ['/risk-impact', 'Risk Intelligence'], ['/release-comparison', 'Release Comparison'], ['/datasets', 'Datasets'], ['/about', 'DSA notes']].map(([to, l]) => <Link key={to} to={to} className="chip">{l} <Icon name="arrow" size={12} /></Link>)}</div>
        </Panel>
      </div>
    </>
  );
}
