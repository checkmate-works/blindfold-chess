import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetLocaleFromRequest = vi.fn();

vi.mock('@/lib/locale', () => ({
  getLocaleFromRequest: () => mockGetLocaleFromRequest(),
}));

const { getLandingLocale } = await import('./getLandingLocale');

describe('getLandingLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocaleFromRequest.mockResolvedValue('en');
  });

  describe('?lang= query param priority', () => {
    it('returns ja when ?lang=ja', async () => {
      const locale = await getLandingLocale({ lang: 'ja' });
      expect(locale).toBe('ja');
      expect(mockGetLocaleFromRequest).not.toHaveBeenCalled();
    });

    it('returns pt-BR when ?lang=pt-BR (region-qualified)', async () => {
      const locale = await getLandingLocale({ lang: 'pt-BR' });
      expect(locale).toBe('pt-BR');
    });

    it('returns es when ?lang=es', async () => {
      const locale = await getLandingLocale({ lang: 'es' });
      expect(locale).toBe('es');
    });

    it('?lang= wins over cookie / Accept-Language (ensures crawl URL determinism)', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      const locale = await getLandingLocale({ lang: 'es' });
      expect(locale).toBe('es');
    });
  });

  describe('whitelist rejection (security + SEO hygiene)', () => {
    it('falls through on unsupported locale ?lang=fr', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('en');
      const locale = await getLandingLocale({ lang: 'fr' });
      expect(locale).toBe('en');
      expect(mockGetLocaleFromRequest).toHaveBeenCalled();
    });

    it('falls through on empty string ?lang=', async () => {
      const locale = await getLandingLocale({ lang: '' });
      expect(locale).toBe('en');
    });

    it('falls through on injection attempt ?lang=<script>', async () => {
      const locale = await getLandingLocale({ lang: '<script>alert(1)</script>' });
      expect(locale).toBe('en');
    });

    it('does not normalize case (lowercase pt-br is rejected — canonical is pt-BR)', async () => {
      const locale = await getLandingLocale({ lang: 'pt-br' });
      expect(locale).toBe('en');
    });
  });

  describe('array / malformed values', () => {
    it('uses the first value when ?lang=ja&lang=es is given as an array', async () => {
      const locale = await getLandingLocale({ lang: ['ja', 'es'] });
      expect(locale).toBe('ja');
    });

    it('rejects an array whose first entry is unsupported', async () => {
      const locale = await getLandingLocale({ lang: ['fr', 'ja'] });
      expect(locale).toBe('en');
    });
  });

  describe('no ?lang= provided', () => {
    it('delegates to getLocaleFromRequest', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('ja');
      const locale = await getLandingLocale({});
      expect(locale).toBe('ja');
      expect(mockGetLocaleFromRequest).toHaveBeenCalledOnce();
    });

    it('ignores unrelated search params', async () => {
      mockGetLocaleFromRequest.mockResolvedValue('pt-BR');
      const locale = await getLandingLocale({ utm_source: 'twitter', ref: 'hn' });
      expect(locale).toBe('pt-BR');
    });
  });
});
