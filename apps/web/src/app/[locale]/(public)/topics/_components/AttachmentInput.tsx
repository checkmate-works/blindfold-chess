'use client';

import { useCallback, useState } from 'react';

import { Textarea } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  /** Notify the parent form that the user typed in the attachment field. */
  onChange?: (hasContent: boolean) => void;
};

/**
 * Single-textarea input for the topic post attachment field.
 *
 * @description
 * Accepts either a Lichess game URL or a raw PGN. The field is
 * intentionally collapsed behind an "Attach a game" expander so the
 * default comment form stays uncluttered. An anonymize checkbox lets
 * the poster mask player names at storage time (server enforces).
 *
 * No client-side validation is performed beyond the empty / non-empty
 * distinction — the server does the authoritative parse via
 * `detectAttachmentInput` and `validateAttachedPgn`. We deliberately do
 * not pre-render a chess.js preview here because that would pull
 * chess.js into every client bundle for the chunk page.
 */
export function AttachmentInput({ onChange }: Props) {
  const t = useTranslations('attachment');
  const [open, setOpen] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value.trim().length > 0);
    },
    [onChange]
  );

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
            // `topic_post_attachments.chk_pgn_byte_length`.
            maxLength={120_000}
            placeholder={t('input.placeholder')}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">{t('input.modeHint')}</p>

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
