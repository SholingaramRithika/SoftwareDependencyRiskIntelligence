import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from '../router.tsx';
import { useApp } from '../state/AppState.tsx';
import { WaveletError, WaveletTree, brute, type QueryResult } from '../algorithms/waveletTree.ts';
import { benchmark, type BenchRow } from '../algorithms/benchmark.ts';
import { Badge, ErrorBox, Panel, PanelTitle, PageHead, Spinner, Switch, Table } from '../components/ui.tsx';
import WaveletDiagram from '../components/WaveletDiagram.tsx';

type QType = 'kth' | 'count' | 'rangeCount' | 'rank' | 'select' | 'access';
const QUERIES: { id: QType; label: string; fields: [string, string][]; help: string }[] = [
  { id: 'kth', label: 'K-th smallest in [l, r]', fields: [['l', 'l (left position)'], ['r', 'r (right position)'], ['k', 'k (1-based rank)']], help: 'The k-th smallest value among positions l..r.' },
  { id: 'count', label: 'Frequency of x in [l, r]', fields: [['l', 'l'], ['r', 'r'], ['x', 'x (value)']], help: 'How many times the value x occurs in positions l..r.' },
  { id: 'rangeCount', label: 'Values in [a, b] within [l, r]', fields: [['l', 'l'], ['r', 'r'], ['a', 'a (min value)'], ['b', 'b (max value)']], help: 'How many positions in l..r hold a value between a and b (inclusive).' },
  { id: 'rank', label: 'Rank: occurrences of x in prefix', fields: [['x', 'x (value)'], ['i', 'i (prefix length, 0..n)']], help: 'Occurrences of x among the first i elements (positions 0..i−1).' },
  { id: 'select', label: 'Select: position of j-th x', fields: [['x', 'x (value)'], ['j', 'j (1-based occurrence)']], help: 'Zero-based position of the j-th occurrence of x.' },
  { id: 'access', label: 'Access: value at position i', fields: [['i', 'i (position)']], help: 'The value stored at zero-based position i.' },
];
const PRESETS: { name: string; values: string }[] = [
  { name: 'Lecture example', values: '5, 2, 8, 6, 3, 7, 1, 4' },
  { name: 'Duplicates', values: '4, 1, 4, 2, 4, 3, 1, 4, 2, 2' },
  { name: 'Negative values', values: '-3, 5, -3, 0, 7, -1, 5, 2' },
];
const MAX_LAB = 64;

function parseArray(text: string): number[] {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length > MAX_LAB) throw new Error(`The lab shows at most ${MAX_LAB} values so the diagram stays readable (you entered ${parts.length}).`);
  return parts.map((p, i) => { const v = Number(p); if (!/^[-+]?\d+$/.test(p) || !Number.isFinite(v)) throw new Error(`"${p}" (value #${i + 1}) is not an integer.`); return v; });
}
const num = (s: string, name: string) => { if (s.trim() === '' || !/^[-+]?\d+$/.test(s.trim())) throw new WaveletError('INVALID_VALUE', `${name} must be an integer.`); return Number(s.trim()); };

function execute(tree: WaveletTree, arr: number[], type: QType, p: Record<string, string>): { res: QueryResult; expected: number; label: string } {
  switch (type) {
    case 'kth': { const [l, r, k] = [num(p.l, 'l'), num(p.r, 'r'), num(p.k, 'k')]; const res = tree.kthSmallest(l, r, k); return { res, expected: brute.kth(arr, l, r, k), label: `kthSmallest(l=${l}, r=${r}, k=${k})` }; }
    case 'count': { const [l, r, x] = [num(p.l, 'l'), num(p.r, 'r'), num(p.x, 'x')]; const res = tree.count(l, r, x); return { res, expected: brute.count(arr, l, r, x), label: `count(l=${l}, r=${r}, x=${x})` }; }
    case 'rangeCount': { const [l, r, a, b] = [num(p.l, 'l'), num(p.r, 'r'), num(p.a, 'a'), num(p.b, 'b')]; const res = tree.rangeCount(l, r, a, b); return { res, expected: brute.rangeCount(arr, l, r, a, b), label: `rangeCount(l=${l}, r=${r}, a=${a}, b=${b})` }; }
    case 'rank': { const [x, i] = [num(p.x, 'x'), num(p.i, 'i')]; const res = tree.rank(x, i); return { res, expected: brute.rank(arr, x, i), label: `rank(x=${x}, i=${i})` }; }
    case 'select': { const [x, j] = [num(p.x, 'x'), num(p.j, 'j')]; const res = tree.select(x, j); return { res, expected: brute.select(arr, x, j), label: `select(x=${x}, j=${j})` }; }
    case 'access': { const i = num(p.i, 'i'); const res = tree.access(i); return { res, expected: brute.access(arr, i), label: `access(i=${i})` }; }
  }
}

