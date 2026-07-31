'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { DEFAULT_LOCALE } from '@/config';

/**
 * `[locale]`-scoped 404 boundary.
 *
 * Deliberately a Client Component with the locale taken from `useParams()`.
 * A not-found boundary is prerendered as part of EVERY route's shell, and a
 * server-side locale lookup here has no safe form: `headers()` (the previous
 * implementation) taints the entire `[locale]` tree and silently disables
 * all static generation — that exact regression is how this comment came to
 * exist — while `getLocale()` cannot see the layout's `setRequestLocale()`
 * seed from inside a boundary and falls back to the default locale. The
 * client router always knows the real params, and the copy is intentionally
 * locale-independent, so nothing here needs the server.
 */
export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? DEFAULT_LOCALE;

  return (
    <div className="flex items-center justify-center min-h-[60vh] -my-8">
      <div className="text-center px-4">
        <h1 className="text-6xl font-light text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-8">Page not found</p>
        <Link
          href={`/${locale}`}
          className="inline-block px-6 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
