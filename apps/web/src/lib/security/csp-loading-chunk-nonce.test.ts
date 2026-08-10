import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for `patches/next@16.3.0.patch`.
 *
 * Next.js emits the `<script>` tags for a route's JS chunks from two places:
 * `get-layer-assets` (layout / page), which stamps `nonce: ctx.nonce`, and
 * `create-component-styles-and-scripts` (`loading` / `error` / `template` /
 * `not-found`), which upstream forgets to. Under this app's
 * `script-src 'nonce-…' 'strict-dynamic'` policy the host and scheme fallbacks
 * are ignored, so the un-stamped chunk is blocked outright — observed in
 * production as `script-src-elem` violations against our OWN origin for
 * `/_next/static/…` on every route whose `loading.tsx` pulls its own chunk
 * (Sentry BLINDFOLD-CHESS-33).
 *
 * ## Why this file checks the compiled bundles too
 *
 * The emitter ships twice. Next resolves the app-page render module through
 * `dist/server/route-modules/app-page/module.compiled.js`, which requires a
 * prebuilt `dist/compiled/next-server/app-page*.runtime.<mode>.js` on Node and
 * only falls back to the unbundled `dist/server/app-render/*` sources when
 * `NEXT_RUNTIME` is `'edge'`. Page rendering here is Node, so patching the
 * readable sources alone fixed nothing: the first version of this test asserted
 * exactly that and stayed green through two months of production violations.
 * Assert on the file the server actually loads, and treat the unbundled source
 * as the edge-runtime copy it is.
 *
 * The fix lives in a pnpm patch, which is invisible in this repo's source and
 * would silently vanish on a Next.js upgrade — taking every dynamic route's
 * hydration with it once the policy stops being report-only. This test reads
 * the installed package so that disappearance is loud.
 *
 * When upstream ships the same fix, delete the patch AND this test together.
 * Still unfixed as of 16.3.1-canary.10.
 */
describe('Next.js loading/error boundary chunks carry the CSP nonce', () => {
  const require = createRequire(import.meta.url);

  async function readInstalledModule(relative: string): Promise<string> {
    const nextRoot = path.dirname(require.resolve('next/package.json'));
    return readFile(path.join(nextRoot, relative), 'utf8');
  }

  /**
   * The minified emitter, as it appears in the compiled bundles:
   * ``("script",{src:`${a.assetPrefix}/_next/${f(e)}${g(a,!0)}`,async:!0,key:`script-${c}`})``
   *
   * Group 1 is the identifier bound to the render context (`a` at the time of
   * writing) and group 2 is whatever trails the `key` property — where the
   * patch inserts `,nonce:<ctx>.nonce`. Matching the shape rather than the
   * exact bytes keeps the failure message useful when Next re-minifies.
   */
  const MINIFIED_EMITTER =
    /\("script",\{src:`\$\{(\w+)\.assetPrefix\}\/_next\/[^`]*`,async:!0,key:`script-\$\{\w+\}`([^}]*)\}\)/g;

  /**
   * The bundles the patch covers: the two non-experimental production
   * runtimes. `app-page-turbo.runtime.prod.js` is the one this build loads;
   * the plain one covers a build that ever runs without Turbopack. The
   * `-experimental` pair is reachable only under `__NEXT_EXPERIMENTAL_REACT`
   * (asserted below) and the `.dev` bundles serve a policy nobody enforces
   * locally, so both are deliberately left un-patched.
   */
  const PATCHED_RUNTIMES = [
    'dist/compiled/next-server/app-page-turbo.runtime.prod.js',
    'dist/compiled/next-server/app-page.runtime.prod.js',
  ];

  it.each(PATCHED_RUNTIMES)('%s passes the nonce to the emitted <script>', async (relative) => {
    const source = await readInstalledModule(relative);
    const matches = [...source.matchAll(MINIFIED_EMITTER)];

    // Exactly one emitter is expected. Zero means Next rewrote it and the
    // patch is now dead code; more than one means the assertion below is no
    // longer checking what it claims to.
    expect(matches).toHaveLength(1);

    const [, ctxIdentifier, trailingProps] = matches[0];
    expect(trailingProps).toContain(`nonce:${ctxIdentifier}.nonce`);
  });

  it.each([
    'dist/server/app-render/create-component-styles-and-scripts.js',
    'dist/esm/server/app-render/create-component-styles-and-scripts.js',
  ])('%s passes ctx.nonce to the emitted <script>', async (relative) => {
    // The edge-runtime copy. Not loaded by this app's page rendering, but
    // patched for consistency and cheap to keep honest.
    const source = await readInstalledModule(relative);
    expect(source).toContain('nonce: ctx.nonce');
  });

  it('still resolves Node page rendering to the bundles this patch covers', async () => {
    // The indirection that made the original patch inert. If Next changes how
    // it picks a runtime, re-derive which file needs patching before touching
    // the assertions above.
    const loader = await readInstalledModule(
      'dist/server/route-modules/app-page/module.compiled.js'
    );

    for (const relative of PATCHED_RUNTIMES) {
      expect(loader).toContain(path.basename(relative));
    }
    // The unbundled sources are the edge branch only.
    expect(loader).toContain("process.env.NEXT_RUNTIME === 'edge'");
    // The un-patched `-experimental` bundles stay unreachable without this flag.
    expect(loader).toContain('process.env.__NEXT_EXPERIMENTAL_REACT');
  });

  it('still matches the upstream shape the patch targets', async () => {
    // If this fails, Next.js rewrote the emitter: re-derive the patch against
    // the new code (or drop it, if the nonce is now passed upstream) rather
    // than force the assertions above to pass.
    const source = await readInstalledModule(
      'dist/server/app-render/create-component-styles-and-scripts.js'
    );
    expect(source).toContain("createElement('script'");
    expect(source).toContain('key: `script-${scriptIndex}`');
  });
});
