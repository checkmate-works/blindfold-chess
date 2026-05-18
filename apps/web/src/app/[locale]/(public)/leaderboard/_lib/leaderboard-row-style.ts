/** Left-border accent for the top-3 leaderboard ranks. */
export const TOP3_BORDER: Record<number, string> = {
  1: 'border-l-4 border-l-podium-gold',
  2: 'border-l-4 border-l-podium-silver',
  3: 'border-l-4 border-l-podium-bronze',
};

/**
 * Compose the `<tr>` className for a leaderboard row: the base row styling,
 * the current-user / top-3 background highlight, and the top-3 left border.
 */
export function leaderboardRowClassName(opts: { rank: number; isCurrentUser?: boolean }): string {
  const isTop3 = opts.rank >= 1 && opts.rank <= 3;

  return [
    'border-b border-border last:border-b-0 transition-colors',
    opts.isCurrentUser
      ? 'bg-primary/5 dark:bg-primary/10'
      : isTop3
        ? 'bg-muted/30 dark:bg-muted/20 hover:bg-muted/50'
        : 'hover:bg-muted/50',
    TOP3_BORDER[opts.rank] ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}
