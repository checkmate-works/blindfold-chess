import { PagePanel, PageTitle } from '@/app/[locale]/_components';

/**
 * Articles listing loading skeleton.
 *
 * Shown while the server renders the paginated article list. Mirrors the
 * PageTitle + PagePanel + SectionTitle + ListLinkContainer/ListLink structure
 * to minimise CLS when the real content swaps in.
 */
export default function ArticlesLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Articles</span>
      </PageTitle>

      <PagePanel>
        {/* SectionTitle skeleton */}
        <div className="border-b border-warning/50 pb-2">
          <div className="h-5 md:h-6 bg-muted rounded w-48 animate-pulse" />
        </div>

        {/* ListLinkContainer skeleton */}
        <ul className="bg-card border border-border rounded-md overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="border-b border-border last:border-b-0 px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-muted rounded w-3/4" />
                </div>
                <div className="h-4 bg-muted rounded w-20 flex-shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      </PagePanel>
    </div>
  );
}
