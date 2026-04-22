import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function PagePanel({ children, className = 'space-y-8' }: Props) {
  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
