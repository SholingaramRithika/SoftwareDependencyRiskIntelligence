export interface RouteDef { path: string; title: string; module: boolean; blurb: string }
/** Single source of truth for navigation: every nav link, CTA and sidebar item must point to one of these. */
export const ROUTES: RouteDef[] = [
  { path: '/', title: 'Home', module: false, blurb: 'Project overview' },
  { path: '/dashboard', title: 'Dashboard', module: true, blurb: 'KPIs and risk overview' },
  { path: '/dependencies', title: 'Dependency Graph', module: true, blurb: 'Explore package relationships' },
  { path: '/wavelet-lab', title: 'Wavelet Tree Lab', module: true, blurb: 'Build and query a Wavelet Tree' },
  { path: '/release-comparison', title: 'Release Comparison', module: true, blurb: 'Diff two releases' },
  { path: '/risk-impact', title: 'Risk Intelligence', module: true, blurb: 'Scores, paths and impact' },
  { path: '/datasets', title: 'Dataset Manager', module: true, blurb: 'Select and import data' },
  { path: '/about', title: 'About & DSA Notes', module: false, blurb: 'Justification, complexity, architecture' },
  { path: '/settings', title: 'Settings', module: false, blurb: 'Theme and preferences' },
];
export const isKnownPath = (p: string) => ROUTES.some(r => r.path === p);
