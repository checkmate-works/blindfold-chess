import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  className?: string;
  isVisible?: boolean;
  /**
   * Tailwind rounding utility for the overlay box. Defaults to `'rounded-md'`
   * so existing callers are unaffected. Pass e.g. `'rounded-none sm:rounded-md'`
   * for boards that go flush-edge on mobile (coordinate-quiz).
   */
  rounded?: string;
  'data-testid'?: string;
};

export function BoardOverlay({
  children,
  className = '',
  isVisible = true,
  rounded = 'rounded-md',
  'data-testid': dataTestId,
}: Props) {
  if (!isVisible) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-black/30 ${rounded} z-50 pointer-events-none ${className}`}
      data-testid={dataTestId}
    >
      <div className="pointer-events-auto flex items-center justify-center">{children}</div>
    </div>
  );
}
