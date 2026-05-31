/**
 * Loading placeholder for {@link TopicTabs}. Mirrors LinkTabs' segmented tab
 * row (a `bg-secondary` track with four equal pills) so the real tabs swap in
 * without layout shift. Pure/static — safe to render from any loading.tsx.
 */
export function TopicTabsSkeleton() {
  return (
    <div className="flex gap-1 rounded-lg bg-secondary p-1" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
