import type { LeaderboardRow } from '../_lib/types';
import { PlayerCell } from './PlayerCell';
import { RankBadge } from './RankBadge';
import { ScoreCell } from './ScoreCell';

type Props = {
  row: LeaderboardRow;
  locale: string;
};

export function LeaderboardRowCells({ row, locale }: Props) {
  return (
    <>
      <td className="py-3 px-3 text-center w-16">
        <RankBadge rank={row.rank} />
      </td>
      <td className="py-3 px-3">
        <PlayerCell row={row} locale={locale} />
      </td>
      <ScoreCell row={row} />
    </>
  );
}
