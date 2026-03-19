type Props = {
  rank: number;
};

const PODIUM_STYLES: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold',
  2: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 font-bold',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold',
};

export function RankBadge({ rank }: Props) {
  const podiumStyle = PODIUM_STYLES[rank];

  if (podiumStyle) {
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm ${podiumStyle}`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground text-sm font-medium">
      {rank}
    </span>
  );
}
