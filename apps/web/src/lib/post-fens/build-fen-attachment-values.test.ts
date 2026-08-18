import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';
import { describe, expect, it } from 'vitest';

import {
  buildFenAttachmentValues,
  fenAttachmentErrorKey,
  fenAttachmentPgErrorKind,
} from './build-fen-attachment-values';

describe('buildFenAttachmentValues — validation', () => {
  it('accepts a valid FEN with no caption (null)', () => {
    expect(buildFenAttachmentValues(STARTING_FEN, null)).toEqual({
      ok: true,
      values: { fen: STARTING_FEN, caption: null },
    });
  });

  it('canonicalizes surrounding whitespace before validating and storing', () => {
    const padded = `  ${STARTING_FEN}  `;
    expect(buildFenAttachmentValues(padded, undefined)).toEqual({
      ok: true,
      values: { fen: STARTING_FEN, caption: null },
    });
  });

  it('accepts a FEN whose RAW length exceeds the cap if the TRIMMED length fits', () => {
    const padded = `${' '.repeat(150)}${STARTING_FEN}`;
    const result = buildFenAttachmentValues(padded, null);
    expect(result).toEqual({ ok: true, values: { fen: STARTING_FEN, caption: null } });
  });

  it('rejects empty / whitespace-only / non-string FEN with fen_required', () => {
    expect(buildFenAttachmentValues('', null)).toEqual({ ok: false, error: 'fen_required' });
    expect(buildFenAttachmentValues('   ', null)).toEqual({ ok: false, error: 'fen_required' });
    expect(buildFenAttachmentValues(undefined, null)).toEqual({ ok: false, error: 'fen_required' });
  });

  it('rejects a FEN longer than the cap with fen_too_long', () => {
    expect(buildFenAttachmentValues('x'.repeat(101), null)).toEqual({
      ok: false,
      error: 'fen_too_long',
    });
  });

  it('rejects a structurally malformed FEN with invalid_fen_structure', () => {
    expect(buildFenAttachmentValues('not-a-fen', null)).toEqual({
      ok: false,
      error: 'invalid_fen_structure',
    });
  });

  it('rejects a semantically illegal FEN (no kings) with invalid_fen_semantic', () => {
    expect(buildFenAttachmentValues('8/8/8/8/8/8/8/8 w - - 0 1', null)).toEqual({
      ok: false,
      error: 'invalid_fen_semantic',
    });
  });

  it('rejects a caption longer than the cap with caption_too_long', () => {
    expect(buildFenAttachmentValues(STARTING_FEN, 'x'.repeat(201))).toEqual({
      ok: false,
      error: 'caption_too_long',
    });
  });

  it('sanitizes captions and collapses all-invisible captions to null', () => {
    const dirty = `evil${String.fromCharCode(0x202e)}cap${String.fromCharCode(0x200b)}tion`;
    expect(buildFenAttachmentValues(STARTING_FEN, dirty)).toEqual({
      ok: true,
      values: { fen: STARTING_FEN, caption: 'evilcaption' },
    });

    const onlyBidi =
      String.fromCharCode(0x202e) + String.fromCharCode(0x200b) + String.fromCharCode(0xfeff);
    expect(buildFenAttachmentValues(STARTING_FEN, onlyBidi)).toEqual({
      ok: true,
      values: { fen: STARTING_FEN, caption: null },
    });
  });
});

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code });

describe('fenAttachmentPgErrorKind — SQLSTATE mapping', () => {
  it('maps 23505 / 23514 / 22001 to their kinds and returns null otherwise', () => {
    expect(fenAttachmentPgErrorKind(pgError('23505'))).toBe('already_attached');
    expect(fenAttachmentPgErrorKind(pgError('23514'))).toBe('invalid_fen_structure');
    expect(fenAttachmentPgErrorKind(pgError('22001'))).toBe('fen_too_long');
    expect(fenAttachmentPgErrorKind(pgError('40001'))).toBeNull();
    expect(fenAttachmentPgErrorKind(new Error('boom'))).toBeNull();
  });
});

describe('fenAttachmentErrorKey — i18n key mapping', () => {
  it('maps every kind to its postFenAttachment.error.* key', () => {
    expect(fenAttachmentErrorKey('fen_required')).toBe('postFenAttachment.error.fenRequired');
    expect(fenAttachmentErrorKey('fen_too_long')).toBe('postFenAttachment.error.fenTooLong');
    expect(fenAttachmentErrorKey('invalid_fen_structure')).toBe(
      'postFenAttachment.error.invalidFenStructure'
    );
    expect(fenAttachmentErrorKey('invalid_fen_semantic')).toBe(
      'postFenAttachment.error.invalidFenSemantic'
    );
    expect(fenAttachmentErrorKey('caption_too_long')).toBe(
      'postFenAttachment.error.captionTooLong'
    );
    expect(fenAttachmentErrorKey('already_attached')).toBe(
      'postFenAttachment.error.alreadyAttached'
    );
  });
});
