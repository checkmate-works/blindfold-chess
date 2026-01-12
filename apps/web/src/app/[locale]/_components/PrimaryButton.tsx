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
      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';

  const baseClasses = [
    'px-6',
    'py-3',
    variantClasses,
    'font-medium',
    'rounded-md',
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
