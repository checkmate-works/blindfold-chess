// @ts-expect-error -- Next.js vendors path-to-regexp without type declarations.
// It is imported from there on purpose: `headers()` sources are compiled by
// THIS copy, so asserting against it tests the pattern Next will actually use.
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp';

import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it, vi } from 'vitest';

import nextConfig from '../../../next.config';
import {
  EMBED_CDN_CACHE_CONTROL,
  embedLangNeedsCollapse,
  isCdnCacheableEmbedRequest,
} from './embed-cdn-cache';

vi.mock('next-intl/plugin', () => ({
  default: () => (config: unknown) => config,
}));

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
}));

type HeaderRule = {
  source: string;
  has?: { type: string; key: string; value?: string }[];
  headers: { key: string; value: string }[];
};

async function cdnRule(): Promise<HeaderRule> {
  const rules = (await nextConfig.headers!()) as HeaderRule[];
  const matches = rules.filter((rule) =>
    rule.headers.some((header) => header.key === 'Vercel-CDN-Cache-Control')
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

/**
 * Whether the config rule selects a request, evaluated the way Next's own
 * `matchHas` does: `value` wrapped in `^…$`, and the LAST value of a repeated
 * query key. The proxy collapses repeated `lang` before this can matter; the
 * last-value reading is kept so the tests describe the rule as it really is.
 */
async function ruleSelects(path: string): Promise<boolean> {
  const rule = await cdnRule();
  const url = new URL(path, 'https://example.test');
  if (!pathToRegexp(rule.source).test(url.pathname)) return false;
  return (rule.has ?? []).every((item) => {
    if (item.type !== 'query') throw new Error(`unexpected has type ${item.type}`);
    const values = url.searchParams.getAll(item.key);
    if (values.length === 0) return false;
    if (item.value === undefined) return true;
    return new RegExp(`^${item.value}$`).test(values[values.length - 1]);
  });
}

function cacheable(path: string): boolean {
  const url = new URL(path, 'https://example.test');
  return isCdnCacheableEmbedRequest(url.pathname, url.searchParams);
}

const SELECTED = [
  ...SUPPORTED_LOCALES.map((locale) => `/embed/g/abc123?lang=${locale}`),
  '/embed/g/abc123?view=plain&lang=ja&bg=dark&ply=12',
  '/embed?lang=en',
  '/embed/g/0b7c2a9e-1111-4c3d-9e2f-5a6b7c8d9e0f?lang=pt-BR',
];

const NOT_SELECTED = [
  // The default: negotiated from Accept-Language, so per-reader.
  '/embed/g/abc123',
  '/embed/g/abc123?bg=dark&view=plain',
  // Values the page does not accept fall back to negotiation.
  '/embed/g/abc123?lang=',
  '/embed/g/abc123?lang=fr',
  '/embed/g/abc123?lang=JA',
  '/embed/g/abc123?lang=pt-br',
  '/embed/g/abc123?lang=xen',
  '/embed/g/abc123?lang=jax',
  // Pinned language, but not the embed surface.
  '/ja/games/shared/some-id?lang=ja',
  '/embedded-thing?lang=ja',
];

describe('isCdnCacheableEmbedRequest', () => {
  it.each(SELECTED)('caches %s', (path) => {
    expect(cacheable(path)).toBe(true);
  });

  it.each(NOT_SELECTED)('does not cache %s', (path) => {
    expect(cacheable(path)).toBe(false);
  });

  it('does not cache a repeated lang, whichever value is valid', () => {
    expect(cacheable('/embed/g/abc123?lang=xx&lang=ja')).toBe(false);
    expect(cacheable('/embed/g/abc123?lang=ja&lang=en')).toBe(false);
  });
});

describe('embedLangNeedsCollapse', () => {
  it('flags an embed URL with more than one lang', () => {
    const url = new URL('https://example.test/embed/g/abc123?lang=xx&lang=ja');
    expect(embedLangNeedsCollapse(url.pathname, url.searchParams)).toBe(true);
  });

  it('leaves single-lang embeds and non-embed paths alone', () => {
    for (const path of ['/embed/g/abc123?lang=ja', '/embed/g/abc123', '/ja/faq?lang=a&lang=b']) {
      const url = new URL(path, 'https://example.test');
      expect(embedLangNeedsCollapse(url.pathname, url.searchParams), path).toBe(false);
    }
  });
});

describe("next.config's Vercel-CDN-Cache-Control rule", () => {
  it('carries the documented directive', async () => {
    const rule = await cdnRule();
    expect(rule.headers).toEqual([
      { key: 'Vercel-CDN-Cache-Control', value: EMBED_CDN_CACHE_CONTROL },
    ]);
  });

  it('never tells a browser or downstream cache to store the page', async () => {
    // A plain `Cache-Control` / `CDN-Cache-Control` from config would either
    // lose to Next's own header or leak the TTL past Vercel.
    const rule = await cdnRule();
    expect(rule.headers.map((h) => h.key)).toEqual(['Vercel-CDN-Cache-Control']);
  });

  it.each(SELECTED)('selects %s, as the proxy does', async (path) => {
    expect(await ruleSelects(path)).toBe(true);
  });

  it.each(NOT_SELECTED)('skips %s, as the proxy does', async (path) => {
    expect(await ruleSelects(path)).toBe(false);
  });

  it('lists exactly the supported locales', async () => {
    // Guards the literal in next.config.ts: a locale added to
    // SUPPORTED_LOCALES but not there is merely uncached, one removed from
    // SUPPORTED_LOCALES but left there would cache a negotiated body.
    const rule = await cdnRule();
    const value = rule.has?.find((item) => item.key === 'lang')?.value;
    const listed = value?.match(/\(\?:(.*)\)/)?.[1].split('|');
    expect(new Set(listed)).toEqual(new Set(SUPPORTED_LOCALES));
  });
});
