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

type Props = {
  /** Notify the parent form that the user typed in the attachment field. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in.
   *  The parent uses this to pick the right Server Action and to render
   *  hidden form fields for the embed flow. */
  onModeChange?: (mode: AttachmentInputMode) => void;
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
export function AttachmentInput({ onChange, onModeChange }: Props) {
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

  // PGN-mode preview hint (kept from the legacy single-textarea UX).
  // URL mode surfaces `urlValidationError` instead.
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
      default:
        break;
    }
  }

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
