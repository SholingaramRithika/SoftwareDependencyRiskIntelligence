import { useMemo, useState } from 'react';
import { Link } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { analyzeRelease } from '../state/analysis.ts';
import { downstream, riskyPaths } from '../algorithms/graph.ts';
import { RISK_WEIGHTS, THRESHOLDS, VULN_CAP, OUTDATED_CAP } from '../algorithms/risk.ts';
import { SEVERITIES, type Severity } from '../data/types.ts';
import { Badge, Empty, ErrorBox, Metric, Panel, PanelTitle, PageHead, SyntheticBadge, Table, cap, SEV_COLOR } from '../components/ui.tsx';
import { Donut, Legend, LineChart, sevSegments } from '../components/charts.tsx';
import DataPicker from '../components/DataPicker.tsx';

export default function RiskImpact() {
  const { analysis, analysisError, dataset } = useApp();
  const [q, setQ] = useState('');
  const [sev, setSev] = useState<'all' | Severity>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [onlyVuln, setOnlyVuln] = useState(false);
  const trend = useMemo(() => { try { return dataset.releases.map(r => ({ id: r.label, a: analyzeRelease(dataset, r.id) })); } catch { return []; } }, [dataset]);
  const paths = useMemo(() => (analysis ? riskyPaths(analysis.graph, analysis.root, id => analysis.byId.get(id)!.risk.score, THRESHOLDS.high, 8) : []), [analysis]);
  if (analysisError) return <ErrorBox title="This release could not be analysed">{analysisError}</ErrorBox>;
  if (!analysis) return null;
  const rows = analysis.rows.filter(r => (sev === 'all' || r.risk.severity === sev) && (!onlyVuln || r.vulnCount > 0) && (!q.trim() || r.id.toLowerCase().includes(q.trim().toLowerCase()))).sort((a, b) => b.risk.score - a.risk.score);
  const cur = sel ? analysis.byId.get(sel) ?? null : null;
  const affected = cur ? [...downstream(analysis.graph, cur.id)].sort() : [];
  const f = cur?.risk.factors;
  const factorRows = f ? [['CVSS-style severity', f.cvss, RISK_WEIGHTS.cvss * 100], ['Vulnerability count', f.vulns, RISK_WEIGHTS.vulns * 100], ['Majors behind', f.outdated, RISK_WEIGHTS.outdated * 100], ['Maintenance gap', f.maintenance, RISK_WEIGHTS.maintenance * 100]] as const : [];
  return (
    <>
      <PageHead icon="shield" title="Risk Intelligence" sub="Identify high-risk packages and see who is affected downstream."><DataPicker /></PageHead>
      {dataset.synthetic && <div className="notice" style={{ marginBottom: 16 }}><SyntheticBadge /> <span className="small">Severity inputs in this dataset are invented to demonstrate the scoring. Importing a dataset only makes its numbers as trustworthy as its source; this tool does not look up real vulnerability databases.</span></div>}
      <div className="grid g4">
        {SEVERITIES.map(s => <Metric key={s} icon="shield" tone={({ critical: 'red', high: 'amber', medium: 'blue', low: 'green' } as const)[s]} value={analysis.counts[s]} label={`${cap(s)} (${s === 'critical' ? `≥ ${THRESHOLDS.critical}` : s === 'high' ? `${THRESHOLDS.high}–${THRESHOLDS.critical - 1}` : s === 'medium' ? `${THRESHOLDS.medium}–${THRESHOLDS.high - 1}` : `< ${THRESHOLDS.medium}`})`} />)}
      </div>
      <div className="grid g-main-side" style={{ marginTop: 16 }}>
        <Panel>
          <PanelTitle title="Vulnerable Packages" sub={`${rows.length} of ${analysis.rows.length} shown · click a row for the breakdown`} right={<div className="row"><input type="search" placeholder="Search packages…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search packages" /><select value={sev} onChange={e => setSev(e.target.value as 'all' | Severity)} aria-label="Severity filter"><option value="all">All severity</option>{SEVERITIES.map(s => <option key={s} value={s}>{cap(s)}</option>)}</select><label className="chk small"><input type="checkbox" checked={onlyVuln} onChange={e => setOnlyVuln(e.target.checked)} />Has recorded vulns</label></div>} />
          <Table head={['Package', 'Version', 'Risk', 'Severity', 'Vulns', 'Dependents']} empty={rows.length === 0 ? <Empty title="No packages match">Try clearing the search or filters.</Empty> : null}>
            {rows.map(r => <tr key={r.id} className={sel === r.id ? 'sel' : ''} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSel(r.id)}><td>{r.id}</td><td className="mono">{r.version}</td><td><b>{r.risk.score}</b></td><td><Badge kind={r.risk.severity} /></td><td>{r.vulnCount}</td><td>{r.dependents}</td></tr>)}
          </Table>
        </Panel>
        <Panel>
          <PanelTitle title="Risk Score Distribution" />
          <div className="row" style={{ justifyContent: 'space-around' }}><Donut segments={sevSegments(analysis.counts)} center={String(Math.round(analysis.avgScore))} sub="/100 mean" /><Legend segments={sevSegments(analysis.counts)} /></div>
        </Panel>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel className={cur ? 'primary' : ''}>
          <PanelTitle title="Risk Factor Breakdown" sub={cur ? `${cur.id} v${cur.version}` : 'Select a package'} />
          {!cur ? <Empty title="No package selected">Click a row in the table.</Empty> : (
            <div className="stack">
              <div className="row"><b style={{ fontSize: '1.8rem' }}>{cur.risk.score}</b><Badge kind={cur.risk.severity} /><Link to={`/dependencies?pkg=${cur.id}`} className="small">Open in graph →</Link></div>
              {factorRows.map(([label, v, max]) => <div key={label} className="small"><div className="row" style={{ justifyContent: 'space-between' }}><span>{label}</span><span className="muted">{v.toFixed(1)} / {max.toFixed(0)} pts</span></div><div className="bar"><i style={{ width: `${(v / max) * 100}%`, background: SEV_COLOR[cur.risk.severity] }} /></div></div>)}
              <div className="small"><strong>Downstream impact:</strong> {affected.length === 0 ? 'no other package depends on this one.' : `${affected.length} package(s) transitively depend on it.`}</div>
              {affected.length > 0 && <div className="chips">{affected.map(a => <Link key={a} to={`/dependencies?pkg=${a}`} className="chip">{a}</Link>)}</div>}
            </div>
          )}
        </Panel>
        <Panel>
          <PanelTitle title="High-risk Dependency Paths" sub={`Shortest path from root “${analysis.root}” to each package scoring ≥ ${THRESHOLDS.high}`} />
          {paths.length === 0 ? <Empty title="No high-risk paths">No reachable package scores ≥ {THRESHOLDS.high} in this release.</Empty> : <ul className="plain">{paths.map(p => <li key={p.path.join('>')} className="small"><Badge kind={p.score >= THRESHOLDS.critical ? 'critical' : 'high'}>{p.score}</Badge> <span className="mono">{p.path.join(' → ')}</span></li>)}</ul>}
        </Panel>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel>
          <PanelTitle title="Risk Trend" sub="Mean score and critical count per release" />
          {trend.length < 2 ? <Empty title="Only one release">A trend needs two or more releases.</Empty> : <LineChart labels={trend.map(t => t.id)} yMax={100} series={[{ name: 'mean score', color: '#00D9FF', values: trend.map(t => Math.round(t.a.avgScore)) }, { name: 'critical count', color: '#EF4444', values: trend.map(t => t.a.counts.critical) }]} />}
        </Panel>
        <Panel variant="subtle">
          <PanelTitle title="Scoring formula" sub="Implemented in src/algorithms/risk.ts" />
          <div className="small stack">
            <code className="mono" style={{ whiteSpace: 'pre-wrap' }}>{`score = round(100 × (\n  ${RISK_WEIGHTS.cvss} × cvss/10\n + ${RISK_WEIGHTS.vulns} × min(vulnCount, ${VULN_CAP})/${VULN_CAP}\n + ${RISK_WEIGHTS.outdated} × min(majorsBehind, ${OUTDATED_CAP})/${OUTDATED_CAP}\n + ${RISK_WEIGHTS.maintenance} × (1 − maintenance) ))`}</code>
            <div>Inputs come from the dataset: <code>cvss</code> 0–10, <code>vulnCount</code> ≥ 0, <code>majorsBehind</code> ≥ 0, <code>maintenance</code> 0–1. Counts are capped so one factor cannot dominate. Thresholds: critical ≥ {THRESHOLDS.critical}, high ≥ {THRESHOLDS.high}, medium ≥ {THRESHOLDS.medium}, otherwise low. Invalid inputs are rejected, not guessed.</div>
          </div>
        </Panel>
      </div>
    </>
  );
}
