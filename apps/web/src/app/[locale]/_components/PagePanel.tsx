import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

// `-mx-4` assumes the parent locale layout wrapper uses `px-4` at `<sm` (see `[locale]/layout.tsx`); breaks PagePanel out to flush-edge on mobile.
export function PagePanel({ children, className = 'space-y-8' }: Props) {
  return (
    <div
      className={`bg-card -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border sm:border-border p-4 sm:p-6 md:p-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
