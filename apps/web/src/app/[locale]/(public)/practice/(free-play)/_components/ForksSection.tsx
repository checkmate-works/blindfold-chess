import { Link } from '@/i18n/routing';
import { FiGitBranch } from 'react-icons/fi';

import { resolveDisplayName } from '@/lib/users/display-name';

type ForkRow = {
  position: {
    id: string;
    title: string;
  };
  profile: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

type Props = {
  /** Most-recent-first slice of the parent's descendants. Capped by the caller. */
  forks: ForkRow[];
  /**
   * Total descendant count after server-side filtering. Used in the summary
   * line so users see the real number even when the visible slice is capped.
   * Section renders nothing when `0`.
   */
  totalCount: number;
  /**
   * Detail-page base path for the consumer route (e.g. `/practice/puzzle` or
   * `/practice/position-memory`). Each row links to `${basePath}/${id}`.
   * Kept as a plain prop so the section stays type-agnostic.
   */
  basePath: string;
  /**
   * Locale-resolved labels. Passed in (rather than calling next-intl) so this
   * component stays a pure RSC and can be rendered in any locale slot.
   */
  labels: {
    sectionTitle: (count: number) => string;
    byAuthor: (name: string) => string;
  };
};

/**
 * Collapsible "Forks (N)" section rendered above the comments on a
 * position's detail page. Uses native `<details>` so the toggle works
 * without client JavaScript and SSR delivers a fully-hydrated DOM.
 *
 * Hidden entirely when `totalCount === 0`; the consumer detail page short-
 * circuits the list query in that case, but the guard here is what lets
 * the page just always include the component without an extra wrapping
 * conditional.
 */
export function ForksSection({ forks, totalCount, basePath, labels }: Props) {
  if (totalCount === 0) return null;

  return (
    <details className="rounded-md border border-border bg-card px-3 py-2 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
        <FiGitBranch aria-hidden className="h-3 w-3" />
        <span>{labels.sectionTitle(totalCount)}</span>
      </summary>
      <ul className="mt-3 space-y-1">
        {forks.map((row) => {
          const name = resolveDisplayName(row.profile);
          return (
            <li key={row.position.id} className="text-muted-foreground">
              <Link
                href={`${basePath}/${row.position.id}`}
                className="text-foreground hover:underline"
              >
                {row.position.title}
              </Link>
              <span> — {labels.byAuthor(name)}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
