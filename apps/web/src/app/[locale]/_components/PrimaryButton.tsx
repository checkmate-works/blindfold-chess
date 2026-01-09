import { type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  children,
  className = '',
  disabled,
  loading = false,
  fullWidth = true,
  variant = 'primary',
  ...props
}: Props) {
  const variantClasses =
    variant === 'secondary'
      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
      : 'bg-foreground text-background hover:bg-foreground/90';

  const baseClasses = [
    'px-6',
    'py-3',
    variantClasses,
    'font-semibold',
    'rounded-lg',
    'transition-colors',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={baseClasses} disabled={disabled || loading} {...props}>
      {loading ? '...' : children}
    </button>
  );
}
