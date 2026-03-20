type Props = {
  rank: number;
};

const PODIUM_STYLES: Record<number, string> = {
  1: 'bg-podium-gold text-podium-gold-foreground font-bold',
  2: 'bg-podium-silver text-podium-silver-foreground font-bold',
  3: 'bg-podium-bronze text-podium-bronze-foreground font-bold',
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
