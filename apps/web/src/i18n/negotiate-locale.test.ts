import { describe, expect, it } from 'vitest';

import { negotiateLocale } from './negotiate-locale';

describe('negotiateLocale', () => {
  it('falls back to the default locale when the header is missing or empty', () => {
    expect(negotiateLocale(null)).toBe('en');
    expect(negotiateLocale('')).toBe('en');
  });

  it('matches a supported locale exactly', () => {
    expect(negotiateLocale('ja')).toBe('ja');
    expect(negotiateLocale('pt-BR')).toBe('pt-BR');
  });

  it('is case-insensitive about the region subtag', () => {
    expect(negotiateLocale('pt-br')).toBe('pt-BR');
  });

  it('falls back to the primary subtag for an unsupported region', () => {
    expect(negotiateLocale('en-GB')).toBe('en');
    // Portugal has no translation of its own — pt-BR is the near match.
    expect(negotiateLocale('pt-PT')).toBe('pt-BR');
    expect(negotiateLocale('es-MX')).toBe('es');
  });

  it('honours q-values over header order', () => {
    expect(negotiateLocale('en;q=0.5,ja;q=0.9')).toBe('ja');
    expect(negotiateLocale('fr,ja;q=0.8')).toBe('ja');
  });

  it('keeps header order among equal q-values', () => {
    expect(negotiateLocale('ja,en')).toBe('ja');
    expect(negotiateLocale('en,ja')).toBe('en');
  });

  it('skips languages it does not support', () => {
    expect(negotiateLocale('fr-FR,de;q=0.7')).toBe('en');
  });

  it('ignores the wildcard and zero-weight entries', () => {
    expect(negotiateLocale('*')).toBe('en');
    expect(negotiateLocale('ja;q=0,es')).toBe('es');
  });

  it('handles the header a real browser sends', () => {
    expect(negotiateLocale('ja,en-US;q=0.9,en;q=0.8')).toBe('ja');
  });
});
