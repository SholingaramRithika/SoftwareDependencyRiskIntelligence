import { useEffect, useRef } from 'react';
import { useApp } from '../state/AppState.tsx';

/** Shared animated background: drifting particles, connecting lines, glowing nodes and flowing wave trails.
 *  Particle count scales with screen area (capped), pauses when the tab is hidden, and renders a single still frame in reduced-motion mode. */
export default function Background() {
  const { settings } = useApp();
  const ref = useRef<HTMLCanvasElement>(null);
  const on = settings.background;
  useEffect(() => {
    const canvas = ref.current; if (!on || !canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const reduce = () => document.documentElement.dataset.motion === 'reduce';
    let w = 0, h = 0, raf = 0, t = 0, mx = 0, my = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    type P = { x: number; y: number; vx: number; vy: number; r: number; z: number; hue: 0 | 1 | 2 | 3 };
    let ps: P[] = [];
    const seed = () => {
      const n = Math.min(90, Math.max(28, Math.floor((w * h) / 22000)));
      ps = Array.from({ length: n }, () => { const q = Math.random(); return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: 1 + Math.random() * 1.8, z: .3 + Math.random() * .9, hue: (q > .96 ? 3 : q > .9 ? 2 : q > .55 ? 1 : 0) as P['hue'] }; });
    };
    const resize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed(); };
    const rgb = () => getComputedStyle(document.documentElement).getPropertyValue('--particle').trim() || '0,217,255';
    const rgb2 = () => getComputedStyle(document.documentElement).getPropertyValue('--particle2').trim() || '59,130,246';
    const draw = () => {
      const c1 = rgb(), c2 = rgb2();
      ctx.clearRect(0, 0, w, h);
      // flowing wave trails
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 14) {
          const y = h * (.55 + k * .12) + Math.sin(x / (180 + k * 60) + t * (.5 + k * .15) + k) * (26 + k * 12) + Math.sin(x / 70 - t * .8) * 6;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, `rgba(${c2},0)`); g.addColorStop(.5, `rgba(${k === 1 ? '124,58,237' : c1},.22)`); g.addColorStop(1, `rgba(${c2},0)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke();
      }
      const ox = mx * 14, oy = my * 10; // parallax
      const pos = ps.map(p => ({ x: p.x + ox * p.z, y: p.y + oy * p.z }));
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y, d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) { ctx.strokeStyle = `rgba(${c1},${(1 - Math.sqrt(d2) / 130) * .22})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[j].x, pos[j].y); ctx.stroke(); }
      }
      ps.forEach((p, i) => {
        const col = p.hue === 3 ? '245,158,11' : p.hue === 2 ? '124,58,237' : p.hue === 1 ? c2 : c1;
        const g = ctx.createRadialGradient(pos[i].x, pos[i].y, 0, pos[i].x, pos[i].y, p.r * 5);
        g.addColorStop(0, `rgba(${col},.85)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, p.r * 5, 0, 7); ctx.fill();
      });
    };
    const tick = () => {
      if (!document.hidden) {
        t += .016;
        for (const p of ps) { p.x += p.vx; p.y += p.vy; if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20; if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20; }
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => { mx = e.clientX / w - .5; my = e.clientY / h - .5; };
    resize(); window.addEventListener('resize', resize); window.addEventListener('pointermove', onMove, { passive: true });
    if (reduce()) draw(); else raf = requestAnimationFrame(tick);
    const obs = new MutationObserver(() => { cancelAnimationFrame(raf); if (reduce()) draw(); else raf = requestAnimationFrame(tick); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-theme'] });
    return () => { cancelAnimationFrame(raf); obs.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); };
  }, [on]);
  return (<>
    <div className="bg-fallback" aria-hidden="true" />
    {on && <canvas ref={ref} className="bg-canvas" aria-hidden="true" data-testid="bg-canvas" />}
    <div className="bg-vignette" aria-hidden="true" />
  </>);
}
