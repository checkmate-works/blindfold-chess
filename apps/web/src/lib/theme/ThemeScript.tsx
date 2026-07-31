import { THEME_BOOTSTRAP_SCRIPT_DEV, THEME_BOOTSTRAP_SCRIPT_PROD } from './theme-bootstrap-script';

// Inline bootstrap script that applies the saved (or system) theme class on
// <html> before first paint, preventing a flash of incorrect theme.
//
// Using `application/ld+json`-style non-JS type is NOT an option because the
// script must actually execute. Keeping the element strictly in the server
// tree is what makes this safe.
//
// The script text is a build-time constant (source of truth:
// `./theme-bootstrap-script.ts`), so the CSP allows it via a `'sha256-...'`
// source expression (`@/lib/security/inline-script-hashes.ts`) instead of a
// per-request nonce. Reading the nonce here used to require `headers()`,
// which marked every route under `[locale]/` dynamic and silently disabled
// all static generation / ISR — the hash approach removes the last dynamic
// API read from the always-mounted layout tree.
//
// This is intentionally a Server Component. The <script> must be present in
// the SSR'd HTML so the browser executes it synchronously while parsing
// <head> — before first paint and before any client JS runs. A Client
// Component cannot satisfy that constraint.
//
// React 19 / Next.js 16 dev-mode warning: as of Next.js 16.2.x, the bundled
// react-dom (`next/dist/compiled/react-dom/cjs/react-dom-client.development.js`)
// emits "Encountered a script tag while rendering React component. Scripts
// inside React components are never executed when rendering on the client.
// Consider using template tag instead." for any inline <script> child of
// <head>. Verified at lines ~12944-12969 (case "script") and the
// `isScriptDataBlock` gate at ~23647: the warning is suppressed only for
// data blocks (type="application/json" etc.), which do not execute. The
// warning fires during fresh-mount reconciliation; React 19 does not
// hydrate <head> children through `popHydrationState`, so head <script>s
// always go through the fresh-mount path on the client.
//
// The earlier comment in this file cited the unbundled `react-dom@19.2.5`
// source (which lacks this specific warning) and concluded the warning was
// unreachable. That conclusion was correct for the unbundled package but
// wrong for Next.js, which ships its OWN copy of react-dom that contains
// the warning. The bundled copy is what runs in the browser at dev time.
//
// Behaviour-preserving fix: prepend a narrowly-scoped console.error filter
// that drops only this one warning string. Installed inline at the very top
// of the bootstrap script, the filter runs synchronously while the browser
// parses <head>, well before React hydration begins. By the time React
// reconciles the <script> children of <head> (and trips the warning), the
// filter is already in place. One filter at the first <script> in <head>
// covers every other inline <script> sibling (AdHideBootstrapScript etc.)
// because React's `didWarnScriptTags` global only fires the warning at
// most once per page anyway. The filter is gated on
// `process.env.NODE_ENV !== 'production'` so it is a no-op (and tree-shaken
// from the inline payload's effect at runtime) in production builds.
//
// Race against Next.js dev-overlay patching: Next's
// `next/dist/next-devtools/userspace/app/errors/intercept-console-error.js`
// captures `originConsoleError = globalThis.console.error` at MODULE LOAD
// time (line 29) and later does `window.console.error = wrapper` at
// `patchConsoleError()` call time (line 35). The wrapper internally calls
// `originConsoleError.apply(...)` — i.e., the value snapshotted at module
// load. Async dev-runtime chunks can finish loading and execute that
// module-load step BEFORE our inline `<script>` parses, in which case
// `originConsoleError` is the native function and Next's wrapper bypasses
// any plain `console.error = ourFilter` assignment we make later.
//
// To win that race regardless of order, we install via
// `Object.defineProperty(console, 'error', {get, set})`: the getter always
// returns our filter (so any reader — Next's module-load capture, React's
// `prevError = console.error` snapshot in `disableLogs`, etc. — sees our
// filter), and the setter captures Next's wrapper as the inner forward
// target without losing our filter from the property slot. A depth guard
// breaks the recursion when Next's wrapper re-enters via its captured
// `originConsoleError` (which the accessor made equal to our filter). A
// `try/catch` falls back to plain assignment if `defineProperty` throws on
// some exotic browser/console implementation.
//
// DO NOT add `'use client'` plus a `typeof window === 'undefined'` guard.
// That pattern returns `null` on the client while the server emits a
// <script>, causing a positional hydration mismatch on <head> siblings
// (JsonLd etc.) — every sibling after this one shifts by one slot. See git
// history for `0f1d2dd8` for the regression. The current fix preserves the
// React tree shape: a Server Component that always renders one <script>
// element, identical on server and client, which is what the unit tests in
// `./ThemeScript.test.tsx` enforce.
const SCRIPT =
  process.env.NODE_ENV === 'production' ? THEME_BOOTSTRAP_SCRIPT_PROD : THEME_BOOTSTRAP_SCRIPT_DEV;

export function ThemeScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
