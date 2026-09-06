import type { ReactNode } from 'react';

import Link from 'next/link';

import { FaExternalLinkAlt } from 'react-icons/fa';

/**
 * The locale every admin link to the public site uses. The admin UI itself is
 * English-only — every page calls `getTranslations({ locale: 'en' })` — so
 * there is no active locale to inherit, and the public routes all live under a
 * `[locale]` segment that has to be filled with something.
 */
const ADMIN_PUBLIC_LOCALE = 'en';

type AdminExternalLinkProps = {
  /**
   * A public-site path WITHOUT the locale segment, e.g. `/chunks/back-rank`.
   * The path builders in `@/lib/...` and the public route tree all return
   * this shape, so callers pass their result straight through.
   */
  path: string;
  children: ReactNode;
};

/**
 * A link from an admin table out to the page the public site renders that row
 * on. Opens in a new tab — an admin following one is looking something up
 * mid-task, not navigating away from the list they are working through — and
 * says so with the outbound-arrow glyph, since nothing else in the admin UI
 * leaves the admin UI.
 */
export function AdminExternalLink({ path, children }: AdminExternalLinkProps) {
  return (
    <Link
      href={`/${ADMIN_PUBLIC_LOCALE}${path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {children}
      <FaExternalLinkAlt className="h-3 w-3" />
    </Link>
  );
}
