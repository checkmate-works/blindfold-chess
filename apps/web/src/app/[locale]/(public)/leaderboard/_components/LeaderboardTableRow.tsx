import type { LeaderboardRow } from '../_lib/types';
import { LeaderboardRowCells } from './LeaderboardRowCells';

type Props = {
  row: LeaderboardRow;
  isCurrentUser: boolean;
  locale: string;
};

const TOP3_BORDER: Record<number, string> = {
  1: 'border-l-4 border-l-podium-gold',
  2: 'border-l-4 border-l-podium-silver',
  3: 'border-l-4 border-l-podium-bronze',
};

export function LeaderboardTableRow({ row, isCurrentUser, locale }: Props) {
  const topBorder = TOP3_BORDER[row.rank] ?? '';
  const isTop3 = row.rank >= 1 && row.rank <= 3;

  return (
    <tr
      className={[
        'border-b border-border last:border-b-0 transition-colors',
        isCurrentUser
          ? 'bg-primary/5 dark:bg-primary/10'
          : isTop3
            ? 'bg-muted/30 dark:bg-muted/20 hover:bg-muted/50'
            : 'hover:bg-muted/50',
        topBorder,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <LeaderboardRowCells row={row} locale={locale} />
    </tr>
  );
}
