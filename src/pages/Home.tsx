import { useEffect, useMemo, useState } from 'react';
import { Link } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { Panel, PanelTitle, Icon, SyntheticBadge, Spinner } from '../components/ui.tsx';
import { Donut, Legend, sevSegments } from '../components/charts.tsx';
import WaveletDiagram from '../components/WaveletDiagram.tsx';
import { WaveletTree } from '../algorithms/waveletTree.ts';
import { layeredLayout } from '../algorithms/graph.ts';
import { analyzeRelease } from '../state/analysis.ts';
import { compareReleases } from '../algorithms/release.ts';
import { benchmark, type BenchRow } from '../algorithms/benchmark.ts';

const FEATURES = [
  { n: '01', to: '/dependencies', icon: 'graph', t: 'Graph Analytics', d: 'Visualize and explore package dependencies with interactive graphs.' },
  { n: '02', to: '/wavelet-lab', icon: 'tree', t: 'Wavelet Tree', d: 'Efficient range queries on package risk scores.' },
  { n: '03', to: '/risk-impact', icon: 'shield', t: 'Risk Intelligence', d: 'Identify vulnerable and high-impact packages.' },
  { n: '04', to: '/release-comparison', icon: 'chart', t: 'Release Comparison', d: 'Track dependency and risk changes across releases.' },
];

