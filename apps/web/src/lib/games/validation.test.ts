import { describe, expect, it } from 'vitest';

import { detectAttachmentInput } from './validation';

describe('detectAttachmentInput', () => {
  it('returns empty for null / undefined / blank', () => {
    expect(detectAttachmentInput(null).kind).toBe('empty');
    expect(detectAttachmentInput(undefined).kind).toBe('empty');
    expect(detectAttachmentInput('').kind).toBe('empty');
    expect(detectAttachmentInput('   \n\t').kind).toBe('empty');
  });

  it('extracts gameId from canonical 8-char Lichess URL', () => {
    const r = detectAttachmentInput('https://lichess.org/abcd1234');
    expect(r.kind).toBe('lichess');
    if (r.kind === 'lichess') {
      expect(r.gameId).toBe('abcd1234');
    }
  });

  it('handles trailing slash', () => {
    const r = detectAttachmentInput('https://lichess.org/abcd1234/');
    expect(r.kind).toBe('lichess');
    if (r.kind === 'lichess') {
      expect(r.gameId).toBe('abcd1234');
    }
  });

  it('truncates 12-char player URL to 8-char canonical id', () => {
    const r = detectAttachmentInput('https://lichess.org/abcd1234abcd/white');
    expect(r.kind).toBe('lichess');
    if (r.kind === 'lichess') {
      expect(r.gameId).toBe('abcd1234');
    }
  });

  it('accepts /black orientation suffix', () => {
    const r = detectAttachmentInput('https://lichess.org/abcd1234abcd/black');
    expect(r.kind).toBe('lichess');
    if (r.kind === 'lichess') {
      expect(r.gameId).toBe('abcd1234');
    }
  });

  it('flags lichess study URL as unsupported (v1)', () => {
    const r = detectAttachmentInput('https://lichess.org/study/AbCdEfGh');
    expect(r.kind).toBe('lichess_unsupported');
  });

  it('parses a chess.com URL alone (no PGN body) into a chesscom_attribution result without pgn', () => {
    const r = detectAttachmentInput('https://www.chess.com/game/live/12345678');
    expect(r.kind).toBe('chesscom_attribution');
    if (r.kind === 'chesscom_attribution') {
      expect(r.attribution).toEqual({
        attributionPlatform: 'chesscom',
        attributionPath: '/game/live/12345678',
      });
      // The original URL is preserved on `sourceUrl` for audit / logging.
      // The renderer never reads it back as an href — it rebuilds from
      // `attributionPlatform` + `attributionPath`.
      expect(r.sourceUrl).toBe('https://www.chess.com/game/live/12345678');
      // No PGN body was supplied — the action layer treats this as a
      // "paste the PGN below the URL" guidance error.
      expect(r.pgn).toBeUndefined();
    }
  });

  it('parses a chess.com URL + PGN body into a chesscom_attribution result with pgn', () => {
    const input = `https://www.chess.com/game/live/12345678
[Event "Live Chess"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6`;
    const r = detectAttachmentInput(input);
    expect(r.kind).toBe('chesscom_attribution');
    if (r.kind === 'chesscom_attribution') {
      expect(r.attribution.attributionPath).toBe('/game/live/12345678');
      expect(r.sourceUrl).toBe('https://www.chess.com/game/live/12345678');
      expect(r.pgn).toBeDefined();
      expect(r.pgn).toContain('1. e4 e5');
      // The URL line itself MUST NOT be carried into the PGN body —
      // chess-core's PGN parser would choke on it.
      expect(r.pgn).not.toContain('chess.com');
    }
  });

  it('flags chess.com URL + non-PGN trailing text as chesscom_invalid_pgn', () => {
    const input = 'https://www.chess.com/game/live/12345678\nhello world this is not pgn';
    const r = detectAttachmentInput(input);
    expect(r.kind).toBe('chesscom_invalid_pgn');
  });

  it('flags a chess.com-shaped URL that fails strict validation as chesscom_invalid_url', () => {
    // Bare apex (chess.com without www) fails the parser's hostname
    // allow-list. We surface a chess.com-specific error, NOT 'unknown',
    // so the message mentions chess.com.
    const r = detectAttachmentInput('https://chess.com/game/live/12345678');
    expect(r.kind).toBe('chesscom_invalid_url');
  });

  it('flags an http:// chess.com URL as chesscom_invalid_url (must be https)', () => {
    const r = detectAttachmentInput('http://www.chess.com/game/live/12345678');
    expect(r.kind).toBe('chesscom_invalid_url');
  });

  it('flags a userinfo-trick chess.com URL as chesscom_invalid_url', () => {
    const r = detectAttachmentInput('https://www.chess.com@evil.tld/foo');
    expect(r.kind).toBe('chesscom_invalid_url');
  });

  it('detects PGN with headers', () => {
    const pgn = '[Event "Test"]\n[White "A"]\n\n1. e4 e5';
    const r = detectAttachmentInput(pgn);
    expect(r.kind).toBe('pgn');
    if (r.kind === 'pgn') {
      expect(r.text).toBe(pgn);
    }
  });

  it('detects headerless PGN starting with move number', () => {
    const r = detectAttachmentInput('1. e4 e5 2. Nf3 Nc6');
    expect(r.kind).toBe('pgn');
  });

  it('returns unknown for arbitrary text', () => {
    const r = detectAttachmentInput('hello world this is just a comment');
    expect(r.kind).toBe('unknown');
  });

  it('returns unknown for an unrelated URL', () => {
    const r = detectAttachmentInput('https://example.com/some/page');
    expect(r.kind).toBe('unknown');
  });
});
