import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dataset } from '../data/types.ts';
import { BUILTIN_DATASETS } from '../data/demoDataset.ts';
import { validateDataset } from '../data/validate.ts';
import { analyzeRelease, type Analysis } from './analysis.ts';

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  background: boolean;
  motion: 'system' | 'reduce' | 'full';
  graphLabels: boolean; graphArrows: boolean; graphDimOthers: boolean;
  stepDelayMs: number; showBitsInTree: boolean;
  defaultDatasetId: string;
  density: 'compact' | 'default' | 'comfortable';
}
export const DEFAULT_SETTINGS: Settings = { theme: 'dark', background: true, motion: 'system', graphLabels: true, graphArrows: true, graphDimOthers: true, stepDelayMs: 900, showBitsInTree: true, defaultDatasetId: 'demo-dataset', density: 'default' };

export interface Activity { at: string; text: string }
interface Ctx {
  settings: Settings; setSettings: (p: Partial<Settings>) => void; resetSettings: () => void;
  datasets: Dataset[]; dataset: Dataset; setDatasetId: (id: string) => void;
  addDataset: (d: Dataset) => void; removeDataset: (id: string) => void;
  releaseId: string; setReleaseId: (id: string) => void;
  analysis: Analysis | null; analysisError: string | null;
  activity: Activity[]; log: (text: string) => void;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => { const v = useContext(C); if (!v) throw new Error('useApp outside provider'); return v; };

const KEY_SETTINGS = 'waveletscope.settings.v1', KEY_IMPORTED = 'waveletscope.imported.v1';
const load = <T,>(k: string, fallback: T): T => { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: preferences just won't persist */ } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setS] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEY_SETTINGS, {}) }));
  const [imported, setImported] = useState<Dataset[]>(() => load<unknown[]>(KEY_IMPORTED, []).map(validateDataset).flatMap(r => (r.ok && r.dataset ? [r.dataset] : [])));
  const datasets = useMemo(() => [...BUILTIN_DATASETS, ...imported], [imported]);
  const [datasetId, setDatasetIdState] = useState(() => (datasets.some(d => d.id === settings.defaultDatasetId) ? settings.defaultDatasetId : BUILTIN_DATASETS[0].id));
  const dataset = datasets.find(d => d.id === datasetId) ?? datasets[0];
  const [releaseSel, setReleaseId] = useState('');
  const releaseId = dataset.releases.some(r => r.id === releaseSel) ? releaseSel : dataset.releases[dataset.releases.length - 1].id;
  const [activity, setActivity] = useState<Activity[]>([]);
  const log = useCallback((text: string) => setActivity(a => [{ at: new Date().toLocaleTimeString(), text }, ...a].slice(0, 8)), []);

  const setSettings = useCallback((p: Partial<Settings>) => setS(s => { const n = { ...s, ...p }; save(KEY_SETTINGS, n); return n; }), []);
  const resetSettings = useCallback(() => { setS(DEFAULT_SETTINGS); save(KEY_SETTINGS, DEFAULT_SETTINGS); }, []);
  const setDatasetId = useCallback((id: string) => { setDatasetIdState(id); setReleaseId(''); const d = datasets.find(x => x.id === id); if (d) log(`Dataset "${d.name}" selected`); }, [datasets, log]);
  const addDataset = useCallback((d: Dataset) => setImported(list => { const n = [...list.filter(x => x.id !== d.id), d]; save(KEY_IMPORTED, n); return n; }), []);
  const removeDataset = useCallback((id: string) => { setImported(list => { const n = list.filter(x => x.id !== id); save(KEY_IMPORTED, n); return n; }); setDatasetIdState(cur => (cur === id ? BUILTIN_DATASETS[0].id : cur)); }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      const reduce = settings.motion === 'reduce' || (settings.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      root.dataset.motion = reduce ? 'reduce' : 'full';
      root.dataset.density = settings.density;
    };
    apply();
    const mq = [window.matchMedia('(prefers-color-scheme: dark)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
    mq.forEach(m => m.addEventListener('change', apply));
    return () => mq.forEach(m => m.removeEventListener('change', apply));
  }, [settings.theme, settings.motion, settings.density]);

  const { analysis, analysisError } = useMemo(() => {
    try { return { analysis: analyzeRelease(dataset, releaseId), analysisError: null as string | null }; }
    catch (e) { return { analysis: null as Analysis | null, analysisError: (e as Error).message }; }
  }, [dataset, releaseId]);

  const value = useMemo<Ctx>(() => ({ settings, setSettings, resetSettings, datasets, dataset, setDatasetId, addDataset, removeDataset, releaseId, setReleaseId, analysis, analysisError, activity, log }),
    [settings, setSettings, resetSettings, datasets, dataset, setDatasetId, addDataset, removeDataset, releaseId, analysis, analysisError, activity, log]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
