import { PagePanel, PageTitle } from '@/app/[locale]/_components';

/**
 * Games / play loading skeleton.
 *
 * Shown while the play page resolves. Mirrors the outer structure of
 * PlayPageClient (space-y-8 > PageTitle > PagePanel) and approximates
 * the initial game-in-progress layout (3-column grid with game area
 * and moves panel) to prevent CLS.
 */
export default function GamesPlayLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          {/* Game area skeleton (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status line */}
            <div className="h-5 bg-muted rounded w-40" />
            {/* Move input area */}
            <div className="h-10 bg-muted rounded w-full" />
            {/* Action buttons */}
            <div className="flex gap-3">
              <div className="h-10 bg-muted rounded w-24" />
              <div className="h-10 bg-muted rounded w-24" />
            </div>
          </div>

          {/* Moves panel skeleton (1 col) */}
          <div className="lg:col-span-1 space-y-3">
            <div className="h-5 bg-muted rounded w-24" />
            <div className="h-40 bg-muted rounded w-full" />
          </div>
        </div>

        {/* Divider skeleton */}
        <div className="border-t border-border my-6" />

        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-muted rounded w-48 animate-pulse" />
      </PagePanel>
    </div>
  );
}
