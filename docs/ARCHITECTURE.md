# Architecture

```
Dataset JSON ──► validate.ts ──► Dataset ──► analyzeRelease() ──► { graph, per-package risk, counts }
                                    │                                   │
                                    ├── release.ts (compare two releases)
                                    └── waveletTree.ts (risk-score array → queries)
                                                  ▼
                                   React pages (read-only views + controls)
```
- **Pure core (`src/algorithms`, `src/data`, `src/state/analysis.ts`)** has no React/DOM imports and is unit-tested with Node's runner.
- **State (`src/state/AppState.tsx`)**: React context for the active dataset/release, settings (persisted in `localStorage`), imported datasets (persisted, re-validated on load), and a session activity log.
- **UI**: shared `Layout` (header, sidebar, `Background`), glass components (`ui.tsx`), SVG charts (`charts.tsx`), `WaveletDiagram`, `GraphView`.
- **Routing**: `src/routes.ts` is the single list of routes; `src/router.tsx` is a ~30-line History-API router. A test asserts every `to="/…"` link in the source is a known route.
- **Design tokens**: CSS variables in `src/styles.css` (`--navy`, `--cyan`, …) shared by all pages; light theme overrides the same variables.
- **Background**: one canvas component (particles, connecting lines, wave trails, parallax); pauses when the tab is hidden; static single frame when motion is reduced; can be turned off in Settings.
- **No backend**: all data are bundled or imported by the user; nothing is sent over the network.
