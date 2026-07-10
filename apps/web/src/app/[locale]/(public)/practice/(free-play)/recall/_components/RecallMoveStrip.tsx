'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveLogEntry } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/recall-format';

type Props = {
  /** Full move-log history. */
  entries: MoveLogEntry[];
  /**
   * When provided, each marker becomes a button that jumps the board to the
   * move's position. Used by the completion summary's per-move review.
   */
  onEntryClick?: (entry: MoveLogEntry) => void;
};

const MARKER_CLASS = {
  correct: 'bg-success/70',
  skipped: 'bg-warning/70',
  auto: 'bg-muted-foreground/40',
} as const;

/**
 * The per-move strip: one small marker per move — a green square for a
 * clean first-try recall, an amber square for an explicit "I don't know"
 * skip, a gray square for the opponent's own move when "Auto-fill
 * opponent's moves" is on (`auto` — not the user's responsibility, so it's
 * excluded from the recall stats bar above but still shown here for
 * context), and a red pill (showing the actual wrong SAN, not just a blank
 * color) for each incorrect attempt — same visual language as the
 * games/play result screen's "By Move" effort strip.
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
    (e): e is MoveLogEntry & { status: 'correct' | 'incorrect' | 'skipped' | 'auto' } =>
      e.status === 'correct' ||
      e.status === 'incorrect' ||
      e.status === 'skipped' ||
      e.status === 'auto'
  );
  const autoFilledEntries = entries.filter((e) => e.status === 'autoFilled');

  if (individualEntries.length === 0 && autoFilledEntries.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
  }

  const interactive = onEntryClick !== undefined;
  const buttonClass = interactive ? 'hover:scale-110 hover:ring-2 hover:ring-foreground/40' : '';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {individualEntries.map((entry, index) => {
          const prefix = formatMoveNumberPrefix(entry.moveNumber, entry.isWhiteMove);
          const onClick = interactive ? () => onEntryClick?.(entry) : undefined;

          if (entry.status === 'incorrect') {
            const label = `${prefix} ${t('summary.triedMove', { move: entry.incorrectMove ?? '', correct: entry.move })}`;
            return (
              <button
                key={index}
                type="button"
                onClick={onClick}
                disabled={!interactive}
                title={label}
                aria-label={label}
                className={`inline-flex h-5 items-center rounded-sm bg-destructive/70 px-1.5 font-mono text-xs text-destructive-foreground transition-transform ${buttonClass}`}
              >
                {entry.incorrectMove}
              </button>
            );
          }

          const label =
            entry.status === 'correct'
              ? `${prefix} ${entry.move} — ${t('summary.nailed')}`
              : entry.status === 'auto'
                ? `${prefix} ${entry.move} — ${t('summary.legendAuto')}`
                : `${prefix} ${entry.move} — ${t('summary.missed')}`;
          return (
            <button
              key={index}
              type="button"
              onClick={onClick}
              disabled={!interactive}
              title={label}
              aria-label={label}
              className={`h-5 w-5 rounded-sm transition-transform ${buttonClass} ${MARKER_CLASS[entry.status]}`}
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
        {individualEntries.some((e) => e.status === 'correct') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 rounded-sm ${MARKER_CLASS.correct}`} />
            {t('summary.nailed')}
          </span>
        )}
        {individualEntries.some((e) => e.status === 'incorrect') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-destructive/70" />
            {t('summary.legendIncorrect')}
          </span>
        )}
        {individualEntries.some((e) => e.status === 'skipped') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 rounded-sm ${MARKER_CLASS.skipped}`} />
            {t('summary.missed')}
          </span>
        )}
        {individualEntries.some((e) => e.status === 'auto') && (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 rounded-sm ${MARKER_CLASS.auto}`} />
            {t('summary.legendAuto')}
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
