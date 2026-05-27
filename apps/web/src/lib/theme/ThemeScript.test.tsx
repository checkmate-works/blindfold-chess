import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdHideBootstrapScript } from '@/lib/ads/AdHideBootstrapScript';
import { ADS_HIDDEN_COOKIE_NAME } from '@/lib/ads/ads-hidden-cookie';

import { ThemeScript } from './ThemeScript';
import { THEME_STORAGE_KEY } from './constants';

// `ThemeScript` is an async Server Component that calls `headers()` to read
// the per-request CSP nonce. In vitest+jsdom there is no Next.js request
// context, so we mock `next/headers` to return an empty header bag — the
// component's only need is to read `x-nonce`, which is allowed to be absent
// (the component falls back to `undefined`).
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}));

const FILTER_FRAGMENT = 'Encountered a script tag while rendering';

/**
 * Regression guard for the SPEC1 saga (commit `0f1d2dd8`, reverted).
 *
 * These tests guard against re-introducing the `'use client'` +
 * `typeof window === 'undefined'` pattern that was introduced and reverted
 * in commit `0f1d2dd8`. That pattern returned `null` on the client while
 * the server emitted a <script>, causing a positional hydration mismatch
 * on <head> siblings (JsonLd etc.).
 *
 * The correct invariant is: each component renders EXACTLY ONE <script>
 * element with inline content (no `src`, no `async`, no `onLoad`/`onError`)
 * — both during SSR and during any client-side render. Returning `null`
 * from either is the structural bug we are guarding against.
 *
 * vitest+jsdom CANNOT catch hydration mismatches — that requires a real
 * browser. These unit tests catch the structural CAUSE (returning null on
 * the client), not the SYMPTOM (hydration mismatch). The cause is
 * sufficient because the only known way to trigger the symptom is by
 * returning null from a Client Component while the server emits a script.
 *
 * See `./ThemeScript.tsx` for the React-DOM source citation
 * (Next.js 16.2.x bundled react-dom) explaining the "Encountered a script
 * tag while rendering" warning that DOES fire for inline <script>s in
 * <head>, and the dev-only console.error filter that suppresses it at the
 * source while preserving the Server Component shape (= same React tree on
 * server and client, no hydration sibling shift).
 */
describe('inline bootstrap scripts: structural invariant', () => {
  afterEach(() => {
    cleanup();
  });

  it('ThemeScript renders exactly one inline <script> with theme bootstrap content', async () => {
    const element = await ThemeScript();
    const { container } = render(element);
    const scripts = container.querySelectorAll('script');
    expect(scripts).toHaveLength(1);

    const script = scripts[0];
    expect(script.hasAttribute('async')).toBe(false);
    expect(script.hasAttribute('src')).toBe(false);
    expect(script.getAttribute('onload')).toBeNull();
    expect(script.getAttribute('onerror')).toBeNull();

    const body = script.innerHTML;
    expect(body).toContain(THEME_STORAGE_KEY);
    expect(body).toContain('localStorage');
  });

  it('AdHideBootstrapScript renders exactly one inline <script> with ad-hide bootstrap content', () => {
    const { container } = render(<AdHideBootstrapScript />);
    const scripts = container.querySelectorAll('script');
    expect(scripts).toHaveLength(1);

    const script = scripts[0];
    expect(script.hasAttribute('async')).toBe(false);
    expect(script.hasAttribute('src')).toBe(false);
    expect(script.getAttribute('onload')).toBeNull();
    expect(script.getAttribute('onerror')).toBeNull();

    const body = script.innerHTML;
    expect(body).toContain(ADS_HIDDEN_COOKIE_NAME);
    expect(body).toContain('document.cookie');
  });
});

/**
 * Branch coverage for the dev-only console.error filter prefix.
 *
 * The filter is computed at module-load time from `process.env.NODE_ENV`, so
 * each branch must load the module under a freshly stubbed env. `vi.stubEnv`
 * + `vi.resetModules()` + dynamic `await import()` is the standard Vitest
 * pattern for module-level env-derived constants.
 */
describe('ThemeScript dev/prod filter branch', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('includes the console.error filter prefix when NODE_ENV !== "production"', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { ThemeScript: DevThemeScript } = await import('./ThemeScript');

    const element = await DevThemeScript();
    const { container } = render(element);
    const body = container.querySelector('script')!.innerHTML;
    expect(body).toContain(FILTER_FRAGMENT);
    expect(body).toContain('console.error');
    expect(body).toContain(THEME_STORAGE_KEY);
  });

  it('omits the console.error filter prefix when NODE_ENV === "production"', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { ThemeScript: ProdThemeScript } = await import('./ThemeScript');

    const element = await ProdThemeScript();
    const { container } = render(element);
    const body = container.querySelector('script')!.innerHTML;
    expect(body).not.toContain(FILTER_FRAGMENT);
    expect(body).not.toContain('console.error');
    expect(body).toContain(THEME_STORAGE_KEY);
  });
});
