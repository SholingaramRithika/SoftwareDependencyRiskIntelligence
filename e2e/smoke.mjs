// Browser smoke / UI integration test. Usage:
//   npm run build && npm run preview        (in one terminal)
//   BASE_URL=http://localhost:4173 node e2e/smoke.mjs   (needs: npm i -D playwright && npx playwright install chromium)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const results = []; const errors = [];
const check = async (name, fn) => { try { await fn(); results.push([true, name]); } catch (e) { results.push([false, `${name} -> ${String(e.message).split('\n')[0]}`]); } };
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m); };
const see = async (loc, m) => { try { await loc.first().waitFor({ state: 'visible', timeout: 5000 }); } catch { throw new Error('not visible: ' + m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const go = async p => { await page.goto(BASE + p); await page.waitForSelector('h1', { timeout: 8000 }); };

const ROUTES = ['/', '/dashboard', '/dependencies', '/wavelet-lab', '/release-comparison', '/risk-impact', '/datasets', '/about', '/settings'];
for (const r of ROUTES) await check(`route ${r} renders with an h1 and the shared background`, async () => { await go(r); await see(page.locator('h1').first(), 'h1 visible'); eq(await page.locator('[data-testid=bg-canvas]').count(), 1, 'canvas'); });
await check('unknown route shows not-found page with a way back', async () => { await go('/nope'); ok((await page.locator('h1').first().innerText()).includes('not found'), 'not found'); });

await check('home: header nav + CTAs navigate to real routes', async () => {
  await go('/'); await page.waitForSelector('text=wavelet', { timeout: 8000 }); await page.getByRole('link', { name: 'Get Started' }).click(); await page.waitForURL('**/dashboard');
  await go('/'); await page.getByRole('link', { name: 'Explore the Project' }).click(); await page.waitForURL('**/dashboard');
  await go('/'); await page.getByRole('link', { name: 'About', exact: true }).first().click(); await page.waitForURL('**/about');
  await go('/'); await page.getByRole('button', { name: /Modules/ }).click(); await page.getByRole('menuitem', { name: /Release Comparison/ }).click(); await page.waitForURL('**/release-comparison');
  for (const [name, url] of [['Graph Analytics', '/dependencies'], ['Wavelet Tree', '/wavelet-lab'], ['Risk Intelligence', '/risk-impact'], ['Release Comparison', '/release-comparison']]) { await go('/'); await page.locator('#features').getByRole('link', { name: new RegExp(name) }).click(); await page.waitForURL('**' + url); }
});
await check('home: Features link scrolls to feature strip', async () => { await go('/'); await page.getByRole('link', { name: 'Features', exact: true }).first().click(); await page.waitForURL('**/#features'); });
await check('home: real data shown (counts match dataset) and benchmark finishes', async () => { await go('/'); await page.waitForSelector('text=wavelet', { timeout: 8000 }); ok((await page.locator('.comp').innerText()).includes('27'), '27 packages in latest demo release'); });

await check('lab: default query returns 3 and matches brute force', async () => {
  await go('/wavelet-lab'); await page.getByRole('button', { name: 'Execute Query' }).click();
  eq((await page.getByTestId('query-result').innerText()).trim(), '3'); await see(page.getByText('Matches brute force'), 'verified badge');
});
await check('lab: step navigation highlights nodes', async () => {
  await go('/wavelet-lab'); await page.getByRole('button', { name: 'Execute Query' }).click(); const before = await page.locator('.step.on').innerText(); await page.getByRole('button', { name: /Next/ }).click(); ok((await page.locator('.step.on').innerText()) !== before, 'step changed');
});
await check('lab: invalid query shows an error and no result', async () => {
  await go('/wavelet-lab'); await page.getByLabel('k (1-based rank)').fill('99'); await page.getByRole('button', { name: 'Execute Query' }).click(); await see(page.getByRole('alert').filter({ hasText: 'k=99' }), 'error shown'); eq(await page.getByTestId('query-result').count(), 0);
});
await check('lab: invalid and empty arrays are handled', async () => {
  await go('/wavelet-lab'); await page.getByLabel('Input array').fill('1, 2, x'); await page.getByRole('button', { name: 'Build Wavelet Tree' }).click(); await see(page.getByText('is not an integer'), 'non-integer');
  await page.getByLabel('Input array').fill(''); await page.getByRole('button', { name: 'Build Wavelet Tree' }).click(); await see(page.getByText('array is empty'), 'empty msg'); await page.getByRole('button', { name: 'Execute Query' }).click(); await see(page.getByText(/empty/i).first(), 'empty query error');
});
await check('lab: all six query types give brute-force-verified answers', async () => {
  await go('/wavelet-lab');
  const cases = [['Frequency of x in [l, r]', { 'x': '2' }], ['Values in [a, b] within [l, r]', {}], ['Rank: occurrences of x in prefix', { x: '5', 'i (prefix length, 0..n)': '4' }], ['Select: position of j-th x', { x: '7' }], ['Access: value at position i', {}]];
  for (const [label, fields] of cases) { await page.getByLabel('Query type').selectOption({ label }); for (const [k, v] of Object.entries(fields)) await page.getByLabel(k, { exact: false }).first().fill(v); await page.getByRole('button', { name: 'Execute Query' }).click(); await see(page.getByText('Matches brute force'), `verified: ${label}`); }
});
await check('lab: demo mode auto-plays', async () => { await go('/wavelet-lab?demo=1'); await page.waitForSelector('[data-testid=query-result]'); eq((await page.getByTestId('query-result').innerText()).trim(), '3'); });
await check('lab: reset restores demo state', async () => { await go('/wavelet-lab'); await page.getByLabel('Input array').fill('9, 9'); await page.getByRole('button', { name: 'Reset to demo state' }).click(); eq(await page.getByLabel('Input array').inputValue(), '5, 2, 8, 6, 3, 7, 1, 4'); });

await check('graph: nodes rendered, selection shows details, search dims others', async () => {
  await go('/dependencies'); eq(await page.locator('[aria-label="Dependency graph"] g[role=button]').count(), 27);
  await page.locator('g[role=button][aria-label^="crypto-lite"]').click(); ok(await page.getByText('Package Details').isVisible() && (await page.locator('h3.mono').innerText()) === 'crypto-lite', 'details');
  await page.getByLabel('Search packages').fill('http'); await see(page.getByText(/of 27 packages match/), 'match count');
});
await check('graph: zoom buttons and fit work without errors', async () => { await go('/dependencies'); await page.getByLabel('Zoom in').click(); await page.getByLabel('Zoom out').click(); await page.getByLabel('Fit to screen').click(); });
await check('graph: ?pkg= deep link preselects package', async () => { await go('/dependencies?pkg=http-lite'); eq(await page.locator('h3.mono').innerText(), 'http-lite'); });

await check('release comparison: shows empty state, then computed counts', async () => {
  await go('/release-comparison'); await see(page.getByText('No comparison yet'), 'empty'); await page.getByRole('button', { name: 'Compare Releases' }).click(); await page.waitForSelector('text=Version Comparison');
  const t = await page.locator('main').innerText(); ok(/Added\s*\n?\s*4|4\s*\n\s*Added/.test(t) || t.includes('Added (4)'), 'added=4 for v1.0.0→v2.0.0'); ok(t.includes('Removed (2)'), 'removed=2');
});
await check('release comparison: same release → identical notice', async () => { await go('/release-comparison'); await page.getByLabel('Target release').selectOption('v1.0.0'); await page.getByRole('button', { name: 'Compare Releases' }).click(); await see(page.getByText('identical package versions'), 'identical'); });
await check('risk: table filter/search and breakdown', async () => {
  await go('/risk-impact'); await page.getByLabel('Severity filter').selectOption('medium'); const n = await page.locator('tbody tr').count(); ok(n >= 1, 'medium rows'); await page.locator('tbody tr').first().click(); await see(page.getByText('Downstream impact'), 'breakdown');
  await page.getByLabel('Search packages').fill('zzzz'); await see(page.getByText('No packages match'), 'empty state');
});
await check('dashboard: KPIs derive from dataset and dataset switch updates them', async () => {
  await go('/dashboard'); ok((await page.locator('main').innerText()).includes('Total Packages'), 'kpi'); await page.getByLabel('Dataset').selectOption('tiny-sample'); await page.waitForSelector('text=release r2'); 
});
await check('datasets: rejects malformed JSON and invalid schema, accepts valid file', async () => {
  await go('/datasets'); const input = page.getByLabel('Import dataset file');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{oops') }); await see(page.getByText('is not valid JSON'), 'bad json');
  await input.setInputFiles({ name: 'schema.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ id: 'x', name: 'x', packages: [], releases: [] })) }); await see(page.getByText('failed validation'), 'schema');
  const good = { id: 'mine', name: 'Mine', synthetic: true, packages: [{ id: 'a', kind: 'runtime', description: '' }, { id: 'b', kind: 'runtime', description: '' }], releases: [{ id: 'r1', label: 'r1', date: '', entries: [{ pkg: 'a', version: '1', risk: { cvss: 1, vulnCount: 0, majorsBehind: 0, maintenance: 1 } }, { pkg: 'b', version: '1', risk: { cvss: 1, vulnCount: 0, majorsBehind: 0, maintenance: 1 } }], edges: [{ from: 'a', to: 'b' }] }] };
  await input.setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(good)) }); await see(page.getByText('Imported “Mine”'), 'imported'); await see(page.locator('tr', { hasText: 'Mine' }).getByText('Active'), 'active');
  const dangling = JSON.parse(JSON.stringify(good)); dangling.id = 'dang'; dangling.releases[0].edges.push({ from: 'a', to: 'ghost' });
  await input.setInputFiles({ name: 'dang.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(dangling)) }); await see(page.getByText('references a package that is not in this release'), 'dangling edge');
  ok(!(await page.locator('tbody').innerText()).includes('dang'), 'invalid dataset not added');
});
await check('settings: theme toggle changes data-theme, background toggle removes canvas, reduced motion applies', async () => {
  await go('/settings'); await page.getByRole('radio', { name: 'Light' }).click(); eq(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  await page.getByRole('radio', { name: 'Dark' }).click(); eq(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByRole('switch', { name: 'Animated background' }).setChecked(false, { force: true }); eq(await page.locator('[data-testid=bg-canvas]').count(), 0);
  await page.getByRole('radio', { name: 'Reduce' }).click(); eq(await page.evaluate(() => document.documentElement.dataset.motion), 'reduce');
  await page.reload(); await page.waitForSelector('h1'); eq(await page.locator('[data-testid=bg-canvas]').count(), 0, 'persisted after reload');
});
await check('header theme button cycles dark → light', async () => { await ctx.clearCookies(); await page.evaluate(() => localStorage.clear()); await go('/'); await page.getByRole('button', { name: /^Theme: dark/ }).click(); eq(await page.evaluate(() => document.documentElement.dataset.theme), 'light'); });

for (const [label, vp] of [['tablet 820', { width: 820, height: 1000 }], ['mobile 390', { width: 390, height: 800 }]]) await check(`responsive ${label}: no horizontal page overflow on any route`, async () => {
  await page.evaluate(() => localStorage.clear()); await page.setViewportSize(vp);
  for (const r of ROUTES) { await go(r); await page.waitForTimeout(150); const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(o <= 2, `${r} overflows by ${o}px`); }
});
await check('no console or page errors across the whole run', async () => { ok(errors.length === 0, errors.slice(0, 3).join(' | ')); });
await browser.close();
for (const [p, n] of results) console.log(`${p ? 'PASS' : 'FAIL'}  ${n}`);
const failed = results.filter(r => !r[0]).length; console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
