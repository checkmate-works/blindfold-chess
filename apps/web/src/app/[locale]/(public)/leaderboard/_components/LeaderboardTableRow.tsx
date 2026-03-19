import type { LeaderboardRow } from '../_lib/types';
import { formatTime } from '../_lib/utils';
import { PlayerCell } from './PlayerCell';
import { RankBadge } from './RankBadge';

type Props = {
  row: LeaderboardRow;
  isCurrentUser: boolean;
  locale: string;
};

export function LeaderboardTableRow({ row, isCurrentUser, locale }: Props) {
  return (
    <tr
      className={`border-b border-border last:border-b-0 transition-colors ${
        isCurrentUser ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'
      }`}
    >
      <td className="py-3 px-3 text-center">
        <RankBadge rank={row.rank} />
      </td>
      <td className="py-3 px-3">
        <PlayerCell row={row} locale={locale} />
      </td>
      <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground">
        {row.score}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
        {row.incorrectAnswers}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
        {formatTime(row.timeTaken)}
      </td>
    </tr>
  );
}
