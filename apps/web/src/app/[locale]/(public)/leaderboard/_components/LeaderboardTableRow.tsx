import { leaderboardRowClassName } from '../_lib/leaderboard-row-style';
import type { LeaderboardRow } from '../_lib/types';
import { LeaderboardRowCells } from './LeaderboardRowCells';

type Props = {
  row: LeaderboardRow;
  isCurrentUser: boolean;
  locale: string;
};

export function LeaderboardTableRow({ row, isCurrentUser, locale }: Props) {
  return (
    <tr className={leaderboardRowClassName({ rank: row.rank, isCurrentUser })}>
      <LeaderboardRowCells row={row} locale={locale} />
    </tr>
  );
}
