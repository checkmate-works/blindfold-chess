// @vitest-environment jsdom
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { localeFromPathname, useErrorBoundary } from './use-error-boundary';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

const COPY_KEYS = ['title', 'description', 'tryAgain', 'goHome'] as const;

function renderAt(pathname: string) {
  window.history.replaceState({}, '', pathname);
  return renderHook(() => useErrorBoundary(new Error('boom')));
}

describe('useErrorBoundary', () => {
  /**
   * The compiler already rejects a missing locale (`satisfies Record<Locale,
   * …>`), but not a locale whose entry was filled in with the English text to
   * make the compiler happy — which is the failure this boundary actually had.
   */
  describe('copy', () => {
    it.each([...SUPPORTED_LOCALES])('has all four strings for %s', (locale) => {
      const { result } = renderAt(`/${locale}/practice`);

      expect(result.current.locale).toBe(locale);
      for (const key of COPY_KEYS) {
        expect(result.current.t[key].length).toBeGreaterThan(0);
      }
    });

    it('translates rather than repeating English in every locale', () => {
      const titles = SUPPORTED_LOCALES.map(
        (locale) => renderAt(`/${locale}`).result.current.t.title
      );

      expect(new Set(titles).size).toBe(SUPPORTED_LOCALES.length);
    });
  });

  it('reports the error to Sentry', () => {
    const error = new Error('boom');
    window.history.replaceState({}, '', '/en');

    renderHook(() => useErrorBoundary(error));

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});

describe('localeFromPathname', () => {
  it.each([...SUPPORTED_LOCALES])('reads %s off the first segment', (locale) => {
    expect(localeFromPathname(`/${locale}/practice/legal-moves`)).toBe(locale);
    expect(localeFromPathname(`/${locale}`)).toBe(locale);
  });

  it('accepts a mis-cased pt-BR segment and returns the canonical form', () => {
    expect(localeFromPathname('/pt-br/practice')).toBe('pt-BR');
    expect(localeFromPathname('/PT-BR/practice')).toBe('pt-BR');
  });

  it.each([
    // No locale prefix at all — what the boundary sees on a route outside the
    // `[locale]` tree, and during SSR, where the pathname is empty.
    ['', 'empty pathname (SSR)'],
    ['/', 'the landing page'],
    ['/admin/users', 'a non-localized route tree'],
    // A segment that merely starts with a locale. `startsWith('/ja')` used to
    // hand this one Japanese copy.
    ['/japanese-openings', 'a segment beginning with a locale'],
    // `pt` is a language tag we negotiate from `Accept-Language`, but never a
    // route segment we serve.
    ['/pt/practice', 'a primary subtag that is not a route'],
    ['/fr/practice', 'an unsupported locale'],
  ])('falls back to the default locale for %s (%s)', (pathname) => {
    expect(localeFromPathname(pathname)).toBe(DEFAULT_LOCALE);
  });
});
