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

  it('flags chess.com URL as unsupported with guidance', () => {
    const r = detectAttachmentInput('https://www.chess.com/game/live/12345678');
    expect(r.kind).toBe('chesscom_unsupported');
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
