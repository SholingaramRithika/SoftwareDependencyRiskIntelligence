# Test cases and recorded results

Status values: **PASS** = executed in the authoring environment and passed; **NOT RUN** = not executed; nothing is marked PASS unless it was actually run.

## A. Unit / integration tests (`npm test`) — executed: 39 run, 39 passed, 0 failed (Node 22.22)

| ID | Area | Test | Status |
|---|---|---|---|
| U28 | Wavelet Tree | build: partitioning and prefix counts are correct | PASS |
| U29 | Wavelet Tree | sizes of children always sum to parent size | PASS |
| U30 | Wavelet Tree | documented example results | PASS |
| U31 | Wavelet Tree | single element, all-equal, duplicates | PASS |
| U32 | Wavelet Tree | negative values | PASS |
| U33 | Wavelet Tree | empty input: builds, but every query reports EMPTY_ARRAY | PASS |
| U34 | Wavelet Tree | invalid parameters are rejected with specific codes | PASS |
| U35 | Wavelet Tree | values outside the domain count as zero occurrences | PASS |
| U36 | Wavelet Tree | explicit domain [0,100] works and keeps depth | PASS |
| U37 | Wavelet Tree | steps correspond to the real traversal (each step path exists and ranges are within node size) | PASS |
| U38 | Wavelet Tree | randomized comparison against brute force (all query types) | PASS |
| U39 | Wavelet Tree | exhaustive check on every range of a small array | PASS |
| U06 | Graph | nodes, directed edges and dedupe | PASS |
| U07 | Graph | missing package references and duplicate ids throw | PASS |
| U08 | Graph | upstream / downstream / affected | PASS |
| U09 | Graph | cycles: detected, and traversal terminates | PASS |
| U10 | Graph | shortest path and unreachable | PASS |
| U11 | Graph | risky paths: highest first, simple paths only | PASS |
| U12 | Graph | layout: unique positions, one layer per depth, unreachable nodes isolated on last layer | PASS |
| U13 | Graph | layout falls back to BFS depth when the graph has a cycle (no crash, all nodes placed) | PASS |
| U14 | Graph | demo dataset builds into acyclic graphs with a single root for every release | PASS |
| U22 | Risk | formula: zero and maximum | PASS |
| U23 | Risk | formula: hand-computed value (9.8, 4 vulns, 3 behind, .3 maintenance) | PASS |
| U24 | Risk | caps: values above caps do not increase the score | PASS |
| U25 | Risk | severity thresholds at the boundaries | PASS |
| U26 | Risk | invalid or missing inputs are rejected | PASS |
| U27 | Risk | severityCounts | PASS |
| U15 | Release | compareVersions | PASS |
| U16 | Release | added / removed / upgraded / downgraded / unchanged | PASS |
| U17 | Release | identical releases produce no differences | PASS |
| U18 | Release | empty release vs populated release | PASS |
| U19 | Release | demo dataset: v1.0.0 -> v2.0.0 matches independently computed expectations | PASS |
| U20 | Release | risk impact after a dependency change: upgrading http-lite lowers its score and the release average | PASS |
| U21 | Release | findRelease errors on unknown id; tiny dataset analyses | PASS |
| U01 | Dataset / routes / benchmark | built-in datasets validate | PASS |
| U02 | Dataset / routes / benchmark | malformed datasets are rejected with clear messages | PASS |
| U03 | Dataset / routes / benchmark | routes: unique paths, every route has a page file entry in App.tsx | PASS |
| U04 | Dataset / routes / benchmark | every internal link target in the source code is a known route | PASS |
| U05 | Dataset / routes / benchmark | benchmark returns positive timings for each size | PASS |

## B. Browser UI tests (`e2e/smoke.mjs`) — executed: 33 checks, 33 passed

Run against an esbuild bundle of the sources with React 19 in headless Chromium (not against the Vite build; see TEST_PLAN “Environment”).

| ID | Check | Status |
|---|---|---|
| E01–E09 | Each route (/, /dashboard, /dependencies, /wavelet-lab, /release-comparison, /risk-impact, /datasets, /about, /settings) renders an h1 and the shared background canvas | PASS |
| E10 | Unknown route shows “Page not found” with a way back | PASS |
| E11 | Header Get Started, Explore the Project, About, Modules menu, and all four feature cards navigate to real routes | PASS |
| E12 | Features link goes to /#features | PASS |
| E13 | Home shows live counts (27 packages in the latest demo release) and finishes the benchmark | PASS |
| E14 | Lab: default k-th smallest query returns 3 and shows “Matches brute force” | PASS |
| E15 | Lab: Next ▶ changes the highlighted step | PASS |
| E16 | Lab: k=99 shows an error alert and no result | PASS |
| E17 | Lab: non-integer array and empty array are handled; query on empty array reports an error | PASS |
| E18 | Lab: frequency, value-range, rank, select and access queries are all brute-force verified | PASS |
| E19 | Lab: ?demo=1 auto-plays and returns 3 | PASS |
| E20 | Lab: Reset restores the lecture example | PASS |
| E21 | Graph: 27 nodes drawn; selecting crypto-lite shows its details; search updates the match count | PASS |
| E22 | Graph: zoom in/out/fit controls work without errors | PASS |
| E23 | Graph: /dependencies?pkg=http-lite preselects the package | PASS |
| E24 | Release comparison: empty state, then v1.0.0→v2.0.0 shows 4 added and 2 removed | PASS |
| E25 | Release comparison: same release for both selectors shows the “identical” notice | PASS |
| E26 | Risk: severity filter, row selection breakdown, empty-search state | PASS |
| E27 | Dashboard: KPIs shown; switching to the tiny dataset updates the release data | PASS |
| E28 | Datasets: malformed JSON, invalid schema and dangling edge are rejected (and not added); a valid file is imported and becomes active | PASS |
| E29 | Settings: light/dark theme switch, background toggle removes the canvas, Reduce motion applies, persisted after reload | PASS |
| E30 | Header theme button cycles dark → light | PASS |
| E31 | No horizontal page overflow on any route at 820 px | PASS |
| E32 | No horizontal page overflow on any route at 390 px | PASS |
| E33 | No console or page errors during the whole run | PASS |

## C. Manual / not-yet-executed checks

| ID | Check | Status |
|---|---|---|
| M01 | `npm install` with a network, then `npm run dev` and `npm run build && npm run preview` start without errors (Vite 5 / React 18) | NOT RUN |
| M02 | `npm run typecheck` passes for the React files (the non-React modules were type-checked strictly with tsc and passed) | NOT RUN |
| M03 | Homepage visually matches the supplied reference screenshot (layout, hero composition, feature strip) | NOT RUN |
| M04 | Internal pages visually match the supplied multi-page reference | NOT RUN |
| M05 | Light theme: contrast and readability on every page | NOT RUN |
| M06 | Graph pan by mouse-drag and wheel zoom feel correct; touch pinch/drag on a phone | NOT RUN |
| M07 | Firefox and Safari: backdrop-filter, canvas background and SVG tree render correctly | NOT RUN |
| M08 | Screen-reader and keyboard-only walkthrough | NOT RUN |
| M09 | OS-level “reduce motion” preference stops the background animation | NOT RUN |
| M10 | Large imported dataset (hundreds of packages): graph readability and layout time | NOT RUN |
| M11 | Package a clean checkout with `npm ci` using the lockfile you generate and re-run `npm test` | NOT RUN |
