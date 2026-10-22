import type { Dataset, Edge, PackageKind, ReleaseEntry } from './types.ts';

/**
 * SYNTHETIC demonstration data. Every package name, version and risk input below is invented
 * for demonstration; none of it describes a real library or a verified vulnerability.
 * Row format: id|kind|description|rel1|rel2|rel3, each release = version:cvss:vulns:majorsBehind:maintenance ("-" = absent).
 */
const ROWS = `
acme-app|runtime|Root application under analysis|1.0.0:0:0:0:1|1.5.0:0:0:0:1|2.0.0:0:0:0:1
pixel-ui|runtime|Component library|3.1.0:4.3:1:1:.7|3.2.0:4.3:1:0:.8|3.4.0:0:0:0:.9
datagrid|runtime|Virtualised data grid|2.0.1:7.5:2:2:.5|2.1.0:7.5:2:1:.5|3.0.0:5.3:1:0:.6
router-lite|runtime|Client-side router|1.8.0:0:0:0:.9|1.9.2:0:0:0:.9|2.0.0:0:0:0:.9
state-kit|runtime|State management|4.0.0:3.1:1:0:.8|4.1.0:3.1:1:0:.8|4.2.0:0:0:0:.9
http-lite|runtime|HTTP client|0.9.4:9.1:3:3:.3|1.0.2:9.1:2:2:.4|1.2.0:6.5:1:0:.7
auth-guard|runtime|Authentication middleware|2.2.0:8.2:2:1:.6|2.3.0:5.3:1:0:.7|3.0.0:0:0:0:.9
i18n-core|runtime|Internationalisation helpers|5.0.0:0:0:0:.9|5.1.0:0:0:0:.9|5.2.0:0:0:0:.9
form-forge|runtime|Form builder|-|1.0.0:6.1:1:0:.6|1.1.0:6.1:1:0:.6
chart-kit|runtime|Charting widgets|-|-|0.8.0:3.7:1:0:.7
md-render|runtime|Markdown renderer|1.4.0:7.4:2:2:.4|1.4.3:7.4:2:2:.4|-
cache-layer|runtime|Caching layer|-|0.5.0:5.9:1:1:.5|0.6.0:5.9:1:0:.6
telemetry-opt|optional|Usage telemetry (optional)|-|-|0.3.0:2.5:1:0:.6
retry-util|runtime|Retry helper|1.1.0:0:0:0:.8|1.1.0:0:0:0:.8|1.2.0:0:0:0:.8
crypto-lite|runtime|Crypto primitives|2.4.0:9.8:4:3:.3|2.3.9:9.8:4:3:.3|2.6.0:5.5:1:0:.8
tls-shim|runtime|TLS wrapper|1.0.0:8.1:2:2:.4|1.0.1:8.1:2:2:.4|1.1.0:4.2:1:0:.6
test-runner|development|Test runner|6.0.0:0:0:0:.9|6.1.0:0:0:0:.9|7.0.0:0:0:0:.9
mock-server|development|API mocking|0.7.0:5.0:1:1:.5|0.7.1:5.0:1:1:.5|-
lint-rules|development|Lint rules|3.2.0:0:0:0:.9|3.3.0:0:0:0:.9|3.3.1:0:0:0:.9
bundle-pack|development|Bundler|5.4.0:4.0:1:1:.8|5.5.0:0:0:0:.9|5.6.0:0:0:0:.9
type-gen|development|Type generator|1.2.0:0:0:0:.7|1.3.0:0:0:0:.7|1.3.0:0:0:0:.7
stream-utils|runtime|Stream helpers|2.0.0:6.8:1:2:.5|2.0.0:6.8:1:2:.5|2.1.0:0:0:0:.7
event-bus|runtime|Event emitter|1.0.0:0:0:0:.9|1.0.0:0:0:0:.9|1.0.1:0:0:0:.9
uuid-gen|runtime|ID generation|9.0.0:0:0:0:.9|9.0.0:0:0:0:.9|9.0.0:0:0:0:.9
date-wiz|runtime|Date utilities|2.1.0:3.3:1:1:.6|2.2.0:0:0:0:.7|2.2.0:0:0:0:.7
schema-check|runtime|Schema validator|7.0.0:0:0:0:.9|7.1.0:0:0:0:.9|7.2.0:0:0:0:.9
logger-x|runtime|Logger|1.3.0:0:0:0:.8|1.3.0:0:0:0:.8|1.4.0:0:0:0:.8
view-core|peer|View library (peer dependency)|18.0.0:0:0:0:1|18.2.0:0:0:0:1|19.0.0:0:0:0:1
gzip-fast|optional|Compression (optional)|0.4.0:5.5:1:1:.4|0.4.0:5.5:1:1:.4|0.5.0:0:0:0:.6
`;

