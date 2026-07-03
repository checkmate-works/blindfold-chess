import type { ReactNode } from 'react';

export type AdminBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'caution'
  | 'info'
  | 'neutral'
  | 'accent';

const VARIANT_CLASSES: Record<AdminBadgeVariant, string> = {
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-destructive-soft text-destructive-soft-foreground',
  caution: 'bg-caution-soft text-caution-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  neutral: 'bg-secondary text-secondary-foreground',
  accent: 'bg-accent',
};

type AdminBadgeProps = {
  variant: AdminBadgeVariant;
  children: ReactNode;
};

export function AdminBadge({ variant, children }: AdminBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
