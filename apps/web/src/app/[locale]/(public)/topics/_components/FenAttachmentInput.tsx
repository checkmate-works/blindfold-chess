'use client';

import { useEffect, useState } from 'react';

import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';
import { FEN_MAX_LENGTH } from '@/lib/post-fens/constants';

/**
 * Discriminated mode reported to the parent.
 *
 * @design Why a separate FEN expander
 *
 * The Position-tab input owns the FEN value, optional caption, and a
 * client-side semantic validation pass (which feeds the MiniBoard
 * preview). The parent form receives a single discriminated payload so
 * its submit-time switch can stay exhaustively type-checked.
 */
export type FenAttachmentMode =
  | { kind: 'empty' }
  | { kind: 'fen'; fen: string; caption: string | null; valid: boolean };

type Props = {
  /** Notify the parent when the input becomes non-empty. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent of the current discriminated mode. */
  onModeChange?: (mode: FenAttachmentMode) => void;
};

export function FenAttachmentInput({ onChange, onModeChange }: Props) {
  const [fen, setFen] = useState('');
  const [caption, setCaption] = useState('');

  const fenTrimmed = fen.trim();
  const fenValidation =
    fenTrimmed.length > 0 && fenTrimmed.length <= FEN_MAX_LENGTH
      ? validateFenSemantic(fenTrimmed)
      : { ok: false as const, reason: 'structure' as const, error: '' };
  const fenValid = fenValidation.ok;

  useEffect(() => {
    if (fenTrimmed.length === 0) {
      onModeChange?.({ kind: 'empty' });
      onChange?.(false);
      return;
    }
    onModeChange?.({
      kind: 'fen',
      fen: fenTrimmed,
      caption: caption.trim().length > 0 ? caption.trim() : null,
      valid: fenValid,
    });
    onChange?.(true);
  }, [fenTrimmed, caption, fenValid, onChange, onModeChange]);

  const showPreview = fenTrimmed.length > 0 && fenValid;
  const showInvalidHint = fenTrimmed.length > 0 && !fenValid;

  return (
    <div className="space-y-2">
      <label htmlFor="attachmentFen" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.fen.input.label */}
        FEN position
      </label>
      <input
        id="attachmentFen"
        name="attachmentFen"
        type="text"
        maxLength={FEN_MAX_LENGTH}
        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 font-mono text-sm text-foreground"
      />
      <label htmlFor="attachmentFenCaption" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.fen.input.captionLabel */}
        Caption (optional)
      </label>
      <input
        id="attachmentFenCaption"
        name="attachmentFenCaption"
        type="text"
        maxLength={200}
        placeholder=""
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground"
      />
      {showInvalidHint && (
        <p className="text-xs text-destructive">
          {/* TODO(i18n): attachment.fen.input.invalid (use existing postFenAttachment.error.invalidFenStructure copy) */}
          FEN format is invalid. Check the position, side to move, castling, and en passant fields.
        </p>
      )}
      {showPreview && (
        <div className="w-32 mx-auto sm:mx-0">
          <MiniBoard fen={fenTrimmed} responsive />
        </div>
      )}
    </div>
  );
}
