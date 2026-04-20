type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * When true, disables the pulse animation. Useful for nested skeleton
   * shapes inside a parent that is already pulsing, to avoid double-pulse
   * interference.
   */
  static?: boolean;
};

export function Skeleton({
  className = '',
  static: isStatic = false,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  'aria-busy': ariaBusy = true,
  ...props
}: SkeletonProps) {
  const animationClass = isStatic ? '' : 'motion-safe:animate-pulse';
  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-busy={ariaBusy}
      className={`rounded-md bg-muted ${animationClass} ${className}`.trim()}
      {...props}
    />
  );
}
