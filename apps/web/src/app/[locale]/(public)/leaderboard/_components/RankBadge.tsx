import { getMedalEmoji } from '@/lib/users/rank-emoji';

type Props = {
  rank: number;
};

export function RankBadge({ rank }: Props) {
  const medal = getMedalEmoji(rank);

  if (medal) {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 text-xl"
        role="img"
        aria-label={`Rank ${rank}`}
      >
        {medal}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground text-sm font-medium">
      {rank}
    </span>
  );
}
