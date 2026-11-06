import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Upgrade regression check: Next.js boundary scripts must preserve CSP nonces.
 *
 * Next.js 16.4.1 includes the nonce fix for loading/error/template boundary
 * scripts in both its readable sources and its compiled production runtimes,
 * and the local pnpm patch that used to supply it was removed after verifying
 * both copies. Node rendering loads
 * `dist/compiled/next-server/app-page*.runtime.prod.js`, so checking only
 * `dist/server/app-render/*` is insufficient — that is how an inert patch
 * once went unnoticed. When upgrading Next.js, also check a
 * production-rendered dynamic page for nonce-bearing script tags.
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
   * writing) and group 2 is whatever trails the `key` property — where
   * upstream includes `,nonce:<ctx>.nonce`. Matching the shape rather than the
   * exact bytes keeps the failure message useful when Next re-minifies.
   */
  const MINIFIED_EMITTER =
    /\("script",\{src:`\$\{(\w+)\.assetPrefix\}\/_next\/[^`]*`,async:!0,key:`script-\$\{\w+\}`([^}]*)\}\)/g;

  /**
   * The production bundles checked here: the two non-experimental production
   * runtimes. `app-page-turbo.runtime.prod.js` is the one this build loads;
   * the plain one covers a build that ever runs without Turbopack. The
   * `-experimental` pair is reachable only under `__NEXT_EXPERIMENTAL_REACT`
   * (asserted below) and the `.dev` bundles serve a policy nobody enforces
   * locally, so both are deliberately left unchecked.
   */
  const PRODUCTION_RUNTIMES = [
    'dist/compiled/next-server/app-page-turbo.runtime.prod.js',
    'dist/compiled/next-server/app-page.runtime.prod.js',
  ];

  it.each(PRODUCTION_RUNTIMES)('%s passes the nonce to the emitted <script>', async (relative) => {
    const source = await readInstalledModule(relative);
    const matches = [...source.matchAll(MINIFIED_EMITTER)];

    // Exactly one emitter is expected. Zero means Next rewrote it and the
    // upstream emitter has changed; more than one means the assertion below is no
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
    // checked separately for consistency.
    const source = await readInstalledModule(relative);
    expect(source).toContain('nonce: ctx.nonce');
  });

  it('still resolves Node page rendering to the production bundles checked here', async () => {
    // The indirection that made the original patch inert. If Next changes how
    // it picks a runtime, re-check which file needs inspection before touching
    // the assertions above.
    const loader = await readInstalledModule(
      'dist/server/route-modules/app-page/module.compiled.js'
    );

    for (const relative of PRODUCTION_RUNTIMES) {
      expect(loader).toContain(path.basename(relative));
    }
    // The unbundled sources are the edge branch only.
    expect(loader).toContain("process.env.NEXT_RUNTIME === 'edge'");
    // The unchecked `-experimental` bundles stay unreachable without this flag.
    expect(loader).toContain('process.env.__NEXT_EXPERIMENTAL_REACT');
  });

  it('still matches the upstream emitter shape', async () => {
    // If this fails, Next.js rewrote the emitter: inspect the new emitter
    // before updating these assertions.
    const source = await readInstalledModule(
      'dist/server/app-render/create-component-styles-and-scripts.js'
    );
    expect(source).toContain("createElement('script'");
    expect(source).toContain('key: `script-${scriptIndex}`');
  });
});
