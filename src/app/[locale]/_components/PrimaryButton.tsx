import { type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  fullWidth?: boolean;
};

export function PrimaryButton({
  children,
  className = '',
  disabled,
  loading = false,
  fullWidth = true,
  ...props
}: Props) {
  const baseClasses = [
    'px-6',
    'py-3',
    'bg-foreground',
    'text-background',
    'font-semibold',
    'rounded-lg',
    'transition-colors',
    'hover:bg-foreground/90',
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
