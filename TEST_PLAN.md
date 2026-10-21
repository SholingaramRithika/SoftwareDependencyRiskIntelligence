# Test plan

## Scope
Correctness of the algorithms (Wavelet Tree, graph, risk, release comparison, dataset validation) and the behaviour of every page and control.

## Levels
| Level | Tooling | Location | Command |
|---|---|---|---|
| Unit — Wavelet Tree | Node `node:test` + `assert` | `tests/waveletTree.test.ts` | `npm test` |
| Unit — graph, risk, release, validation | same | `tests/graph|risk|release|dataset.test.ts` | `npm test` |
| Integration — dataset → analysis → release comparison | same | `tests/release.test.ts`, `tests/graph.test.ts` | `npm test` |
| Static integration — routes/links | same | `tests/dataset.test.ts` | `npm test` |
| UI / browser integration | Playwright (Chromium) | `e2e/smoke.mjs` | `npm run test:e2e` (see README) |
| Manual / visual | human | `TEST_CASES.md` §C | — |

## Strategy
- **Oracle testing:** every Wavelet Tree query is compared with a deliberately naive brute-force function (`brute` in `waveletTree.ts`) on (a) hand-checked examples, (b) 300 random arrays × 12 random queries per array with a fixed PRNG seed (repeatable), and (c) *every* `(l, r, k)` of a small array.
- **Boundary and error testing:** empty/single/all-equal/duplicate/negative arrays, ranges at 0 and n−1, invalid `l, r, k, j, i`, non-integers, values outside the domain, domain violations.
- **Formula testing:** hand-computed risk score, caps, and each severity threshold at its boundary (24/25, 49/50, 74/75).
- **Graph testing:** direction, dedupe, missing references, duplicate ids, up/downstream closure, cycles (Tarjan, BFS termination), unreachable nodes, shortest path, layout invariants (every edge points to a deeper layer).
- **Release testing:** all five change types, identical releases, empty vs populated, version ordering (`1.10.0 > 1.9.9`, pre-release), expected result on the demo dataset, risk impact of an upgrade.
- **UI testing:** all nine routes plus not-found; header/CTA/feature-card navigation; query execution for all six types; invalid input; step navigation; demo mode; reset; graph selection/search/zoom/deep link; release comparison states; risk filters; dataset switching; import of malformed JSON, invalid schema, dangling edges and a valid file; theme/background/motion settings and persistence; horizontal overflow at 820 px and 390 px; no console errors.

## Entry / exit criteria
Entry: code compiles (`npm test` loads). Exit: all automated tests pass **as executed**; any failure is fixed and the suite rerun. A test that was not run is never reported as passed.

## Known gaps (see `TEST_CASES.md`)
Visual fidelity to the reference mock-ups, light-theme polish, real touch gestures, cross-browser (Firefox/Safari), screen-reader audit, and a `tsc` type-check of the React files were **not** executed in the authoring environment.

## Environment used for the recorded results
Node 22.22; Chromium via Playwright; the UI test ran against an **esbuild bundle** of `src/` using React 19 (the project itself declares React 18 + Vite 5, which could not be installed offline). Re-run `npm install && npm run build && npm run preview` and the e2e script on your machine to confirm with the real toolchain.
