# Member 4 push guide - ReleaseData
**Your area:** Release comparison, dataset model/validation/manager

## Files you own (this zip contains exactly these)
- `src/algorithms/release.ts`
- `tests/release.test.ts`
- `src/pages/ReleaseComparison.tsx`
- `src/data/types.ts`
- `src/data/validate.ts`
- `src/data/demoDataset.ts`
- `tests/dataset.test.ts`
- `src/pages/Datasets.tsx`
- `src/components/DataPicker.tsx`

## Push steps (use YOUR OWN GitHub account)
Push order matters: **Member 1 pushes first** (project skeleton). Members 2-4 pull, then push. The project only compiles once all four parts are in.
```bash
# Member 1 only, once: create an empty GitHub repo, then
git init && git branch -M main
# Members 2-4: git clone <repo-url> && cd <repo> && git pull
git config user.name "Your Name"
git config user.email "<email verified on YOUR GitHub account>"
# unzip this archive INTO the repo root (do not nest it in a folder), then:
git checkout -b feature/releasedata
git add .
git commit -m "Add release comparison"
git remote add origin <repo-url>   # Member 1 only
git push -u origin feature/releasedata   # Member 1 may push main directly
```
Then open a pull request (use "Rebase and merge" or a merge commit, not squash, so your authorship stays visible).

## After all four parts are merged
```bash
npm install
npm test
npm run dev
```
Fill in your row in `docs/CONTRIBUTIONS.md` yourself, and commit only your own work.
