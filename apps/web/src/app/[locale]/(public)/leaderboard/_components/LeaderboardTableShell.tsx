type ShellProps = {
  ariaLabel: string;
  children: React.ReactNode;
  /** Optional content rendered below the table (e.g. the current-user row). */
  footer?: React.ReactNode;
};

/**
 * The bordered, rounded card wrapper around a leaderboard `<table>`. Shared
 * by the score leaderboard and the exp leaderboard, whose column layouts
 * differ but whose outer scaffolding is identical.
 */
export function LeaderboardTableShell({ ariaLabel, children, footer }: ShellProps) {
  return (
    <div className="space-y-0">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full table-fixed" aria-label={ariaLabel}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}

/** The centered "no entries yet" placeholder shared by the leaderboards. */
export function LeaderboardEmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-lg">{message}</p>
    </div>
  );
}
