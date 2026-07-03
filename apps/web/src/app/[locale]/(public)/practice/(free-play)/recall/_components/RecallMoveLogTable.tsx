'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveLogEntry } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/recall-format';

type Props = {
  /** Full move-log history; only incorrect / skipped (gave-up) rows are shown. */
  entries: MoveLogEntry[];
  /**
   * When provided, each row becomes a button that jumps the board to the
   * move's position. Used by the completion summary's "stumbled here" review.
   */
  onEntryClick?: (entry: MoveLogEntry) => void;
};

/**
 * The mistakes table: every move the user got wrong or gave up on, with the
 * incorrect vs. correct SAN side by side. Opponent auto-fills (`auto`) are not
 * mistakes, so they are excluded. Rows are clickable when `onEntryClick` is
 * wired (the completion summary uses this to revisit each stumble).
 */
export function RecallMoveLogTable({ entries, onEntryClick }: Props) {
  const t = useTranslations('recall');

  const relevantEntries = entries.filter((e) => e.status === 'incorrect' || e.status === 'skipped');
  if (relevantEntries.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
  }

  const interactive = onEntryClick !== undefined;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th className="text-left px-4 py-3 font-medium">{t('logMoveNumber')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('logIncorrectMove')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('logCorrectMove')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {relevantEntries.map((entry, index) => (
            <tr
              key={index}
              onClick={interactive ? () => onEntryClick?.(entry) : undefined}
              className={interactive ? 'cursor-pointer hover:bg-muted transition-colors' : ''}
            >
              <td className="px-4 py-3 text-muted-foreground">
                {formatMoveNumberPrefix(entry.moveNumber, entry.isWhiteMove)}
              </td>
              {entry.status === 'incorrect' ? (
                <>
                  <td className="px-4 py-3 text-destructive">{entry.incorrectMove}</td>
                  <td className="px-4 py-3 text-success">{entry.move}</td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-muted-foreground">{t('logSkipped')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.move}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
