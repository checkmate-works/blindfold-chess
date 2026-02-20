import { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  className?: string;
  isVisible?: boolean;
  'data-testid'?: string;
};

export function BoardOverlay({
  children,
  className = '',
  isVisible = true,
  'data-testid': dataTestId,
}: Props) {
  if (!isVisible) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-black/30 rounded-md z-50 pointer-events-none ${className}`}
      data-testid={dataTestId}
    >
      <div className="pointer-events-auto flex items-center justify-center">{children}</div>
    </div>
  );
}