function MiniNetwork() {
  const { analysis } = useApp();
  const pos = useMemo(() => (analysis ? layeredLayout(analysis.graph, analysis.root, 34, 34) : []), [analysis]);
  if (!analysis) return null;
  const P = new Map(pos.map(p => [p.id, p])); const xs = pos.map(p => p.x), ys = pos.map(p => p.y);
  const x0 = Math.min(...xs) - 12, y0 = Math.min(...ys) - 12, w = Math.max(...xs) - x0 + 12, h = Math.max(...ys) - y0 + 12;
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${h}`} width="100%" height="170" role="img" aria-label="Mini dependency network">
      {analysis.graph.ids.flatMap(f => analysis.graph.out.get(f)!.map(t => <line key={f + t} x1={P.get(f)!.x} y1={P.get(f)!.y} x2={P.get(t)!.x} y2={P.get(t)!.y} stroke="#3B82F6" strokeOpacity=".4" />))}
      {pos.map(p => <circle key={p.id} cx={p.x} cy={p.y} r={p.id === analysis.root ? 7 : 4} fill={p.id === analysis.root ? '#00D9FF' : analysis.byId.get(p.id)!.risk.severity === 'critical' ? '#EF4444' : analysis.byId.get(p.id)!.risk.severity === 'high' ? '#F59E0B' : '#7C3AED'} />)}
    </svg>
  );
}

export default function Home() {
  const { analysis, dataset } = useApp();
  const [bench, setBench] = useState<BenchRow[] | null>(null);
  useEffect(() => { const t = setTimeout(() => setBench(benchmark([100, 1000, 10000, 100000], 30)), 80); return () => clearTimeout(t); }, []);
  const history = useMemo(() => { try { return dataset.releases.flatMap(r => analyzeRelease(dataset, r.id).scores); } catch { return []; } }, [dataset]);
  const tree = useMemo(() => (history.length ? WaveletTree.build(history, { lo: 0, hi: 100 }) : null), [history]);
  const rels = dataset.releases;
  const cmp = useMemo(() => (rels.length >= 2 ? compareReleases(rels[rels.length - 2], rels[rels.length - 1]) : null), [rels]);
  const maxUs = bench ? Math.max(...bench.flatMap(b => [b.waveletUs, b.linearUs])) : 1;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-left">
          <span className="badge pill">DSA CASE STUDY</span>
          <h1 id="hero-title">Wavelet<span>Scope</span></h1>
          <div className="title">Software Dependency<br />Risk Intelligence &amp;<br />Release Comparison System</div>
          <div className="rule" />
          <p className="tag">Discover. Analyze. Compare. Build Safer Software.</p>
          <p className="muted" style={{ maxWidth: 520 }}>An interactive platform that combines graph analytics and Wavelet Tree algorithms to visualize, analyze, and compare software dependencies, vulnerabilities, and release changes.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link to="/dashboard" className="btn primary">Explore the Project <Icon name="arrow" size={16} /></Link>
            <Link to="/wavelet-lab?demo=1" className="btn"><Icon name="play" size={16} /> Watch Demo</Link>
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>“Watch Demo” opens the Wavelet Tree Lab and auto-plays a real k-th smallest query.</p>
        </div>

        <div>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>{dataset.synthetic && <SyntheticBadge />}<span className="tiny muted">Live figures from “{dataset.name}”</span></div>
          {!analysis || !tree ? <Panel><Spinner label="Preparing analysis…" /></Panel> : (
            <div className="comp">
              <Panel className="c-net" hover>
                <PanelTitle title="Dependency Network" sub="Visualize package relationships" />
                <div className="row" style={{ gap: 22 }}><div><b style={{ fontSize: '1.5rem' }}>{analysis.rows.length}</b><div className="tiny muted">Packages</div></div><div><b style={{ fontSize: '1.5rem' }}>{analysis.graph.edgeCount}</b><div className="tiny muted">Dependencies</div></div></div>
                <MiniNetwork />
              </Panel>
              <Panel className="c-vuln" hover>
                <PanelTitle title="Vulnerability Detection" sub="Packages with recorded vulnerabilities (in this dataset)" />
                <div className="row" style={{ justifyContent: 'space-around' }}>
                  <Donut size={118} segments={[{ label: 'With vulnerabilities', value: analysis.vulnerable, color: '#3B82F6' }, { label: 'None recorded', value: analysis.rows.length - analysis.vulnerable, color: 'rgba(148,163,184,.25)' }]} center={`${Math.round((analysis.vulnerable / Math.max(1, analysis.rows.length)) * 100)}%`} sub={`${analysis.vulnerable} of ${analysis.rows.length}`} />
                  <Legend segments={sevSegments(analysis.counts)} />
                </div>
              </Panel>
              <Panel className="c-a primary" style={{ gridColumn: '1 / 9' }}>
                <PanelTitle title="Wavelet Tree Visualization" sub={`Top levels of a real tree over ${history.length} risk scores (every package in every release, domain [0, 100])`} right={<Link to="/wavelet-lab" className="btn sm">Open lab</Link>} />
                <div style={{ overflowX: 'auto' }}><WaveletDiagram tree={tree} maxDepth={3} compact /></div>
              </Panel>
              <Panel className="c-rel" hover style={{ gridColumn: '9 / 13' }}>
                <PanelTitle title="Release Comparison" sub={cmp ? `${rels[rels.length - 2].label} → ${rels[rels.length - 1].label}` : 'Needs two releases'} />
                {cmp ? <div className="grid g2" style={{ gap: 8 }}>{(['added', 'removed', 'upgraded', 'downgraded'] as const).map(k => <div key={k}><b style={{ fontSize: '1.4rem', color: k === 'added' ? 'var(--green)' : k === 'removed' ? 'var(--red)' : k === 'upgraded' ? 'var(--cyan)' : 'var(--amber)' }}>{cmp.counts[k]}</b><div className="tiny muted">{k[0].toUpperCase() + k.slice(1)}</div></div>)}</div> : <div className="muted small">Add a second release to compare.</div>}
              </Panel>
              <Panel className="c-b" hover style={{ gridColumn: '1 / 9' }}>
                <PanelTitle title="Query Performance" sub="k-th smallest on a half-length range · measured in this browser (µs/query, log-scaled bars)" />
                {!bench ? <div style={{ minHeight: 250 }}><Spinner label="Measuring…" /></div> : (
                  <div className="stack" style={{ minHeight: 250 }}>{bench.map(b => (
                    <div key={b.n} className="small"><div className="row" style={{ justifyContent: 'space-between' }}><span>n = {b.n.toLocaleString()}</span><span className="muted">wavelet {b.waveletUs.toFixed(1)} µs · linear {b.linearUs.toFixed(1)} µs</span></div>
                      {[['#00D9FF', b.waveletUs], ['#7C3AED', b.linearUs]].map(([c, v]) => <div key={c as string} className="bar" style={{ marginTop: 3 }}><i style={{ width: `${Math.max(3, (Math.log10(1 + (v as number)) / Math.log10(1 + maxUs)) * 100)}%`, background: c as string }} /></div>)}</div>))}
                    <div className="tiny muted"><span className="cyan">■</span> Wavelet Tree <span className="violet">■</span> sort-the-slice baseline · timings vary by machine</div></div>
                )}
              </Panel>
              <Panel className="c-risk" hover style={{ gridColumn: '9 / 13' }}>
                <PanelTitle title="Risk Analysis" sub="Mean score of this release" />
                <div className="row"><Donut size={110} segments={sevSegments(analysis.counts)} center={String(Math.round(analysis.avgScore))} sub="/100 mean" /><Legend segments={sevSegments(analysis.counts)} /></div>
              </Panel>
            </div>
          )}
        </div>
      </section>

      <section id="features" className="feature-strip" aria-label="Modules">
        {FEATURES.map(f => (
          <Link key={f.to} to={f.to} className="glass hover fcard">
            <div className="ico"><Icon name={f.icon} size={26} /></div>
            <div><div className="n">{f.n}</div><h3>{f.t}</h3><p>{f.d}</p></div>
            <div className="go"><Icon name="arrow" size={16} /></div>
          </Link>
        ))}
      </section>
    </>
  );
}
