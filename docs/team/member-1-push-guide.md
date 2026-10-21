# Member 1 push guide - Foundation
**Your area:** App shell, design system, routing, Home/About/Settings, documentation

## Files you own (this zip contains exactly these)
- `.gitignore`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `README.md`
- `TEST_PLAN.md`
- `TEST_CASES.md`
- `e2e/smoke.mjs`
- `docs/ARCHITECTURE.md`
- `docs/COMPLEXITY.md`
- `docs/CONTRIBUTIONS.md`
- `docs/DSA_JUSTIFICATION.md`
- `src/main.tsx`
- `src/App.tsx`
- `src/router.tsx`
- `src/routes.ts`
- `src/styles.css`
- `src/components/Background.tsx`
- `src/components/Layout.tsx`
- `src/components/ui.tsx`
- `src/components/charts.tsx`
- `src/state/AppState.tsx`
- `src/pages/Home.tsx`
- `src/pages/About.tsx`
- `src/pages/Settings.tsx`

## Push steps (use YOUR OWN GitHub account)
Push order matters: **Member 1 pushes first** (project skeleton). Members 2-4 pull, then push. The project only compiles once all four parts are in.
```bash
# Member 1 only, once: create an empty GitHub repo, then
git init && git branch -M main
# Members 2-4: git clone <repo-url> && cd <repo> && git pull
git config user.name "Your Name"
git config user.email "<email verified on YOUR GitHub account>"
# unzip this archive INTO the repo root (do not nest it in a folder), then:
git checkout -b feature/foundation
git add .
git commit -m "Add app shell"
git remote add origin <repo-url>   # Member 1 only
git push -u origin feature/foundation   # Member 1 may push main directly
```
Then open a pull request (use "Rebase and merge" or a merge commit, not squash, so your authorship stays visible).

## After all four parts are merged
```bash
npm install
npm test
npm run dev
```
Fill in your row in `docs/CONTRIBUTIONS.md` yourself, and commit only your own work.
