/**
 * Content Security Policy helpers.
 *
 * CSP is constructed per-request in `src/proxy.ts` rather than via
 * `next.config.ts` because `script-src` varies per request: dynamic routes
 * get a per-request `'nonce-<value>'` token, and the choice of policy
 * variant depends on the request path — static headers defined in
 * `next.config.ts` cannot express either.
 *
 * ## Two `script-src` variants
 *
 * **Per-request-nonce variant** (default) — the `'strict-dynamic'` + nonce
 * pattern recommended by the Next.js App Router CSP guide:
 * https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 *
 * - Scripts injected by Next.js itself (hydration, RSC flight chunks,
 *   `next/script`) pick up the nonce automatically: Next extracts it from the
 *   `Content-Security-Policy(-Report-Only)` header visible to the renderer
 *   and stamps it on every script it emits during a dynamic render.
 * - The app's own three build-time-constant inline bootstrap scripts (theme,
 *   ad-hide, announcement-dismiss) are allowed via `'sha256-...'` hash
 *   sources (`./inline-script-hashes.ts`) rather than the nonce. Hashes are
 *   honored alongside `'strict-dynamic'` (CSP3), and — critically — they need
 *   no `headers()` read in Server Components. The previous design threaded
 *   the nonce through `headers()` into every layout, which marked the whole
 *   `[locale]/` tree dynamic and silently disabled static generation.
 * - With `'strict-dynamic'`, modern browsers trust scripts with the correct
 *   nonce/hash and anything they subsequently load; host/scheme allow-lists
 *   (`https:`, specific domains) become a fallback for browsers that do not
 *   understand `'strict-dynamic'`.
 * - Next.js 16.3.0 stamps the nonce on the `<script>` tags it emits for a
 *   layout/page but NOT on those it emits for a `loading` / `error` /
 *   `template` / `not-found` boundary — the two live in different modules and
 *   only the former reads `ctx.nonce`. Under `'strict-dynamic'` the host
 *   fallbacks above are ignored, so that one chunk is blocked outright. Fixed
 *   by `patches/next@16.3.0.patch`, which must patch the prebuilt
 *   `dist/compiled/next-server/app-page*.runtime.prod.js` bundles and not only
 *   the readable `dist/server/app-render/*` sources — Node page rendering loads
 *   the former and reaches the latter only on the edge runtime. See the
 *   CLAUDE.md note and `./csp-loading-chunk-nonce.test.ts`, which fails if the
 *   patch goes missing from the bundles the server actually loads.
 *
 * **Static-content variant** — for prerendered (SSG/ISR) routes, selected by
 * path in `src/proxy.ts` via `isStaticContentPath()`. Prerendered HTML is
 * shared across requests, so it can never carry a per-request nonce; under
 * the nonce variant every framework script in that HTML would violate. This
 * variant drops nonce/hashes/`'strict-dynamic'` and falls back to
 * `'unsafe-inline'` so cached HTML keeps working. The hash sources MUST stay
 * out of this variant: per CSP2, the presence of any nonce or hash makes
 * browsers ignore `'unsafe-inline'`, which would re-break the framework's
 * inline flight scripts. See `./static-content-paths.ts` for the trade-off
 * discussion. Every directive other than `script-src` is identical in both
 * variants.
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
import { inlineScriptHashes } from './inline-script-hashes';

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
 * Extract the CSP-style origin (`scheme://host[:port]`) from a URL string.
 *
 * Returns `null` when `raw` is missing or unparseable so callers can fail
 * closed (i.e., simply omit the entry rather than emit a malformed CSP).
 *
 * `URL.origin` is exactly the form CSP wants: it includes the port only when
 * non-default for the scheme, and omits any pathname / query / hash.
 */
function originFromUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Derive the WebSocket origin (`ws://` or `wss://`) corresponding to the
 * given http(s) URL. Returns `null` if the URL is missing, unparseable, or
 * uses a non-http(s) scheme.
 *
 * CSP Level 3 is supposed to imply ws/wss when http/https is allowlisted,
 * but several browsers historically required the explicit ws/wss entry for
 * Supabase Realtime to connect, so we emit it explicitly.
 */
function wsOriginFromUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:') return `ws://${u.host}`;
    if (u.protocol === 'https:') return `wss://${u.host}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * The `script-src` strategy for a response — see the module doc above for
 * what each variant means and when the proxy picks which.
 */
export type ScriptPolicy =
  { mode: 'per-request-nonce'; nonce: string } | { mode: 'static-content' };

/**
 * Build the full `Content-Security-Policy` header value for a given
 * `script-src` strategy.
 *
 * The directive list is intentionally kept in a single place so the proxy
 * and any future SSR-only code paths agree on the policy. When the hosting
 * environment is `development`, `'unsafe-eval'` is added to `script-src` so
 * Fast Refresh / Turbopack keep working; production builds never include it.
 *
 * `allowFraming` opts the response out of the default `frame-ancestors 'none'`
 * — see `./framing.ts` for which paths get it and why the embed surface is
 * safe to frame. The proxy decides per request; every other caller gets the
 * closed default. That directive is inert while the policy is delivered
 * report-only, so `X-Frame-Options` is what enforces framing today — see the
 * `frame-ancestors` line below and the module doc in `./framing.ts`.
 */
export function buildCspHeader(
  scriptPolicy: ScriptPolicy,
  options: {
    isDevelopment?: boolean;
    allowFraming?: boolean;
    /**
     * Supabase project URL, defaulting to `NEXT_PUBLIC_SUPABASE_URL`, and
     * canonical site URL, defaulting to `NEXT_PUBLIC_SITE_URL`. Both were
     * read inline while `isDevelopment` was already an option, leaving this
     * half-injected: the emitted `connect-src` / `manifest-src` allow-lists
     * changed with the environment and a test could only reach those
     * branches by stubbing `process.env`.
     */
    supabaseUrl?: string;
    siteUrl?: string;
  } = {}
): string {
  const isDevelopment = options.isDevelopment ?? process.env.NODE_ENV === 'development';
  const allowFraming = options.allowFraming ?? false;
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const siteUrl = options.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL;

  // Derive the Supabase origin from `NEXT_PUBLIC_SUPABASE_URL` so local dev
  // (which uses `http://127.0.0.1:54321` and is NOT covered by the
  // `*.supabase.co` wildcard) and any future regional / custom-domain
  // Supabase deployments (`db.<region>.supabase.co`, custom domains) keep
  // working without ad-hoc allow-list edits. The wildcard is intentionally
  // retained as a belt-and-suspenders fallback for the standard hosted case.
  // If the env var is missing or unparseable we fall closed: nothing is
  // appended, the existing `*.supabase.co` wildcard remains, and production
  // is unaffected.
  const supabaseOrigin = originFromUrl(supabaseUrl);
  const supabaseWsOrigin = wsOriginFromUrl(supabaseUrl);

  // Canonical site origin. `metadataBase` resolves the `/manifest.webmanifest`
  // link to an ABSOLUTE URL on the canonical host (e.g.
  // `https://www.blindfold-chess.online/...`). When a request is served on a
  // different host than the canonical one (e.g. the bare apex
  // `blindfold-chess.online` before the apex->www redirect, or a crawler hitting
  // it directly), that absolute manifest URL is cross-origin to the document's
  // `'self'`, so `manifest-src` (which otherwise falls back to `default-src
  // 'self'`) blocks it. Allow-listing the canonical origin fixes the violation
  // regardless of which host actually served the page. Falls back to the known
  // production canonical so the entry is present even if the env var is unset.
  const siteOrigin = originFromUrl(siteUrl) ?? 'https://www.blindfold-chess.online';

  // Keep host allow-lists: they act as a fallback for browsers that do not
  // implement `'strict-dynamic'`. Modern browsers ignore host-based entries
  // in `script-src` once `'strict-dynamic'` is present, but older ones still
  // rely on them. In the static-content variant there is no
  // `'strict-dynamic'`, so the hosts (and `'unsafe-inline'`) are what the
  // browser actually evaluates.
  const scriptSrc = [
    "'self'",
    // Variant-specific sources — see the module doc. The hash sources for the
    // app's constant bootstrap scripts belong ONLY to the nonce variant:
    // adding any hash to the static variant would make browsers ignore its
    // 'unsafe-inline' fallback and block the framework's inline scripts in
    // prerendered HTML.
    ...(scriptPolicy.mode === 'per-request-nonce'
      ? [`'nonce-${scriptPolicy.nonce}'`, "'strict-dynamic'", ...inlineScriptHashes(isDevelopment)]
      : ["'unsafe-inline'"]),
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
    // Web Workers spawned from a `blob:` URL. The client-side HEIC→JPEG
    // converter (`heic-to`, used before comment-image / avatar upload) runs
    // libheif in a Worker it builds via `new Worker(URL.createObjectURL(blob))`.
    // Under `'strict-dynamic'` the scheme/host fallbacks in `script-src` are
    // ignored for worker sourcing, and without an explicit `worker-src` the
    // blob worker falls through to `default-src 'self'` and is blocked — so it
    // must be named here. `'self'` also covers any same-origin worker scripts.
    "worker-src 'self' blob:",
    // `'unsafe-inline'` on styles is out of scope to remove (CSS-in-JS).
    // `fonts.googleapis.com` serves the @font-face stylesheet for the Google
    // Sans fonts that Google's AdSense / consent UI injects.
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    // `ep1.adtrafficquality.google`: the Ad Traffic Quality endpoint is not
    // only an XHR beacon target (see `connect-src` below) — it is also fetched
    // as a tracking pixel via `<img>`, so it must be named in BOTH directives.
    //
    // `www.googletagmanager.com`: GA4 delivers some measurement hits as image
    // beacons (`/td?id=G-...`) rather than XHR — gtag.js picks the transport
    // itself depending on browser and payload size, so the host is needed in
    // `img-src` as well as `script-src`.
    "img-src 'self' data: blob: *.supabase.co" +
      (supabaseOrigin ? ` ${supabaseOrigin}` : '') +
      ' pagead2.googlesyndication.com *.doubleclick.net ep1.adtrafficquality.google' +
      ' www.googletagmanager.com',
    // `fonts.gstatic.com`: woff2 files for the Google Sans font that AdSense's
    // in-page UI pulls in (the app's own Inter is self-hosted via next/font).
    "font-src 'self' data: fonts.gstatic.com",
    // `ep1.adtrafficquality.google`: AdSense's Ad Traffic Quality system POSTs
    // beacons here via fetch/XHR (the iframe counterpart `ep2.adtrafficquality.google`
    // lives in `frame-src` below). Without it production logs a flood of
    // connect-src violations.
    //
    // `fundingchoicesmessages.google.com`: Google's Privacy & messaging (Funding
    // Choices) CMP. Plain AdSense publishers get no separate CMP tag — the
    // consent message is delivered by `adsbygoogle.js` itself, which then
    // fetches / beacons this host via XHR on every page load. The host was
    // dropped from `script-src` when the standalone CMP tag was removed
    // (a91d72fc5); under `'strict-dynamic'` the injected script needs no
    // script-src entry, but `connect-src` has no such escape hatch, so this
    // entry is required. Missing it produced a steady stream of connect-src
    // violation reports in production.
    //
    // `*.google-analytics.com` (not the literal `www.google-analytics.com`):
    // gtag.js sends measurement hits to region-prefixed hosts such as
    // `region1.google-analytics.com` / `region2.google-analytics.com` for
    // Google-side load balancing / data residency. This is an internal
    // Google implementation detail outside our control, so the wildcard is
    // required to avoid a flood of connect-src violation reports.
    //
    // `csi.gstatic.com`: AdSense's RUM script (`pagead2.googlesyndication.com
    // /pagead/js/rum.js`) posts its client-side instrumentation to Google's
    // CSI collector. Same situation as the CMP above — `'strict-dynamic'`
    // covers loading rum.js but says nothing about where it may connect.
    //
    // `www.google.com`: AdSense / gtag conversion and user-list pings
    // (`/pagead/...`, `/ccm/collect`) go to the bare google.com host, which is
    // covered by neither `*.google-analytics.com` nor the syndication hosts.
    // Already present in `frame-src` for the same ad stack.
    "connect-src 'self' *.google-analytics.com *.sentry.io *.ingest.sentry.io *.supabase.co" +
      (supabaseOrigin ? ` ${supabaseOrigin}` : '') +
      (supabaseWsOrigin ? ` ${supabaseWsOrigin}` : '') +
      ' pagead2.googlesyndication.com adservice.google.com ep1.adtrafficquality.google' +
      ' fundingchoicesmessages.google.com csi.gstatic.com www.google.com',
    // `'self'`: the share dialog previews the embeddable replay by framing our
    // own `/embed/g/<code>` — without this the preview is a blank box the
    // moment the policy is enforced (issue #89), which is the one thing that
    // dialog exists to rule out. Reported as a violation on every open until
    // it was added, since `frame-src` does not fall back to `default-src`
    // once the directive is present.
    //
    // `pagead2.googlesyndication.com`: AdSense also renders some ad iframes from
    // this host (in addition to googleads.g.doubleclick.net / tpc.googlesyndication.com).
    //
    // `data:`: AdSense seeds every ad slot with a placeholder
    // `<iframe src="data:text/html,...">` before swapping in the real creative.
    // Reported from every ad-bearing page across Chrome/Firefox/Edge; the app
    // itself renders no `data:` frame (nor any `srcDoc`), so this entry exists
    // solely for the ad stack. The relaxation is narrow: a `data:` document
    // gets an opaque origin, so it cannot read this page's DOM, storage, or
    // cookies — unlike `data:` in `script-src`, which would be an XSS bypass
    // and stays forbidden. Drop this the day the site stops serving ads.
    "frame-src 'self' data: googleads.g.doubleclick.net tpc.googlesyndication.com pagead2.googlesyndication.com ep2.adtrafficquality.google www.google.com www.chess.com www.youtube-nocookie.com",
    // `'self'` covers the host that served the document; `siteOrigin` covers the
    // absolute canonical manifest URL emitted by `metadataBase` when the request
    // was served on a non-canonical host. See `siteOrigin` derivation above.
    `manifest-src 'self' ${siteOrigin}`,
    // Emitted but INERT until the policy enforces: browsers ignore
    // `frame-ancestors` in a report-only policy, and emit no violation report
    // for it either, so this line currently neither blocks a frame nor tells
    // us it would have. `X-Frame-Options` (next.config.ts) carries the split
    // in the meantime — see the module doc in `./framing.ts` before changing
    // either one, and note that flipping to an enforcing CSP (issue #89) turns
    // this line on for the first time, untested by any report we have.
    //
    // `*` rather than an allow-list: an embed is only useful if any blog can
    // host it, and the framed document is a read-only view of already-public
    // data with no action a framing site could trick a viewer into taking.
    allowFraming ? 'frame-ancestors *' : "frame-ancestors 'none'",
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
