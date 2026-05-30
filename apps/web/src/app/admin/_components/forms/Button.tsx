import type { ButtonHTMLAttributes } from 'react';

/**
 * Admin action button. Three variants cover the duplicated button styling found
 * across the admin forms:
 * - `primary` — the repeated `bg-primary` filled submit button (15+ copies).
 * - `secondary` — the `bg-secondary` filled button (e.g. "Search Users").
 * - `outline` — the `bg-card` bordered cancel/secondary button.
 *
 * Pure presentational (no hooks). `type` defaults to `button` to avoid the
 * native `<button>` footgun of implicitly submitting its enclosing form.
 */
const BASE_CLASS = 'px-4 py-2 rounded text-sm font-medium disabled:opacity-50';

const VARIANT_CLASS = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity',
  outline: 'bg-card border border-border hover:bg-secondary transition-colors',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT_CLASS;
};

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  const merged = `${BASE_CLASS} ${VARIANT_CLASS[variant]}${className ? ` ${className}` : ''}`;
  return <button type={type} className={merged} {...props} />;
}
