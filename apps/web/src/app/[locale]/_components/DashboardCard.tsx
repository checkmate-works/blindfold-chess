import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

// `-mx-4` assumes the parent locale layout wrapper uses `px-4` at `<sm` (see `[locale]/layout.tsx`); breaks DashboardCard out to flush-edge on mobile.
export function DashboardCard({ children }: Props) {
  return (
    <div className="bg-card -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border sm:border-border overflow-hidden">
      {children}
    </div>
  );
}
