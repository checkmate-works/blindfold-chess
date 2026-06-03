import { describe, expect, it } from 'vitest';

import type { AttachmentInputDetect } from '@/lib/games/validation';

import { pgnSubModeError, urlSubModeError } from './attachment-sub-mode-error';

describe('pgnSubModeError', () => {
  it('passes a PGN body and empty/no detection', () => {
    expect(pgnSubModeError(null)).toBeNull();
    expect(pgnSubModeError({ kind: 'empty' })).toBeNull();
    expect(pgnSubModeError({ kind: 'pgn', text: '1. e4 e5' })).toBeNull();
  });

  it('redirects a Lichess URL to the URL tab', () => {
    expect(pgnSubModeError({ kind: 'lichess', gameId: 'abc' })).toMatch(/Lichess URL tab/);
    expect(pgnSubModeError({ kind: 'lichess_embed', embedId: 'abc', sourceUrl: 'x' })).toMatch(
      /Lichess URL tab/
    );
  });

  it('rejects chess.com shapes with the paste-PGN guidance', () => {
    expect(pgnSubModeError({ kind: 'chesscom_invalid_url' })).toMatch(/chess\.com/);
  });

  it('flags unknown input as not-a-PGN', () => {
    expect(pgnSubModeError({ kind: 'unknown' })).toMatch(/PGN/);
  });
});

describe('urlSubModeError', () => {
  it('passes Lichess game / embed URLs and empty', () => {
    expect(urlSubModeError(null)).toBeNull();
    expect(urlSubModeError({ kind: 'empty' })).toBeNull();
    expect(urlSubModeError({ kind: 'lichess', gameId: 'abc' })).toBeNull();
    expect(urlSubModeError({ kind: 'lichess_embed', embedId: 'abc', sourceUrl: 'x' })).toBeNull();
  });

  it('redirects a pasted PGN body to the PGN tab', () => {
    expect(urlSubModeError({ kind: 'pgn', text: '1. e4' })).toMatch(/PGN tab/);
  });

  it('rejects study URLs and chess.com', () => {
    expect(urlSubModeError({ kind: 'lichess_unsupported' })).toMatch(/study/i);
    expect(urlSubModeError({ kind: 'chesscom_invalid_url' })).toMatch(/chess\.com/);
  });

  it('flags unknown input as not-a-Lichess-URL', () => {
    const result = urlSubModeError({ kind: 'unknown' } as AttachmentInputDetect);
    expect(result).toMatch(/Lichess/);
  });
});
