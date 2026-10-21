# Member 2 push guide - WaveletTree
**Your area:** Wavelet Tree data structure, benchmark and Wavelet Tree Lab

## Files you own (this zip contains exactly these)
- `src/algorithms/waveletTree.ts`
- `src/algorithms/benchmark.ts`
- `tests/waveletTree.test.ts`
- `src/pages/WaveletLab.tsx`
- `src/components/WaveletDiagram.tsx`

## Push steps (use YOUR OWN GitHub account)
Push order matters: **Member 1 pushes first** (project skeleton). Members 2-4 pull, then push. The project only compiles once all four parts are in.
```bash
# Member 1 only, once: create an empty GitHub repo, then
git init && git branch -M main
# Members 2-4: git clone <repo-url> && cd <repo> && git pull
git config user.name "Your Name"
git config user.email "<email verified on YOUR GitHub account>"
# unzip this archive INTO the repo root (do not nest it in a folder), then:
git checkout -b feature/wavelettree
git add .
git commit -m "Add wavelet tree data structure"
git remote add origin <repo-url>   # Member 1 only
git push -u origin feature/wavelettree   # Member 1 may push main directly
```
Then open a pull request (use "Rebase and merge" or a merge commit, not squash, so your authorship stays visible).

## After all four parts are merged
```bash
npm install
npm test
npm run dev
```
Fill in your row in `docs/CONTRIBUTIONS.md` yourself, and commit only your own work.
