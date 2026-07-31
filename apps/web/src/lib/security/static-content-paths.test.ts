import { describe, expect, it } from 'vitest';

import { isStaticContentPath } from './static-content-paths';

describe('isStaticContentPath', () => {
  it.each([
    '/en/faq',
    '/ja/privacy',
    '/ja/terms',
    '/es/glossary',
    '/pt-BR/glossary/letter/a',
    '/en/articles',
    '/ja/articles/some-slug',
    '/en/dojo/ranks',
    '/ja/dojo/guides/5kyu',
    '/en/learn/basics/notation',
    '/ja/practice',
    '/en/practice/coordinate-quiz',
    '/ja/games/new',
    '/en/games/new/pgn',
    '/ja/announcements',
    '/en/pricing',
    '/ja/preferences',
    '/en/manual/some-page',
    '/ja/licenses',
    '/en/interview',
    '/ja/getting-started',
    '/en/coin',
    '/ja/contact',
    '/en/affiliate-disclosure',
    '/ja/company',
    '/en/games',
    '/ja/games/bulk-delete',
    '/en/games/play/error',
  ])('matches prerendered content route %s', (path) => {
    expect(isStaticContentPath(path)).toBe(true);
  });

  it.each([
    // Auth-carrying / personalized / UGC-heavy surfaces keep the nonce policy.
    '/en/mypage',
    '/ja/mypage/subscription',
    '/en/sign-in',
    '/ja', // home feed
    '/ja/', // home feed with trailing slash
    '/en/topics',
    '/ja/u/someone',
    '/ja/games/play', // the Stockfish/auth play surface keeps the nonce policy
    '/en/games/shared', // shared-game pages are dynamic UGC surfaces
    '/en/games/newer', // prefix must not bleed past the segment boundary
    '/ja/repertoires',
    '/en/chunks',
    '/ja/leaderboard/score/all-time',
    '/en/notifications',
    // Non-[locale] surfaces are dynamic by design.
    '/',
    '/admin',
    '/admin/users',
    '/embed/g/abc',
    '/auth/callback',
    '/api/csp-report',
    // Unknown first segment is not a locale.
    '/fr/faq',
    '/faq',
  ])('leaves %s on the per-request-nonce policy', (path) => {
    expect(isStaticContentPath(path)).toBe(false);
  });
});
