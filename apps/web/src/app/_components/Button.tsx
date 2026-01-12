import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary:
    'bg-secondary text-secondary-foreground border border-foreground/20 shadow-sm hover:bg-secondary/90 hover:border-foreground/30',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'secondary',
  size = 'sm',
  icon,
  loading = false,
  fullWidth = false,
  asChild = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'rounded-md font-medium transition-colors duration-150 flex items-center justify-center gap-2';
  const disabledStyles =
    disabled || loading ? 'opacity-50 cursor-not-allowed shadow-none text-muted-foreground' : '';
  const widthStyles = fullWidth ? 'w-full' : '';
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${widthStyles} ${className}`;

  // If asChild is true, render as a span to be used inside Link
  if (asChild) {
    return (
      <span className={combinedClassName}>
        {icon && !loading && (
          <span className="w-3 h-3 flex items-center justify-center">{icon}</span>
        )}
        {loading ? '...' : children}
      </span>
    );
  }

  return (
    <button className={combinedClassName} disabled={disabled || loading} {...props}>
      {icon && !loading && <span className="w-3 h-3 flex items-center justify-center">{icon}</span>}
      {loading ? '...' : children}
    </button>
  );
}
