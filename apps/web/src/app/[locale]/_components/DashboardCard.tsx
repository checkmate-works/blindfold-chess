import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DashboardCard({ children }: Props) {
  return <div className="bg-card border border-border rounded-lg overflow-hidden">{children}</div>;
}
