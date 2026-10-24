import { useEffect, useMemo, useState } from 'react';
import { Link, navigate, useLocation } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { downstream, shortestPath, upstream } from '../algorithms/graph.ts';
import { PACKAGE_KINDS, SEVERITIES, type PackageKind, type Severity } from '../data/types.ts';
import { Badge, ErrorBox, Panel, PanelTitle, PageHead, Empty, cap, SEV_COLOR } from '../components/ui.tsx';
import GraphView from '../components/GraphView.tsx';
import DataPicker from '../components/DataPicker.tsx';

export default function Dependencies() {
  const { analysis, analysisError, settings } = useApp();
  const loc = useLocation();
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<Set<PackageKind>>(new Set(PACKAGE_KINDS));
  const [sevs, setSevs] = useState<Set<Severity>>(new Set(SEVERITIES));
  const [selected, setSelected] = useState<string | null>(loc.search.get('pkg'));
  const [mode, setMode] = useState<'neighbors' | 'affected' | 'path'>('neighbors');

  useEffect(() => { if (analysis && selected && !analysis.byId.has(selected)) setSelected(null); }, [analysis, selected]);
  const sel = analysis && selected ? analysis.byId.get(selected) ?? null : null;
  const matches = useMemo(() => {
    const m = new Set<string>(); if (!analysis) return m; const q = query.trim().toLowerCase();
    for (const r of analysis.rows) if (kinds.has(r.kind) && sevs.has(r.risk.severity) && (!q || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))) m.add(r.id);
    return m;
  }, [analysis, query, kinds, sevs]);
  const { up, down, path } = useMemo(() => {
    if (!analysis || !sel) return { up: new Set<string>(), down: new Set<string>(), path: [] as string[] };
    return { up: mode === 'affected' ? new Set<string>() : upstream(analysis.graph, sel.id), down: mode === 'path' ? new Set<string>() : downstream(analysis.graph, sel.id), path: mode === 'path' ? shortestPath(analysis.graph, analysis.root, sel.id) ?? [] : [] };
  }, [analysis, sel, mode]);

  if (analysisError) return <ErrorBox title="This release could not be analysed">{analysisError}</ErrorBox>;
  if (!analysis) return null;
  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n); };
  const pick = (id: string | null) => { setSelected(id); navigate(id ? `/dependencies?pkg=${id}` : '/dependencies', true); };
  const resetFilters = () => { setQuery(''); setKinds(new Set(PACKAGE_KINDS)); setSevs(new Set(SEVERITIES)); };

  return (
    <>
      <PageHead icon="graph" title="Dependency Graph Explorer" sub="Edges point from a package to the packages it depends on. Scroll to zoom, drag to pan, click a node to inspect it."><DataPicker /></PageHead>
      <Panel style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: 'end', gap: 22 }}>
          <label className="f" style={{ minWidth: 220 }}>Search packages<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. http" aria-label="Search packages" /></label>
          <div role="group" aria-label="Package type"><strong className="small">Package type</strong><div className="row" style={{ gap: 14, marginTop: 4 }}>{PACKAGE_KINDS.map(k => <label key={k} className="chk"><input type="checkbox" checked={kinds.has(k)} onChange={() => toggle(kinds, k, setKinds)} />{cap(k)}</label>)}</div></div>
          <div role="group" aria-label="Risk level"><strong className="small">Risk level</strong><div className="row" style={{ gap: 14, marginTop: 4 }}>{SEVERITIES.map(s => <label key={s} className="chk"><input type="checkbox" checked={sevs.has(s)} onChange={() => toggle(sevs, s, setSevs)} /><span style={{ color: SEV_COLOR[s] }}>●</span> {cap(s)}</label>)}</div></div>
          <button className="btn sm" onClick={resetFilters}>Reset filters</button>
          <span className="small muted" role="status">{matches.size} of {analysis.rows.length} packages match</span>
        </div>
        {matches.size === 0 && <div style={{ marginTop: 10 }}><Empty title="No matches">Adjust the search or filters.</Empty></div>}
        {matches.size > 0 && query && <div className="chips" style={{ marginTop: 10 }}>{[...matches].slice(0, 10).map(id => <button key={id} className="chip" onClick={() => pick(id)}>{id}</button>)}</div>}
      </Panel>
      <div className="grid g-explorer">
        <Panel className="primary" style={{ padding: 10 }}>
          <GraphView graph={analysis.graph} root={analysis.root} byId={analysis.byId} selected={sel?.id ?? null} onSelect={pick} matches={matches} upstreamSet={up} downstreamSet={down} pathNodes={path} showLabels={settings.graphLabels} showArrows={settings.graphArrows} dimOthers={settings.graphDimOthers} />
          <div className="row small muted" style={{ marginTop: 8, justifyContent: 'space-between' }}><span>Root: <code>{analysis.root}</code> · {analysis.rows.length} nodes · {analysis.graph.edgeCount} edges</span>{sel && <span className="tabs" role="group" aria-label="Highlight mode">{([['neighbors', 'Up + downstream'], ['affected', 'Affected only'], ['path', 'Path from root']] as const).map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</span>}</div>
        </Panel>

        <Panel>
          <PanelTitle title="Package Details" />
          {!sel ? <Empty title="Nothing selected">Click a node or search for a package to see its details, upstream and downstream dependencies.</Empty> : (
            <div className="stack">
              <div><h3 className="mono">{sel.id}</h3><div className="muted small">{sel.description}</div></div>
              <div className="row"><Badge kind={sel.risk.severity} /><span className="badge pill">risk {sel.risk.score}</span><span className="badge unchanged">{sel.kind}</span><span className="badge unchanged">v{sel.version}</span></div>
              <div className="small"><b>{sel.vulnCount}</b> recorded vulnerabilit{sel.vulnCount === 1 ? 'y' : 'ies'} <span className="muted">(dataset-provided)</span></div>
              <div className="small"><strong>Depends on ({analysis.graph.out.get(sel.id)!.length} direct, {upstream(analysis.graph, sel.id).size} total)</strong><div className="chips" style={{ marginTop: 4 }}>{analysis.graph.out.get(sel.id)!.map(d => <button key={d} className="chip" onClick={() => pick(d)}>{d}</button>)}{analysis.graph.out.get(sel.id)!.length === 0 && <span className="muted">nothing</span>}</div></div>
              <div className="small"><strong>Dependents ({analysis.graph.inn.get(sel.id)!.length} direct, {downstream(analysis.graph, sel.id).size} affected in total)</strong><div className="chips" style={{ marginTop: 4 }}>{analysis.graph.inn.get(sel.id)!.map(d => <button key={d} className="chip" onClick={() => pick(d)}>{d}</button>)}{analysis.graph.inn.get(sel.id)!.length === 0 && <span className="muted">none (top-level)</span>}</div></div>
              {mode === 'path' && <div className="small"><strong>Shortest path from root</strong><div className="mono tiny">{path.length ? path.join(' → ') : 'not reachable from the root'}</div></div>}
              <Link to="/risk-impact" className="btn primary sm">View risk breakdown</Link>
              <button className="btn sm" onClick={() => pick(null)}>Clear selection</button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
