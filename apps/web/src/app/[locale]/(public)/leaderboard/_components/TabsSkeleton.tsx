/**
 * Placeholder for one of the leaderboard's segmented controls while its page
 * streams in: the Score/Exp switch (two segments), the period tabs (three)
 * and the module filter (seven). Same pill row and pill height as the real
 * controls, so nothing shifts when they resolve.
 */
export function TabsSkeleton({ segments }: { segments: number }) {
  return (
    <div className="flex rounded-lg bg-secondary p-1">
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className="h-10 flex-1 rounded-md" />
      ))}
    </div>
  );
}
