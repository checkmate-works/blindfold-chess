'use client';

import { useEffect, useMemo, useState } from 'react';

import { Textarea } from '@/app/_components';

import { detectAttachmentInput } from '@/lib/games/validation';

import { PgnDiagnosisHint } from '@/app/[locale]/_components/PgnDiagnosisHint';

import { pgnSubModeError, urlSubModeError } from '../_lib/attachment-sub-mode-error';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Pre-release scope (#84): PGN body + Lichess URL only
 *
 * The Game tab is split into two radio sub-modes — `PGN` and
 * `Lichess URL` — each with its own input and per-shape validation.
 * Both sub-modes emit `mode = { kind: 'pgn', pgn: <raw value> }` so
 * `NewPostForm`'s submit handler keeps a narrow union (`empty | pgn`);
 * the server's `detectAttachmentInput` re-runs on the raw `attachment`
 * field and dispatches Lichess URLs through `resolveLichessAttachmentPgn`
 * (the Phase 13 path).
 *
 * Accepted:
 *   - PGN sub-mode: a raw PGN body.
 *   - URL sub-mode: a Lichess game URL (`lichess.org/{id}`) or a
 *     Lichess embed URL (`lichess.org/embed/{id}` or
 *     `lichess.org/embed/game/{id}`).
 *
 * Rejected (with sub-mode-specific errors):
 *   - chess.com URLs of any shape (TOS forbids auto-fetch; users who
 *     want a chess.com game must paste the exported PGN body).
 *   - Lichess study URLs (multi-chapter, out of scope for v1).
 *   - PGN body pasted into the URL sub-mode (and vice versa) —
 *     directs the user to the matching tab.
 *   - Free text that is neither a PGN body nor an accepted URL.
 */
export type AttachmentInputMode =
  { kind: 'empty' } | { kind: 'pgn'; pgn: string; anonymize: boolean };

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

type GameSubKind = 'pgn' | 'url';

/**
 * Game-tab attachment input — radio-split between a PGN textarea and
 * a Lichess URL input.
 *
 * @description
 * Each sub-mode keeps its own buffer so the user can flip between
 * them without losing the in-progress draft. Authoritative
 * validation always happens server-side; the client-side
 * `detectAttachmentInput` is used here only to gate the Apply button
 * and surface a friendly per-shape error.
 */
export function AttachmentInput({ onChange, onModeChange, onValidationStatusChange }: Props) {
  const [subKind, setSubKind] = useState<GameSubKind>('pgn');
  const [pgnValue, setPgnValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [anonymize, setAnonymize] = useState(false);

  const activeValue = subKind === 'pgn' ? pgnValue : urlValue;

  const detected = useMemo(() => {
    if (activeValue.trim().length === 0) return null;
    return detectAttachmentInput(activeValue);
  }, [activeValue]);

  // Per-shape preview errors for the active sub-mode (gates the Apply button +
  // surfaces a friendly hint). The shape→message dispatch lives in
  // `attachment-sub-mode-error`; here it is only applied to the active tab.
  const pgnPreviewError = useMemo<string | null>(
    () => (subKind === 'pgn' ? pgnSubModeError(detected) : null),
    [subKind, detected]
  );

  const urlPreviewError = useMemo<string | null>(
    () => (subKind === 'url' ? urlSubModeError(detected) : null),
    [subKind, detected]
  );

  const mode: AttachmentInputMode = useMemo(() => {
    if (!detected || detected.kind === 'empty') return { kind: 'empty' };
    if (subKind === 'pgn') {
      if (detected.kind === 'pgn') {
        return { kind: 'pgn', pgn: pgnValue, anonymize };
      }
      return { kind: 'empty' };
    }
    // url sub-mode
    if (detected.kind === 'lichess' || detected.kind === 'lichess_embed') {
      return { kind: 'pgn', pgn: urlValue, anonymize };
    }
    return { kind: 'empty' };
  }, [detected, subKind, pgnValue, urlValue, anonymize]);

  useEffect(() => {
    if (onModeChange) onModeChange(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (onChange) onChange(activeValue.trim().length > 0);
  }, [activeValue, onChange]);

  const validationStatus: ValidationStatus = useMemo(() => {
    if (activeValue.trim().length === 0) return 'empty';
    const error = subKind === 'pgn' ? pgnPreviewError : urlPreviewError;
    if (error !== null) return 'error';
    return 'ok';
  }, [activeValue, subKind, pgnPreviewError, urlPreviewError]);

  useEffect(() => {
    if (onValidationStatusChange) onValidationStatusChange(validationStatus);
  }, [validationStatus, onValidationStatusChange]);

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Game attachment kind" className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-foreground">
          <input
            type="radio"
            name="gameAttachmentKind"
            value="pgn"
            checked={subKind === 'pgn'}
            onChange={() => setSubKind('pgn')}
          />
          {/* TODO(i18n): attachment.game.kind.pgn */}
          <span>PGN</span>
        </label>
        <label className="flex items-center gap-1.5 text-foreground">
          <input
            type="radio"
            name="gameAttachmentKind"
            value="url"
            checked={subKind === 'url'}
            onChange={() => setSubKind('url')}
          />
          {/* TODO(i18n): attachment.game.kind.url */}
          <span>Lichess URL</span>
        </label>
      </div>

      {subKind === 'pgn' && (
        <PgnInput value={pgnValue} onChange={setPgnValue} previewError={pgnPreviewError} />
      )}

      {subKind === 'url' && (
        <UrlInput value={urlValue} onChange={setUrlValue} validationError={urlPreviewError} />
      )}

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type PgnInputProps = {
  value: string;
  onChange: (next: string) => void;
  previewError: string | null;
};

function PgnInput({ value, onChange, previewError }: PgnInputProps) {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {previewError ? (
        <p className="text-xs text-destructive">{previewError}</p>
      ) : (
        /* Only once the paste is PGN-*shaped*: the shape error already
           explains a Lichess URL or free text, and two complaints about one
           textarea help nobody. Best-effort — the server's `validateAttachedPgn`
           (chess.js) remains the authority and Apply stays enabled, so a PGN
           the two parsers disagree about is still attachable. */
        <PgnDiagnosisHint pgn={value} id="attachmentPgn-error" />
      )}
    </div>
  );
}

type UrlInputProps = {
  value: string;
  onChange: (next: string) => void;
  validationError: string | null;
};

function UrlInput({ value, onChange, validationError }: UrlInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="attachmentUrl" className="block text-sm font-medium text-foreground">
        {/* TODO(i18n): attachment.game.url.label */}
        Lichess URL
      </label>
      <input
        id="attachmentUrl"
        name="attachment"
        type="url"
        maxLength={2048}
        // TODO(i18n): attachment.game.url.placeholder
        placeholder="https://lichess.org/..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground"
      />
      <p className="text-xs text-muted-foreground">
        {/* TODO(i18n): attachment.game.url.hint */}
        Lichess game URL or embed URL.
      </p>
      {validationError && <p className="text-xs text-destructive">{validationError}</p>}
    </div>
  );
}
