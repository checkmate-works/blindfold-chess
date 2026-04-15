import { getMissColorClass } from '@/lib/challenge/ui';

import type { LeaderboardRow } from '../_lib/types';
import { PlayerCell } from './PlayerCell';
import { RankBadge } from './RankBadge';

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
      <td className="py-3 px-3 text-right tabular-nums font-semibold text-foreground w-24">
        {row.score}
        <span className={`text-xs ml-0.5 font-normal ${getMissColorClass(row.incorrectAnswers)}`}>
          ({row.incorrectAnswers})
        </span>
      </td>
    </>
  );
}
