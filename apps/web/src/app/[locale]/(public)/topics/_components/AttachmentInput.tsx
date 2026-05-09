'use client';

import { useEffect, useMemo, useState } from 'react';

import { Textarea } from '@/app/_components';

import { detectAttachmentInput } from '@/lib/games/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Pre-release scope (#84): PGN-only
 *
 * The Game tab originally accepted both PGN body and URL paste shapes
 * (Lichess game URL, Lichess embed, chess.com /emboard). For the
 * current release we restrict the Game tab to **pure PGN body input**
 * — every URL shape is surfaced as a client-side error and not
 * forwarded to the server. The URL-flavoured Server Actions
 * (`createChunkPostWithEmbedAttachment`, the `lichess_embed` arm of
 * `createChunkPostWithAttachment`) remain in the codebase as dead
 * code so a future release can re-enable them by reverting this
 * component change.
 */
export type AttachmentInputMode =
  | { kind: 'empty' }
  | { kind: 'pgn'; pgn: string; anonymize: boolean };

/**
 * Validation status surfaced to the parent so it can disable the
 * Apply button when the active tab has a known-bad input.
 *
 *   - `empty` — nothing meaningful entered (Apply allowed; emits
 *     `{ kind: 'empty' }` mode = no attachment row).
 *   - `ok`    — input parses to a kind the server can accept (Apply
 *     allowed; emits a non-empty mode).
 *   - `error` — client detected a known-bad input (Apply disabled).
 */
export type ValidationStatus = 'empty' | 'ok' | 'error';

type Props = {
  /** Notify the parent form that the user typed in the attachment field. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in.
   *  The parent uses this to pick the right Server Action. */
  onModeChange?: (mode: AttachmentInputMode) => void;
  /** Notify the parent of the current validation status so it can
   *  disable the Apply button while the active tab is in `error`. */
  onValidationStatusChange?: (status: ValidationStatus) => void;
};

/**
 * Game-tab attachment input — PGN textarea only.
 *
 * @description
 * Authoritative validation always happens server-side via
 * `detectAttachmentInput` + `validateAttachedPgn`. The client-side
 * `detectAttachmentInput` is used here only to surface a friendly
 * error when the user pastes something that is not a PGN body
 * (Lichess URLs, chess.com URLs, free text), so the user does not
 * waste a submit on an unsupported shape.
 */
export function AttachmentInput({ onChange, onModeChange, onValidationStatusChange }: Props) {
  const [pgnValue, setPgnValue] = useState('');
  const [anonymize, setAnonymize] = useState(false);

  const detected = useMemo(() => {
    if (pgnValue.trim().length === 0) return null;
    return detectAttachmentInput(pgnValue);
  }, [pgnValue]);

  // Anything other than `pgn` (or `empty`) is rejected client-side.
  // For #84 we collapse all URL / unknown shapes into a single generic
  // error message — the previous per-shape preview hints (chess.com
  // detected, Lichess URL detected, study URL not supported, …) were
  // load-bearing for the URL flow which no longer exists.
  const previewError = useMemo<string | null>(() => {
    if (!detected) return null;
    switch (detected.kind) {
      case 'pgn':
      case 'empty':
        return null;
      default:
        // TODO(i18n): attachment.game.pgn.error.urlNotAccepted
        return 'URLs are not accepted. Paste a PGN body only.';
    }
  }, [detected]);

  const mode: AttachmentInputMode = useMemo(() => {
    if (!detected || detected.kind === 'empty') return { kind: 'empty' };
    if (detected.kind === 'pgn') {
      return { kind: 'pgn', pgn: pgnValue, anonymize };
    }
    // Any non-PGN detection (URL shapes, unknown) → empty so the parent
    // never submits a known-bad attachment. The user sees `previewError`.
    return { kind: 'empty' };
  }, [detected, pgnValue, anonymize]);

  useEffect(() => {
    if (onModeChange) onModeChange(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (onChange) onChange(pgnValue.trim().length > 0);
  }, [pgnValue, onChange]);

  const validationStatus: ValidationStatus = useMemo(() => {
    if (pgnValue.trim().length === 0) return 'empty';
    if (previewError !== null) return 'error';
    return 'ok';
  }, [pgnValue, previewError]);

  useEffect(() => {
    if (onValidationStatusChange) onValidationStatusChange(validationStatus);
  }, [validationStatus, onValidationStatusChange]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="attachmentPgn" className="block text-sm font-medium text-foreground">
          {/* TODO(i18n): attachment.game.pgn.label */}
          PGN
        </label>
        <Textarea
          id="attachmentPgn"
          name="attachment"
          rows={6}
          // Generous client cap; server-side limit is 100 KB per
          // `post_game_pgn_attachments.chk_pgn_byte_length`.
          maxLength={120_000}
          // TODO(i18n): attachment.game.pgn.placeholder
          placeholder="Paste PGN here..."
          value={pgnValue}
          onChange={(e) => setPgnValue(e.target.value)}
        />
        {previewError && <p className="text-xs text-destructive">{previewError}</p>}
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          id="attachmentAnonymize"
          name="attachmentAnonymize"
          type="checkbox"
          className="mt-0.5"
          checked={anonymize}
          onChange={(e) => setAnonymize(e.target.checked)}
        />
        <span>
          {/* TODO(i18n): attachment.label.anonymize */}
          <span className="font-medium">Anonymize player names</span>
          <br />
          {/* TODO(i18n): attachment.label.anonymizeHint */}
          <span className="text-xs text-muted-foreground">
            Replaces White / Black with placeholders before storage.
          </span>
        </span>
      </label>
    </div>
  );
}
