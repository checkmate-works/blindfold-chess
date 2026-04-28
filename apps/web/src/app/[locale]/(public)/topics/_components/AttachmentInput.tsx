'use client';

import { useCallback, useMemo, useState } from 'react';

import { Textarea } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { detectAttachmentInput } from '@/lib/games/validation';

/**
 * Discriminated mode reported to the parent form.
 *
 * @design Single-input UX
 *
 * SPEC2 Phase B introduces embed URLs (chess.com emboard / Lichess
 * embed). We keep the single textarea — `detectAttachmentInput` already
 * routes the input into the right kind, and the user does not need to
 * pre-classify their paste. The parent form picks the right Server
 * Action based on the reported `mode`.
 */
export type AttachmentInputMode =
  | { kind: 'empty' }
  | { kind: 'pgn' }
  | { kind: 'embed'; provider: 'chesscom' | 'lichess'; sourceUrl: string };

type Props = {
  /** Notify the parent form that the user typed in the attachment field. */
  onChange?: (hasContent: boolean) => void;
  /** Notify the parent form which mode the input is currently in.
   *  The parent uses this to pick the right Server Action and to render
   *  hidden form fields for the embed flow. */
  onModeChange?: (mode: AttachmentInputMode) => void;
};

/**
 * Single-textarea input for the topic post attachment field.
 *
 * @description
 * Accepts a Lichess game URL, raw PGN, or (SPEC2 Phase B) a chess.com
 * emboard / Lichess embed URL. The field is intentionally collapsed
 * behind an "Attach a game" expander so the default comment form stays
 * uncluttered. An anonymize checkbox lets the poster mask player names
 * at storage time (server enforces).
 *
 * Client-side detection runs on every change to surface a friendly
 * preview hint and to report the mode to the parent form. Authoritative
 * validation always happens server-side via `detectAttachmentInput` +
 * `validateAttachedPgn` — we never trust the client's detection result
 * for security decisions.
 */
export function AttachmentInput({ onChange, onModeChange }: Props) {
  const t = useTranslations('attachment');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  // Memoize the detection result so the same trimmed input does not
  // re-run the regex chain on every render. The detection is pure and
  // cheap, but it touches `getPgnHeaders` for PGN-shaped inputs, and
  // we only need to recompute when the value changes.
  const detected = useMemo(
    () => (value.trim().length > 0 ? detectAttachmentInput(value) : null),
    [value]
  );

  const mode: AttachmentInputMode = useMemo(() => {
    if (!detected || detected.kind === 'empty') return { kind: 'empty' };
    if (detected.kind === 'lichess_embed') {
      return { kind: 'embed', provider: 'lichess', sourceUrl: detected.sourceUrl };
    }
    if (detected.kind === 'chesscom_embed') {
      return { kind: 'embed', provider: 'chesscom', sourceUrl: detected.sourceUrl };
    }
    return { kind: 'pgn' };
  }, [detected]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);
      onChange?.(next.trim().length > 0);
    },
    [onChange]
  );

  // Notify parent on mode transitions. We keep this in an effect-less
  // pattern by computing the mode synchronously and passing it on every
  // value change — the parent is expected to memoize / shallow-compare.
  // Using a derived call here is acceptable because `onModeChange`
  // is itself a stable callback in the parent.
  if (onModeChange) {
    // Calling during render is intentional (and safe since onModeChange
    // is stable + does not setState in a way that would re-render this
    // component synchronously). React 19 still tolerates this pattern
    // for parent-state mirrors.
    Promise.resolve().then(() => onModeChange(mode));
  }

  // Surface a per-kind preview hint so the user knows what we detected.
  let previewHint: string | null = null;
  let previewError: string | null = null;
  if (detected) {
    switch (detected.kind) {
      case 'chesscom_embed':
        previewHint = t('embed.chesscomDetected');
        break;
      case 'lichess_embed':
        previewHint = t('embed.lichessDetected');
        break;
      case 'chesscom_embed_invalid_url':
      case 'lichess_embed_invalid_url':
        previewError = t('embed.invalidUrl');
        break;
      default:
        break;
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="text-sm text-link-primary hover:underline"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? t('input.hide') : t('input.show')}
      </button>

      {open && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <label htmlFor="attachment" className="block text-sm font-medium text-foreground">
            {t('input.label')}
          </label>
          <Textarea
            id="attachment"
            name="attachment"
            rows={6}
            // Generous client cap; server-side limit is 100 KB per
            // `post_game_pgn_attachments.chk_pgn_byte_length`.
            maxLength={120_000}
            placeholder={t('input.placeholder')}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">{t('input.modeHint')}</p>

          {previewHint && <p className="text-xs text-foreground">{previewHint}</p>}
          {previewError && <p className="text-xs text-destructive">{previewError}</p>}

          {/*
            Embed flow hidden fields. When the input is detected as an
            embed URL the parent form switches to
            `createChunkPostWithEmbedAttachment` and reads these fields.
            The `attachment` textarea is still submitted but the embed
            action ignores it. Server-side re-validation re-parses the
            URL — we never trust the client-detected provider as
            authoritative.
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
            />
            <span>
              <span className="font-medium">{t('label.anonymize')}</span>
              <br />
              <span className="text-xs text-muted-foreground">{t('label.anonymizeHint')}</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
