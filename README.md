# WaveletScope

**Wavelet Tree-Based Software Dependency Risk Intelligence and Release Comparison System** — a DSA case study.

A browser application (React + TypeScript + Vite) that combines a real **Wavelet Tree** with **dependency-graph analytics**, **risk scoring** and **release comparison**. Everything runs locally in the browser; the live demo needs no network and no backend.

> **Data notice.** The bundled datasets are **synthetic**: package names, versions and risk inputs are invented. Nothing in them describes a real library or a verified vulnerability. Imported datasets are only as trustworthy as their source.

## Requirements
- Node.js **22.6 or newer** (the unit tests run TypeScript directly with `--experimental-strip-types`), npm 10+

## Install and run
```bash
npm install          # creates package-lock.json on first run; commit it
npm run dev          # http://localhost:5173
```
Production build: `npm run build && npm run preview` (serves on http://localhost:4173).

## Pages
| Route | Page |
|---|---|
| `/` | Landing page (live figures from the active dataset) |
| `/dashboard` | KPIs, health trend, risk distribution, top risky packages, release changes, session activity |
| `/dependencies` | Interactive dependency graph: zoom/pan, search, filters, details, upstream/downstream/path highlighting |
| `/wavelet-lab` | **Wavelet Tree Lab** — build, query (6 query types), step through the real traversal |
| `/release-comparison` | Added / removed / upgraded / downgraded / unchanged, risk deltas, edge changes |
| `/risk-impact` | Severity counts, searchable table, factor breakdown, downstream impact, risky paths, formula |
| `/datasets` | Dataset list, validation status, JSON import with strict validation, sample download |
| `/about` | Motivation, data-structure justification, implementation, complexity, architecture, limitations |
| `/settings` | Theme (dark/light/system), animated background, motion, graph display, query playback, default dataset |

## Live-demo script (about 3 minutes)
1. Open **/wavelet-lab**. The lecture example `5, 2, 8, 6, 3, 7, 1, 4` is already built. (Home → **Watch Demo** does steps 2–4 automatically.)
2. Query **K-th smallest in [l, r]** with `l=1, r=6, k=3` → **3**. Press **Execute Query**.
3. Step through with **Next ▶** / **▶ Play**; the highlighted nodes are the ones the algorithm actually visited. Click a node to see its bit-vector and prefix-zero counts.
4. Note the “Matches brute force” badge: every answer is cross-checked against a naive implementation.
5. Try edge cases: `k=99` (invalid rank), `l=5, r=2` (bad range), empty array, `1, 2, x` (not an integer), duplicates preset, negative-values preset.
6. **Reset to demo state** restores the known starting point.
7. Show **/dependencies** (select a node, switch highlight mode), **/release-comparison** (v1.0.0 → v2.0.0: 4 added, 2 removed) and **/risk-impact**.

Other repeatable sample queries on the lecture example (positions zero-based, ranges inclusive):

| Query | Parameters | Expected |
|---|---|---|
| count of x in [l, r] | l=0, r=7, x=5 | 1 |
| values in [a, b] within [l, r] | l=1, r=6, a=2, b=6 | 3 |
| rank (prefix length i) | x=5, i=4 | 1 |
| select (j-th x) | x=7, j=1 | 5 |
| access | i=3 | 6 |

## Tests
```bash
npm test                 # 39 unit/integration tests (Node's built-in runner, no extra dependencies)
npm run test:algorithms  # only the algorithm suites
npm run typecheck        # tsc --noEmit (needs npm install)

# Browser smoke/UI integration test (optional extra dependency)
npm i -D playwright && npx playwright install chromium
npm run build && npm run preview &        # then, in another terminal:
BASE_URL=http://localhost:4173 npm run test:e2e
```
See `TEST_PLAN.md` and `TEST_CASES.md` for what is covered and what was actually executed.

## Project layout
```
src/algorithms/   waveletTree.ts  graph.ts  risk.ts  release.ts  benchmark.ts   (pure TypeScript, no UI)
src/data/         types.ts  demoDataset.ts (synthetic)  validate.ts
src/state/        AppState.tsx (context, settings, persistence)  analysis.ts
src/components/   Background, Layout, ui, charts, WaveletDiagram, GraphView, DataPicker
src/pages/        one file per route
src/router.tsx    small History-API router (no react-router dependency)
tests/            node:test suites      e2e/smoke.mjs  Playwright browser test
docs/             DSA_JUSTIFICATION.md  COMPLEXITY.md  ARCHITECTURE.md  CONTRIBUTIONS.md
```

## Dataset format
Import JSON on **/datasets** (download the sample there). Required: `id`, `name`, `synthetic` (true/false), `packages[]`, `releases[]` (each with `entries[]` and `edges[]`). Malformed files are rejected with a list of specific problems and nothing is imported unless **all** checks pass. Imported datasets are stored in the browser's `localStorage`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `npm test` says unknown option / syntax error | Use Node 22.6+ (`node -v`). |
| `npm run dev` port busy | `npx vite --port 5174` |
| Page is blank after changing settings | Clear site data (localStorage) or use **Settings → Restore defaults**. |
| Background animation looks slow | Settings → Animated background off, or Motion → Reduce. |
| Import says “failed validation” | Read the listed problems; each names the array index and field. |
| Imported data disappeared | It lives in this browser's localStorage only; private windows do not keep it. |

## What is *not* in this project
No backend or database, no live vulnerability feed, no dynamic (updatable) Wavelet Tree, no compression of values to rank space. See `/about` → Limitations.
