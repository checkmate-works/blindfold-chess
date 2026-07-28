import { Link } from '@/i18n/routing';
import { FiGitBranch } from 'react-icons/fi';

/**
 * `⑂ <label> <source title>` — the one-line fork-provenance marker.
 *
 * Shared so a fork looks the same wherever it is stated: under the H1 on a
 * position's detail page (via {@link ForkProvenanceNote}) and at the top of
 * the create form while the fork is still being authored. Both are the same
 * claim — "this position descends from that one" — and previously read as
 * two unrelated UI elements, the create form using a boxed info banner with
 * its own sentence-shaped copy.
 *
 * Renders the label alone (no title, no link) when `href` is omitted — the
 * detail page's soft-deleted-parent case, where the label itself carries the
 * whole message ("Forked from a deleted puzzle").
 */
export function ForkSourceLine({
  label,
  title,
  href,
}: {
  label: string;
  title?: string;
  href?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <FiGitBranch className="h-3 w-3 flex-shrink-0" aria-hidden />
      {href && title !== undefined ? (
        <>
          {label}{' '}
          <Link href={href} className="underline hover:text-foreground">
            {title}
          </Link>
        </>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
