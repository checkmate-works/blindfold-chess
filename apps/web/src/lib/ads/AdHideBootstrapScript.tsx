import { ADS_HIDDEN_COOKIE_NAME } from './ads-hidden-cookie';

// No-flash ad-hide bootstrap. Reads the `bfc_ads_hidden` cookie and, when
// set to `'1'`, flags `<html data-ads-hidden="true">` so the matching CSS
// rule (defined in the inline <style> block in `[locale]/layout.tsx`) hides
// ad slots before first paint.
//
// This is intentionally a Server Component, parallel to ThemeScript. The
// <script> must be in the SSR'd HTML so it executes synchronously while the
// browser parses <head>, before first paint.
//
// React 19 / Next.js 16 dev-mode emits an "Encountered a script tag while
// rendering React component" warning for inline <script>s in <head>. The
// warning is silenced once at the page level by a console.error filter
// installed inline at the top of `ThemeScript`, which is rendered first in
// <head>. See `@/lib/theme/ThemeScript.tsx` for the full React-DOM source
// citation, and for why the `'use client'` + `typeof window` null-on-
// client pattern is forbidden (it causes a positional hydration mismatch
// on <head> siblings — git history `0f1d2dd8`).
const SCRIPT = `(function(){try{if(/(?:^|; )${ADS_HIDDEN_COOKIE_NAME}=1(?:;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-ads-hidden','true');}}catch(e){}})();`;

export function AdHideBootstrapScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
