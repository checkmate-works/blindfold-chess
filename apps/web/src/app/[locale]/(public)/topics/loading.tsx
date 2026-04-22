/**
 * Topics index loading skeleton.
 *
 * Mirrors the page.tsx structure (PageTitle + PagePanel with CardLinks,
 * SectionTitle, and TopicPostCard list) to minimise CLS when the real
 * content swaps in.
 */
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

export default function TopicsLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Topics</span>
      </PageTitle>

      <PagePanel>
        {/* CardLink x2 skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-muted rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-1" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>
          <span className="invisible">Recent posts</span>
        </SectionTitle>

        {/* TopicPostCard list skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-muted rounded-full" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
              <div className="h-3 bg-muted rounded w-20 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-1" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
