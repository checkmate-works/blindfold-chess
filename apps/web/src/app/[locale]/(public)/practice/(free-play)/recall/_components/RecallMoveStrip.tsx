'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { formatMoveAnchor } from '@blindfold-chess/features/chess-core/move-numbering';

import type { MoveLogEntry } from '../_lib';

type Props = {
  /** Full move-log history. */
  entries: MoveLogEntry[];
  /**
   * When provided, each marker becomes a button that jumps the board to the
   * move's position. Used by the completion summary's per-move review.
   */
  onEntryClick?: (entry: MoveLogEntry) => void;
};

/** Statuses rendered as their own marker (everything but the collapsed `autoFilled` run). */
type IndividualStatus = Exclude<MoveLogEntry['status'], 'autoFilled'>;

const MARKER_CLASS: Record<IndividualStatus, string> = {
  correct: 'bg-success/70',
  incorrect: 'bg-destructive/70',
  skipped: 'bg-warning/70',
  auto: 'bg-muted-foreground/40',
};

/** Legend label i18n key (under `recall.`) per square-marker status. */
const SQUARE_LABEL_KEY = {
  correct: 'summary.nailed',
  skipped: 'summary.missed',
  auto: 'summary.legendAuto',
} as const satisfies Record<Exclude<IndividualStatus, 'incorrect'>, string>;

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
 * so `autoFilled` entries always sit in one trailing run at the end of the
 * log (interleaved with the opponent's `auto` moves when auto-opponent is
 * on). Repeating an identical square per bulk-resolved move would just be a
 * wall of "couldn't recall" markers, so they all collapse into one
 * "+N auto-filled" chip instead — it marks the point the user gave up, not
 * every move after it.
 */
export function RecallMoveStrip({ entries, onEntryClick }: Props) {
  const t = useTranslations('recall');

  const individualEntries = entries.filter(
    (e): e is MoveLogEntry & { status: IndividualStatus } => e.status !== 'autoFilled'
  );
  const autoFilledEntries = entries.filter((e) => e.status === 'autoFilled');

  if (entries.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
  }

  const interactive = onEntryClick !== undefined;
  const buttonClass = interactive ? 'hover:scale-110 hover:ring-2 hover:ring-foreground/40' : '';

  const legendItems: Array<{ key: string; markerClass: string; label: string }> = (
    ['correct', 'incorrect', 'skipped', 'auto'] as const
  )
    .filter((status) => individualEntries.some((e) => e.status === status))
    .map((status) => ({
      key: status,
      markerClass: `rounded-sm ${MARKER_CLASS[status]}`,
      label: t(status === 'incorrect' ? 'summary.legendIncorrect' : SQUARE_LABEL_KEY[status]),
    }));
  if (autoFilledEntries.length > 0) {
    legendItems.push({
      key: 'autoFilled',
      markerClass: 'rounded-full bg-muted',
      label: t('logAutoFilled'),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {individualEntries.map((entry, index) => {
          const prefix = formatMoveAnchor(entry.moveNumber, entry.isWhiteMove);
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
                className={`inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-xs text-destructive-foreground transition-transform ${MARKER_CLASS.incorrect} ${buttonClass}`}
              >
                {entry.incorrectMove}
              </button>
            );
          }

          const label = `${prefix} ${entry.move} — ${t(SQUARE_LABEL_KEY[entry.status])}`;
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
        {legendItems.map(({ key, markerClass, label }) => (
          <span key={key} className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <span className={`h-3 w-3 ${markerClass}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
