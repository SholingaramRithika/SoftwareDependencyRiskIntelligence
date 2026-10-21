import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from '../router.tsx';
import { ROUTES } from '../routes.ts';
import { useApp } from '../state/AppState.tsx';
import Background from './Background.tsx';
import { Icon, LogoMark } from './ui.tsx';

const SIDE_ICON: Record<string, string> = { '/dashboard': 'home', '/dependencies': 'graph', '/wavelet-lab': 'tree', '/release-comparison': 'swap', '/risk-impact': 'shield', '/datasets': 'db', '/about': 'info', '/settings': 'gear' };

export default function Layout({ children, internal }: { children: ReactNode; internal: boolean }) {
  const loc = useLocation();
  const { settings, setSettings } = useApp();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(false); }, [loc.path, loc.hash]);
  useEffect(() => { // scroll to #anchor, or to top on a new page
    if (loc.hash) { const el = document.getElementById(loc.hash.slice(1)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } }
    window.scrollTo(0, 0);
  }, [loc.path, loc.hash]);
  useEffect(() => { const f = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  const modules = ROUTES.filter(r => r.module);
  const nextTheme = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
  const active = (p: string) => (loc.path === p && !loc.hash ? 'active' : '');
  return (
    <div className="app">
      <Background />
      <a className="skip" href="#content">Skip to content</a>
      <header className="header">
        <Link to="/" className="logo" aria-label="WaveletScope home"><LogoMark /><span>Wavelet<b>Scope</b></span></Link>
        <nav className="nav" aria-label="Primary">
          <Link to="/" className={active('/')}>Home</Link>
          <Link to="/#features" className={loc.path === '/' && loc.hash === '#features' ? 'active' : ''}>Features</Link>
          <div className="menu" ref={menuRef}>
            <button className="navbtn" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(m => !m)}>Modules ▾</button>
            {menu && <div className="menu-pop" role="menu">{modules.map(m => <Link key={m.path} to={m.path} role="menuitem"><strong>{m.title}</strong><small>{m.blurb}</small></Link>)}</div>}
          </div>
          <Link to="/about" className={active('/about')}>About</Link>
        </nav>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => setSettings({ theme: nextTheme })} aria-label={`Theme: ${settings.theme}. Switch to ${nextTheme}`} title={`Theme: ${settings.theme} → ${nextTheme}`}><Icon name="sun" size={18} /></button>
        <Link to="/dashboard" className="btn primary getstarted">Get Started <Icon name="arrow" size={16} /></Link>
      </header>
      <div className="body">
        {internal && (
          <aside className="sidebar" aria-label="Modules">
            <h4>Modules</h4>
            {ROUTES.filter(r => r.path !== '/').map(r => <Link key={r.path} to={r.path} className={active(r.path)}><Icon name={SIDE_ICON[r.path] ?? 'box'} size={18} />{r.title}</Link>)}
          </aside>
        )}
        <main id="content" className={internal ? 'main' : ''} style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
      <footer className="footer">WaveletScope · DSA case study · All bundled data is synthetic demonstration data unless you import your own.</footer>
    </div>
  );
}
