import { SEV_COLOR } from './ui.tsx';

export interface Seg { label: string; value: number; color: string }
export function Donut({ segments, center, sub, size = 150 }: { segments: Seg[]; center: string; sub?: string; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0), R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`${center} ${sub ?? ''}: ${segments.map(s => `${s.label} ${s.value}`).join(', ')}`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="16" />
      {total > 0 && segments.filter(s => s.value > 0).map(s => { const len = (s.value / total) * C; const el = <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />; off += len; return el; })}
      <text x="70" y="70" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text)">{center}</text>
      {sub && <text x="70" y="88" textAnchor="middle" fontSize="10" fill="var(--text2)">{sub}</text>}
    </svg>
  );
}
export const sevSegments = (c: Record<'critical' | 'high' | 'medium' | 'low', number>): Seg[] => (['critical', 'high', 'medium', 'low'] as const).map(k => ({ label: k[0].toUpperCase() + k.slice(1), value: c[k], color: SEV_COLOR[k] }));
export function Legend({ segments }: { segments: Seg[] }) { return <div className="legend">{segments.map(s => <div key={s.label}><i style={{ background: s.color }} />{s.label}<b>{s.value}</b></div>)}</div>; }

export function Bars({ items, height = 150 }: { items: Seg[]; height?: number }) {
  const max = Math.max(1, ...items.map(i => i.value)), w = 100 / items.length;
  return (
    <svg viewBox={`0 0 300 ${height}`} width="100%" role="img" aria-label={items.map(i => `${i.label} ${i.value}`).join(', ')}>
      {items.map((it, i) => { const bh = (it.value / max) * (height - 44); const x = (i * 300) / items.length + 300 / items.length / 2; return (
        <g key={it.label}><rect x={x - 17} y={height - 24 - bh} width="34" height={Math.max(bh, 1)} rx="5" fill={it.color} opacity=".9" /><text x={x} y={height - 28 - bh} textAnchor="middle" fontSize="11" fill="var(--text)">{it.value}</text><text x={x} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text2)">{it.label}</text></g>); })}
      <line x1="0" x2="300" y1={height - 24} y2={height - 24} stroke="rgba(148,163,184,.3)" />{w < 0 && null}
    </svg>
  );
}
export function GroupedBars({ groups, series, height = 170 }: { groups: string[]; series: { name: string; color: string; values: number[] }[]; height?: number }) {
  const max = Math.max(1, ...series.flatMap(s => s.values)), gw = 300 / groups.length, bw = Math.min(18, (gw - 10) / series.length);
  return (
    <div>
      <svg viewBox={`0 0 300 ${height}`} width="100%" role="img" aria-label="Grouped bar chart">
        {groups.map((g, gi) => <g key={g}>{series.map((s, si) => { const bh = (s.values[gi] / max) * (height - 44); const x = gi * gw + gw / 2 + (si - (series.length - 1) / 2) * (bw + 3) - bw / 2; return <g key={s.name}><rect x={x} y={height - 24 - bh} width={bw} height={Math.max(bh, 1)} rx="4" fill={s.color} /><text x={x + bw / 2} y={height - 27 - bh} textAnchor="middle" fontSize="9.5" fill="var(--text)">{s.values[gi]}</text></g>; })}<text x={gi * gw + gw / 2} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text2)">{g}</text></g>)}
        <line x1="0" x2="300" y1={height - 24} y2={height - 24} stroke="rgba(148,163,184,.3)" />
      </svg>
      <div className="row small muted" style={{ justifyContent: 'center' }}>{series.map(s => <span key={s.name}><i style={{ background: s.color, display: 'inline-block', width: 10, height: 10, borderRadius: 3, marginRight: 5 }} />{s.name}</span>)}</div>
    </div>
  );
}
export function LineChart({ labels, series, height = 170, yMax }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number; yMax?: number }) {
  const W = 320, L = 28, B = 24, T = 10, max = yMax ?? Math.max(1, ...series.flatMap(s => s.values));
  const X = (i: number) => L + (labels.length === 1 ? (W - L) / 2 : (i * (W - L - 10)) / (labels.length - 1)), Y = (v: number) => T + (1 - v / max) * (height - T - B);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={`Line chart: ${series.map(s => s.name).join(', ')} across ${labels.join(', ')}`}>
        {[0, .5, 1].map(f => <g key={f}><line x1={L} x2={W} y1={Y(max * f)} y2={Y(max * f)} stroke="rgba(148,163,184,.2)" /><text x={L - 4} y={Y(max * f) + 3} textAnchor="end" fontSize="9" fill="var(--text2)">{Math.round(max * f)}</text></g>)}
        {series.map(s => <g key={s.name}><polyline fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />{s.values.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="3.2" fill={s.color}><title>{`${s.name} @ ${labels[i]}: ${v}`}</title></circle>)}</g>)}
        {labels.map((l, i) => <text key={l} x={X(i)} y={height - 8} textAnchor="middle" fontSize="9.5" fill="var(--text2)">{l}</text>)}
      </svg>
      <div className="row small muted" style={{ justifyContent: 'center' }}>{series.map(s => <span key={s.name}><i style={{ background: s.color, display: 'inline-block', width: 10, height: 3, borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />{s.name}</span>)}</div>
    </div>
  );
}
