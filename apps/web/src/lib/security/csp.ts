/**
 * Content Security Policy helpers.
 *
 * CSP is constructed per-request in `src/proxy.ts` rather than via
 * `next.config.ts` because the `script-src` directive needs a per-request
 * `'nonce-<value>'` token — static headers defined in `next.config.ts` cannot
 * hold per-request values.
 *
 * The policy uses the `'strict-dynamic'` + nonce pattern recommended by the
 * Next.js App Router CSP guide:
 * https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 *
 * - Inline `<script>` tags in Server Components must carry the nonce via the
 *   `nonce={...}` prop. The nonce is read from the `x-nonce` request header
 *   (set by the proxy) through `headers()` in Server Components.
 * - Scripts injected by Next.js itself (hydration, RSC chunks, `next/script`)
 *   pick up the nonce automatically when `x-nonce` is present on the request.
 * - With `'strict-dynamic'`, modern browsers trust scripts with the correct
 *   nonce and anything they subsequently load; host/scheme allow-lists
 *   (`https:`, specific domains) become a fallback for browsers that do not
 *   understand `'strict-dynamic'`.
 *
 * In development, `'unsafe-eval'` is added to `script-src` because React Fast
 * Refresh / Turbopack HMR rely on `eval`. Production never allows
 * `'unsafe-eval'`. Production DOES allow `'wasm-unsafe-eval'`, which is a
 * narrower keyword that only permits WebAssembly compilation (required by
 * Stockfish on `/[locale]/games/play`) without re-enabling regular `eval()`.
 *
 * `style-src 'unsafe-inline'` is retained: removing it would require
 * overhauling every CSS-in-JS / inline `<style>` usage in the app, which is
 * out of scope for the XSS hardening pass.
 */

const REPORT_GROUP = 'csp-endpoint';
const REPORT_PATH = '/api/csp-report';

/**
 * Generate a cryptographically-random base64 nonce safe for the Edge runtime.
 *
 * 16 bytes -> 24-character base64 string. `crypto.getRandomValues` is
 * available on both Node.js and the Edge runtime used by Next.js proxy /
 * middleware.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in both browsers and the Edge runtime.
  return btoa(binary);
}

/**
 * Build the full `Content-Security-Policy` header value for a given nonce.
 *
 * The directive list is intentionally kept in a single place so the proxy
 * and any future SSR-only code paths agree on the policy. When the hosting
 * environment is `development`, `'unsafe-eval'` is added to `script-src` so
 * Fast Refresh / Turbopack keep working; production builds never include it.
 */
export function buildCspHeader(nonce: string, options: { isDevelopment?: boolean } = {}): string {
  const isDevelopment = options.isDevelopment ?? process.env.NODE_ENV === 'development';

  // Keep host allow-lists: they act as a fallback for browsers that do not
  // implement `'strict-dynamic'`. Modern browsers ignore host-based entries
  // in `script-src` once `'strict-dynamic'` is present, but older ones still
  // rely on them.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Required so Stockfish (public/stockfish.js + stockfish.wasm) can compile
    // WebAssembly on /[locale]/games/play. Unlike 'unsafe-eval', this keyword
    // ONLY permits WebAssembly.compile / WebAssembly.instantiate — it does NOT
    // re-enable eval() for ordinary JS, so the 'strict-dynamic' + nonce XSS
    // defence is unchanged. Do NOT remove without a replacement for the
    // Stockfish engine used by the AI-game feature.
    "'wasm-unsafe-eval'",
    // Fallback schemes for non-`strict-dynamic` browsers.
    'https:',
    // Explicit host fallbacks (also honored by older browsers).
    'www.googletagmanager.com',
    'www.google-analytics.com',
    'cdn-cookieyes.com',
    '*.sentry.io',
    'pagead2.googlesyndication.com',
    'adservice.google.com',
    'adservice.google.co.jp',
    '*.doubleclick.net',
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  const directives: string[] = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // `'unsafe-inline'` on styles is out of scope to remove (CSS-in-JS).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: *.supabase.co pagead2.googlesyndication.com *.doubleclick.net",
    "font-src 'self' data:",
    "connect-src 'self' www.google-analytics.com *.sentry.io *.ingest.sentry.io *.supabase.co pagead2.googlesyndication.com adservice.google.com",
    'frame-src googleads.g.doubleclick.net tpc.googlesyndication.com ep2.adtrafficquality.google www.google.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
    `report-uri ${REPORT_PATH}`,
    `report-to ${REPORT_GROUP}`,
  ];

  return directives.join('; ');
}

/**
 * Build the `Report-To` header value (modern reporting endpoint config).
 *
 * Paired with `report-to <group>` in the CSP so supporting browsers POST
 * violation reports to our `/api/csp-report` handler. `report-uri` is kept
 * in the CSP as a fallback for browsers that have not yet migrated to the
 * Reporting API.
 */
export function buildReportToHeader(): string {
  return JSON.stringify({
    group: REPORT_GROUP,
    max_age: 10886400,
    endpoints: [{ url: REPORT_PATH }],
  });
}

/**
 * Build the `Reporting-Endpoints` header value.
 *
 * `Reporting-Endpoints` is the successor to `Report-To` (deprecated in
 * Chrome 96+) and uses the Structured Fields `key="value"` syntax rather
 * than a JSON payload. The project emits both headers concurrently so
 * supporting browsers prefer the modern one while older ones still honor
 * `Report-To`. Both point at the same `/api/csp-report` collector, paired
 * with `report-to <group>` in the CSP directive list.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Reporting-Endpoints
 */
export function buildReportingEndpointsHeader(): string {
  return `${REPORT_GROUP}="${REPORT_PATH}"`;
}
