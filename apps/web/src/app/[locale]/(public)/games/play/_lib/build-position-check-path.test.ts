import { describe, expect, it } from 'vitest';

import { decodeFenFromBase64Url } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_lib/share-url';

import { buildPositionCheckPath } from './build-position-check-path';

describe('buildPositionCheckPath', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  it('targets the instant-problem session with skipMemorize and returnTo', () => {
    const path = buildPositionCheckPath({
      locale: 'ja',
      fen,
      returnTo: '/ja/games/play?gameId=abc&color=white',
    });

    const [pathname, query] = path.split('?');
    const params = new URLSearchParams(query);

    expect(pathname).toMatch(/^\/ja\/practice\/position-memory\/custom\/[A-Za-z0-9_-]+\/session$/);
    expect(params.get('skipMemorize')).toBe('1');
    expect(params.get('returnTo')).toBe('/ja/games/play?gameId=abc&color=white');
  });

  it('round-trips the FEN through the URL token', () => {
    const path = buildPositionCheckPath({ locale: 'en', fen, returnTo: '/en/games/play' });
    const token = path.split('/custom/')[1].split('/session')[0];

    expect(decodeFenFromBase64Url(token)).toBe(fen);
  });
});
