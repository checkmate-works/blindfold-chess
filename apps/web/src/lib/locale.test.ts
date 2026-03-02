import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCookieGet = vi.fn();
const mockHeadersGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: mockCookieGet,
    }),
  headers: () =>
    Promise.resolve({
      get: mockHeadersGet,
    }),
}));

vi.mock('server-only', () => ({}));

// Dynamic import to ensure mocks are in place
const { getLocaleFromRequest } = await import('./locale');

describe('getLocaleFromRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
    mockHeadersGet.mockReturnValue(null);
  });

  describe('cookie-based detection', () => {
    it('should return en when cookie is en', async () => {
      mockCookieGet.mockReturnValue({ value: 'en' });

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });

    it('should return ja when cookie is ja', async () => {
      mockCookieGet.mockReturnValue({ value: 'ja' });

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('ja');
    });

    it('should ignore unsupported locale in cookie and fall through', async () => {
      mockCookieGet.mockReturnValue({ value: 'fr' });

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });

    it('should ignore empty cookie value and fall through', async () => {
      mockCookieGet.mockReturnValue({ value: '' });

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });
  });

  describe('Accept-Language header detection', () => {
    it('should detect ja from Accept-Language header', async () => {
      mockHeadersGet.mockReturnValue('ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7');

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('ja');
    });

    it('should detect en from Accept-Language header', async () => {
      mockHeadersGet.mockReturnValue('en-US,en;q=0.9');

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });

    it('should detect locale from language prefix (ja-JP -> ja)', async () => {
      mockHeadersGet.mockReturnValue('ja-JP');

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('ja');
    });

    it('should fall back to default when Accept-Language has no supported locale', async () => {
      mockHeadersGet.mockReturnValue('fr-FR,de;q=0.9');

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });
  });

  describe('priority', () => {
    it('should prioritize cookie over Accept-Language header', async () => {
      mockCookieGet.mockReturnValue({ value: 'en' });
      mockHeadersGet.mockReturnValue('ja-JP,ja;q=0.9');

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });
  });

  describe('default fallback', () => {
    it('should return en when no cookie and no Accept-Language header', async () => {
      const locale = await getLocaleFromRequest();

      expect(locale).toBe('en');
    });
  });
});
