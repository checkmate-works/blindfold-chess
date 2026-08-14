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

  // Phase-2 (R1): pt-BR adds a mixed-case, regionally-qualified locale to the
  // supported list. The parser must (a) match case-insensitively so a
  // browser-sent lowercase `pt-br` still resolves, and (b) fall back by
  // primary subtag so bare `pt` (or `pt-PT` from Portugal) still resolves to
  // our `pt-BR` translation instead of falling through to English.
  describe('Accept-Language: case insensitivity and prefix fallback (pt-BR, R1)', () => {
    it('matches pt-BR exactly when the browser sends mixed-case with weighted list', async () => {
      mockHeadersGet.mockReturnValue('pt-BR,pt;q=0.9,en-US;q=0.8');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('matches pt-BR when the browser sends lowercase pt-br', async () => {
      mockHeadersGet.mockReturnValue('pt-br');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('matches pt-BR when the browser sends uppercase PT-BR', async () => {
      mockHeadersGet.mockReturnValue('PT-BR');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('falls back from bare pt to pt-BR via primary-subtag match', async () => {
      mockHeadersGet.mockReturnValue('pt');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('falls back from pt-PT to pt-BR via primary-subtag match (the only pt variant we ship)', async () => {
      mockHeadersGet.mockReturnValue('pt-PT');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('falls back from en-GB to en via primary-subtag match', async () => {
      mockHeadersGet.mockReturnValue('en-GB');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('en');
    });

    it('returns the default (en) for fr-FR since no supported locale shares that primary subtag', async () => {
      mockHeadersGet.mockReturnValue('fr-FR');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('en');
    });

    it('returns the default for the `*` wildcard token', async () => {
      mockHeadersGet.mockReturnValue('*');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('en');
    });

    it('skips unsupported primary tokens and resolves a later pt-BR entry', async () => {
      // First entry `de` has no supported primary-subtag match and must not
      // short-circuit. The parser is expected to continue to the next entry
      // and resolve `pt-BR`.
      mockHeadersGet.mockReturnValue('de,pt-BR;q=0.9');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });

    it('tolerates excess whitespace inside tokens', async () => {
      mockHeadersGet.mockReturnValue('  pt-BR , pt;q=0.9  ');
      const locale = await getLocaleFromRequest();
      expect(locale).toBe('pt-BR');
    });
  });

  // Boundary: getLocaleFromRequest uses strict `isValidLocale` comparison on
  // the cookie path — lowercase `pt-br` is NOT normalized to `pt-BR`. This
  // documents the current behaviour so a future normalization change is
  // explicit. See also: parseAcceptLanguage, which IS case-insensitive.
  describe('Cookie-based detection: case-sensitivity boundary', () => {
    it('accepts cookie value pt-BR as-is', async () => {
      mockCookieGet.mockReturnValue({ value: 'pt-BR' });

      const locale = await getLocaleFromRequest();

      expect(locale).toBe('pt-BR');
    });

    it('rejects lowercase cookie value pt-br (cookie path is case-sensitive) and falls through', async () => {
      // Intentionally asserting the current strict behaviour: cookies are
      // emitted by our own UI and should always match a canonical locale
      // value. If a malformed cookie sneaks in (e.g., from an old browser
      // session), we treat it as invalid and fall through to the
      // Accept-Language header / default. This is distinct from the
      // Accept-Language path, which normalizes casing.
      mockCookieGet.mockReturnValue({ value: 'pt-br' });

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
