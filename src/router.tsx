import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** Minimal History-API router (no external dependency). */
export function navigate(to: string, replace = false) {
  if (replace) history.replaceState({}, '', to); else history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export interface Loc { path: string; search: URLSearchParams; hash: string }
const read = (): Loc => ({ path: window.location.pathname.replace(/\/+$/, '') || '/', search: new URLSearchParams(window.location.search), hash: window.location.hash });
export function useLocation(): Loc {
  const [loc, setLoc] = useState<Loc>(read);
  useEffect(() => { const f = () => setLoc(read()); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  return loc;
}
export function Link({ to, onClick, children, ...rest }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); navigate(to);
  };
  return <a href={to} onClick={handle} {...rest}>{children}</a>;
}
