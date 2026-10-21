import { useState, type ReactNode } from 'react';
import { useApp, DEFAULT_SETTINGS } from '../state/AppState.tsx';
import { Panel, PanelTitle, PageHead, Switch } from '../components/ui.tsx';

export default function Settings() {
  const { settings, setSettings, resetSettings, datasets } = useApp();
  const [tab, setTab] = useState<'appearance' | 'visualization' | 'query' | 'data'>('appearance');
  const Row = ({ title, desc, children }: { title: string; desc: string; children: ReactNode }) => <div className="setting"><div><strong>{title}</strong><div className="small muted">{desc}</div></div>{children}</div>;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <>
      <PageHead icon="gear" title="Settings" sub="Customize your experience. Changes apply immediately and are saved in this browser."><button className="btn sm" onClick={resetSettings}>Restore defaults</button></PageHead>
      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>{([['appearance', 'Appearance'], ['visualization', 'Graph display'], ['query', 'Query'], ['data', 'Datasets']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <Panel className="primary" style={{ maxWidth: 820 }}>
        {tab === 'appearance' && (<>
          <PanelTitle title="Appearance" />
          <Row title="Theme" desc="Dark is the default WaveletScope look. “System” follows your OS."><div className="tabs" role="radiogroup" aria-label="Theme">{(['dark', 'light', 'system'] as const).map(t => <button key={t} role="radio" aria-checked={settings.theme === t} className={settings.theme === t ? 'on' : ''} onClick={() => setSettings({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div></Row>
          <Row title="Animated background" desc="Moving particles, network lines and wave trails behind every page."><Switch checked={settings.background} onChange={v => setSettings({ background: v })} label="Animated background" /></Row>
          <Row title="Motion" desc={`Reduced motion stops the background animation and UI transitions. Your OS currently ${reduced ? 'requests reduced motion' : 'allows full motion'}.`}><div className="tabs" role="radiogroup" aria-label="Motion">{([['system', 'Follow system'], ['reduce', 'Reduce'], ['full', 'Full']] as const).map(([k, l]) => <button key={k} role="radio" aria-checked={settings.motion === k} className={settings.motion === k ? 'on' : ''} onClick={() => setSettings({ motion: k })}>{l}</button>)}</div></Row>
          <Row title="UI density" desc="Spacing and corner radius of panels."><div className="tabs" role="radiogroup" aria-label="Density">{(['compact', 'default', 'comfortable'] as const).map(k => <button key={k} role="radio" aria-checked={settings.density === k} className={settings.density === k ? 'on' : ''} onClick={() => setSettings({ density: k })}>{k[0].toUpperCase() + k.slice(1)}</button>)}</div></Row>
        </>)}
        {tab === 'visualization' && (<>
          <PanelTitle title="Graph display" />
          <Row title="Show package labels" desc="Names under every node in the dependency graph."><Switch checked={settings.graphLabels} onChange={v => setSettings({ graphLabels: v })} label="Show package labels" /></Row>
          <Row title="Show edge arrows" desc="Arrowheads point from a package to what it depends on."><Switch checked={settings.graphArrows} onChange={v => setSettings({ graphArrows: v })} label="Show edge arrows" /></Row>
          <Row title="Dim non-matching nodes" desc="Fade nodes excluded by filters or outside the selected package's neighbourhood."><Switch checked={settings.graphDimOthers} onChange={v => setSettings({ graphDimOthers: v })} label="Dim non-matching nodes" /></Row>
        </>)}
        {tab === 'query' && (<>
          <PanelTitle title="Query settings" />
          <Row title="Show bit-vectors in the tree" desc="Initial state of the Wavelet Tree Lab bit-vector toggle."><Switch checked={settings.showBitsInTree} onChange={v => setSettings({ showBitsInTree: v })} label="Show bit-vectors in the tree" /></Row>
          <Row title={`Step playback delay: ${settings.stepDelayMs} ms`} desc="Time between steps when auto-playing a query."><input type="range" min={200} max={2500} step={100} value={settings.stepDelayMs} onChange={e => setSettings({ stepDelayMs: Number(e.target.value) })} aria-label="Step playback delay" /></Row>
        </>)}
        {tab === 'data' && (<>
          <PanelTitle title="Dataset preferences" />
          <Row title="Default dataset" desc="Loaded when the application starts."><select value={settings.defaultDatasetId} onChange={e => setSettings({ defaultDatasetId: e.target.value })} aria-label="Default dataset">{datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Row>
        </>)}
      </Panel>
      <div className="tiny muted" style={{ marginTop: 10 }}>Defaults: theme {DEFAULT_SETTINGS.theme}, background on, motion follows system.</div>
    </>
  );
}
