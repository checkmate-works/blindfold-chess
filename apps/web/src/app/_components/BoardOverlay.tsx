import { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  className?: string;
  isVisible?: boolean;
};

export function BoardOverlay({ children, className = '', isVisible = true }: Props) {
  if (!isVisible) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-black/30 rounded-md z-50 pointer-events-none ${className}`}
    >
      <div className="pointer-events-auto flex items-center justify-center">{children}</div>
    </div>
  );
}
