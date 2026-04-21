import { SUPPORTED_LOCALES } from '@/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('landing URL builders', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.blindfold-chess.online';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  describe('buildLandingUrl', () => {
    it('maps en to bare / (the default locale is the primary entrypoint)', async () => {
      const { buildLandingUrl } = await import('./landing-urls');
      expect(buildLandingUrl('en')).toBe('https://www.blindfold-chess.online/');
    });

    it('maps ja to /?lang=ja', async () => {
      const { buildLandingUrl } = await import('./landing-urls');
      expect(buildLandingUrl('ja')).toBe('https://www.blindfold-chess.online/?lang=ja');
    });

    it('maps es to /?lang=es', async () => {
      const { buildLandingUrl } = await import('./landing-urls');
      expect(buildLandingUrl('es')).toBe('https://www.blindfold-chess.online/?lang=es');
    });

    it('maps pt-BR to /?lang=pt-BR (region-qualified, unencoded hyphen)', async () => {
      const { buildLandingUrl } = await import('./landing-urls');
      expect(buildLandingUrl('pt-BR')).toBe('https://www.blindfold-chess.online/?lang=pt-BR');
    });
  });

  describe('buildLandingLanguageAlternates', () => {
    it('emits one entry per SUPPORTED_LOCALES plus x-default', async () => {
      const { buildLandingLanguageAlternates } = await import('./landing-urls');
      const languages = buildLandingLanguageAlternates();
      const keys = Object.keys(languages).sort();
      const expected = [...SUPPORTED_LOCALES, 'x-default'].sort();
      expect(keys).toEqual(expected);
    });

    it('points x-default at the bare / URL (en default)', async () => {
      const { buildLandingLanguageAlternates } = await import('./landing-urls');
      const languages = buildLandingLanguageAlternates();
      expect(languages['x-default']).toBe('https://www.blindfold-chess.online/');
    });

    it('each locale points at its landing URL variant', async () => {
      const { buildLandingLanguageAlternates, buildLandingUrl } = await import('./landing-urls');
      const languages = buildLandingLanguageAlternates();
      for (const locale of SUPPORTED_LOCALES) {
        expect(languages[locale]).toBe(buildLandingUrl(locale));
      }
    });

    it('en entry is bare / (not /?lang=en) — the SEO contract depends on this', async () => {
      const { buildLandingLanguageAlternates } = await import('./landing-urls');
      const languages = buildLandingLanguageAlternates();
      expect(languages['en']).toBe('https://www.blindfold-chess.online/');
    });
  });
});
