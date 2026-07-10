'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveLogEntry } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/recall-format';

type Props = {
  /** Full move-log history; only incorrect / skipped / auto-filled rows are shown. */
  entries: MoveLogEntry[];
  /**
   * When provided, each marker becomes a button that jumps the board to the
   * move's position. Used by the completion summary's "stumbled here" review.
   */
  onEntryClick?: (entry: MoveLogEntry) => void;
};

const MARKER_CLASS = {
  incorrect: 'bg-destructive/70',
  skipped: 'bg-warning/70',
} as const;

/**
 * The mistakes strip: one small square per wrong attempt or explicit "I
 * don't know" skip — same visual language as the games/play result screen's
 * "By Move" effort strip. Opponent auto-fills (`auto`) are not mistakes, so
 * they are excluded.
 *
 * A single "Auto-fill All" click resolves every remaining move in one batch,
 * so `autoFilled` entries always form one trailing run at the end of the
 * log. Repeating an identical square per bulk-resolved move would just be a
 * wall of "couldn't recall" markers, so that whole run collapses into one
 * "+N auto-filled" chip instead — it marks the point the user gave up, not
 * every move after it.
 */
export function RecallMoveStrip({ entries, onEntryClick }: Props) {
  const t = useTranslations('recall');

  const individualEntries = entries.filter(
    (e): e is MoveLogEntry & { status: 'incorrect' | 'skipped' } =>
      e.status === 'incorrect' || e.status === 'skipped'
  );
  const autoFilledEntries = entries.filter((e) => e.status === 'autoFilled');

  if (individualEntries.length === 0 && autoFilledEntries.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
  }

  const interactive = onEntryClick !== undefined;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {individualEntries.map((entry, index) => {
          const prefix = formatMoveNumberPrefix(entry.moveNumber, entry.isWhiteMove);
          const label =
            entry.status === 'incorrect'
              ? `${prefix} ${t('summary.triedMove', { move: entry.incorrectMove ?? '', correct: entry.move })}`
              : `${prefix} ${entry.move} — ${t('summary.missed')}`;
          return (
            <button
              key={index}
              type="button"
              onClick={interactive ? () => onEntryClick?.(entry) : undefined}
              disabled={!interactive}
              title={label}
              aria-label={label}
              className={`h-5 w-5 rounded-sm transition-transform ${
                interactive ? 'hover:scale-125 hover:ring-2 hover:ring-foreground/40' : ''
              } ${MARKER_CLASS[entry.status]}`}
            />
          );
        })}
        {autoFilledEntries.length > 0 && (
          <button
            type="button"
            onClick={interactive ? () => onEntryClick?.(autoFilledEntries[0]) : undefined}
            disabled={!interactive}
            title={t('logAutoFilled')}
            aria-label={t('logAutoFilled')}
            className={`inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs text-muted-foreground transition-transform ${
              interactive ? 'hover:scale-105' : ''
            }`}
          >
            {t('summary.autoFilledCount', { count: autoFilledEntries.length })}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {individualEntries.some((e) => e.status === 'incorrect') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 rounded-sm ${MARKER_CLASS.incorrect}`} />
            {t('summary.legendIncorrect')}
          </span>
        )}
        {individualEntries.some((e) => e.status === 'skipped') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 rounded-sm ${MARKER_CLASS.skipped}`} />
            {t('summary.missed')}
          </span>
        )}
        {autoFilledEntries.length > 0 && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className="h-3 w-3 rounded-full bg-muted" />
            {t('logAutoFilled')}
          </span>
        )}
      </div>
    </div>
  );
}
