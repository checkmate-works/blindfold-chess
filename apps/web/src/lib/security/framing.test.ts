// @ts-expect-error -- Next.js vendors path-to-regexp without type declarations.
// It is imported from there on purpose: `headers()` sources are compiled by
// THIS copy, so asserting against it tests the pattern Next will actually use.
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp';

import { describe, expect, it, vi } from 'vitest';

import nextConfig from '../../../next.config';
import { EMBED_PATH_SEGMENT, isFramablePath } from './framing';

// Same pass-through stubs as `src/app/next-config-redirects.test.ts` — the
// config is wrapped by both plugins and neither is needed to read its rules.
vi.mock('next-intl/plugin', () => ({
  default: () => (config: unknown) => config,
}));

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
}));

type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

async function frameOptionsRule(): Promise<HeaderRule> {
  const rules = (await nextConfig.headers!()) as HeaderRule[];
  const matches = rules.filter((rule) =>
    rule.headers.some((header) => header.key === 'X-Frame-Options')
  );
  // More than one rule setting it would emit the header twice on any path both
  // match, which browsers treat as a conflicting (and therefore denied) policy.
  expect(matches).toHaveLength(1);
  return matches[0];
}

describe('isFramablePath', () => {
  it('permits the embed surface and everything under it', () => {
    expect(isFramablePath('/embed')).toBe(true);
    expect(isFramablePath('/embed/g/abc123')).toBe(true);
  });

  it('refuses every other path', () => {
    expect(isFramablePath('/')).toBe(false);
    expect(isFramablePath('/ja/games/shared/some-id')).toBe(false);
    expect(isFramablePath('/ja/mypage')).toBe(false);
    expect(isFramablePath('/admin')).toBe(false);
    expect(isFramablePath('/g/abc123')).toBe(false);
  });

  it('does not treat a path that merely starts with the segment as the embed surface', () => {
    expect(isFramablePath('/embedded-thing')).toBe(false);
  });
});

describe("next.config's X-Frame-Options rule", () => {
  it('denies framing everywhere the CSP does', async () => {
    const rule = await frameOptionsRule();
    const matches = pathToRegexp(rule.source);

    for (const pathname of [
      '/',
      '/ja/games/shared/some-id',
      '/ja/mypage',
      '/admin',
      '/g/abc123',
      '/embedded-thing',
    ]) {
      expect(isFramablePath(pathname)).toBe(false);
      expect(matches.test(pathname), `${pathname} must receive X-Frame-Options`).toBe(true);
    }
  });

  it('leaves the header off exactly where the CSP allows framing', async () => {
    const rule = await frameOptionsRule();
    const matches = pathToRegexp(rule.source);

    for (const pathname of [`/${EMBED_PATH_SEGMENT}`, `/${EMBED_PATH_SEGMENT}/g/abc123`]) {
      expect(isFramablePath(pathname)).toBe(true);
      expect(matches.test(pathname), `${pathname} must NOT receive X-Frame-Options`).toBe(false);
    }
  });

  it('still denies framing by default', async () => {
    const rule = await frameOptionsRule();
    expect(rule.headers.find((h) => h.key === 'X-Frame-Options')!.value).toBe('DENY');
  });
});
