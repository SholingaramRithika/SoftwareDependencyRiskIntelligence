# Member 3 push guide - GraphRisk
**Your area:** Dependency graph algorithms, risk scoring, Graph explorer, Risk and Dashboard pages

## Files you own (this zip contains exactly these)
- `src/algorithms/graph.ts`
- `src/algorithms/risk.ts`
- `tests/graph.test.ts`
- `tests/risk.test.ts`
- `src/state/analysis.ts`
- `src/pages/Dependencies.tsx`
- `src/components/GraphView.tsx`
- `src/pages/RiskImpact.tsx`
- `src/pages/Dashboard.tsx`

## Push steps (use YOUR OWN GitHub account)
Push order matters: **Member 1 pushes first** (project skeleton). Members 2-4 pull, then push. The project only compiles once all four parts are in.
```bash
# Member 1 only, once: create an empty GitHub repo, then
git init && git branch -M main
# Members 2-4: git clone <repo-url> && cd <repo> && git pull
git config user.name "Your Name"
git config user.email "<email verified on YOUR GitHub account>"
# unzip this archive INTO the repo root (do not nest it in a folder), then:
git checkout -b feature/graphrisk
git add .
git commit -m "Add dependency graph algorithms"
git remote add origin <repo-url>   # Member 1 only
git push -u origin feature/graphrisk   # Member 1 may push main directly
```
Then open a pull request (use "Rebase and merge" or a merge commit, not squash, so your authorship stays visible).

## After all four parts are merged
```bash
npm install
npm test
npm run dev
```
Fill in your row in `docs/CONTRIBUTIONS.md` yourself, and commit only your own work.
