import { PagePanel, PageTitle } from '@/app/[locale]/_components';

/**
 * Learn category listing loading skeleton.
 *
 * Shown while the server renders the learn index / category pages.
 */
export default function LearnLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        {/* SectionTitle skeleton */}
        <div className="border-b border-border pb-2">
          <div className="h-5 md:h-6 bg-muted rounded w-48 animate-pulse" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
