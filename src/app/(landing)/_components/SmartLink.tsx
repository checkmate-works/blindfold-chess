'use client';

import { MouseEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function SmartLink({ href, children, className }: Props) {
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
      className={`cursor-pointer underline hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm transition-colors ${className || ''}`}
    >
      {children}
    </Link>
  );
}
