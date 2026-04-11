import { describe, expect, it, vi } from 'vitest';

import nextConfig from '../../next.config';

// next.config.ts is wrapped with `withNextIntl` and `withSentryConfig`. Both
// plugins normally return the config object (optionally extended). We stub
// them to pass-through so we can import the module under test without needing
// a full Next.js / Sentry build environment.
vi.mock('next-intl/plugin', () => ({
  default: () => (config: unknown) => config,
}));

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
}));

type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

describe('next.config redirects — guide URL migration', () => {
  it('exposes an async redirects() function', () => {
    expect(typeof nextConfig.redirects).toBe('function');
  });

  it('contains a 301 redirect from /:locale/ranks/:slug/guide to the new hub', async () => {
    const rules = (await nextConfig.redirects!()) as RedirectRule[];
    const rule = rules.find((r) => r.source === '/:locale/ranks/:slug/guide');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/guides/ranks/:slug');
    expect(rule!.permanent).toBe(true);
  });

  it('contains a 301 redirect from /:locale/ranks/:slug/guide/:page to the new numbered page', async () => {
    const rules = (await nextConfig.redirects!()) as RedirectRule[];
    const rule = rules.find((r) => r.source === '/:locale/ranks/:slug/guide/:page(\\d+)');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/guides/ranks/:slug/:page');
    expect(rule!.permanent).toBe(true);
  });

  it('constrains the page segment to digits only (non-numeric chapter slugs do not match)', async () => {
    const rules = (await nextConfig.redirects!()) as RedirectRule[];
    const rule = rules.find((r) => r.source.startsWith('/:locale/ranks/:slug/guide/:page'));
    expect(rule).toBeDefined();
    // The source is constrained via the `:page(\d+)` regex parameter syntax.
    expect(rule!.source).toContain('(\\d+)');
  });

  it('does not contain any legacy unprefixed guide destination', async () => {
    const rules = (await nextConfig.redirects!()) as RedirectRule[];
    for (const rule of rules) {
      // Guide destinations should always live under /:locale/guides/...
      if (rule.destination.includes('/guides/ranks/')) {
        expect(rule.destination).toMatch(/^\/:locale\/guides\/ranks\//);
      }
    }
  });
});
