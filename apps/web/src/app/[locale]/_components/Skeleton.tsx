type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * When true, disables the pulse animation entirely. Useful for nested
   * skeleton shapes inside a parent that is already pulsing, or for
   * decorative shapes where motion is not desired.
   */
  disableAnimation?: boolean;
};

/**
 * Generic skeleton shape primitive.
 *
 * Contributes exactly two things — the muted fill and the pulse — and leaves
 * every dimension, spacing and corner utility to `className`.
 *
 * @design The corner radius is the caller's, not this component's
 *
 * This used to hard-code `rounded-md`, which quietly made the primitive
 * unusable for the majority of the app's skeleton shapes: a class list is not
 * a cascade, so a caller passing `rounded` or `rounded-full` could not
 * override it — Tailwind resolves the conflict by stylesheet order, not by
 * the order the classes appear in the attribute. The two callers that needed
 * a circle had to reach for `!rounded-full`, and dozens of skeletons across
 * the app hand-rolled `bg-muted animate-pulse` instead of adopting this at
 * all. Every caller now states its own radius.
 *
 * Defaults to `aria-hidden="true"` so individual shapes are treated as
 * purely decorative by assistive tech. Skeletons typically render many
 * shapes side-by-side; letting each one announce itself as a live region
 * creates "busy" chatter in screen readers. Callers that need a live
 * region should apply `role="status"` / `aria-live` / `aria-busy` on an
 * outer wrapper that scopes the whole loading area, not on each shape.
 *
 * Any aria/role attribute can still be overridden via `...props` (e.g.
 * pass `aria-hidden={false}` to opt an individual shape back in).
 */
export function Skeleton({
  className = '',
  disableAnimation = false,
  'aria-hidden': ariaHidden = true,
  ...props
}: SkeletonProps) {
  const animationClass = disableAnimation ? '' : 'motion-safe:animate-pulse';
  return (
    <div
      aria-hidden={ariaHidden}
      className={`bg-muted ${animationClass} ${className}`.trim()}
      {...props}
    />
  );
}
