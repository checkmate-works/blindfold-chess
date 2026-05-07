import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  'data-tour-id'?: string;
};

export function DashboardSection({ children, ...rest }: Props) {
  return (
    <div className="p-4 sm:p-6 border-b border-border last:border-b-0" {...rest}>
      {children}
    </div>
  );
}
