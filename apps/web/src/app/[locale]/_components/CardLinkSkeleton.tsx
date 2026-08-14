/**
 * Loading placeholder for one {@link CardLink} — icon, title, description.
 *
 * Lives next to the component it mirrors, because that is the only way the
 * two stay the same shape: a skeleton earns its keep by reserving the real
 * box, so a stale copy produces the layout shift it exists to prevent.
 *
 * Three practice result skeletons wrote this markup out identically. Four
 * other placeholders render a near-copy with different bar widths — the learn
 * loading states use `w-1/3` / `w-1/4`, the single-position result uses
 * `w-1/2` / `w-3/4`. Those are left alone: all three are guesses at the same
 * `CardLink`, so reconciling them is a visual decision rather than a
 * mechanical one, and parameterising the widths would turn a mirror of one
 * component into a configurable box.
 */
export function CardLinkSkeleton() {
  return (
    <div className="p-6 bg-card rounded-md border border-border animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
        <div className="flex-1">
          <div className="h-5 bg-muted rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
