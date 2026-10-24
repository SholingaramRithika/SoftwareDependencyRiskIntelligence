import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layeredLayout, type Graph } from '../algorithms/graph.ts';
import type { PackageRow } from '../state/analysis.ts';
import { SEV_COLOR } from './ui.tsx';

interface Props {
  graph: Graph; root: string; byId: Map<string, PackageRow>; selected: string | null; onSelect: (id: string | null) => void;
  matches: Set<string>; upstreamSet: Set<string>; downstreamSet: Set<string>; pathNodes: string[]; showLabels: boolean; showArrows: boolean; dimOthers: boolean;
}
export default function GraphView({ graph, root, byId, selected, onSelect, matches, upstreamSet, downstreamSet, pathNodes, showLabels, showArrows, dimOthers }: Props) {
  const pos = useMemo(() => new Map(layeredLayout(graph, root).map(p => [p.id, p])), [graph, root]);
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const lastMoved = useRef(false);
  const bounds = useMemo(() => { const xs = [...pos.values()].map(p => p.x), ys = [...pos.values()].map(p => p.y); return { minX: Math.min(...xs) - 70, maxX: Math.max(...xs) + 70, minY: Math.min(...ys) - 50, maxY: Math.max(...ys) + 60 }; }, [pos]);
  const fit = useCallback(() => {
    const el = box.current; const W = el?.clientWidth || 800, H = el?.clientHeight || 520;
    const bw = bounds.maxX - bounds.minX, bh = bounds.maxY - bounds.minY, k = Math.min(W / bw, H / bh, 1.3);
    setView({ k, x: (W - bw * k) / 2 - bounds.minX * k, y: (H - bh * k) / 2 - bounds.minY * k });
  }, [bounds]);
  useEffect(() => { fit(); const el = box.current; if (!el || typeof ResizeObserver === 'undefined') return; const ro = new ResizeObserver(() => fit()); ro.observe(el); return () => ro.disconnect(); }, [fit]);
  const zoomAt = useCallback((f: number, px?: number, py?: number) => setView(v => {
    const el = box.current; const cx = px ?? (el?.clientWidth ?? 800) / 2, cy = py ?? (el?.clientHeight ?? 500) / 2;
    const k = Math.min(3, Math.max(.2, v.k * f)); return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
  }), []);
  useEffect(() => { // wheel needs a non-passive listener to prevent page scroll while zooming
    const el = box.current; if (!el) return;
    const f = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f);
  }, [zoomAt]);
  const pathSet = new Set(pathNodes), pathEdges = new Set(pathNodes.slice(1).map((n, i) => `${pathNodes[i]}>${n}`));
  const focusOn = selected !== null;
  const nodeOpacity = (id: string) => { if (!dimOthers) return 1; if (!matches.has(id)) return .18; if (focusOn && id !== selected && !upstreamSet.has(id) && !downstreamSet.has(id) && !pathSet.has(id)) return .35; return 1; };
  const edges: JSX.Element[] = [];
  for (const from of graph.ids) for (const to of graph.out.get(from)!) {
    const a = pos.get(from)!, b = pos.get(to)!;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, r = 15;
    const x1 = a.x + (dx / len) * r, y1 = a.y + (dy / len) * r, x2 = b.x - (dx / len) * (r + (showArrows ? 5 : 0)), y2 = b.y - (dy / len) * (r + (showArrows ? 5 : 0));
    const inPath = pathEdges.has(`${from}>${to}`);
    const up = (from === selected || upstreamSet.has(from)) && upstreamSet.has(to), down = (to === selected || downstreamSet.has(to)) && downstreamSet.has(from);
    const col = inPath ? '#F59E0B' : up ? '#00D9FF' : down ? '#A78BFA' : '#4B6FA5';
    const hot = inPath || up || down;
    edges.push(<line key={`${from}>${to}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={hot ? 2.4 : 1.1} opacity={hot ? .95 : dimOthers && focusOn ? .15 : .5} markerEnd={showArrows ? `url(#arr-${hot ? (inPath ? 'a' : up ? 'c' : 'v') : 'n'})` : undefined} />);
  }
  const marker = (id: string, c: string) => <marker key={id} id={`arr-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={c} /></marker>;
  return (
    <div ref={box} className="graph-box" data-testid="graph-box"
      onPointerDown={e => { if ((e.target as Element).closest('.graph-ctl')) return; lastMoved.current = false; drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; }}
      onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; setView(v => ({ ...v, x: d.vx + dx, y: d.vy + dy })); }}
      onPointerUp={() => { lastMoved.current = !!drag.current?.moved; drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <div className="graph-ctl">
        <button aria-label="Zoom in" onClick={() => zoomAt(1.25)}>+</button><button aria-label="Zoom out" onClick={() => zoomAt(1 / 1.25)}>−</button>
        <button aria-label="Fit to screen" title="Fit to screen" onClick={fit}>⤢</button><button aria-label="Reset view and selection" title="Reset" onClick={() => { onSelect(null); fit(); }}>⟲</button>
      </div>
      <div className="graph-legend">{(['critical', 'high', 'medium', 'low'] as const).map(s => <span key={s}><i style={{ background: SEV_COLOR[s] }} />{s}</span>)}<span><i style={{ background: '#00D9FF' }} />upstream (depends on)</span><span><i style={{ background: '#A78BFA' }} />downstream (dependents)</span><span><i style={{ background: '#F59E0B' }} />path</span></div>
      <svg width="100%" height="100%" role="group" aria-label="Dependency graph">
        <defs>{marker('n', '#4B6FA5')}{marker('c', '#00D9FF')}{marker('v', '#A78BFA')}{marker('a', '#F59E0B')}</defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {edges}
          {graph.ids.map(id => {
            const p = pos.get(id)!, row = byId.get(id)!, col = SEV_COLOR[row.risk.severity], sel = id === selected;
            return (
              <g key={id} transform={`translate(${p.x},${p.y})`} opacity={nodeOpacity(id)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={`${id}, risk ${row.risk.score} ${row.risk.severity}`}
                onClick={e => { e.stopPropagation(); if (!lastMoved.current) onSelect(sel ? null : id); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(sel ? null : id); } }}>
                <circle r={sel ? 20 : 15} fill="rgba(5,11,24,.9)" stroke={col} strokeWidth={sel ? 4 : 2.4} style={{ filter: `drop-shadow(0 0 ${sel ? 12 : 6}px ${col})` }} />
                <circle r={sel ? 8 : 6} fill={col} opacity=".9" />
                {id === root && <circle r="23" fill="none" stroke="#00D9FF" strokeDasharray="3 3" />}
                {showLabels && <text y={32} textAnchor="middle" fontSize="11" fill="var(--text)" style={{ paintOrder: 'stroke', stroke: 'rgba(5,11,24,.85)', strokeWidth: 3 }}>{id}</text>}
                <title>{`${id} v${row.version} — risk ${row.risk.score} (${row.risk.severity})`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
