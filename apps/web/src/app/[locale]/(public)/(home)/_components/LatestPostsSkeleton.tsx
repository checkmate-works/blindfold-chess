type Props = {
  title: string;
};

export function LatestPostsSkeleton({ title }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <ul className="bg-card border border-border rounded-md overflow-hidden">
        {[1, 2, 3].map((i) => (
          <li key={i} className="border-b border-border last:border-b-0 px-4 py-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-muted rounded flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-3/4" />
              </div>
              <div className="h-4 bg-muted rounded w-20 flex-shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
