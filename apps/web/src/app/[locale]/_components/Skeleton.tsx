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
      className={`rounded-md bg-muted ${animationClass} ${className}`.trim()}
      {...props}
    />
  );
}
