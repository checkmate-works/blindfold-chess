import { CONSENT_BOOTSTRAP_SCRIPT } from './consent-bootstrap-script';

// No-flash consent bootstrap. Reads the `bfc_consent` cookie and, when it
// carries a decision, flags `<html data-consent="granted|denied">` so the
// matching CSS rule (defined in the inline <style> block of each root layout)
// hides the consent banner before first paint. A visitor who has already
// answered must never see the banner flash past.
//
// This is intentionally a Server Component, parallel to ThemeScript and
// AdHideBootstrapScript. The <script> must be in the SSR'd HTML so it executes
// synchronously while the browser parses <head>, before first paint.
//
// The script text is a build-time constant (`./consent-bootstrap-script.ts`)
// allowed by the CSP via a `'sha256-...'` source expression — no per-request
// nonce, so mounting it never forces dynamic rendering.
//
// React 19 / Next.js 16 dev-mode emits an "Encountered a script tag while
// rendering React component" warning for inline <script>s in <head>. The
// warning is silenced once at the page level by a console.error filter
// installed inline at the top of `ThemeScript`, which is rendered first in
// <head>. See `@/lib/theme/ThemeScript.tsx` for the full React-DOM source
// citation, and for why the `'use client'` + `typeof window` null-on-client
// pattern is forbidden (it causes a positional hydration mismatch on <head>
// siblings — git history `0f1d2dd8`).
export function ConsentBootstrapScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: CONSENT_BOOTSTRAP_SCRIPT }}
    />
  );
}
