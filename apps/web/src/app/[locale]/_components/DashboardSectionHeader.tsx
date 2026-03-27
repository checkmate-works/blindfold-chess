import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  actions?: ReactNode;
};

export function DashboardSectionHeader({ icon, title, actions }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
