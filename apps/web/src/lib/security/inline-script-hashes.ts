/**
 * CSP `'sha256-...'` source expressions for the app's build-time-constant
 * inline scripts.
 *
 * Three inline `<script>`s ship in the always-mounted layout tree (theme
 * bootstrap, ad-hide bootstrap, announcement-dismiss). Allowing them by hash
 * instead of a per-request nonce means no Server Component ever needs to read
 * `headers()` for CSP purposes — which is what previously forced every route
 * under `[locale]/` into dynamic rendering and silently disabled all static
 * generation / ISR.
 *
 * The values are precomputed literals because `buildCspHeader` runs
 * synchronously in the Edge middleware, where only the async
 * `crypto.subtle.digest` is available. The adjacent unit test
 * (`inline-script-hashes.test.ts`) recomputes every digest from the actual
 * script sources, so editing a script without updating its hash fails the
 * suite instead of silently emitting CSP violations in production.
 *
 * The digest is SHA-256 over the exact UTF-8 script text, base64-encoded,
 * per the CSP2 hash-source algorithm.
 */

/** `ThemeScript` production variant (`THEME_BOOTSTRAP_SCRIPT_PROD`). */
export const THEME_BOOTSTRAP_HASH_PROD = 'sha256-Ln4MYNZqCA+sokT1r3SAF09kre8P6UBU2/hxWWp3ZpQ=';

/** `ThemeScript` development variant (`THEME_BOOTSTRAP_SCRIPT_DEV`). */
export const THEME_BOOTSTRAP_HASH_DEV = 'sha256-R22D1ttAgCjVJflyZ32IYDAtwknib67fv9zCHY80wIk=';

/** `AdHideBootstrapScript` (`AD_HIDE_BOOTSTRAP_SCRIPT`). */
export const AD_HIDE_BOOTSTRAP_HASH = 'sha256-IEdY+K3I4FDlGORZ4jH5V/zSq3MDltJ7P6Vec7gBCmQ=';

/** Header announcement-dismiss script (`ANNOUNCEMENT_DISMISS_SCRIPT`). */
export const ANNOUNCEMENT_DISMISS_HASH = 'sha256-7WaHfrrc+R9fXX0kuBv6WNXaVJurHB5qlpc8rQk/ZXA=';

/**
 * The hash set to embed in the `script-src` directive for the given runtime
 * mode. Development renders the dev theme variant (console-filter prefix), so
 * its hash replaces the production one; the other scripts are identical in
 * both modes.
 */
export function inlineScriptHashes(isDevelopment: boolean): string[] {
  return [
    isDevelopment ? THEME_BOOTSTRAP_HASH_DEV : THEME_BOOTSTRAP_HASH_PROD,
    AD_HIDE_BOOTSTRAP_HASH,
    ANNOUNCEMENT_DISMISS_HASH,
  ].map((h) => `'${h}'`);
}
