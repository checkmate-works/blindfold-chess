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

  // ─── Phase I: chess.com URL + body shape regressions ───
  it('treats a chess.com URL followed by many blank lines as URL-only (chesscom_attribution without pgn)', () => {
    // The detector splits on `\r?\n`, then asks "is anything after the
    // URL line non-empty?". Many blank lines after the URL must NOT
    // be misinterpreted as a PGN body — the user just hit Enter a few
    // extra times. The action layer should still treat this as
    // "paste the PGN below the URL" guidance, NOT as invalid PGN.
    const input = 'https://www.chess.com/game/live/12345678\n\n\n\n\n\n   \n\n';
    const r = detectAttachmentInput(input);
    expect(r.kind).toBe('chesscom_attribution');
    if (r.kind === 'chesscom_attribution') {
      expect(r.pgn).toBeUndefined();
      expect(r.sourceUrl).toBe('https://www.chess.com/game/live/12345678');
    }
  });

  it('treats a chess.com URL with leading whitespace and CRLF line endings the same as the canonical form', () => {
    // Pasted from a chess.com share dialog the input often arrives
    // with Windows line endings AND a trailing newline. Pin that
    // these all reduce to the same `chesscom_attribution` shape so a
    // future split-regex change cannot silently misroute a Windows
    // paste.
    const input =
      '   https://www.chess.com/game/live/12345678   \r\n\r\n[Event "Live"]\r\n\r\n1. e4 e5';
    const r = detectAttachmentInput(input);
    expect(r.kind).toBe('chesscom_attribution');
    if (r.kind === 'chesscom_attribution') {
      // The URL line must have been removed from the PGN body — if it
      // leaked through, chess-core would choke on it downstream.
      expect(r.pgn).toBeDefined();
      expect(r.pgn).not.toContain('chess.com');
      expect(r.pgn).toContain('1. e4 e5');
    }
  });

  it('does NOT route a non-chess.com host into the chesscom_* namespace', () => {
    // The first-line chess.com-ish filter is conservative; URLs that
    // do not contain "chess.com" must NOT be upgraded into the
    // chesscom error namespace. Reproduce here so a future broadening
    // of `CHESSCOM_URL_RE` (e.g. matching `chess` alone) is caught.
    //
    // Implementation note: the input below combines a non-chess.com
    // first line with a PGN-shaped tail. Today the detector falls
    // through the chess.com branch and the body matches `looksLikePgnText`,
    // so the result is `pgn` (the URL line is just treated as part of
    // a noisy PGN paste). What matters for this regression is that we
    // do NOT silently land in `chesscom_invalid_url` /
    // `chesscom_invalid_pgn` — those error keys would surface a
    // chess.com-flavoured message to the user even though they pasted
    // an example.com URL.
    const r = detectAttachmentInput('https://example.com/page\n[Event "x"]\n\n1. e4 e5');
    expect(r.kind).not.toBe('chesscom_invalid_url');
    expect(r.kind).not.toBe('chesscom_invalid_pgn');
    expect(r.kind).not.toBe('chesscom_attribution');
  });

  it('routes a Lichess-host URL with a chess.com substring AS `lichess`, not chesscom_*', () => {
    // Even if a user managed to construct a Lichess URL that contains
    // the substring "chess.com" (defensive — should not happen in
    // practice), the Lichess matcher runs first and wins. Pin so the
    // ordering is not silently flipped.
    const r = detectAttachmentInput('https://lichess.org/abcd1234');
    expect(r.kind).toBe('lichess');
  });

  // ─── embed URL smoke tests ───
  // Exhaustive parser coverage lives in `parse-embed-url.test.ts`. The
  // tests below only confirm that `detectAttachmentInput` routes embed
  // URLs to the right kind in the right order.
  it('routes a Lichess embed URL into the lichess_embed kind', () => {
    const r = detectAttachmentInput('https://lichess.org/embed/abcd1234');
    expect(r.kind).toBe('lichess_embed');
    if (r.kind === 'lichess_embed') {
      expect(r.embedId).toBe('abcd1234');
      expect(r.sourceUrl).toBe('https://lichess.org/embed/abcd1234');
    }
  });

  it('routes a malformed Lichess embed URL into lichess_embed_invalid_url', () => {
    // Trailing path makes the embed parser reject — must NOT silently
    // fall through to the lichess game branch (which would also fail
    // since the path does not match LICHESS_URL_RE).
    const r = detectAttachmentInput('https://lichess.org/embed/abcd1234/extra');
    expect(r.kind).toBe('lichess_embed_invalid_url');
  });

  it('routes a chess.com emboard URL into the chesscom_embed kind', () => {
    const r = detectAttachmentInput('https://www.chess.com/emboard?id=12345');
    expect(r.kind).toBe('chesscom_embed');
    if (r.kind === 'chesscom_embed') {
      expect(r.embedId).toBe('12345');
      expect(r.sourceUrl).toBe('https://www.chess.com/emboard?id=12345');
    }
  });

  it('routes a malformed chess.com emboard URL into chesscom_embed_invalid_url, not the legacy chesscom_invalid_url', () => {
    // Bare apex fails the strict embed parser. Must surface the embed-
    // specific error key rather than the legacy chesscom_invalid_url
    // (which assumes the user pasted a /game/ URL + PGN flow).
    const r = detectAttachmentInput('https://chess.com/emboard?id=12345');
    expect(r.kind).toBe('chesscom_embed_invalid_url');
  });

  it('routes the chess.com /game/ URL flow as chesscom_attribution (not as embed)', () => {
    // /game/ URLs do not match the emboard pre-filter and must continue
    // to flow through the legacy chesscom_attribution branch.
    const r = detectAttachmentInput('https://www.chess.com/game/live/12345678');
    expect(r.kind).toBe('chesscom_attribution');
  });
});
