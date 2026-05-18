'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveLogEntry } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/postmortem-format';

type Props = {
  /** Full move-log history; only incorrect / auto-filled rows are shown. */
  entries: MoveLogEntry[];
};

/**
 * The mistakes table inside the postmortem "move log" modal. Lists every
 * move the user got wrong or auto-filled, with the incorrect vs. correct
 * SAN side by side. Extracted from `PostmortemClient`, where it had been
 * defined as an inline IIFE in the modal body.
 */
export function PostmortemMoveLogTable({ entries }: Props) {
  const t = useTranslations('postmortem');

  const relevantEntries = entries.filter((e) => e.status === 'incorrect' || e.status === 'auto');
  if (relevantEntries.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{t('noMistakes')}</p>;
  }

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
            <tr key={index}>
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
                  <td className="px-4 py-3 text-muted-foreground">{t('logAutoFilled')}</td>
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
