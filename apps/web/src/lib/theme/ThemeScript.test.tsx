import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AdHideBootstrapScript } from '@/lib/ads/AdHideBootstrapScript';

import { ThemeScript } from './ThemeScript';

/**
 * Regression guard for SPEC1: React 19 emits "Encountered a script tag while
 * rendering" whenever a <script> element is part of the React tree on the
 * client (including RSC payload reconciliation during in-app navigation such
 * as locale switching).
 *
 * Both inline-bootstrap components are Client Components that intentionally
 * gate their <script> emit on `typeof window === 'undefined'`, so the script
 * is produced during SSR only. Vitest runs in jsdom, where `window` is
 * defined, so rendering these components here must produce no <script>
 * element. If anyone re-introduces unconditional <script> rendering, this
 * test fails.
 */
describe('SSR-only inline bootstrap scripts', () => {
  afterEach(() => {
    cleanup();
  });

  it('ThemeScript renders nothing on the client', () => {
    const { container } = render(<ThemeScript />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('AdHideBootstrapScript renders nothing on the client', () => {
    const { container } = render(<AdHideBootstrapScript />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).toBe('');
  });
});
