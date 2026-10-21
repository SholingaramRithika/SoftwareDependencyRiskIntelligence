import { AppProvider } from './state/AppState.tsx';
import { useLocation } from './router.tsx';
import Layout from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Dependencies from './pages/Dependencies.tsx';
import WaveletLab from './pages/WaveletLab.tsx';
import ReleaseComparison from './pages/ReleaseComparison.tsx';
import RiskImpact from './pages/RiskImpact.tsx';
import Datasets from './pages/Datasets.tsx';
import About from './pages/About.tsx';
import Settings from './pages/Settings.tsx';
import { Link } from './router.tsx';
import { Panel } from './components/ui.tsx';

// Route table: every path here must also exist in src/routes.ts (checked by tests/dataset.test.ts)
const PAGES: Record<string, () => JSX.Element> = {
  '/': Home, '/dashboard': Dashboard, '/dependencies': Dependencies, '/wavelet-lab': WaveletLab,
  '/release-comparison': ReleaseComparison, '/risk-impact': RiskImpact, '/datasets': Datasets, '/about': About, '/settings': Settings,
};
function Router() {
  const { path } = useLocation();
  const Page = PAGES[path];
  if (!Page) return <Layout internal><Panel className="primary" style={{ maxWidth: 560 }}><h1>Page not found</h1><p className="muted">There is no page at <code>{path}</code>.</p><Link to="/dashboard" className="btn primary">Go to the dashboard</Link></Panel></Layout>;
  return <Layout internal={path !== '/'}><Page /></Layout>;
}
export default function App() { return <AppProvider><Router /></AppProvider>; }
