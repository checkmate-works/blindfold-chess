'use client';

import { ADS_HIDDEN_COOKIE_NAME } from './ads-hidden-cookie';

// No-flash ad-hide bootstrap. Reads the `bfc_ads_hidden` cookie and, when
// set to `'1'`, flags `<html data-ads-hidden="true">` so the matching CSS
// rule (defined in the inline <style> block in `[locale]/layout.tsx`) hides
// ad slots before first paint.
//
// Why a Client Component with a server-only render guard:
// Mirrors the rationale in `@/lib/theme/ThemeScript.tsx` — see that file for
// the full explanation. In short, React 19 warns when a <script> element is
// part of the React tree on the client (including RSC payload reconciliation
// during in-app navigation such as locale switching). Gating the <script>
// emit on `typeof window === 'undefined'` produces it during SSR only, so
// the browser still receives and executes the inline script before paint
// while the client React tree never contains a <script> element.
const SCRIPT = `(function(){try{if(/(?:^|; )${ADS_HIDDEN_COOKIE_NAME}=1(?:;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-ads-hidden','true');}}catch(e){}})();`;

export function AdHideBootstrapScript() {
  if (typeof window !== 'undefined') return null;
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
