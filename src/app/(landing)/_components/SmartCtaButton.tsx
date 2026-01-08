'use client';

import { MouseEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

type Props = {
  href: string;
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  className?: string;
};

export function SmartCtaButton({
  href,
  label,
  variant = 'primary',
  size = 'lg',
  className,
}: Props) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Check if user is Japanese
    const isJapanese =
      typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja');

    if (isJapanese) {
      e.preventDefault();
      router.push(`/ja${href}`);
    }
    // If not Japanese, let the default Link behavior handle it (going to /en...)
  };

  // Default href points to English version for SEO
  const defaultHref = `/en${href}`;

  return (
    <Link
      href={defaultHref}
      onClick={handleClick}
      className="inline-block tab-0 focus:outline-none"
    >
      <Button
        variant={variant as any}
        size={size}
        className={`cursor-pointer ${className || ''}`}
        // Button itself doesn't need onClick anymore as the wrapping Link handles it
        // However, we need to ensure the click bubbles up or is handled by Link
        // next/link wraps children in <a> if legacy behavior, but in App Router it wraps children.
        // If Button is a button element, nesting it inside <a> (Link) is invalid HTML.
        // We should render Button as a div or span if possible, OR just style the Link as a button.
        // But reusing the Button component is easier.
        // The Custom Button component likely renders a <button>.
        // Nesting <button> inside <a> is invalid but often works.
        // A better approach is to not use the Button component if it renders a <button> tag,
        // OR pass a prop to render as div?
        // Let's assume for now wrapping is fine or the Button component handles 'asChild' pattern (but we don't know).
        // Since NewGameButton wraps Button in Link:
        // <Link ...><Button ...>{text}</Button></Link>
        // We will follow that pattern.
      >
        {label}
      </Button>
    </Link>
  );
}
