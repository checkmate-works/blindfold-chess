import { describe, expect, it } from 'vitest';

import { findSupportedLocale, isSupportedLocale, matchLanguageTag } from './supported-locale';

describe('isSupportedLocale', () => {
  it('accepts the canonical identifiers', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('pt-BR')).toBe(true);
  });

  it('rejects a mis-cased identifier', () => {
    // The values it guards (our own cookie, `?lang=`, a Server Action
    // argument) are emitted by this app, so a casing variant is corruption
    // rather than a browser convention.
    expect(isSupportedLocale('pt-br')).toBe(false);
    expect(isSupportedLocale('EN')).toBe(false);
  });

  it('rejects unsupported and empty values', () => {
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('pt')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });
});

describe('findSupportedLocale', () => {
  it('normalizes casing to the canonical identifier', () => {
    expect(findSupportedLocale('pt-br')).toBe('pt-BR');
    expect(findSupportedLocale('PT-BR')).toBe('pt-BR');
    expect(findSupportedLocale('JA')).toBe('ja');
  });

  it('does not fall back to the primary subtag', () => {
    // `/pt/x` is not a route we serve, so `needsLocalePrefix` must not treat
    // it as an already-localized path.
    expect(findSupportedLocale('pt')).toBeUndefined();
    expect(findSupportedLocale('en-GB')).toBeUndefined();
  });
});

describe('matchLanguageTag', () => {
  it('prefers an exact match over the primary subtag', () => {
    expect(matchLanguageTag('pt-BR')).toBe('pt-BR');
    expect(matchLanguageTag('en')).toBe('en');
  });

  it('falls back to the primary subtag', () => {
    expect(matchLanguageTag('pt')).toBe('pt-BR');
    expect(matchLanguageTag('pt-PT')).toBe('pt-BR');
    expect(matchLanguageTag('en-GB')).toBe('en');
    expect(matchLanguageTag('es-MX')).toBe('es');
  });

  it('returns undefined when nothing shares a primary subtag', () => {
    expect(matchLanguageTag('fr-FR')).toBeUndefined();
    expect(matchLanguageTag('')).toBeUndefined();
  });
});
