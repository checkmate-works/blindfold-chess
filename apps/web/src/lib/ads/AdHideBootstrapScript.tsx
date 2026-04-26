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
// See `@/lib/theme/ThemeScript.tsx` for the React-DOM source citation
// explaining why script-as-direct-child-of-<head> does NOT trigger the
// React 19 warning, and why the `'use client'` + `typeof window` null-on-
// client pattern is forbidden (it causes a positional hydration mismatch on
// <head> siblings).
const SCRIPT = `(function(){try{if(/(?:^|; )${ADS_HIDDEN_COOKIE_NAME}=1(?:;|$)/.test(document.cookie)){document.documentElement.setAttribute('data-ads-hidden','true');}}catch(e){}})();`;

export function AdHideBootstrapScript({ nonce }: { nonce?: string }) {
  return (
    <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  );
}
