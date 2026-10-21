# Individual contributions and GitHub proof

> This file is a **template for the team to complete honestly**. It deliberately contains no names, no commit history and no authorship claims. Nobody should be credited for work they did not do, and no commits should be made on anyone's behalf.

## Module ownership (fill in)
| Module | Files | Owner (GitHub username) | What I can explain in the viva |
|---|---|---|---|
| Wavelet Tree core | `src/algorithms/waveletTree.ts`, `tests/waveletTree.test.ts` | | |
| Graph algorithms | `src/algorithms/graph.ts`, `tests/graph.test.ts` | | |
| Risk scoring | `src/algorithms/risk.ts`, `tests/risk.test.ts` | | |
| Release comparison | `src/algorithms/release.ts`, `src/pages/ReleaseComparison.tsx`, `tests/release.test.ts` | | |
| Dataset validation / manager | `src/data/validate.ts`, `src/pages/Datasets.tsx` | | |
| Wavelet Tree Lab UI | `src/pages/WaveletLab.tsx`, `src/components/WaveletDiagram.tsx` | | |
| Graph explorer UI | `src/pages/Dependencies.tsx`, `src/components/GraphView.tsx` | | |
| Design system / background | `src/styles.css`, `src/components/Background.tsx`, `ui.tsx`, `charts.tsx` | | |
| Dashboard / Risk / Home / About / Settings pages | `src/pages/*` | | |
| Testing & docs | `tests/`, `e2e/`, `TEST_*.md`, `README.md`, `docs/` | | |

## Keeping commits attributable
1. Every member clones the repo and sets **their own** identity: `git config user.name "Your Name"` and `git config user.email "<the email verified on YOUR GitHub account>"`.
2. Work on a branch (`git checkout -b feature/<module>`), commit small and often, push, open a pull request. Do not share one login or commit as someone else.
3. Do not squash everyone's work into one commit; prefer "Rebase and merge" or "Create a merge commit" so each author's commits survive.
4. Commit messages should say what changed in which module.

## Commands to show history during the evaluation
```bash
git log --oneline --graph --decorate --all
git shortlog -sne --all                       # commits per author
git log --author="<name or email>" --stat     # one member's commits and touched files
git log --follow -p -- src/algorithms/waveletTree.ts   # history of one file
git blame src/algorithms/waveletTree.ts       # who wrote which line
```
Also be ready to show the repository's **Contributors / Insights → Contributors** page on GitHub.

## Reproducible demonstration per member (fill in)
For each module you own: (1) open the file, (2) run its tests (`node --experimental-strip-types --test tests/<file>.test.ts`), (3) change one value or condition on purpose and show a test failing, then revert, (4) explain the complexity of the main function.
