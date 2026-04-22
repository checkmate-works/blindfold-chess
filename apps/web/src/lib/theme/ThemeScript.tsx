import { headers } from 'next/headers';

import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from './constants';

// Inline bootstrap script that applies the saved (or system) theme class on
// <html> before first paint, preventing a flash of incorrect theme. Rendered
// as a Server Component so it only enters the React tree during SSR and is
// hydrated (not re-created) on the client. This avoids the React 19
// "Encountered a script tag while rendering" warning that was triggered by
// next-themes' client-rendered <script>.
//
// Using `application/ld+json`-style non-JS type is NOT an option because the
// script must actually execute. Keeping the element strictly in the server
// tree is what makes this safe.
//
// The script carries the per-request CSP nonce (set on the request by
// `src/proxy.ts`) so it passes the `'strict-dynamic'` + nonce script-src
// directive without needing `'unsafe-inline'`.
const SCRIPT = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='${THEME_LIGHT_CLASS}'||s==='${THEME_DARK_CLASS}'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'${THEME_DARK_CLASS}':'${THEME_LIGHT_CLASS}');d.classList.remove('${THEME_LIGHT_CLASS}','${THEME_DARK_CLASS}');d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  );
}
