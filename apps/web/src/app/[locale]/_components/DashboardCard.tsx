import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DashboardCard({ children }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {children}
    </div>
  );
}
