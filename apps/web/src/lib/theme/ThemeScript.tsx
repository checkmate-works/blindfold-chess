import { headers } from 'next/headers';

import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from './constants';

// Inline bootstrap script that applies the saved (or system) theme class on
// <html> before first paint, preventing a flash of incorrect theme.
//
// Using `application/ld+json`-style non-JS type is NOT an option because the
// script must actually execute. Keeping the element strictly in the server
// tree is what makes this safe.
//
// The script carries the per-request CSP nonce (set on the request by
// `src/proxy.ts`) so it passes the `'strict-dynamic'` + nonce script-src
// directive without needing `'unsafe-inline'`.
//
// This is intentionally a Server Component. The <script> must be present in
// the SSR'd HTML so the browser executes it synchronously while parsing
// <head> — before first paint and before any client JS runs. A Client
// Component cannot satisfy that constraint.
//
// Why this is safe under React 19 (verified against react-dom@19.2.5):
// `react-dom-client.development.js:23070-23204` — every "Cannot render a
// <script>" warning path is gated on
// `outsideHostContainerContext = !hostContext.ancestorInfo.containerTagInScope`.
// `react-dom-client.development.js:2376-2379` — entering <head> SETS
// `containerTagInScope`, so descendants of <head> have
// `outsideHostContainerContext === false` and the warning is unreachable.
// `grep` confirms zero hits for the original warning text and helper
// `isScriptDataBlock` in the installed react / react-dom packages.
//
// DO NOT add `'use client'` plus a `typeof window === 'undefined'` guard.
// That pattern returns `null` on the client while the server emits a
// <script>, causing a positional hydration mismatch on <head> siblings
// (JsonLd etc.) — every sibling after this one shifts by one slot. See git
// history for `0f1d2dd8` for the regression.
const SCRIPT = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=s==='${THEME_LIGHT_CLASS}'||s==='${THEME_DARK_CLASS}'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'${THEME_DARK_CLASS}':'${THEME_LIGHT_CLASS}');d.classList.remove('${THEME_LIGHT_CLASS}','${THEME_DARK_CLASS}');d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  );
}
