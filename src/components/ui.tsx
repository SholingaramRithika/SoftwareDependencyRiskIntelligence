import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import type { Severity } from '../data/types.ts';

export const SEV_COLOR: Record<Severity, string> = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#22C55E' };
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PATHS: Record<string, string> = {
  logo: 'M4 17 L10 6 L15 14 L21 4', graph: 'M12 5v4M12 9l-5 6M12 9l5 6M12 4m-2 0a2 2 0 104 0a2 2 0 10-4 0M7 17m-2 0a2 2 0 104 0a2 2 0 10-4 0M17 17m-2 0a2 2 0 104 0a2 2 0 10-4 0',
  tree: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5', shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5', chart: 'M5 20V10 M12 20V4 M19 20v-7',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', db: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6 M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6',
  info: 'M12 8h.01 M11 12h1v5h1 M12 3a9 9 0 100 18 9 9 0 000-18z', gear: 'M12 9a3 3 0 100 6 3 3 0 000-6z M19 12l2-1-2-4-2 .8-1.5-1.1L15 4h-4l-.5 2.7L9 7.8 7 7l-2 4 2 1-.0 .0L5 13l2 4 2-.8 1.5 1.1L11 20h4l.5-2.7 1.5-1.1 2 .8 2-4z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5', arrow: 'M5 12h14 M13 6l6 6-6 6',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', swap: 'M4 8h14 M14 4l4 4-4 4 M20 16H6 M10 12l-4 4 4 4', warn: 'M12 3l10 18H2z M12 10v5 M12 18h.01', play: 'M8 5v14l11-7z', box: 'M12 3l8 4v10l-8 4-8-4V7z M4 7l8 4 8-4 M12 11v10',
};
export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name] ?? PATHS.box} /></svg>;
}
export function LogoMark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00D9FF" /><stop offset="1" stopColor="#3B82F6" /></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="rgba(0,217,255,.12)" stroke="url(#lg)" strokeWidth="1.5" /><path d="M7 20 L12 10 L17 18 L25 8" fill="none" stroke="url(#lg)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Panel({ children, variant = '', className = '', hover = false, flush = false, ...rest }: { children: ReactNode; variant?: 'primary' | 'subtle' | ''; className?: string; hover?: boolean; flush?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass ${variant} ${hover ? 'hover' : ''} ${flush ? 'flush' : ''} ${className}`} {...rest}>{children}</div>;
}
export function PanelTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return <div className="panel-title"><div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>{right}</div>;
}
export function PageHead({ icon, title, sub, children }: { icon: string; title: string; sub: string; children?: ReactNode }) {
  return <div className="page-head"><div className="ico"><Icon name={icon} size={26} /></div><div className="grow"><h1>{title}</h1><div className="muted">{sub}</div></div>{children}</div>;
}
export function Metric({ icon, tone, value, label, sub }: { icon: string; tone: 'cyan' | 'blue' | 'red' | 'amber' | 'green' | 'violet'; value: ReactNode; label: string; sub?: ReactNode }) {
  return <Panel hover className="metric"><div className={`ico ${tone}`}><Icon name={icon} size={24} /></div><div><div className="v">{value}</div><div className="l">{label}</div>{sub && <div className="tiny muted">{sub}</div>}</div></Panel>;
}
export function Badge({ kind, children }: { kind: string; children?: ReactNode }) { return <span className={`badge ${kind}`}>{children ?? cap(kind)}</span>; }
export const SyntheticBadge = () => <span className="badge synthetic tip" tabIndex={0} data-tip="Package names and risk inputs are invented for demonstration. Nothing here is a verified vulnerability.">Synthetic demo data</span>;
export function Spinner({ label = 'Loading…' }: { label?: string }) { return <span role="status"><span className="spinner" /> <span className="muted small">{label}</span></span>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><strong style={{ color: 'var(--text)' }}>{title}</strong><div className="small">{children}</div></div>; }
export function ErrorBox({ title = 'Something went wrong', children }: { title?: string; children?: ReactNode }) { return <div className="errbox" role="alert"><strong>{title}</strong><div className="small">{children}</div></div>; }
export function Tip({ text, children }: { text: string; children: ReactNode }) { return <span className="tip" tabIndex={0} data-tip={text}>{children}</span>; }
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { if (!open) return; const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [open, onClose]);
  if (!open) return null;
  return <div className="overlay" onClick={onClose}><div className="glass primary dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><h3 style={{ marginBottom: 10 }}>{title}</h3>{children}</div></div>;
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <span className="switch"><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} /><i /></span>;
}
export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return <div className="table-wrap"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty}</div>;
}
