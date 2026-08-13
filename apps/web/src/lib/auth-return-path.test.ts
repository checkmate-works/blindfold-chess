import { describe, expect, it } from 'vitest';

import { resolveReturnPath, withReturnPath } from './auth-return-path';

describe('resolveReturnPath', () => {
  it('accepts ordinary in-app paths, query and hash included', () => {
    expect(resolveReturnPath('/ja/games/play/result')).toBe('/ja/games/play/result');
    expect(resolveReturnPath('/en/leaderboard/score/all?page=3')).toBe(
      '/en/leaderboard/score/all?page=3'
    );
    expect(resolveReturnPath('/ja/chunks/foo#comments')).toBe('/ja/chunks/foo#comments');
  });

  it('delegates the open-redirect guard to sanitizeNext', () => {
    expect(resolveReturnPath('//evil.com')).toBeNull();
    expect(resolveReturnPath('https://evil.com')).toBeNull();
    expect(resolveReturnPath('/\\evil.com')).toBeNull();
    expect(resolveReturnPath(null)).toBeNull();
  });

  it('rejects auth screens so signing in cannot bounce back to itself', () => {
    expect(resolveReturnPath('/ja/sign-in')).toBeNull();
    expect(resolveReturnPath('/en/sign-up')).toBeNull();
    expect(resolveReturnPath('/pt-BR/forgot-password')).toBeNull();
    expect(resolveReturnPath('/es/reset-password')).toBeNull();
    expect(resolveReturnPath('/ja/banned')).toBeNull();
  });

  it('rejects auth screens in their locale-less form too', () => {
    expect(resolveReturnPath('/sign-in')).toBeNull();
    expect(resolveReturnPath('/sign-up')).toBeNull();
  });

  it('rejects an auth screen carrying its own query or hash', () => {
    // The header link renders on `/sign-in?next=…` as well, so the returnable
    // check has to look past the query to catch the self-reference.
    expect(resolveReturnPath('/ja/sign-in?next=%2Fja%2Fmypage')).toBeNull();
    expect(resolveReturnPath('/ja/sign-in#form')).toBeNull();
  });

  it('does not mistake a longer path for an auth screen', () => {
    expect(resolveReturnPath('/ja/sign-in-guide')).toBe('/ja/sign-in-guide');
    expect(resolveReturnPath('/ja/dojo/sign-in')).toBe('/ja/dojo/sign-in');
  });

  it('treats an unknown first segment as a plain path segment', () => {
    // `fr` is not a supported locale, so nothing is stripped and the path is
    // compared as-is (it 404s later, but that is not this function's call).
    expect(resolveReturnPath('/fr/sign-in')).toBe('/fr/sign-in');
  });
});

describe('withReturnPath', () => {
  it('appends an encoded next', () => {
    expect(withReturnPath('/sign-in', '/ja/games/play/result?gameId=a&x=1')).toBe(
      '/sign-in?next=%2Fja%2Fgames%2Fplay%2Fresult%3FgameId%3Da%26x%3D1'
    );
  });

  it('preserves a query the base already carries', () => {
    expect(withReturnPath('/ja/sign-in?toast=sign_in_required', '/ja/mypage/coins')).toBe(
      '/ja/sign-in?toast=sign_in_required&next=%2Fja%2Fmypage%2Fcoins'
    );
  });

  it('returns the base untouched when next is unusable', () => {
    expect(withReturnPath('/sign-in', '//evil.com')).toBe('/sign-in');
    expect(withReturnPath('/sign-in', '/ja/sign-in')).toBe('/sign-in');
    expect(withReturnPath('/sign-in', undefined)).toBe('/sign-in');
  });
});
