'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';

import { withReturnPath } from '@/lib/auth-return-path';

type Props = {
  /** Which auth screen to send the visitor to. Locale-less; the prefix is added here. */
  to: '/sign-in' | '/sign-up';
  className?: string;
  children: ReactNode;
};

/**
 * A link to sign-in / sign-up that brings the visitor back to the page they
 * left. Use it for auth CTAs that render on *any* page (the header, the guest
 * create-form overlay) rather than on one known route.
 *
 * The `href` is built from `usePathname()` alone and the query string is added
 * only on click, from `window.location`. `useSearchParams()` would be the
 * obvious way to get the query during render, but reading it opts the whole
 * page out of static rendering — and these CTAs sit on ISR routes such as
 * `/articles` and `/dojo/ranks` (see "No dynamic-API reads" in
 * `apps/web/CLAUDE.md`). An event handler runs long after rendering, so
 * reading `window` there costs nothing. Components that only ever render on
 * `force-dynamic` pages can use `useCurrentPathAsNext()` instead, which is
 * simpler because it can read the query during render.
 *
 * Modified clicks and non-primary buttons fall through to the browser, which
 * opens the plain `href` — a new tab loses the query half of the return
 * target, which beats hijacking "open in new tab".
 */
export function AuthCtaLink({ to, className, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const base = `/${locale}${to}`;

  return (
    <Link
      href={withReturnPath(base, pathname)}
      className={className}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        router.push(withReturnPath(base, `${pathname}${window.location.search}`));
      }}
    >
      {children}
    </Link>
  );
}
