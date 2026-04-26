'use client';

import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from './constants';

// Inline bootstrap script that applies the saved (or system) theme class on
// <html> before first paint, preventing a flash of incorrect theme.
//
// Why a Client Component with a server-only render guard:
// React 19 warns "Encountered a script tag while rendering" whenever a
// <script> element is part of the React tree on the client — this includes
// client-side reconciliation of an RSC payload during in-app navigation
// (e.g. switching locales). Rendering the script unconditionally from a
// Server Component still produces the warning because the serialized RSC
// output is reconciled on the client.
//
// Marking this file `"use client"` and gating the <script> on
// `typeof window === 'undefined'` produces the script element during SSR
// only. The browser receives the inline <script> in <head> and executes it
// before first paint (no FOUC). On hydration and any subsequent client
// re-render, the component returns null, so React never sees a <script>
// element in its tree on the client and the warning is suppressed.
//
// The <script> remains in the live DOM after hydration because <head>
// children rendered server-side are preserved by React's hydration rules
// (the parent <html> uses suppressHydrationWarning); the difference between
// the SSR'd tree and the client's null is intentional and benign for this
// non-interactive node.
const SCRIPT = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='${THEME_LIGHT_CLASS}'||s==='${THEME_DARK_CLASS}'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'${THEME_DARK_CLASS}':'${THEME_LIGHT_CLASS}');d.classList.remove('${THEME_LIGHT_CLASS}','${THEME_DARK_CLASS}');d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;

export function ThemeScript() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