export default function WaveletLab() {
  const { settings, analysis, log } = useApp();
  const loc = useLocation();
  const [text, setText] = useState(PRESETS[0].values);
  const [riskDomain, setRiskDomain] = useState(false);
  const [tree, setTree] = useState<WaveletTree | null>(null);
  const [arr, setArr] = useState<number[]>([]);
  const [buildErr, setBuildErr] = useState<string | null>(null);
  const [qType, setQType] = useState<QType>('kth');
  const [params, setParams] = useState<Record<string, string>>({ l: '1', r: '6', k: '3', x: '2', a: '2', b: '6', i: '3', j: '1' });
  const [out, setOut] = useState<{ res: QueryResult; expected: number; label: string; type: QType; p: Record<string, string> } | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selPath, setSelPath] = useState('');
  const [showBits, setShowBits] = useState(settings.showBitsInTree);
  const [bench, setBench] = useState<BenchRow[] | null>(null);
  const [benching, setBenching] = useState(false);
  const demoRan = useRef(false);

  const build = useCallback((t: string, useRisk = false, adjust = true): WaveletTree | null => {
    setOut(null); setQErr(null); setStep(0); setPlaying(false); setSelPath('');
    try {
      const values = parseArray(t);
      const wt = WaveletTree.build(values, useRisk ? { lo: 0, hi: 100 } : undefined);
      setArr(values); setTree(wt); setBuildErr(null);
      if (adjust && values.length) setParams(p => ({ ...p, r: String(values.length - 1), l: '0', i: String(Math.min(values.length - 1, 3)) }));
      log(`Built Wavelet Tree over ${values.length} value(s)`);
      return wt;
    } catch (e) { setTree(null); setArr([]); setBuildErr((e as Error).message); return null; }
  }, [log]);

  const run = useCallback((wt: WaveletTree | null, a: number[], type: QType, p: Record<string, string>, autoplay = false) => {
    setQErr(null); setPlaying(false);
    if (!wt) { setQErr('Build a tree first.'); return; }
    try { const o = execute(wt, a, type, p); setOut({ ...o, type, p }); setStep(0); setSelPath(o.res.steps[0]?.path ?? ''); setPlaying(autoplay); log(`${o.label} = ${o.res.value}`); }
    catch (e) { setOut(null); setQErr(e instanceof WaveletError || e instanceof Error ? e.message : 'Unexpected error'); }
  }, [log]);

  useEffect(() => { // initial build; ?demo=1 also runs and auto-plays the sample query
    if (demoRan.current) return; demoRan.current = true;
    const wt = build(PRESETS[0].values, false, false);
    if (loc.search.get('demo') === '1' && wt) { const p = { ...params, l: '1', r: '6', k: '3' }; setQType('kth'); setParams(p); run(wt, parseArray(PRESETS[0].values), 'kth', p, true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = out?.res.steps ?? [];
  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), settings.stepDelayMs);
    return () => clearTimeout(t);
  }, [playing, step, steps.length, settings.stepDelayMs]);
  useEffect(() => { if (steps[step]) setSelPath(steps[step].path); }, [step, steps]);

  const visited = useMemo(() => new Set(steps.slice(0, step + 1).map(s => s.path)), [steps, step]);
  const activePath = steps[step]?.path ?? null;
  const qdef = QUERIES.find(q => q.id === qType)!;
  const selNode = tree?.nodeAt(selPath) ?? null;
  const verified = out ? out.expected === out.res.value : null;
  const rangeLR = out && ['kth', 'count', 'rangeCount'].includes(out.type) ? [Number(out.p.l), Number(out.p.r)] : out?.type === 'rank' ? [0, Number(out.p.i) - 1] : null;
  const hitVal = out ? (out.type === 'count' || out.type === 'rank' || out.type === 'select' ? Number(out.p.x) : out.type === 'kth' || out.type === 'access' ? out.res.value : null) : null;

  const loadPreset = (values: string) => { setText(values); setRiskDomain(false); build(values); };
  const loadRisk = () => { if (!analysis) return; const v = analysis.scores.join(', '); setText(v); setRiskDomain(true); build(v, true); };
  const reset = () => { setText(PRESETS[0].values); setRiskDomain(false); setQType('kth'); setParams({ l: '1', r: '6', k: '3', x: '2', a: '2', b: '6', i: '3', j: '1' }); build(PRESETS[0].values, false, false); };
  const runBench = () => { setBenching(true); setTimeout(() => { setBench(benchmark([100, 1000, 10000, 100000], 40)); setBenching(false); }, 30); };

  return (
    <>
      <PageHead icon="tree" title="Wavelet Tree Lab" sub="Build a real Wavelet Tree, run queries, and watch the algorithm's actual traversal.">
        <button className="btn sm" onClick={reset}>Reset to demo state</button>
      </PageHead>
      <Panel variant="subtle" style={{ marginBottom: 16 }}>
        <div className="small"><strong>Conventions.</strong> Positions are <b>zero-based</b> and ranges <code>[l, r]</code> are <b>inclusive</b>. <code>k</code> and <code>j</code> are <b>one-based</b>. Values are integers (negatives allowed). A node covering values <code>[lo, hi]</code> sends values ≤ mid = ⌊(lo+hi)/2⌋ left (bit 0) and the rest right (bit 1). Edge labels in the tree show these bits.</div>
      </Panel>

      <div className="grid g-main-side">
        <div className="stack">
          <Panel>
            <PanelTitle title="Input Array" sub="Comma/space separated integers (max 64 values)" />
            <div className="row" style={{ alignItems: 'stretch' }}>
              <input style={{ flex: 1, minWidth: 220 }} value={text} onChange={e => { setText(e.target.value); setRiskDomain(false); }} aria-label="Input array" onKeyDown={e => e.key === 'Enter' && build(text, riskDomain)} />
              <button className="btn primary" onClick={() => build(text, riskDomain)}>Build Wavelet Tree</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="small muted">Examples:</span>{PRESETS.map(p => <button key={p.name} className="chip" onClick={() => loadPreset(p.values)}>{p.name}</button>)}
              <button className="chip" onClick={loadRisk} disabled={!analysis} title="Uses the risk scores of the active release, domain [0, 100]">Risk scores (current release)</button>
            </div>
            {buildErr && <div style={{ marginTop: 10 }}><ErrorBox title="Cannot build the tree">{buildErr}</ErrorBox></div>}
            {tree && arr.length === 0 && <div className="notice" style={{ marginTop: 10 }}>The array is empty. A tree can be built but every query will report “empty array”.</div>}
            {arr.length > 0 && <div className="arr" style={{ marginTop: 12 }} aria-label="Array contents">{arr.map((v, i) => { const inR = rangeLR && i >= rangeLR[0] && i <= rangeLR[1]; const hit = out && ((out.type === 'select' && i === out.res.value) || (out.type === 'access' && i === Number(out.p.i)) || (out.type !== 'select' && out.type !== 'access' && inR && hitVal !== null && v === hitVal)); return <div key={i} className={`cell mono ${hit ? 'hit' : inR ? 'in' : ''}`}>{v}<small>{i}</small></div>; })}</div>}
            {tree && tree.n > 0 && <div className="tiny muted" style={{ marginTop: 8 }}>n = {tree.n} · value domain [{tree.lo}, {tree.hi}] · {tree.depth()} level(s) · {tree.storedWords()} stored words</div>}
          </Panel>

          <Panel variant="primary">
            <PanelTitle title="Wavelet Tree" sub="Click a node to inspect its bit-vector. Highlighted nodes are the ones the last query actually visited." right={<label className="row small"><Switch checked={showBits} onChange={setShowBits} label="Show bit-vectors" /> Bit-vectors</label>} />
            {!tree ? <div className="empty">Build a tree to see it here.</div> : tree.n === 0 ? <div className="empty">Empty tree.</div> : <div className="tree-scroll" style={{ padding: 10 }}><WaveletDiagram tree={tree} visited={visited} active={activePath} selected={selPath} onSelect={setSelPath} showBits={showBits} /></div>}
          </Panel>
        </div>

        <div className="stack">
          <Panel>
            <PanelTitle title="Query" />
            <div className="stack">
              <label className="f">Query type<select value={qType} onChange={e => { setQType(e.target.value as QType); setOut(null); setQErr(null); }} aria-label="Query type">{QUERIES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
              <div className="tiny muted">{qdef.help}</div>
              <div className="grid g2" style={{ gap: 10 }}>{qdef.fields.map(([k, label]) => <label key={k} className="f">{label}<input inputMode="numeric" value={params[k]} onChange={e => setParams(p => ({ ...p, [k]: e.target.value }))} aria-label={label} onKeyDown={e => e.key === 'Enter' && run(tree, arr, qType, params)} /></label>)}</div>
              <button className="btn primary" onClick={() => run(tree, arr, qType, params)} disabled={!tree}>Execute Query</button>
              {qErr && <ErrorBox title="Invalid query">{qErr}</ErrorBox>}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Result" />
            {!out ? <div className="empty small">Run a query to see the result and its explanation.</div> : (
              <div className="stack">
                <div className="mono small">{out.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }} className="cyan" data-testid="query-result">{out.res.value}</div>
                <div className="row">{verified ? <Badge kind="low">Matches brute force</Badge> : <Badge kind="critical">MISMATCH vs brute force ({out.expected})</Badge>}</div>
                <p className="small muted">{out.res.explanation}</p>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel>
          <PanelTitle title="Step-by-step Traversal" sub="Each step is recorded by the algorithm as it runs" right={steps.length > 0 && <div className="row"><button className="btn sm" onClick={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }} disabled={step === 0}>◀ Prev</button><button className="btn sm" onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying(p => !p); }}>{playing ? '❚❚ Pause' : '▶ Play'}</button><button className="btn sm" onClick={() => { setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }} disabled={step >= steps.length - 1}>Next ▶</button></div>} />
          {steps.length === 0 ? <div className="empty small">{out ? 'This query needed no traversal (answered immediately).' : 'No query executed yet.'}</div> : <div className="steps" role="list">{steps.map((s, i) => <button key={i} role="listitem" className={`step ${i === step ? 'on' : i > step ? 'future' : ''}`} onClick={() => { setPlaying(false); setStep(i); }}>{s.note}</button>)}</div>}
        </Panel>
        <Panel>
          <PanelTitle title="Level Information" sub={selNode ? `Node path: ${selPath || 'root'}` : 'Select a node'} />
          {!selNode ? <div className="empty small">Click a node in the tree.</div> : (
            <div className="stack small">
              <div>Value range: <b className="mono">[{selNode.lo}, {selNode.hi}]</b> · size <b>{selNode.size}</b>{selNode.lo !== selNode.hi && <> · mid <b>{selNode.lo + Math.floor((selNode.hi - selNode.lo) / 2)}</b></>}</div>
              {selNode.lo === selNode.hi ? <div className="muted">Leaf: all {selNode.size} element(s) equal {selNode.lo}. No bit-vector is stored.</div> : (<>
                <div>Bit-vector (0 → left, 1 → right):<div className="mono bits cyan">{[...selNode.bits].join('')}</div></div>
                <div>Prefix zeros <span className="muted">zeros[i] = number of 0-bits in the first i bits</span>:<div className="mono bits">{[...selNode.zeros].join(' ')}</div></div>
                <div>Left child: {selNode.left ? `[${selNode.left.lo}, ${selNode.left.hi}] size ${selNode.left.size}` : 'none (no values)'} · Right child: {selNode.right ? `[${selNode.right.lo}, ${selNode.right.hi}] size ${selNode.right.size}` : 'none (no values)'}</div>
              </>)}
              {steps[step] && steps[step].path === selPath && <div className="notice">Current step maps range [{steps[step].s}, {steps[step].e}) into this node.</div>}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel variant="subtle">
          <PanelTitle title="Complexity of this implementation" sub="n = array length, σ = value-domain size (hi − lo + 1), L = ⌈log₂ σ⌉ levels" />
          <Table head={['Operation', 'Time']}>
            {[['Build', 'O(n log σ)'], ['Space', 'O(n log σ) words'], ['access / count / rank / k-th', 'O(log σ)'], ['Value-range count', 'O(log σ)'], ['select', 'O(log σ · log n)']].map(([a, b]) => <tr key={a}><td>{a}</td><td className="mono">{b}</td></tr>)}
          </Table>
          <div className="small muted" style={{ marginTop: 8 }}>Why a Wavelet Tree here? <Link to="/about#justification">Read the justification and trade-offs</Link>.</div>
        </Panel>
        <Panel variant="subtle">
          <PanelTitle title="Measured runtime" sub="Theory vs measurement: timings depend on your machine and browser" right={<button className="btn sm" onClick={runBench} disabled={benching}>Run benchmark</button>} />
          {benching ? <Spinner label="Benchmarking…" /> : !bench ? <div className="small muted">Compares k-th smallest on a half-length range: Wavelet Tree vs sorting the slice. Tree build time is excluded.</div> : <Table head={['n', 'Wavelet (µs)', 'Sort slice (µs)']}>{bench.map(b => <tr key={b.n}><td>{b.n.toLocaleString()}</td><td>{b.waveletUs.toFixed(1)}</td><td>{b.linearUs.toFixed(1)}</td></tr>)}</Table>}
        </Panel>
      </div>
    </>
  );
}
