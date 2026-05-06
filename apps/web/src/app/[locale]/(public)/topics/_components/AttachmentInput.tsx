'use client';

import { useEffect, useMemo, useState } from 'react';

import { Textarea } from '@/app/_components';

import { detectAttachmentInput } from '@/lib/games/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Sub-mode UX (Phase 6)
 *
 * The Game tab is split into two sub-modes via a radio group: PGN
 * (textarea) and Lichess URL (single-line URL input). Each sub-mode
 * keeps its own buffer so the user can flip between them without
 * losing the in-progress draft. The reported `mode` discriminator
 * (`empty` / `pgn` / `embed`) is unchanged — Server Action routing
 * keys off `mode.kind` exactly as before, and both sub-modes submit
 * via the same `name="attachment"` form field.
 */
export type AttachmentInputMode =
  | { kind: 'empty' }
  | { kind: 'pgn'; pgn: string; anonymize: boolean }
  | {
      kind: 'embed';
      provider: 'chesscom' | 'lichess';
      sourceUrl: string;
      anonymize: boolean;
    };

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
   *  The parent uses this to pick the right Server Action and to render
   *  hidden form fields for the embed flow. */
  onModeChange?: (mode: AttachmentInputMode) => void;
  /** Notify the parent of the current validation status so it can
   *  disable the Apply button while the active tab is in `error`. */
  onValidationStatusChange?: (status: ValidationStatus) => void;
};

type GameSubKind = 'pgn' | 'url';

/**
 * Game-tab attachment input with PGN / Lichess URL sub-modes.
 *
 * @description
 * PGN sub-mode: textarea accepting raw PGN (or chess.com URL +
 * exported PGN, per the auto-detect contract).
 * URL sub-mode: single-line input accepting a Lichess game URL,
 * Lichess embed URL, or chess.com /emboard URL. The URL input
 * surfaces a client-side whitelist error for anything outside that
 * set so the user does not waste a submit on an unsupported shape.
 *
 * Authoritative validation always happens server-side via
 * `detectAttachmentInput` + `validateAttachedPgn` — the client
 * detection result is advisory, not a security boundary.
 */