// Edges are written "from>to"; "from depends on to".
const E_V1 = `
acme-app>pixel-ui acme-app>datagrid acme-app>router-lite acme-app>state-kit acme-app>http-lite acme-app>auth-guard
acme-app>i18n-core acme-app>logger-x acme-app>test-runner acme-app>lint-rules acme-app>bundle-pack acme-app>type-gen acme-app>view-core
pixel-ui>view-core pixel-ui>event-bus pixel-ui>date-wiz
datagrid>pixel-ui datagrid>state-kit datagrid>stream-utils
router-lite>view-core router-lite>event-bus
state-kit>event-bus
http-lite>retry-util http-lite>tls-shim http-lite>logger-x http-lite>gzip-fast
auth-guard>crypto-lite auth-guard>http-lite auth-guard>uuid-gen auth-guard>schema-check
i18n-core>date-wiz i18n-core>md-render
md-render>logger-x
retry-util>event-bus
tls-shim>crypto-lite
test-runner>mock-server test-runner>logger-x
mock-server>http-lite
lint-rules>schema-check
bundle-pack>gzip-fast
type-gen>schema-check
stream-utils>event-bus
`;
const E_ADD15 = `
acme-app>form-forge form-forge>schema-check form-forge>pixel-ui form-forge>state-kit
state-kit>cache-layer cache-layer>logger-x cache-layer>crypto-lite
`;
const E_ADD20 = `
acme-app>chart-kit chart-kit>pixel-ui chart-kit>date-wiz chart-kit>stream-utils
acme-app>telemetry-opt telemetry-opt>http-lite telemetry-opt>uuid-gen
`;
const E_REMOVE20 = `i18n-core>md-render md-render>logger-x test-runner>mock-server mock-server>http-lite`;

const parseEdges = (s: string): Edge[] => s.trim().split(/\s+/).filter(Boolean).map(t => { const [from, to] = t.split('>'); return { from, to }; });
const key = (e: Edge) => `${e.from}>${e.to}`;

function build(): Dataset {
  const rows = ROWS.trim().split('\n').map(l => l.split('|'));
  const packages = rows.map(([id, kind, description]) => ({ id, kind: kind as PackageKind, description }));
  const entriesFor = (ri: number): ReleaseEntry[] => rows.flatMap(r => {
    const cell = r[3 + ri];
    if (cell === '-') return [];
    const [version, cvss, vulnCount, majorsBehind, maintenance] = cell.split(':');
    return [{ pkg: r[0], version, risk: { cvss: Number(cvss), vulnCount: Number(vulnCount), majorsBehind: Number(majorsBehind), maintenance: Number(maintenance) } }];
  });
  const e1 = parseEdges(E_V1);
  const e2 = [...e1, ...parseEdges(E_ADD15)];
  const rem = new Set(parseEdges(E_REMOVE20).map(key));
  const e3 = [...e2, ...parseEdges(E_ADD20)].filter(e => !rem.has(key(e)));
  return {
    id: 'demo-dataset', name: 'Demo dataset (synthetic)', synthetic: true,
    description: 'Invented packages and risk inputs for demonstration only. No entry describes a real library or a verified vulnerability.',
    packages,
    releases: [
      { id: 'v1.0.0', label: 'v1.0.0', date: '2026-01-15', entries: entriesFor(0), edges: e1 },
      { id: 'v1.5.0', label: 'v1.5.0', date: '2026-05-02', entries: entriesFor(1), edges: e2 },
      { id: 'v2.0.0', label: 'v2.0.0', date: '2026-09-10', entries: entriesFor(2), edges: e3 },
    ],
  };
}
export const DEMO_DATASET: Dataset = build();

/** A very small second dataset, handy for quick live demonstrations and for showing dataset switching. */
export const TINY_DATASET: Dataset = {
  id: 'tiny-sample', name: 'Tiny sample (synthetic)', synthetic: true,
  description: 'Six invented packages across two releases; useful for a fast walkthrough.',
  packages: [
    { id: 'app', kind: 'runtime', description: 'Root' }, { id: 'lib-a', kind: 'runtime', description: 'Library A' },
    { id: 'lib-b', kind: 'runtime', description: 'Library B' }, { id: 'lib-c', kind: 'development', description: 'Library C' },
    { id: 'lib-d', kind: 'optional', description: 'Library D' }, { id: 'lib-e', kind: 'peer', description: 'Library E' },
  ],
  releases: [
    { id: 'r1', label: 'r1', date: '2026-02-01', entries: [
      { pkg: 'app', version: '1.0.0', risk: { cvss: 0, vulnCount: 0, majorsBehind: 0, maintenance: 1 } },
      { pkg: 'lib-a', version: '1.0.0', risk: { cvss: 9, vulnCount: 3, majorsBehind: 2, maintenance: 0.4 } },
      { pkg: 'lib-b', version: '2.1.0', risk: { cvss: 5, vulnCount: 1, majorsBehind: 1, maintenance: 0.6 } },
      { pkg: 'lib-c', version: '0.3.0', risk: { cvss: 2, vulnCount: 0, majorsBehind: 0, maintenance: 0.9 } },
    ], edges: [{ from: 'app', to: 'lib-a' }, { from: 'app', to: 'lib-b' }, { from: 'lib-b', to: 'lib-c' }] },
    { id: 'r2', label: 'r2', date: '2026-06-01', entries: [
      { pkg: 'app', version: '1.1.0', risk: { cvss: 0, vulnCount: 0, majorsBehind: 0, maintenance: 1 } },
      { pkg: 'lib-a', version: '1.2.0', risk: { cvss: 4, vulnCount: 1, majorsBehind: 0, maintenance: 0.7 } },
      { pkg: 'lib-b', version: '2.1.0', risk: { cvss: 5, vulnCount: 1, majorsBehind: 1, maintenance: 0.6 } },
      { pkg: 'lib-d', version: '0.1.0', risk: { cvss: 0, vulnCount: 0, majorsBehind: 0, maintenance: 0.8 } },
      { pkg: 'lib-e', version: '18.0.0', risk: { cvss: 0, vulnCount: 0, majorsBehind: 0, maintenance: 1 } },
    ], edges: [{ from: 'app', to: 'lib-a' }, { from: 'app', to: 'lib-b' }, { from: 'app', to: 'lib-d' }, { from: 'app', to: 'lib-e' }] },
  ],
};
export const BUILTIN_DATASETS: Dataset[] = [DEMO_DATASET, TINY_DATASET];
