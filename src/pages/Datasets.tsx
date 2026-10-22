import { useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppState.tsx';
import { validateDataset } from '../data/validate.ts';
import { TINY_DATASET } from '../data/demoDataset.ts';
import type { Dataset } from '../data/types.ts';
import { Badge, Dialog, ErrorBox, Panel, PanelTitle, PageHead, Spinner, SyntheticBadge, Table } from '../components/ui.tsx';
import { navigate } from '../router.tsx';

const MAX_BYTES = 5 * 1024 * 1024;
function download(name: string, obj: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export default function Datasets() {
  const { datasets, dataset, setDatasetId, addDataset, removeDataset, log } = useApp();
  const [msg, setMsg] = useState<{ ok: boolean; title: string; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const builtinIds = useMemo(() => new Set(['demo-dataset', 'tiny-sample']), []);
  const info = useMemo(() => datasets.map(d => {
    const v = validateDataset(JSON.parse(JSON.stringify(d)));
    const last = d.releases[d.releases.length - 1];
    return { d, v, edges: last.edges.length, inLast: last.entries.length };
  }), [datasets]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMsg(null); setBusy(true);
    try {
      if (f.size > MAX_BYTES) throw new Error(`File is ${(f.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`);
      const text = await f.text();
      let raw: unknown;
      try { raw = JSON.parse(text); } catch (e) { setMsg({ ok: false, title: `“${f.name}” is not valid JSON`, errors: [(e as Error).message] }); return; }
      const r = validateDataset(raw);
      if (!r.ok || !r.dataset) { setMsg({ ok: false, title: `Import rejected: “${f.name}” failed validation`, errors: r.errors }); return; }
      if (builtinIds.has(r.dataset.id)) { setMsg({ ok: false, title: 'Import rejected', errors: [`The id "${r.dataset.id}" belongs to a built-in dataset. Choose a different "id".`] }); return; }
      const replaced = datasets.some(d => d.id === r.dataset!.id);
      addDataset(r.dataset); setDatasetId(r.dataset.id); log(`Imported dataset "${r.dataset.name}"`);
      setMsg({ ok: true, title: `Imported “${r.dataset.name}”${replaced ? ' (replaced an earlier import with the same id)' : ''}`, errors: [] });
    } catch (e) { setMsg({ ok: false, title: 'Could not read the file', errors: [(e as Error).message] }); }
    finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const toDelete = datasets.find(d => d.id === confirm);
  return (
    <>
      <PageHead icon="db" title="Dataset Manager" sub="Manage and import software package and release data.">
        <button className="btn primary" onClick={() => file.current?.click()} disabled={busy}>Import Dataset</button>
        <button className="btn" onClick={() => download('waveletscope-sample.json', TINY_DATASET)}>⬇ Download Sample</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => onFile(e.target.files?.[0])} aria-label="Import dataset file" />
      </PageHead>
      {busy && <Panel><Spinner label="Validating file…" /></Panel>}
      {msg && (msg.ok ? <div className="notice ok" role="status"><strong>{msg.title}</strong></div> : <ErrorBox title={msg.title}><ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{msg.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>{msg.errors.length >= 50 && <div className="tiny">Showing the first 50 problems.</div>}</ErrorBox>)}
      <Panel style={{ marginTop: 16 }}>
        <PanelTitle title="Available Datasets" sub="Imported datasets are stored only in this browser (localStorage)." />
        <Table head={['Name', 'Packages', 'Deps (latest)', 'Releases', 'Validation', 'Actions']}>
          {info.map(({ d, v, edges, inLast }) => (
            <tr key={d.id} className={d.id === dataset.id ? 'sel' : ''}>
              <td><strong>{d.name}</strong> <span className="tiny muted mono">({d.id})</span>{d.synthetic && <> <SyntheticBadge /></>}<div className="tiny muted">{d.description}</div></td>
              <td>{d.packages.length}<div className="tiny muted">{inLast} in latest</div></td><td>{edges}</td><td>{d.releases.length}</td>
              <td>{v.ok ? <Badge kind="verified">Valid</Badge> : <Badge kind="critical">{v.errors.length} problem(s)</Badge>}</td>
              <td><div className="row">{d.id === dataset.id ? <Badge kind="pill">Active</Badge> : <button className="btn sm" onClick={() => setDatasetId(d.id)}>Use</button>}{!builtinIds.has(d.id) && <button className="btn sm danger" onClick={() => setConfirm(d.id)}>Remove</button>}</div></td>
            </tr>))}
        </Table>
      </Panel>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Panel variant="subtle">
          <PanelTitle title="Import format (JSON)" />
          <pre className="mono tiny" style={{ margin: 0, overflow: 'auto', whiteSpace: 'pre' }}>{`{
  "id": "my-data", "name": "My data",
  "synthetic": false,           // required: is it invented?
  "packages": [ { "id": "app", "kind": "runtime", "description": "…" } ],
  "releases": [ {
    "id": "r1", "label": "r1", "date": "2026-01-01",
    "entries": [ { "pkg": "app", "version": "1.0.0",
      "risk": { "cvss": 0, "vulnCount": 0, "majorsBehind": 0, "maintenance": 1 } } ],
    "edges": [ { "from": "app", "to": "lib" } ]   // "from depends on to"
  } ]
}`}</pre>
        </Panel>
        <Panel variant="subtle">
          <PanelTitle title="What is validated" />
          <ul className="small" style={{ margin: '0 0 0 18px', padding: 0 }}>
            <li>Valid JSON, required fields and types, a declared <code>synthetic</code> flag</li><li>Unique package and release ids; kinds in runtime / development / peer / optional</li><li>Every entry refers to a declared package, once per release</li><li>Every edge connects two packages that exist in the same release</li><li>Risk inputs in range (cvss 0–10, integer counts ≥ 0, maintenance 0–1)</li><li>File size ≤ 5 MB. Nothing is imported unless <em>all</em> checks pass.</li>
          </ul>
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => navigate('/dashboard')}>Go to dashboard</button>
        </Panel>
      </div>
      <Dialog open={!!toDelete} title="Remove dataset?" onClose={() => setConfirm(null)}>
        <p className="muted small">“{toDelete?.name}” will be removed from this browser. Built-in datasets are never affected.</p>
        <div className="row"><button className="btn danger" onClick={() => { if (confirm) { removeDataset(confirm); log(`Removed dataset "${toDelete?.name}"`); } setConfirm(null); }}>Remove</button><button className="btn" onClick={() => setConfirm(null)}>Cancel</button></div>
      </Dialog>
    </>
  );
}
export type { Dataset };
