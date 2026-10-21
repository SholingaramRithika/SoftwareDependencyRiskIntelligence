import { useMemo } from 'react';
import type { WaveletNode, WaveletTree } from '../algorithms/waveletTree.ts';

interface Props {
  tree: WaveletTree; visited?: Set<string>; active?: string | null; selected?: string | null;
  onSelect?: (path: string) => void; maxDepth?: number; compact?: boolean; showBits?: boolean;
}
const bitText = (n: WaveletNode, max = 12) => { if (!n.bits.length) return `×${n.size}`; const s = [...n.bits.slice(0, max)].join(''); return n.bits.length > max ? s + '…' : s; };

/** Draws only non-empty nodes of the real tree. Edge labels 0/1 are the bit values that route elements. */
export default function WaveletDiagram({ tree, visited, active, selected, onSelect, maxDepth = 99, compact = false, showBits = true }: Props) {
  const lay = useMemo(() => {
    const pos = new Map<string, { x: number; d: number; n: WaveletNode }>(); let slot = 0;
    const walk = (n: WaveletNode, d: number) => {
      const kids = d >= maxDepth - 1 ? [] : ([n.left, n.right].filter(Boolean) as WaveletNode[]);
      if (!kids.length) { pos.set(n.path, { x: slot++, d, n }); return; }
      kids.forEach(k => walk(k, d + 1));
      const xs = kids.map(k => pos.get(k.path)!.x); pos.set(n.path, { x: (Math.min(...xs) + Math.max(...xs)) / 2, d, n });
    };
    if (tree.root) walk(tree.root, 0);
    return { pos, slots: slot, depth: Math.max(0, ...[...pos.values()].map(p => p.d)) + 1 };
  }, [tree, maxDepth]);
  if (!tree.root) return <div className="empty">No tree built yet.</div>;
  const BW = compact ? 70 : 98, BH = compact ? 34 : (showBits ? 50 : 36), GX = compact ? 12 : 16, GY = compact ? 34 : 40;
  const W = lay.slots * (BW + GX) + GX, H = lay.depth * (BH + GY) + 10;
  const cx = (x: number) => GX + x * (BW + GX) + BW / 2, cy = (d: number) => 6 + d * (BH + GY);
  const edges: JSX.Element[] = [];
  for (const [path, p] of lay.pos) for (const [c, bit] of [['L', '0'], ['R', '1']] as const) {
    const ch = lay.pos.get(path + c); if (!ch) continue;
    const used = visited?.has(path) && visited?.has(path + c);
    edges.push(<g key={path + c}><path d={`M${cx(p.x)} ${cy(p.d) + BH} C${cx(p.x)} ${cy(p.d) + BH + 18}, ${cx(ch.x)} ${cy(ch.d) - 18}, ${cx(ch.x)} ${cy(ch.d)}`} fill="none" stroke={used ? '#F59E0B' : c === 'L' ? '#22D3EE' : '#A78BFA'} strokeWidth={used ? 3 : 1.6} opacity={used ? 1 : .65} />{!compact && <text x={(cx(p.x) + cx(ch.x)) / 2 + (c === 'L' ? -9 : 9)} y={cy(p.d) + BH + 20} fontSize="10" fill="var(--text2)" textAnchor="middle">{bit}</text>}</g>);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wavelet tree diagram" style={{ display: 'block', margin: '0 auto', maxWidth: compact ? '100%' : undefined }}>
      {edges}
      {[...lay.pos.entries()].map(([path, { x, d, n }]) => {
        const isActive = active === path, isVisited = visited?.has(path), isSel = selected === path, right = path.includes('R');
        const stroke = isActive ? '#F59E0B' : isSel ? '#F1F5F9' : isVisited ? '#00D9FF' : right ? '#7C3AED' : '#3B82F6';
        const leaf = n.lo === n.hi;
        return (
          <g key={path} transform={`translate(${cx(x) - BW / 2},${cy(d)})`} onClick={() => onSelect?.(path)} style={{ cursor: onSelect ? 'pointer' : 'default' }} tabIndex={onSelect ? 0 : undefined} onKeyDown={e => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(path); } }} role={onSelect ? 'button' : undefined} aria-label={`Node [${n.lo}, ${n.hi}] with ${n.size} elements`}>
            <rect width={BW} height={BH} rx={compact ? 17 : 12} fill={isActive ? 'rgba(245,158,11,.22)' : isVisited ? 'rgba(0,217,255,.18)' : 'rgba(11,22,41,.85)'} stroke={stroke} strokeWidth={isActive || isSel ? 2.6 : 1.6} style={{ filter: isActive ? 'drop-shadow(0 0 8px #F59E0B)' : isVisited ? 'drop-shadow(0 0 6px #00D9FF)' : undefined }} />
            <text x={BW / 2} y={compact ? BH / 2 + 4 : 19} textAnchor="middle" fontSize={compact ? 10.5 : 12} fontWeight="600" fill="#F1F5F9">{leaf ? `[${n.lo}]` : `[${n.lo}, ${n.hi}]`}</text>
            {!compact && showBits && <text x={BW / 2} y={38} textAnchor="middle" fontSize="10.5" fill={leaf ? '#A8B5C9' : '#67E8F9'} className="mono" style={{ letterSpacing: '.08em' }}>{bitText(n)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
