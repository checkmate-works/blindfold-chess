import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Link } from '@/i18n/routing';

/**
 * The quiet bordered chip used for the owner-only actions on a piece of UGC
 * (Edit, Delete, Add a note…). Outlined and small rather than a filled `Button`:
 * these sit beside the content they act on, and none of them is the page's
 * primary action.
 *
 * Wraps the icon + label pairing too — an icon child is sized to the label, so a
 * chip row stays visually even without every call site repeating the numbers.
 */
type Tone = 'neutral' | 'danger';

/** `sm` for a page-level owner row, `xs` inside a panel. */
type Size = 'xs' | 'sm';

/**
 * `danger` reddens border + label on hover. It marks destructive actions, but
 * is not what guards them — that is the confirmation dialog behind the chip.
 */
const TONE: Record<Tone, string> = {
  neutral: 'hover:border-foreground/20 hover:text-foreground',
  danger: 'hover:border-destructive/40 hover:text-destructive',
};

const SIZE: Record<Size, string> = {
  xs: 'text-xs [&_svg]:h-3 [&_svg]:w-3',
  sm: 'text-sm [&_svg]:h-3.5 [&_svg]:w-3.5',
};

function chipClass(tone: Tone, size: Size): string {
  return [
    'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1',
    'text-muted-foreground transition-colors disabled:opacity-50',
    TONE[tone],
    SIZE[size],
  ].join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
};

export function OwnerActionButton({
  tone = 'neutral',
  size = 'sm',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button type="button" className={`${chipClass(tone, size)} ${className}`} {...props}>
      {children}
    </button>
  );
}

type LinkProps = {
  href: string;
  locale?: string;
  tone?: Tone;
  size?: Size;
  children: ReactNode;
};

/** The same chip as a navigation target (locale-aware `Link`). */
export function OwnerActionLink({
  href,
  locale,
  tone = 'neutral',
  size = 'sm',
  children,
}: LinkProps) {
  return (
    <Link href={href} locale={locale} className={chipClass(tone, size)}>
      {children}
    </Link>
  );
}