export function AttachmentInput({ onChange, onModeChange, onValidationStatusChange }: Props) {
  const [subKind, setSubKind] = useState<GameSubKind>('pgn');
  const [pgnValue, setPgnValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [anonymize, setAnonymize] = useState(false);

  const activeValue = subKind === 'pgn' ? pgnValue : urlValue;

  // Memoize the detection result so the same trimmed input does not
  // re-run the regex chain on every render. The detection is pure and
  // cheap, but it touches `getPgnHeaders` for PGN-shaped inputs, and
  // we only need to recompute when the active value changes.
  const detected = useMemo(() => {
    if (activeValue.trim().length === 0) return null;
    return detectAttachmentInput(activeValue);
  }, [activeValue]);

  // URL sub-mode whitelist. We only accept the three shapes the embed
  // / lichess flow can actually persist; anything else surfaces a
  // sub-mode-specific error so the user can recover without a server
  // round-trip.
  const urlValidationError = useMemo<string | null>(() => {
    if (subKind !== 'url' || !detected) return null;
    switch (detected.kind) {
      case 'lichess':
      case 'lichess_embed':
      case 'chesscom_embed':
        return null;
      case 'lichess_unsupported':
        // TODO(i18n): attachment.game.url.error.lichessStudy
        return 'Lichess study URLs are not supported.';
      case 'lichess_embed_invalid_url':
      case 'chesscom_embed_invalid_url':
        // TODO(i18n): attachment.game.url.error.invalidUrl
        return 'Invalid URL format.';
      case 'chesscom_attribution':
      case 'chesscom_invalid_url':
      case 'chesscom_invalid_pgn':
        // TODO(i18n): attachment.game.url.error.chesscomNeedsPgn
        return 'For chess.com URLs, paste the PGN body in the PGN tab — chess.com TOS prevents auto-fetch.';
      case 'pgn':
      case 'unknown':
      case 'empty':
      default:
        // TODO(i18n): attachment.game.url.error.notUrl
        return 'Please paste a Lichess game URL, Lichess embed URL, or chess.com /emboard URL.';
    }
  }, [subKind, detected]);

  // PGN sub-mode preview hint / error.
  //
  // The legacy single-textarea UX surfaced only embed-detection hints
  // here. Phase 7 extends this to explicitly call out URL shapes that
  // are *not* PGN and not embeddable — Lichess game URLs, Lichess study
  // URLs, and chess.com game URLs — so that pasting one of them into
  // the PGN textarea no longer falls through to "submit as PGN" → the
  // server rejects it → the modal silently closes (the parent's Apply
  // handler runs `onClose()` regardless of submit outcome). Now the
  // user sees an in-modal error and can either switch tabs or paste a
  // PGN body.
  let pgnPreviewHint: string | null = null;
  let pgnPreviewError: string | null = null;
  if (subKind === 'pgn' && detected) {
    switch (detected.kind) {
      case 'chesscom_embed':
        // TODO(i18n): attachment.embed.chesscomDetected
        pgnPreviewHint = 'chess.com embed URL detected.';
        break;
      case 'lichess_embed':
        // TODO(i18n): attachment.embed.lichessDetected
        pgnPreviewHint = 'Lichess embed URL detected.';
        break;
      case 'chesscom_embed_invalid_url':
      case 'lichess_embed_invalid_url':
        // TODO(i18n): attachment.embed.invalidUrl
        pgnPreviewError = 'Invalid embed URL.';
        break;
      case 'lichess':
        // TODO(i18n): attachment.game.pgn.error.lichessGameUrl
        pgnPreviewError = 'This is a Lichess game URL. Switch to the Lichess URL tab to attach.';
        break;
      case 'lichess_unsupported':
        // TODO(i18n): attachment.game.pgn.error.lichessStudy
        pgnPreviewError = 'Lichess study URLs are not supported.';
        break;
      case 'chesscom_attribution':
      case 'chesscom_invalid_url':
      case 'chesscom_invalid_pgn':
        // TODO(i18n): attachment.game.pgn.error.chesscomNeedsPgn
        pgnPreviewError =
          'For chess.com URLs, paste the PGN body — chess.com TOS prevents auto-fetch.';
        break;
      case 'unknown':
        // TODO(i18n): attachment.game.pgn.error.unknown
        pgnPreviewError =
          'This does not look like a PGN body. Paste a complete PGN, or use the Lichess URL tab for a URL.';
        break;
      default:
        break;
    }
  }

  const mode: AttachmentInputMode = useMemo(() => {
    if (!detected || detected.kind === 'empty') return { kind: 'empty' };

    // URL mode with a validation error → treat as empty so the parent
    // form will not submit a known-bad attachment. Parent's submit
    // gating runs off the reported mode kind.
    if (subKind === 'url' && urlValidationError !== null) {
      return { kind: 'empty' };
    }

    if (detected.kind === 'lichess_embed') {
      return {
        kind: 'embed',
        provider: 'lichess',
        sourceUrl: detected.sourceUrl,
        anonymize,
      };
    }
    if (detected.kind === 'chesscom_embed') {
      return {
        kind: 'embed',
        provider: 'chesscom',
        sourceUrl: detected.sourceUrl,
        anonymize,
      };
    }
    // PGN sub-mode: if the textarea content looks like a non-PGN URL
    // shape (Lichess game URL, Lichess study, chess.com URL) or is an
    // unparseable non-PGN-non-URL string ('unknown'), fall through to
    // `empty` so the parent form does not push a known-bad attachment.
    // The user already sees `pgnPreviewError` explaining why, so this
    // is no longer "silent".
    if (
      subKind === 'pgn' &&
      (detected.kind === 'lichess' ||
        detected.kind === 'lichess_unsupported' ||
        detected.kind === 'chesscom_attribution' ||
        detected.kind === 'chesscom_invalid_url' ||
        detected.kind === 'chesscom_invalid_pgn' ||
        detected.kind === 'unknown')
    ) {
      return { kind: 'empty' };
    }
    return { kind: 'pgn', pgn: activeValue, anonymize };
  }, [detected, anonymize, activeValue, subKind, urlValidationError]);

  // Notify parent on mode transitions via an effect so we don't call
  // `setState` on the parent during this component's render. The parent
  // is expected to memoize / shallow-compare on its end so repeated
  // calls with the same mode are cheap.
  useEffect(() => {
    if (onModeChange) onModeChange(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (onChange) onChange(activeValue.trim().length > 0);
  }, [activeValue, onChange]);

  // Validation status reported to the parent. The parent uses this to
  // gate the modal's Apply button — `'error'` blocks Apply, `'empty'`
  // and `'ok'` allow it. `'empty'` is preserved (not coerced to error)
  // so the user can still Apply with no attachment selected.
  const validationStatus: ValidationStatus = useMemo(() => {
    if (activeValue.trim().length === 0) return 'empty';
    if (subKind === 'pgn') {
      if (pgnPreviewError !== null) return 'error';
      return 'ok';
    }
    // url sub-mode
    if (urlValidationError !== null) return 'error';
    return 'ok';
  }, [activeValue, subKind, pgnPreviewError, urlValidationError]);

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
        <PgnInput
          value={pgnValue}
          onChange={setPgnValue}
          previewHint={pgnPreviewHint}
          previewError={pgnPreviewError}
        />
      )}

      {subKind === 'url' && (
        <UrlInput value={urlValue} onChange={setUrlValue} validationError={urlValidationError} />
      )}

      {/*
        Embed flow hidden fields. When the input is detected as an
        embed URL the parent form switches to
        `createChunkPostWithEmbedAttachment` and reads these fields.
        The `attachment` field is still submitted but the embed action
        ignores it. Server-side re-validation re-parses the URL — we
        never trust the client-detected provider as authoritative.
      */}
      {mode.kind === 'embed' && (
        <>
          <input type="hidden" name="embedProvider" value={mode.provider} />
          <input type="hidden" name="embedSourceUrl" value={mode.sourceUrl} />
        </>
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
  previewHint: string | null;
  previewError: string | null;
};

function PgnInput({ value, onChange, previewHint, previewError }: PgnInputProps) {
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
      {previewHint && <p className="text-xs text-foreground">{previewHint}</p>}
      {previewError && <p className="text-xs text-destructive">{previewError}</p>}
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
        Lichess game URL, Lichess embed URL, or chess.com /emboard URL.
      </p>
      {validationError && <p className="text-xs text-destructive">{validationError}</p>}
    </div>
  );
}
