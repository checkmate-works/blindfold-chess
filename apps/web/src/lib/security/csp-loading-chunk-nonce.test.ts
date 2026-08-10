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
 * The fix lives in a pnpm patch, which is invisible in this repo's source and
 * would silently vanish on a Next.js upgrade — taking every dynamic route's
 * hydration with it once the policy stops being report-only. This test reads
 * the installed package so that disappearance is loud.
 *
 * When upstream ships the same fix, delete the patch AND this test together.
 */
describe('Next.js loading/error boundary chunks carry the CSP nonce', () => {
  const require = createRequire(import.meta.url);

  async function readInstalledModule(relative: string): Promise<string> {
    const nextRoot = path.dirname(require.resolve('next/package.json'));
    return readFile(path.join(nextRoot, relative), 'utf8');
  }

  it.each([
    'dist/server/app-render/create-component-styles-and-scripts.js',
    'dist/esm/server/app-render/create-component-styles-and-scripts.js',
  ])('%s passes ctx.nonce to the emitted <script>', async (relative) => {
    const source = await readInstalledModule(relative);
    expect(source).toContain('nonce: ctx.nonce');
  });

  it('still matches the upstream shape the patch targets', async () => {
    // If this fails, Next.js rewrote the emitter: re-derive the patch against
    // the new code (or drop it, if the nonce is now passed upstream) rather
    // than force the assertion above to pass.
    const source = await readInstalledModule(
      'dist/server/app-render/create-component-styles-and-scripts.js'
    );
    expect(source).toContain("createElement('script'");
    expect(source).toContain('key: `script-${scriptIndex}`');
  });
});
