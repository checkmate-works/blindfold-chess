import { getMissColorClass } from '@/lib/challenge/ui';

import type { LeaderboardRow } from '../_lib/types';

/**
 * The score `<td>` for a leaderboard row: the score followed by the
 * parenthesized incorrect-answer count, colored by miss severity. Shared by
 * the per-row cells and the current-user rank row.
 */
export function ScoreCell({ row }: { row: LeaderboardRow }) {
  return (
    <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-24">
      {row.score}
      <span className={`text-xs ml-0.5 font-normal ${getMissColorClass(row.incorrectAnswers)}`}>
        ({row.incorrectAnswers})
      </span>
    </td>
  );
}
