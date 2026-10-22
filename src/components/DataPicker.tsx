import { useApp } from '../state/AppState.tsx';
import { SyntheticBadge } from './ui.tsx';

/** Dataset + release selectors shared by the analysis pages. */
export default function DataPicker({ release = true }: { release?: boolean }) {
  const { datasets, dataset, setDatasetId, releaseId, setReleaseId } = useApp();
  return (
    <div className="row">
      <label className="f">Dataset<select value={dataset.id} onChange={e => setDatasetId(e.target.value)} aria-label="Dataset">{datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      {release && <label className="f">Release<select value={releaseId} onChange={e => setReleaseId(e.target.value)} aria-label="Release">{dataset.releases.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>}
      {dataset.synthetic && <SyntheticBadge />}
    </div>
  );
}
