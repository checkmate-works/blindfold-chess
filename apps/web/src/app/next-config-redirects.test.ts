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

async function getRules(): Promise<RedirectRule[]> {
  return (await nextConfig.redirects!()) as RedirectRule[];
}

describe('next.config redirects — legacy guide URL migration (2026-04)', () => {
  it('exposes an async redirects() function', () => {
    expect(typeof nextConfig.redirects).toBe('function');
  });

  it('redirects /:locale/ranks/:slug/guide straight to the dojo guides hub (single hop)', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source === '/:locale/ranks/:slug/guide');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/dojo/guides/:slug');
    expect(rule!.permanent).toBe(true);
  });

  it('redirects /:locale/ranks/:slug/guide/:page straight to the dojo numbered page (single hop)', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source === '/:locale/ranks/:slug/guide/:page(\\d+)');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/dojo/guides/:slug/:page');
    expect(rule!.permanent).toBe(true);
  });

  it('constrains the page segment to digits only (non-numeric chapter slugs do not match)', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source.startsWith('/:locale/ranks/:slug/guide/:page'));
    expect(rule).toBeDefined();
    // The source is constrained via the `:page(\d+)` regex parameter syntax.
    expect(rule!.source).toContain('(\\d+)');
  });
});

describe('next.config redirects — dojo namespace migration (2026-07)', () => {
  it('redirects /:locale/guides/ranks/:path* to /:locale/dojo/guides/:path* (drops the ranks segment)', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source === '/:locale/guides/ranks/:path*');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/dojo/guides/:path*');
    expect(rule!.permanent).toBe(true);
  });

  it('redirects the bare /:locale/guides index to /:locale/dojo/guides', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source === '/:locale/guides');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/dojo/guides');
    expect(rule!.permanent).toBe(true);
  });

  it('redirects /:locale/ranks/:path* to /:locale/dojo/ranks/:path*', async () => {
    const rules = await getRules();
    const rule = rules.find((r) => r.source === '/:locale/ranks/:path*');
    expect(rule).toBeDefined();
    expect(rule!.destination).toBe('/:locale/dojo/ranks/:path*');
    expect(rule!.permanent).toBe(true);
  });

  it('keeps the legacy /ranks/:slug/guide rules ABOVE the generic ranks rule (redirects are first-match)', async () => {
    const rules = await getRules();
    const genericRanksIndex = rules.findIndex((r) => r.source === '/:locale/ranks/:path*');
    const legacyGuideIndexes = rules
      .map((r, i) => (r.source.startsWith('/:locale/ranks/:slug/guide') ? i : -1))
      .filter((i) => i !== -1);
    expect(genericRanksIndex).toBeGreaterThan(-1);
    expect(legacyGuideIndexes).toHaveLength(2);
    for (const legacyIndex of legacyGuideIndexes) {
      expect(legacyIndex).toBeLessThan(genericRanksIndex);
    }
  });

  it('no rule redirects into the retired /guides/ranks/ or top-level /ranks namespaces', async () => {
    const rules = await getRules();
    for (const rule of rules) {
      expect(rule.destination).not.toContain('/guides/ranks/');
      expect(rule.destination).not.toMatch(/^\/:locale\/ranks(\/|$)/);
    }
  });
});
