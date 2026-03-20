import type { LeaderboardRow } from '../_lib/types';
import { LeaderboardRowCells } from './LeaderboardRowCells';

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
      <LeaderboardRowCells row={row} locale={locale} />
    </tr>
  );
}
